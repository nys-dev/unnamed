const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

const hourText = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export function formatHour(hour: number) {
  return hourText(hour);
}

export function formatWindow(startHour: number, endHour: number) {
  return `${hourText(startHour)}–${hourText(endHour)}`;
}
