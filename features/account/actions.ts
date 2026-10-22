"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 6;
const MAX_DISPLAY_NAME_LENGTH = 50;

const text = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

/** Supabase Auth의 영어 오류를 사용자에게 보여 줄 문장으로 바꾼다. */
function authErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 맞지 않습니다.";
    case "user_already_exists":
    case "email_exists":
      return "이미 가입한 이메일입니다. 로그인해 주세요.";
    case "weak_password":
      return `비밀번호가 너무 약합니다. ${MIN_PASSWORD_LENGTH}자 이상으로 더 복잡하게 만들어 주세요.`;
    case "email_provider_disabled":
    case "signup_disabled":
      return "이 프로젝트에서는 이메일 가입이 꺼져 있습니다. Supabase의 Email provider 설정을 확인해 주세요.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "요청이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.";
    default:
      return "처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.";
  }
}

type Credentials =
  | { ok: true; email: string; password: string }
  | { ok: false; state: FormState };

function credentials(formData: FormData): Credentials {
  const email = text(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email) return { ok: false, state: { error: "이메일을 입력해 주세요." } };
  if (password.length < MIN_PASSWORD_LENGTH)
    return {
      ok: false,
      state: { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` },
    };
  return { ok: true, email, password };
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
  });
  if (error) return { error: authErrorMessage(error) };

  // 이메일 확인이 켜져 있으면 세션이 아직 없다.
  if (!data.session)
    return { message: "가입했습니다. 이메일로 보낸 확인 링크를 누른 뒤 로그인해 주세요." };

  redirect("/settings");
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials(formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });
  if (error) return { error: authErrorMessage(error) };

  redirect("/settings");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateDisplayName(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = text(formData, "displayName");
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH)
    return { error: `표시 이름은 ${MAX_DISPLAY_NAME_LENGTH}자 이하여야 합니다.` };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  // RLS가 본인 행만 고칠 수 있게 한다. 고친 행이 없으면 실패로 본다.
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", claims.claims.sub)
    .select("id");
  if (error || !data?.length) return { error: "저장하지 못했습니다. 잠시 뒤에 다시 시도해 주세요." };

  revalidatePath("/settings");
  return { message: "저장했습니다." };
}
