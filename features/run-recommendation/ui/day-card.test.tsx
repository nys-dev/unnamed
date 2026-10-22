import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { recommendDay, type HourlyConditions } from "../recommend-day";
import { DayCard } from "./day-card";

function hoursOf(overrides: Record<number, Partial<HourlyConditions>> = {}) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temperature: 15,
    windSpeed: 1,
    precipitationProbability: 0,
    uvIndex: 0,
    ...overrides[hour],
  }));
}

// 2026-10-24는 토요일이라 오전 8시부터 오후 8시까지가 후보이다.
function saturdayCard(
  overrides: Record<number, Partial<HourlyConditions>> = {},
  dust: "좋음" | "나쁨" | null = "좋음",
  now = "2026-10-20T00:00",
) {
  const day = recommendDay(
    {
      date: "2026-10-24",
      isHoliday: false,
      dust: dust ?? undefined,
      hours: hoursOf(overrides),
    },
    now,
  );
  render(<DayCard day={{ ...day, label: "모레" }} />);
}

describe("날짜 카드", () => {
  test("날짜 이름과 요일을 제목으로 보여 준다", () => {
    saturdayCard();

    expect(screen.getByRole("heading", { name: /모레/ })).toHaveTextContent(
      "10월 24일 (토)",
    );
  });

  test("좋음 구간을 추천 시간으로 보여 준다", () => {
    saturdayCard({ 12: { windSpeed: 5 } });

    const recommended = screen.getByRole("region", { name: "추천 시간" });
    expect(within(recommended).getByText("08:00–12:00")).toBeInTheDocument();
    expect(within(recommended).getByText("13:00–20:00")).toBeInTheDocument();
  });

  test("좋음이 없으면 보통 구간과 감점 요소를 보여 준다", () => {
    const windy = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 8, { windSpeed: 5 }]),
    );
    saturdayCard(windy);

    const recommended = screen.getByRole("region", { name: "추천 시간" });
    expect(within(recommended).getByText("08:00–20:00")).toBeInTheDocument();
    expect(recommended).toHaveTextContent("감점 요소: 풍속");
  });

  test("하루 전체가 부적합이면 추천 없음을 먼저, 참고용 시간대를 따로 보여 준다", () => {
    const stormy = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [
        i + 8,
        { precipitationProbability: 80, windSpeed: 9 },
      ]),
    );
    saturdayCard({
      ...stormy,
      15: { precipitationProbability: 60 },
      16: { precipitationProbability: 60 },
    });

    expect(screen.getByText("추천 시간 없음")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "추천 시간" })).toBeNull();
    const fallback = screen.getByRole("region", { name: "참고용" });
    expect(fallback).toHaveTextContent("15:00–17:00");
    expect(fallback).toHaveTextContent("부적합 요소: 강수확률");
    expect(fallback).toHaveTextContent("추천하지 않습니다");
  });

  test("남은 후보 시간이 없으면 그렇다고 알려 준다", () => {
    saturdayCard({}, "좋음", "2026-10-24T20:10");

    expect(screen.getByText("남은 러닝 시간이 없습니다.")).toBeInTheDocument();
  });

  test("빠진 정보를 결과 옆에서 알려 준다", () => {
    saturdayCard({}, null);

    expect(
      screen.getByText("미세먼지 정보 없음, 나머지 기준으로 판단"),
    ).toBeInTheDocument();
  });

  test("시간별 표에 기온과 판정을 보여 주고 기온은 판정에 영향을 주지 않는다", () => {
    saturdayCard({ 10: { temperature: 38 } });

    const row = screen.getByRole("row", { name: /10:00/ });
    expect(within(row).getByText("38℃")).toBeInTheDocument();
    // 시간, 판정, 기온 순서이다. 미세먼지도 "좋음"이라 열 위치로 판정을 확인한다.
    expect(within(row).getAllByRole("cell")[1]).toHaveTextContent("좋음");
  });

  test("미세먼지 등급은 표의 행마다가 아니라 날짜마다 한 번 보여 준다", () => {
    saturdayCard({}, "나쁨");

    expect(screen.getByText("미세먼지 나쁨")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "미세먼지" })).toBeNull();
  });
});
