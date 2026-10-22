import { expect, test } from "vitest";

import { kstNow, kstToday } from "./kst";

test("UTC 시각을 한국 시간으로 바꾼다", () => {
  expect(kstNow(new Date("2026-10-22T03:44:00Z"))).toBe("2026-10-22T12:44");
});

test("자정을 넘기면 날짜가 한국 기준으로 다음 날이 된다", () => {
  expect(kstToday(new Date("2026-10-22T15:30:00Z"))).toBe("2026-10-23");
  expect(kstNow(new Date("2026-10-22T15:30:00Z"))).toBe("2026-10-23T00:30");
});
