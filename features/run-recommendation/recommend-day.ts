import {
  FACTOR_LABELS,
  overshootRain,
  overshootUv,
  overshootWind,
  rateDust,
  rateRain,
  rateUv,
  rateWind,
  type FactorKey,
  type Rating,
} from "./criteria";

export type DustGrade = "좋음" | "보통" | "나쁨" | "매우나쁨";

export type HourlyConditions = {
  /** 0–23, 해당 날짜의 시작 시각 */
  hour: number;
  temperature?: number;
  windSpeed?: number;
  precipitationProbability?: number;
  uvIndex?: number;
};

export type DayInput = {
  /** YYYY-MM-DD (한국 시간) */
  date: string;
  isHoliday: boolean;
  dust?: DustGrade;
  hours: HourlyConditions[];
};

export type Level = "좋음" | "보통" | "부적합";

export type HourJudgement = HourlyConditions & {
  level: Level;
  ratings: Partial<Record<FactorKey, Rating>>;
};

export type RunWindow = {
  startHour: number;
  /** 끝 시각(포함하지 않음) */
  endHour: number;
  level: Level;
  /** 감점이 된 요소의 이름 */
  cautions: string[];
};

/** 추천이 아니라 "그래도 뛴다면"의 참고용 시간대 */
export type FallbackWindow = {
  startHour: number;
  endHour: number;
  /** 부적합인 요소의 이름 */
  reasons: string[];
};

export type DayRecommendation = {
  date: string;
  /**
   * good: 좋음 구간이 있음, fair: 보통 구간만 있음,
   * unfit: 후보 시간이 모두 부적합, empty: 후보 시간이 없음
   */
  kind: "good" | "fair" | "unfit" | "empty";
  hours: HourJudgement[];
  windows: RunWindow[];
  fallback?: FallbackWindow;
  /** 값을 받지 못해 판정에서 뺀 요소의 이름 */
  missing: string[];
  /** 그날의 미세먼지 등급. 하루 값이라 시간대마다 같다. */
  dust?: DustGrade;
};

function isWeekendRule(date: string, isHoliday: boolean) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return isHoliday || day === 0 || day === 6;
}

function runnableHours(date: string, isHoliday: boolean) {
  return isWeekendRule(date, isHoliday)
    ? { from: 8, to: 19 }
    : { from: 19, to: 23 };
}

function judgeHour(hour: HourlyConditions, dust?: DustGrade): HourJudgement {
  const ratings: Partial<Record<FactorKey, Rating>> = {};
  if (hour.windSpeed !== undefined) ratings.wind = rateWind(hour.windSpeed);
  if (hour.precipitationProbability !== undefined)
    ratings.rain = rateRain(hour.precipitationProbability);
  if (hour.uvIndex !== undefined) ratings.uv = rateUv(hour.uvIndex);
  if (dust !== undefined) ratings.dust = rateDust(dust);

  const values = Object.values(ratings);
  const level: Level = values.includes("bad")
    ? "부적합"
    : values.includes("warn")
      ? "보통"
      : "좋음";
  return { ...hour, level, ratings };
}

const FACTOR_ORDER: FactorKey[] = ["wind", "rain", "uv", "dust"];

function windowsOf(hours: HourJudgement[], level: Level): RunWindow[] {
  const windows: RunWindow[] = [];
  let run: HourJudgement[] = [];
  const flush = () => {
    if (run.length === 0) return;
    windows.push({
      startHour: run[0].hour,
      endHour: run[run.length - 1].hour + 1,
      level,
      cautions: FACTOR_ORDER.filter((key) =>
        run.some((h) => h.ratings[key] === "warn"),
      ).map((key) => FACTOR_LABELS[key]),
    });
    run = [];
  };
  for (const hour of hours) {
    const continues =
      hour.level === level &&
      (run.length === 0 || run[run.length - 1].hour + 1 === hour.hour);
    if (continues) run.push(hour);
    else {
      flush();
      if (hour.level === level) run.push(hour);
    }
  }
  flush();
  return windows;
}

function badFactors(hour: HourJudgement) {
  return FACTOR_ORDER.filter((key) => hour.ratings[key] === "bad");
}

function overshoot(hour: HourJudgement) {
  return (
    (hour.windSpeed !== undefined ? overshootWind(hour.windSpeed) : 0) +
    (hour.precipitationProbability !== undefined
      ? overshootRain(hour.precipitationProbability)
      : 0) +
    (hour.uvIndex !== undefined ? overshootUv(hour.uvIndex) : 0)
  );
}

// 부적합 요소가 가장 적은 시간을 먼저 고르고, 같으면 기준을 덜 벗어난 시간을 고른다.
// 시간대는 그 시간과 같은 요소가 부적합인 이웃 시간까지 넓힌다.
function fallbackOf(hours: HourJudgement[]): FallbackWindow {
  const best = hours.reduce((a, b) => {
    const diff = badFactors(a).length - badFactors(b).length;
    if (diff !== 0) return diff < 0 ? a : b;
    return overshoot(a) <= overshoot(b) ? a : b;
  });
  const reasons = badFactors(best);
  const same = (h: HourJudgement) =>
    badFactors(h).join() === reasons.join();

  let start = best.hour;
  let end = best.hour + 1;
  while (hours.some((h) => h.hour === start - 1 && same(h))) start -= 1;
  while (hours.some((h) => h.hour === end && same(h))) end += 1;

  return {
    startHour: start,
    endHour: end,
    reasons: reasons.map((key) => FACTOR_LABELS[key]),
  };
}

/** now: YYYY-MM-DDTHH:mm (한국 시간) */
export function recommendDay(day: DayInput, now: string): DayRecommendation {
  const { from, to } = runnableHours(day.date, day.isHoliday);
  const [nowDate, nowTime] = now.split("T");
  // 이미 시작한 시간은 지난 시간으로 본다. 정각이 아니면 다음 정시부터 본다.
  const earliest =
    nowDate === day.date
      ? Number(nowTime.slice(0, 2)) + (nowTime.slice(3) === "00" ? 0 : 1)
      : nowDate > day.date
        ? 24
        : 0;

  const hours = day.hours
    .filter((h) => h.hour >= from && h.hour <= to && h.hour >= earliest)
    .map((h) => judgeHour(h, day.dust));

  const missing = FACTOR_ORDER.filter((key) =>
    hours.length === 0
      ? key === "dust" && day.dust === undefined
      : hours.some((h) => h.ratings[key] === undefined),
  ).map((key) => FACTOR_LABELS[key]);
  const base = { date: day.date, hours, missing, dust: day.dust };

  const good = windowsOf(hours, "좋음");
  if (good.length > 0) return { ...base, kind: "good", windows: good };
  const fair = windowsOf(hours, "보통");
  if (fair.length > 0) return { ...base, kind: "fair", windows: fair };
  if (hours.length === 0) return { ...base, kind: "empty", windows: [] };
  return { ...base, kind: "unfit", windows: [], fallback: fallbackOf(hours) };
}
