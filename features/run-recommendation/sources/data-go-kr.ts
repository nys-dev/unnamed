import type { WeatherSources } from "../get-run-recommendation";
import { airRegionOf } from "../air-region";
import {
  parseAirForecasts,
  parseDustGrade,
  parseForecast,
  parseHolidays,
  parseUvIndex,
  type AirForecast,
} from "./parse";

const BASE = "https://apis.data.go.kr";
const ATTEMPTS = 3;
const TIMEOUT_MS = 8000;

/** 공공데이터포털 API를 부른다. 에어코리아처럼 가끔 5xx를 주는 API를 위해 몇 번 다시 시도한다. */
async function getJson(path: string, params: Record<string, string | number>) {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다.");

  const url = new URL(path, BASE);
  url.searchParams.set("serviceKey", serviceKey);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));

  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.ok) return (await response.json()) as unknown;
      lastError = new Error(`${path} 응답 ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
const AVAILABLE_AFTER_MINUTES = 15; // 발표 후 자료가 올라오기까지 걸리는 시간

/** 지금 받을 수 있는 가장 최근 단기예보 발표 시각 */
export function latestForecastBase(now: string) {
  const [date, time] = now.split("T");
  const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const baseHour = [...BASE_HOURS]
    .reverse()
    .find((h) => minutes >= h * 60 + AVAILABLE_AFTER_MINUTES);
  if (baseHour !== undefined)
    return { baseDate: date.replace(/-/g, ""), baseTime: `${String(baseHour).padStart(2, "0")}00` };

  const yesterday = new Date(`${date}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return { baseDate: yesterday.toISOString().slice(0, 10).replace(/-/g, ""), baseTime: "2300" };
}

async function airForecasts(code: "PM10" | "PM25", searchDate: string): Promise<AirForecast[]> {
  return parseAirForecasts(
    await getJson("/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth", {
      returnType: "json",
      numOfRows: 50,
      pageNo: 1,
      searchDate,
      informCode: code,
    }),
  );
}

export const dataGoKrSources: WeatherSources = {
  async forecast(region, now) {
    const { baseDate, baseTime } = latestForecastBase(now);
    return parseForecast(
      await getJson("/1360000/VilageFcstInfoService_2.0/getVilageFcst", {
        dataType: "JSON",
        numOfRows: 1500,
        pageNo: 1,
        base_date: baseDate,
        base_time: baseTime,
        nx: region.nx,
        ny: region.ny,
      }),
    );
  },

  async uvIndex(region, today) {
    return parseUvIndex(
      await getJson("/1360000/LivingWthrIdxServiceV5/getUVIdxV5", {
        dataType: "JSON",
        numOfRows: 10,
        pageNo: 1,
        areaNo: region.areaNo,
        time: `${today.replace(/-/g, "")}00`,
      }),
    );
  },

  async dustGrades(region, dates) {
    const airRegion = airRegionOf(region);
    // 미세먼지와 초미세먼지는 하나가 실패해도 다른 하나로 판단할 수 있다.
    const [pm10, pm25] = await Promise.allSettled([
      airForecasts("PM10", dates[0]),
      airForecasts("PM25", dates[0]),
    ]);
    const forecasts = {
      PM10: pm10.status === "fulfilled" ? pm10.value : undefined,
      PM25: pm25.status === "fulfilled" ? pm25.value : undefined,
    };
    if (!forecasts.PM10 && !forecasts.PM25)
      throw new Error("에어코리아 대기질 예보를 받지 못했습니다.");
    return new Map(dates.map((date) => [date, parseDustGrade(forecasts, date, airRegion)]));
  },

  async holidays(dates) {
    const months = [...new Set(dates.map((d) => d.slice(0, 7)))];
    const sets = await Promise.all(
      months.map(async (month) =>
        parseHolidays(
          await getJson("/B090041/openapi/service/SpcdeInfoService/getRestDeInfo", {
            _type: "json",
            solYear: month.slice(0, 4),
            solMonth: month.slice(5, 7),
            numOfRows: 50,
          }),
        ),
      ),
    );
    return new Set(sets.flatMap((s) => [...s]));
  },
};
