import type { DustGrade, HourlyConditions } from "../recommend-day";

type JsonObject = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return value && typeof value === "object" ? [value as T] : [];
}

/** 공공데이터포털 응답에서 결과 코드를 확인하고 item 목록을 꺼낸다. */
function itemsOf(json: unknown): JsonObject[] {
  const response = (json as { response?: JsonObject } | undefined)?.response;
  const header = response?.header as { resultCode?: string; resultMsg?: string } | undefined;
  if (header?.resultCode !== "00") {
    throw new Error(
      `공공데이터포털 응답 오류: ${header?.resultCode ?? "?"} ${header?.resultMsg ?? ""}`.trim(),
    );
  }
  const items = (response?.body as { items?: { item?: unknown } | string } | undefined)?.items;
  return typeof items === "object" ? asArray<JsonObject>(items?.item) : [];
}

const compactDate = (yyyymmdd: string | number) => {
  const s = String(yyyymmdd);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

export type ForecastHour = HourlyConditions & { date: string };

/** 기상청 단기예보(getVilageFcst) 응답에서 기온(TMP), 풍속(WSD), 강수확률(POP)을 시간별로 모은다. */
export function parseForecast(json: unknown): ForecastHour[] {
  const byHour = new Map<string, ForecastHour>();
  for (const item of itemsOf(json)) {
    const category = item.category as string;
    if (!["TMP", "WSD", "POP"].includes(category)) continue;
    const key = `${item.fcstDate}${item.fcstTime}`;
    const entry =
      byHour.get(key) ??
      ({
        date: compactDate(item.fcstDate as string),
        hour: Number(String(item.fcstTime).slice(0, 2)),
      } as ForecastHour);
    const value = Number(item.fcstValue);
    if (category === "TMP") entry.temperature = value;
    if (category === "WSD") entry.windSpeed = value;
    if (category === "POP") entry.precipitationProbability = value;
    byHour.set(key, entry);
  }
  return [...byHour.values()];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 기상청 생활기상지수 자외선 응답(h0, h3, ..., h75)을 "YYYY-MM-DDTHH" 키의 시간별 값으로 펼친다.
 * h0은 응답의 date(YYYYMMDDHH) 시각이고, 3시간 값은 앞뒤 1시간까지 가장 가까운 값으로 쓴다.
 */
export function parseUvIndex(json: unknown): Map<string, number> {
  const uv = new Map<string, number>();
  const [item] = itemsOf(json);
  if (!item) return uv;

  const base = String(item.date);
  const baseMs = Date.UTC(
    Number(base.slice(0, 4)),
    Number(base.slice(4, 6)) - 1,
    Number(base.slice(6, 8)),
    Number(base.slice(8, 10)),
  );
  for (let offset = 0; offset <= 75; offset += 3) {
    const raw = item[`h${offset}`];
    if (raw === "" || raw === undefined || raw === null) continue;
    for (const delta of [-1, 0, 1]) {
      if (offset + delta < 0) continue;
      const d = new Date(baseMs + (offset + delta) * 3600e3);
      uv.set(
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}`,
        Number(raw),
      );
    }
  }
  return uv;
}

type AirForecast = { informData: string; dataTime: string; informGrade: string };

const GRADE_ORDER: DustGrade[] = ["좋음", "보통", "나쁨", "매우나쁨"];

/** "2026-10-22 11시 발표" 같은 문자열을 정렬 가능한 값으로 바꾼다. */
const publishedAt = (dataTime: string) => dataTime.replace(/[^0-9]/g, "");

function gradeOf(forecasts: AirForecast[], date: string, airRegion: string) {
  const latest = forecasts
    .filter((f) => f.informData === date)
    .sort((a, b) => publishedAt(b.dataTime).localeCompare(publishedAt(a.dataTime)))[0];
  if (!latest) return undefined;
  const entry = latest.informGrade
    .split(",")
    .map((part) => part.split(":").map((s) => s.trim()))
    .find(([region]) => region === airRegion);
  const grade = entry?.[1] as DustGrade | undefined;
  return grade && GRADE_ORDER.includes(grade) ? grade : undefined;
}

/** 미세먼지(PM10)와 초미세먼지(PM25) 예보 중 나쁜 쪽 등급. 하나만 있으면 그 등급. */
export function parseDustGrade(
  forecasts: { PM10?: AirForecast[]; PM25?: AirForecast[] },
  date: string,
  airRegion: string,
): DustGrade | undefined {
  const grades = [forecasts.PM10, forecasts.PM25]
    .map((list) => (list ? gradeOf(list, date, airRegion) : undefined))
    .filter((g): g is DustGrade => g !== undefined);
  if (grades.length === 0) return undefined;
  return grades.reduce((a, b) => (GRADE_ORDER.indexOf(b) > GRADE_ORDER.indexOf(a) ? b : a));
}

export type { AirForecast };

/** 특일 정보(getRestDeInfo) 응답에서 휴일 날짜를 YYYY-MM-DD로 모은다. */
export function parseHolidays(json: unknown): Set<string> {
  return new Set(
    itemsOf(json)
      .filter((item) => item.isHoliday === "Y")
      .map((item) => compactDate(item.locdate as number)),
  );
}

/** 에어코리아 응답(returnType=json)에서 예보 항목을 꺼낸다. 헤더가 없는 형식이라 따로 처리한다. */
export function parseAirForecasts(json: unknown): AirForecast[] {
  const items = (json as { response?: { body?: { items?: unknown } } })?.response?.body?.items;
  return asArray<AirForecast>(items);
}
