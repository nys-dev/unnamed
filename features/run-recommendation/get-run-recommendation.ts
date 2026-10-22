import type { Region } from "@/lib/regions";
import {
  recommendDay,
  type DayRecommendation,
  type DustGrade,
} from "./recommend-day";
import type { ForecastHour } from "./sources/parse";

/** 날씨 데이터를 가져오는 바깥 경계. 실제 구현은 공공데이터포털 API를 부른다. */
export type WeatherSources = {
  forecast(region: Region, now: string): Promise<ForecastHour[]>;
  /** "YYYY-MM-DDTHH" 키의 시간별 자외선 지수 */
  uvIndex(region: Region, today: string): Promise<Map<string, number>>;
  dustGrades(
    region: Region,
    dates: string[],
  ): Promise<Map<string, DustGrade | undefined>>;
  /** 휴일인 날짜(YYYY-MM-DD) */
  holidays(dates: string[]): Promise<Set<string>>;
};

export type DayLabel = "오늘" | "내일" | "모레";

/** 하루 전체 시간별 날씨 값. 로그인한 사용자의 기록에 붙일 값으로 저장한다. */
export type SnapshotHour = {
  date: string;
  hour: number;
  temperature?: number;
  windSpeed?: number;
  precipitationProbability?: number;
  uvIndex?: number;
  dust?: DustGrade;
};

export type RunForecast = {
  region: Region;
  days: (DayRecommendation & { label: DayLabel })[];
  /** 결과 전체에 붙는 안내 */
  notices: string[];
  /** 화면에 보이는 시간대와 상관없이 오늘, 내일, 모레의 0–23시 값 */
  snapshot: SnapshotHour[];
};

export class ForecastUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("기상청 예보를 받지 못했습니다.", options);
    this.name = "ForecastUnavailableError";
  }
}

const LABELS: DayLabel[] = ["오늘", "내일", "모레"];

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** now: YYYY-MM-DDTHH:mm (한국 시간) */
export async function getRunRecommendation(
  region: Region,
  now: string,
  sources: WeatherSources,
): Promise<RunForecast> {
  const today = now.slice(0, 10);
  const dates = LABELS.map((_, i) => addDays(today, i));

  const [forecast, uv, dust, holidays] = await Promise.allSettled([
    sources.forecast(region, now),
    sources.uvIndex(region, today),
    sources.dustGrades(region, dates),
    sources.holidays(dates),
  ]);

  // 기상청 예보가 없으면 판정할 근거가 없다.
  if (forecast.status === "rejected")
    throw new ForecastUnavailableError({ cause: forecast.reason });

  const notices: string[] = [];
  if (holidays.status === "rejected")
    notices.push("공휴일 정보를 확인하지 못해 요일만으로 판단했습니다.");

  const days = dates.map((date, i) => {
    const hours = forecast.value
      .filter((h) => h.date === date)
      .map((h) => ({
        hour: h.hour,
        temperature: h.temperature,
        windSpeed: h.windSpeed,
        precipitationProbability: h.precipitationProbability,
        uvIndex:
          uv.status === "fulfilled"
            ? uv.value.get(`${date}T${String(h.hour).padStart(2, "0")}`)
            : undefined,
      }));
    return {
      ...recommendDay(
        {
          date,
          isHoliday: holidays.status === "fulfilled" && holidays.value.has(date),
          dust: dust.status === "fulfilled" ? dust.value.get(date) : undefined,
          hours,
        },
        now,
      ),
      label: LABELS[i],
    };
  });

  const snapshot = forecast.value
    .filter((h) => dates.includes(h.date))
    .map((h) => ({
      date: h.date,
      hour: h.hour,
      temperature: h.temperature,
      windSpeed: h.windSpeed,
      precipitationProbability: h.precipitationProbability,
      uvIndex:
        uv.status === "fulfilled"
          ? uv.value.get(`${h.date}T${String(h.hour).padStart(2, "0")}`)
          : undefined,
      dust: dust.status === "fulfilled" ? dust.value.get(h.date) : undefined,
    }));

  return { region, days, notices, snapshot };
}

