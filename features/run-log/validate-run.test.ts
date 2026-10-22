import { describe, expect, test } from "vitest";

import { earliestRunDate, validateRun, type RunInput } from "./index";

const today = "2026-10-22";

const input = (overrides: Partial<RunInput> = {}): RunInput => ({
  runDate: "2026-10-22",
  startHour: 19,
  endHour: 20,
  areaNo: "1111051500",
  satisfied: true,
  dissatisfaction: [],
  ...overrides,
});

describe("러닝 기록 입력 검증", () => {
  test("만족한 기록은 그대로 통과하고 불만족 항목은 버린다", () => {
    const result = validateRun(input({ dissatisfaction: ["바람"] }), today);

    expect(result).toEqual({ ok: true, value: input({ dissatisfaction: [] }) });
  });

  test("불만족 기록은 고른 항목을 중복 없이 보존한다", () => {
    const result = validateRun(
      input({ satisfied: false, dissatisfaction: ["바람", "햇빛", "바람"] }),
      today,
    );

    expect(result).toEqual({
      ok: true,
      value: input({ satisfied: false, dissatisfaction: ["바람", "햇빛"] }),
    });
  });

  test("불만족이어도 항목을 하나도 고르지 않아도 통과한다", () => {
    expect(validateRun(input({ satisfied: false }), today).ok).toBe(true);
  });

  test("만족과 불만족 중 하나를 고르지 않으면 거절한다", () => {
    const result = validateRun(input({ satisfied: undefined }), today);

    expect(result).toEqual({ ok: false, error: "만족 또는 불만족을 골라 주세요." });
  });

  test("정해진 항목이 아니면 거절한다", () => {
    const result = validateRun(input({ satisfied: false, dissatisfaction: ["소음"] }), today);

    expect(result.ok).toBe(false);
  });

  test.each([
    ["2026-10-22", true],
    ["2026-10-15", true],
    ["2026-10-14", false],
    ["2026-10-23", false],
  ])("날짜 %s는 허용 여부가 %s이다", (runDate, ok) => {
    expect(validateRun(input({ runDate }), today).ok).toBe(ok);
  });

  test("미래 날짜는 이유를 알려 준다", () => {
    expect(validateRun(input({ runDate: "2026-10-23" }), today)).toEqual({
      ok: false,
      error: "미래 날짜는 기록할 수 없습니다.",
    });
  });

  test("7일보다 이전 날짜는 이유를 알려 준다", () => {
    expect(validateRun(input({ runDate: "2026-10-14" }), today)).toEqual({
      ok: false,
      error: "7일보다 이전 날짜는 기록할 수 없습니다.",
    });
  });

  test("날짜 형식이 맞지 않으면 거절한다", () => {
    expect(validateRun(input({ runDate: "10월 22일" }), today).ok).toBe(false);
  });

  test.each([
    [19, 19],
    [19, 18],
    [-1, 5],
    [24, 24],
    [5, 25],
    [19.5, 21],
  ])("시간 %s시부터 %s시까지는 거절한다", (startHour, endHour) => {
    expect(validateRun(input({ startHour, endHour }), today).ok).toBe(false);
  });

  test("끝이 시작보다 늦지 않으면 이유를 알려 준다", () => {
    expect(validateRun(input({ startHour: 20, endHour: 20 }), today)).toEqual({
      ok: false,
      error: "끝 시각은 시작 시각보다 늦어야 합니다.",
    });
  });

  test("0시부터 24시까지의 경계는 통과한다", () => {
    expect(validateRun(input({ startHour: 0, endHour: 24 }), today).ok).toBe(true);
  });

  test("지역이 없으면 거절한다", () => {
    expect(validateRun(input({ areaNo: "" }), today)).toEqual({
      ok: false,
      error: "지역을 골라 주세요.",
    });
  });
});

describe("기록할 수 있는 가장 이른 날짜", () => {
  test("오늘로부터 7일 전이고 그 날짜는 검증을 통과한다", () => {
    const earliest = earliestRunDate("2026-10-22");

    expect(earliest).toBe("2026-10-15");
    expect(validateRun(input({ runDate: earliest }), "2026-10-22").ok).toBe(true);
  });
});
