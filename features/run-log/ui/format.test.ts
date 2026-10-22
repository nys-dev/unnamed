import { describe, expect, test } from "vitest";

import { formatRunTime, formatSummary } from "./format";

describe("히스토리 표시 형식", () => {
  test("요약은 값의 범위를 항목별로 이어 붙인다", () => {
    expect(
      formatSummary({
        temperature: { min: 10, max: 12 },
        windSpeed: { min: 1.5, max: 4.2 },
        precipitationProbability: { min: 0, max: 30 },
        uvIndex: { min: 0, max: 0 },
        dust: "좋음",
      }),
    ).toEqual([
      "기온 10～12℃",
      "풍속 1.5～4.2m/s",
      "강수확률 0～30%",
      "자외선 0",
      "미세먼지 좋음",
    ]);
  });

  test("최저와 최고가 같으면 한 값만 보여 준다", () => {
    expect(formatSummary({ temperature: { min: 12, max: 12 } })).toEqual([
      "기온 12℃",
    ]);
  });

  test("요약이 없으면 날씨 값 없음이다", () => {
    expect(formatSummary(undefined)).toEqual(["날씨 값 없음"]);
  });

  test("기록 시간은 끝 시각을 포함하지 않는 구간으로 보여 준다", () => {
    expect(formatRunTime(19, 21)).toBe("19:00–21:00");
    expect(formatRunTime(5, 24)).toBe("05:00–24:00");
  });
});
