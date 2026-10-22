import { describe, expect, test } from "vitest";

import { recommendDay, type HourlyConditions } from "./index";

// 모든 요소가 적합한 하루(24시간)를 만든다. 필요한 시간만 덮어쓴다.
function calmDay(overrides: Record<number, Partial<HourlyConditions>> = {}) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temperature: 15,
    windSpeed: 1,
    precipitationProbability: 0,
    uvIndex: 0,
    ...overrides[hour],
  }));
}

// 2026-10-21 수요일, 2026-10-24 토요일, 2026-10-25 일요일
const farBefore = "2026-10-20T00:00";

describe("러닝 가능 시간대", () => {
  test("평일은 오후 7시 이후의 시간만 후보가 된다", () => {
    const result = recommendDay(
      { date: "2026-10-21", isHoliday: false, dust: "좋음", hours: calmDay() },
      farBefore,
    );

    expect(result.hours.map((h) => h.hour)).toEqual([19, 20, 21, 22, 23]);
  });

  test("토요일은 오전 8시부터 오후 8시까지의 시간만 후보가 된다", () => {
    const result = recommendDay(
      { date: "2026-10-24", isHoliday: false, dust: "좋음", hours: calmDay() },
      farBefore,
    );

    expect(result.hours.map((h) => h.hour)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
  });

  test("공휴일인 평일은 주말과 같은 시간대 규칙을 따른다", () => {
    const result = recommendDay(
      { date: "2026-10-21", isHoliday: true, dust: "좋음", hours: calmDay() },
      farBefore,
    );

    expect(result.hours[0].hour).toBe(8);
    expect(result.hours.at(-1)?.hour).toBe(19);
  });

  test("오늘은 이미 지난 시간을 후보에서 뺀다", () => {
    const result = recommendDay(
      { date: "2026-10-24", isHoliday: false, dust: "좋음", hours: calmDay() },
      "2026-10-24T14:30",
    );

    // 14시대는 이미 시작했으므로 다음 정시인 15시부터 본다.
    expect(result.hours.map((h) => h.hour)).toEqual([15, 16, 17, 18, 19]);
  });
});

// 토요일 오전 10시 한 시간만 바꿔 보며 그 시간의 판정을 확인한다.
function levelAt10(
  condition: Partial<HourlyConditions>,
  dust: "좋음" | "보통" | "나쁨" | "매우나쁨" = "좋음",
) {
  const result = recommendDay(
    {
      date: "2026-10-24",
      isHoliday: false,
      dust,
      hours: calmDay({ 10: condition }),
    },
    farBefore,
  );
  return result.hours.find((h) => h.hour === 10)?.level;
}

describe("시간대 판정", () => {
  test("모든 요소가 적합하면 좋음이다", () => {
    expect(levelAt10({})).toBe("좋음");
  });

  test.each([
    [3.9, "좋음"],
    [4, "보통"],
    [6.9, "보통"],
    [7, "부적합"],
  ])("풍속 초속 %sm는 %s이다", (windSpeed, level) => {
    expect(levelAt10({ windSpeed })).toBe(level);
  });

  test.each([
    [19, "좋음"],
    [20, "보통"],
    [49, "보통"],
    [50, "부적합"],
  ])("강수확률 %s퍼센트는 %s이다", (precipitationProbability, level) => {
    expect(levelAt10({ precipitationProbability })).toBe(level);
  });

  test.each([
    [5, "좋음"],
    [6, "보통"],
    [7, "보통"],
    [8, "부적합"],
  ])("자외선 지수 %s는 %s이다", (uvIndex, level) => {
    expect(levelAt10({ uvIndex })).toBe(level);
  });

  test.each([
    ["좋음", "좋음"],
    ["보통", "좋음"],
    ["나쁨", "부적합"],
    ["매우나쁨", "부적합"],
  ] as const)("미세먼지 %s 등급이면 %s이다", (dust, level) => {
    expect(levelAt10({}, dust)).toBe(level);
  });

  test("온도는 아무리 높거나 낮아도 판정을 바꾸지 않고 값은 그대로 보인다", () => {
    expect(levelAt10({ temperature: -15 })).toBe("좋음");
    expect(levelAt10({ temperature: 38 })).toBe("좋음");
    const result = recommendDay(
      {
        date: "2026-10-24",
        isHoliday: false,
        dust: "좋음",
        hours: calmDay({ 10: { temperature: 38 } }),
      },
      farBefore,
    );
    expect(result.hours.find((h) => h.hour === 10)?.temperature).toBe(38);
  });

  test("부적합 요소가 하나라도 있으면 감점 요소가 있어도 부적합이다", () => {
    expect(levelAt10({ windSpeed: 5, precipitationProbability: 80 })).toBe(
      "부적합",
    );
  });
});

function saturday(
  overrides: Record<number, Partial<HourlyConditions>>,
  dust: "좋음" | "보통" | "나쁨" | "매우나쁨" | null = "좋음",
) {
  return recommendDay(
    {
      date: "2026-10-24",
      isHoliday: false,
      dust: dust ?? undefined,
      hours: calmDay(overrides),
    },
    farBefore,
  );
}

describe("추천 구간", () => {
  test("좋음이 이어지는 구간을 보여 주고 보통 구간은 보여 주지 않는다", () => {
    const result = saturday({
      11: { windSpeed: 5 },
      12: { windSpeed: 5 },
    });

    expect(result.kind).toBe("good");
    expect(result.windows).toEqual([
      { startHour: 8, endHour: 11, level: "좋음", cautions: [] },
      { startHour: 13, endHour: 20, level: "좋음", cautions: [] },
    ]);
  });

  test("좋음이 없으면 보통 구간을 감점 요소와 함께 보여 준다", () => {
    const result = saturday({
      ...Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [i + 8, { windSpeed: 5 }]),
      ),
      9: { windSpeed: 5, precipitationProbability: 30 },
      10: { windSpeed: 5, precipitationProbability: 30 },
      14: { windSpeed: 9 },
    });

    expect(result.kind).toBe("fair");
    expect(result.windows).toEqual([
      { startHour: 8, endHour: 14, level: "보통", cautions: ["풍속", "강수확률"] },
      { startHour: 15, endHour: 20, level: "보통", cautions: ["풍속"] },
    ]);
  });
});

describe("하루 전체가 부적합인 날", () => {
  const stormy = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [
      i + 8,
      { precipitationProbability: 80, windSpeed: 9 },
    ]),
  );

  test("추천은 없고 부적합 요소가 가장 적은 시간대를 참고용으로 준다", () => {
    const result = saturday({
      ...stormy,
      15: { precipitationProbability: 60 },
      16: { precipitationProbability: 60 },
    });

    expect(result.kind).toBe("unfit");
    expect(result.windows).toEqual([]);
    expect(result.fallback).toEqual({
      startHour: 15,
      endHour: 17,
      reasons: ["강수확률"],
    });
  });

  test("부적합 요소 수가 같으면 기준을 덜 벗어난 시간대를 준다", () => {
    const result = saturday({
      ...stormy,
      9: { precipitationProbability: 70 },
      14: { precipitationProbability: 55 },
    });

    expect(result.fallback).toEqual({
      startHour: 14,
      endHour: 15,
      reasons: ["강수확률"],
    });
  });

  test("추천이 있는 날에는 참고용 시간대를 주지 않는다", () => {
    expect(saturday({}).fallback).toBeUndefined();
  });
});

describe("남은 후보 시간이 없는 날", () => {
  test("평일 밤 11시 30분 이후의 오늘은 후보도 참고용 시간대도 없다", () => {
    const result = recommendDay(
      { date: "2026-10-21", isHoliday: false, dust: "좋음", hours: calmDay() },
      "2026-10-21T23:30",
    );

    expect(result.kind).toBe("empty");
    expect(result.windows).toEqual([]);
    expect(result.fallback).toBeUndefined();
  });
});

describe("일부 정보가 없을 때", () => {
  test("미세먼지 정보가 없으면 그 요소를 빼고 판정하고 빠진 정보를 알려 준다", () => {
    const result = saturday({}, null);

    expect(result.kind).toBe("good");
    expect(result.missing).toEqual(["미세먼지"]);
  });

  test("값이 없는 요소는 부적합으로 치지 않는다", () => {
    const result = saturday({ 10: { uvIndex: undefined } });

    expect(result.hours.find((h) => h.hour === 10)?.level).toBe("좋음");
    expect(result.missing).toEqual(["자외선 지수"]);
  });

  test("모든 정보가 있으면 빠진 정보가 없다", () => {
    expect(saturday({}).missing).toEqual([]);
  });
});
