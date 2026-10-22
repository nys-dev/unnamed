import { describe, expect, test } from "vitest";

import { findRegion } from "@/lib/regions";
import {
  ForecastUnavailableError,
  getRunRecommendation,
  type WeatherSources,
} from "./get-run-recommendation";
import type { ForecastHour } from "./sources/parse";

const region = findRegion("1111051500")!;
const now = "2026-10-22T12:44"; // 목요일

const calmForecast = (dates: string[]): ForecastHour[] =>
  dates.flatMap((date) =>
    Array.from({ length: 24 }, (_, hour) => ({
      date,
      hour,
      temperature: 15,
      windSpeed: 1,
      precipitationProbability: 0,
    })),
  );

function sources(overrides: Partial<WeatherSources> = {}): WeatherSources {
  return {
    forecast: async () => calmForecast(["2026-10-22", "2026-10-23", "2026-10-24"]),
    uvIndex: async () => new Map(),
    dustGrades: async (_region, dates) =>
      new Map(dates.map((d) => [d, "좋음" as const])),
    holidays: async () => new Set<string>(),
    ...overrides,
  };
}

// UV 값이 없으면 자외선이 빠진 것으로 보이므로, 대부분의 테스트는 모든 시간에 0을 준다.
const zeroUv = async () =>
  new Map(
    ["2026-10-22", "2026-10-23", "2026-10-24"].flatMap((date) =>
      Array.from({ length: 24 }, (_, h) => [`${date}T${String(h).padStart(2, "0")}`, 0] as const),
    ),
  );

describe("러닝 추천 조립", () => {
  test("오늘, 내일, 모레 세 날을 순서대로 판정한다", async () => {
    const result = await getRunRecommendation(region, now, sources({ uvIndex: zeroUv }));

    expect(result.days.map((d) => [d.label, d.date, d.kind])).toEqual([
      ["오늘", "2026-10-22", "good"],
      ["내일", "2026-10-23", "good"],
      ["모레", "2026-10-24", "good"],
    ]);
    expect(result.region.name).toBe("서울특별시 종로구 청운효자동");
    expect(result.notices).toEqual([]);
  });

  test("공휴일인 평일은 주말 시간대로 판정한다", async () => {
    const result = await getRunRecommendation(
      region,
      now,
      sources({ uvIndex: zeroUv, holidays: async () => new Set(["2026-10-23"]) }),
    );

    expect(result.days[1].hours[0].hour).toBe(8);
  });

  test("기상청 예보를 받지 못하면 추천을 만들지 않고 오류를 던진다", async () => {
    await expect(
      getRunRecommendation(
        region,
        now,
        sources({
          forecast: async () => {
            throw new Error("timeout");
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ForecastUnavailableError);
  });

  test("자외선 정보를 받지 못하면 그 요소를 빼고 빠진 정보를 알린다", async () => {
    const result = await getRunRecommendation(
      region,
      now,
      sources({
        uvIndex: async () => {
          throw new Error("timeout");
        },
      }),
    );

    expect(result.days.every((d) => d.missing.includes("자외선 지수"))).toBe(true);
    expect(result.days[0].kind).toBe("good");
  });

  test("미세먼지 예보가 없는 날은 미세먼지가 빠진 것으로 알린다", async () => {
    const result = await getRunRecommendation(
      region,
      now,
      sources({
        uvIndex: zeroUv,
        dustGrades: async () => new Map([["2026-10-22", "좋음" as const]]),
      }),
    );

    expect(result.days[0].missing).toEqual([]);
    expect(result.days[2].missing).toEqual(["미세먼지"]);
  });

  test("공휴일 정보를 받지 못하면 요일만으로 판정하고 안내한다", async () => {
    const result = await getRunRecommendation(
      region,
      now,
      sources({
        uvIndex: zeroUv,
        holidays: async () => {
          throw new Error("timeout");
        },
      }),
    );

    expect(result.notices).toEqual(["공휴일 정보를 확인하지 못해 요일만으로 판단했습니다."]);
  });

  test("화면에 보이는 시간대와 별개로 하루 전체의 시간별 값을 저장용으로 돌려준다", async () => {
    const result = await getRunRecommendation(
      region,
      now,
      sources({
        uvIndex: async () => new Map([["2026-10-22T12", 5]]),
        dustGrades: async () => new Map([["2026-10-22", "보통" as const]]),
      }),
    );

    expect(result.snapshot).toHaveLength(72);
    expect(result.snapshot.find((h) => h.date === "2026-10-22" && h.hour === 12)).toEqual({
      date: "2026-10-22",
      hour: 12,
      temperature: 15,
      windSpeed: 1,
      precipitationProbability: 0,
      uvIndex: 5,
      dust: "보통",
    });
    // 값이 없는 요소는 비어 있다.
    const other = result.snapshot.find((h) => h.date === "2026-10-23" && h.hour === 3);
    expect(other?.uvIndex).toBeUndefined();
    expect(other?.dust).toBeUndefined();
  });
});
