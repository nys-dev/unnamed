import { expect, test } from "@playwright/test";

test("홈 화면에서 지역을 검색해 러닝 추천 화면까지 간다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("러닝 타임 추천");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "러닝 타임 추천"
  );

  await page.getByLabel("지역명으로 찾기").fill("청운효자동");
  await page.getByRole("button", { name: "검색" }).click();
  await page
    .getByRole("link", { name: "서울특별시 종로구 청운효자동" })
    .click();

  // 실제 날씨 API를 부르므로 응답을 넉넉히 기다린다.
  for (const label of ["오늘", "내일", "모레"]) {
    await expect(
      page.getByRole("heading", { level: 2, name: new RegExp(label) })
    ).toBeVisible({ timeout: 30_000 });
  }
});
