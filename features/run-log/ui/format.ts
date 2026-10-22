import type { WeatherSummary } from "../weather";

const range = (r: { min: number; max: number }, unit: string) =>
  r.min === r.max ? `${r.min}${unit}` : `${r.min}～${r.max}${unit}`;

/** 히스토리에 한 줄씩 보여 줄 날씨 요약 */
export function formatSummary(summary: WeatherSummary | undefined): string[] {
  if (!summary) return ["날씨 값 없음"];
  const parts: string[] = [];
  if (summary.temperature) parts.push(`기온 ${range(summary.temperature, "℃")}`);
  if (summary.windSpeed) parts.push(`풍속 ${range(summary.windSpeed, "m/s")}`);
  if (summary.precipitationProbability)
    parts.push(`강수확률 ${range(summary.precipitationProbability, "%")}`);
  if (summary.uvIndex) parts.push(`자외선 ${range(summary.uvIndex, "")}`);
  if (summary.dust) parts.push(`미세먼지 ${summary.dust}`);
  return parts;
}

const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export function formatRunTime(startHour: number, endHour: number) {
  return `${pad(startHour)}–${pad(endHour)}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** YYYY-MM-DD를 "10월 22일 (목)"으로 */
export function formatRunDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}
