"use server";

import { revalidatePath } from "next/cache";

import { kstToday } from "@/lib/kst";
import { findRegion } from "@/lib/regions";

import { createRun, deleteRun } from "./data";
import { validateRun } from "./validate-run";

export type RunFormState = { error?: string; saved?: boolean };

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

export async function createRunAction(
  _: RunFormState,
  formData: FormData,
): Promise<RunFormState> {
  const satisfiedText = field(formData, "satisfied");
  const result = validateRun(
    {
      runDate: field(formData, "runDate"),
      startHour: Number(field(formData, "startHour")),
      endHour: Number(field(formData, "endHour")),
      areaNo: field(formData, "areaNo"),
      satisfied:
        satisfiedText === "yes" ? true : satisfiedText === "no" ? false : undefined,
      dissatisfaction: formData.getAll("dissatisfaction").map(String),
    },
    kstToday(),
  );
  if (!result.ok) return { error: result.error };

  const region = findRegion(result.value.areaNo);
  if (!region) return { error: "알 수 없는 지역입니다. 지역을 다시 골라 주세요." };

  try {
    await createRun(result.value, region.name);
  } catch {
    return { error: "기록하지 못했습니다. 잠시 뒤에 다시 시도해 주세요." };
  }

  revalidatePath("/runs");
  return { saved: true };
}

export async function deleteRunAction(formData: FormData) {
  const id = field(formData, "id");
  if (!id) return;
  try {
    await deleteRun(id);
  } catch {
    // 지우지 못하면 목록이 그대로 남아 사용자가 다시 시도할 수 있다.
  }
  revalidatePath("/runs");
}
