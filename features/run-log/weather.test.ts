import { describe, expect, test } from "vitest";

import {
  pickWeatherForRun,
  retentionCutoff,
  summarizeWeather,
  type SavedHour,
} from "./index";

const hour = (
  date: string,
  h: number,
  rest: Partial<SavedHour> = {},
): SavedHour => ({
  date,
  hour: h,
  temperature: 10 + h,
  windSpeed: 1,
  precipitationProbability: 0,
  uvIndex: 0,
  dust: "좋음",
  ...rest,
});

describe("기록에 붙일 날씨 값 고르기", () => {
  const saved = [
    hour("2026-10-21", 19),
    hour("2026-10-22", 18),
    hour("2026-10-22", 19),
    hour("2026-10-22", 20),
    hour("2026-10-22", 21),
  ];

  test("기록한 날짜의 시작 시각부터 끝 시각 전까지의 값만 시간 순서로 고른다", () => {
    const picked = pickWeatherForRun(saved, {
      runDate: "2026-10-22",
      startHour: 19,
      endHour: 21,
    });

    expect(picked.map((h) => h.hour)).toEqual([19, 20]);
  });

  test("고른 값에는 날짜가 들어 있지 않다", () => {
    const [first] = pickWeatherForRun(saved, {
      runDate: "2026-10-22",
      startHour: 19,
      endHour: 20,
    });

    expect(first).toEqual({
      hour: 19,
      temperature: 29,
      windSpeed: 1,
      precipitationProbability: 0,
      uvIndex: 0,
      dust: "좋음",
    });
  });

  test("저장된 값이 없으면 빈 목록이다", () => {
    expect(
      pickWeatherForRun(saved, { runDate: "2026-10-20", startHour: 19, endHour: 20 }),
    ).toEqual([]);
  });

  test("일부 시간만 저장되어 있으면 있는 시간의 값만 고른다", () => {
    const picked = pickWeatherForRun(saved, {
      runDate: "2026-10-22",
      startHour: 20,
      endHour: 24,
    });

    expect(picked.map((h) => h.hour)).toEqual([20, 21]);
  });
});

describe("히스토리용 날씨 요약", () => {
  test("값의 범위(최저와 최고)로 요약한다", () => {
    const summary = summarizeWeather([
      { hour: 19, temperature: 12, windSpeed: 1.5, precipitationProbability: 0, uvIndex: 0, dust: "좋음" },
      { hour: 20, temperature: 10, windSpeed: 4.2, precipitationProbability: 30, uvIndex: 0, dust: "좋음" },
    ]);

    expect(summary).toEqual({
      temperature: { min: 10, max: 12 },
      windSpeed: { min: 1.5, max: 4.2 },
      precipitationProbability: { min: 0, max: 30 },
      uvIndex: { min: 0, max: 0 },
      dust: "좋음",
    });
  });

  test("값이 없는 항목은 요약에서 빠진다", () => {
    const summary = summarizeWeather([{ hour: 19, temperature: 12 }]);

    expect(summary).toEqual({ temperature: { min: 12, max: 12 } });
  });

  test("값이 하나도 없으면 undefined이다", () => {
    expect(summarizeWeather([])).toBeUndefined();
    expect(summarizeWeather([{ hour: 19 }])).toBeUndefined();
  });
});

describe("날씨 값 보관 기간", () => {
  test("오늘 기준 3일 전 날짜가 기준 날짜이다", () => {
    expect(retentionCutoff("2026-10-22")).toBe("2026-10-19");
  });

  test("월을 넘겨도 날짜를 바르게 센다", () => {
    expect(retentionCutoff("2026-11-02")).toBe("2026-10-30");
  });
});
