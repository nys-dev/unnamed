import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export { signOut } from "./actions";
export { isSupabaseConfigured };

/** 서버에서 검증한 로그인 사용자. 로그인하지 않았거나 Supabase를 쓸 수 없으면 null. */
export async function getSignedInUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    return claims ? { id: claims.sub, email: claims.email } : null;
  } catch {
    return null;
  }
}

/** 로그인한 사용자 본인의 프로필. RLS가 본인 행만 돌려준다. */
export async function getOwnProfile() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .maybeSingle();
  return data;
}
