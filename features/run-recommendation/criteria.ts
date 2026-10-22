import type { DustGrade } from "./recommend-day";

/** ok: 적합, warn: 감점, bad: 부적합 */
export type Rating = "ok" | "warn" | "bad";

export type FactorKey = "wind" | "rain" | "uv" | "dust";

export const FACTOR_LABELS: Record<FactorKey, string> = {
  wind: "풍속",
  rain: "강수확률",
  uv: "자외선 지수",
  dust: "미세먼지",
};

// 기준값은 PRODUCT.md의 초기 가정이다. 이후 사용자가 조정할 수 있도록 한곳에 모아 둔다.
export function rateWind(metersPerSecond: number): Rating {
  if (metersPerSecond >= 7) return "bad";
  if (metersPerSecond >= 4) return "warn";
  return "ok";
}

export function rateRain(probabilityPercent: number): Rating {
  if (probabilityPercent >= 50) return "bad";
  if (probabilityPercent >= 20) return "warn";
  return "ok";
}

export function rateUv(index: number): Rating {
  if (index >= 8) return "bad";
  if (index >= 6) return "warn";
  return "ok";
}

export function rateDust(grade: DustGrade): Rating {
  return grade === "나쁨" || grade === "매우나쁨" ? "bad" : "ok";
}

// 부적합 기준을 넘은 만큼을 기준값에 대한 비율로 바꾼 값이다. 클수록 더 나쁘다.
export function overshootWind(metersPerSecond: number) {
  return Math.max(0, metersPerSecond - 7) / 7;
}

export function overshootRain(probabilityPercent: number) {
  return Math.max(0, probabilityPercent - 50) / 50;
}

export function overshootUv(index: number) {
  return Math.max(0, index - 8) / 8;
}
