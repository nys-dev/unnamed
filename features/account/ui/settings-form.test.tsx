import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { SettingsForm } from "./settings-form";

afterEach(() => vi.restoreAllMocks());

test("저장 뒤 서버가 새 표시 이름을 내려 주면 입력에 새 값이 보이고 경고가 없다", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});

  const { rerender } = render(<SettingsForm displayName="러너 A" />);
  expect(screen.getByLabelText("표시 이름")).toHaveValue("러너 A");

  rerender(<SettingsForm displayName="러너 B" />);

  expect(screen.getByLabelText("표시 이름")).toHaveValue("러너 B");
  expect(errors).not.toHaveBeenCalled();
});
