/** 지금 시각을 한국 시간 YYYY-MM-DDTHH:mm으로 돌려준다. */
export function kstNow(date = new Date()) {
  const text = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return text.replace(" ", "T");
}

/** 오늘 날짜를 한국 시간 YYYY-MM-DD로 돌려준다. */
export function kstToday(date = new Date()) {
  return kstNow(date).slice(0, 10);
}
