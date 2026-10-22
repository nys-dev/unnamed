export const DISSATISFACTION_ITEMS = [
  "바람",
  "비",
  "햇빛",
  "미세먼지",
  "더위",
  "추위",
  "기타",
] as const;

export type DissatisfactionItem = (typeof DISSATISFACTION_ITEMS)[number];

/** 오늘부터 이 일수 전까지의 날짜를 기록할 수 있다. */
export const MAX_DAYS_BACK = 7;

export type RunInput = {
  /** YYYY-MM-DD */
  runDate: string;
  /** 0–23 */
  startHour: number;
  /** 1–24, 포함하지 않는 끝 시각 */
  endHour: number;
  areaNo: string;
  satisfied: boolean | undefined;
  dissatisfaction: string[];
};

export type ValidRun = Omit<RunInput, "satisfied" | "dissatisfaction"> & {
  satisfied: boolean;
  dissatisfaction: DissatisfactionItem[];
};

export type Validation =
  | { ok: true; value: ValidRun }
  | { ok: false; error: string };

const fail = (error: string): Validation => ({ ok: false, error });

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

/** today: YYYY-MM-DD (한국 시간) */
export function validateRun(input: RunInput, today: string): Validation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.runDate) || Number.isNaN(dayNumber(input.runDate)))
    return fail("날짜 형식이 맞지 않습니다.");

  const daysBack = dayNumber(today) - dayNumber(input.runDate);
  if (daysBack < 0) return fail("미래 날짜는 기록할 수 없습니다.");
  if (daysBack > MAX_DAYS_BACK)
    return fail(`${MAX_DAYS_BACK}일보다 이전 날짜는 기록할 수 없습니다.`);

  const { startHour, endHour } = input;
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23)
    return fail("시작 시각은 0시부터 23시 사이의 정시여야 합니다.");
  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24)
    return fail("끝 시각은 1시부터 24시 사이의 정시여야 합니다.");
  if (endHour <= startHour) return fail("끝 시각은 시작 시각보다 늦어야 합니다.");

  if (!input.areaNo) return fail("지역을 골라 주세요.");

  if (input.satisfied === undefined) return fail("만족 또는 불만족을 골라 주세요.");

  // 만족한 기록에는 항목을 남기지 않는다.
  const items = input.satisfied ? [] : [...new Set(input.dissatisfaction)];
  const known = new Set<string>(DISSATISFACTION_ITEMS);
  if (!items.every((item) => known.has(item)))
    return fail("알 수 없는 불만족 항목입니다.");

  return {
    ok: true,
    value: {
      runDate: input.runDate,
      startHour,
      endHour,
      areaNo: input.areaNo,
      satisfied: input.satisfied,
      dissatisfaction: items as DissatisfactionItem[],
    },
  };
}

/** 기록할 수 있는 가장 이른 날짜. today: YYYY-MM-DD */
export function earliestRunDate(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - MAX_DAYS_BACK);
  return date.toISOString().slice(0, 10);
}
