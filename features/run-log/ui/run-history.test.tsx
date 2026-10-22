import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type { RunRecord } from "../data";
import { RunHistory } from "./run-history";

const record = (overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: "run-1",
  runDate: "2026-10-22",
  startHour: 19,
  endHour: 21,
  areaNo: "1111051500",
  regionName: "서울특별시 종로구 청운효자동",
  satisfied: true,
  dissatisfaction: [],
  weather: [
    { hour: 19, temperature: 12, windSpeed: 1.5, precipitationProbability: 0, uvIndex: 0, dust: "좋음" },
    { hour: 20, temperature: 10, windSpeed: 4.2, precipitationProbability: 30, uvIndex: 0, dust: "좋음" },
  ],
  ...overrides,
});

describe("히스토리", () => {
  test("기록이 없으면 빈 상태를 보여 준다", () => {
    render(<RunHistory runs={[]} />);

    expect(screen.getByText("아직 남긴 기록이 없습니다.")).toBeInTheDocument();
  });

  test("날짜, 시간, 지역, 만족 여부를 보여 준다", () => {
    render(<RunHistory runs={[record()]} />);

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("10월 22일 (목)");
    expect(item).toHaveTextContent("19:00–21:00");
    expect(item).toHaveTextContent("서울특별시 종로구 청운효자동");
    expect(within(item).getByText("만족")).toBeInTheDocument();
  });

  test("불만족 기록은 고른 항목을 보여 준다", () => {
    render(
      <RunHistory runs={[record({ satisfied: false, dissatisfaction: ["바람", "햇빛"] })]} />,
    );

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("불만족")).toBeInTheDocument();
    expect(within(item).getByText("바람")).toBeInTheDocument();
    expect(within(item).getByText("햇빛")).toBeInTheDocument();
  });

  test("붙어 있는 날씨 값을 범위로 요약해 보여 준다", () => {
    render(<RunHistory runs={[record()]} />);

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("기온 10～12℃");
    expect(item).toHaveTextContent("풍속 1.5～4.2m/s");
    expect(item).toHaveTextContent("강수확률 0～30%");
    expect(item).toHaveTextContent("미세먼지 좋음");
  });

  test("날씨 값이 없으면 날씨 값 없음을 보여 준다", () => {
    render(<RunHistory runs={[record({ weather: [] })]} />);

    expect(screen.getByRole("listitem")).toHaveTextContent("날씨 값 없음");
  });

  test("기록마다 지우기 버튼이 있다", () => {
    render(<RunHistory runs={[record(), record({ id: "run-2" })]} />);

    expect(screen.getAllByRole("button", { name: "지우기" })).toHaveLength(2);
  });
});
