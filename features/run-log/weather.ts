export type DustGrade = "좋음" | "보통" | "나쁨" | "매우나쁨";

/** 기록에 붙는 시간별 날씨 값. 없는 값은 비워 둔다. */
export type RunWeatherHour = {
  hour: number;
  temperature?: number;
  windSpeed?: number;
  precipitationProbability?: number;
  uvIndex?: number;
  dust?: DustGrade;
};

/** 사용자가 추천 화면을 열 때 저장해 둔 시간별 값 */
export type SavedHour = RunWeatherHour & {
  /** YYYY-MM-DD */
  date: string;
};

type Range = { min: number; max: number };

export type WeatherSummary = {
  temperature?: Range;
  windSpeed?: Range;
  precipitationProbability?: Range;
  uvIndex?: Range;
  dust?: DustGrade;
};

/** 날씨 값을 이 일수가 지나면 지운다. */
export const RETENTION_DAYS = 3;

const DUST_ORDER: DustGrade[] = ["좋음", "보통", "나쁨", "매우나쁨"];

/** 기록한 날짜의 시작 시각부터 끝 시각 전까지 저장된 값을 시간 순서로 고른다. */
export function pickWeatherForRun(
  saved: SavedHour[],
  run: { runDate: string; startHour: number; endHour: number },
): RunWeatherHour[] {
  return saved
    .filter(
      (h) =>
        h.date === run.runDate && h.hour >= run.startHour && h.hour < run.endHour,
    )
    .sort((a, b) => a.hour - b.hour)
    .map((h) => ({
      hour: h.hour,
      temperature: h.temperature,
      windSpeed: h.windSpeed,
      precipitationProbability: h.precipitationProbability,
      uvIndex: h.uvIndex,
      dust: h.dust,
    }));
}

function rangeOf(values: (number | undefined)[]): Range | undefined {
  const present = values.filter((v): v is number => v !== undefined);
  return present.length === 0
    ? undefined
    : { min: Math.min(...present), max: Math.max(...present) };
}

/** 히스토리에 보여 줄 요약. 값이 하나도 없으면 undefined. */
export function summarizeWeather(
  hours: RunWeatherHour[],
): WeatherSummary | undefined {
  const dusts = hours
    .map((h) => h.dust)
    .filter((d): d is DustGrade => d !== undefined);
  const summary: WeatherSummary = {};

  const temperature = rangeOf(hours.map((h) => h.temperature));
  const windSpeed = rangeOf(hours.map((h) => h.windSpeed));
  const rain = rangeOf(hours.map((h) => h.precipitationProbability));
  const uv = rangeOf(hours.map((h) => h.uvIndex));
  if (temperature) summary.temperature = temperature;
  if (windSpeed) summary.windSpeed = windSpeed;
  if (rain) summary.precipitationProbability = rain;
  if (uv) summary.uvIndex = uv;
  if (dusts.length > 0)
    summary.dust = dusts.reduce((a, b) =>
      DUST_ORDER.indexOf(b) > DUST_ORDER.indexOf(a) ? b : a,
    );

  return Object.keys(summary).length === 0 ? undefined : summary;
}

/** 이 날짜보다 이른 날씨 값은 지운다. today: YYYY-MM-DD */
export function retentionCutoff(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - RETENTION_DAYS);
  return date.toISOString().slice(0, 10);
}
