import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "./config";

/** 로그인이 있어야 열 수 있는 경로. 나머지 화면은 누구나 볼 수 있다. */
const PROTECTED_PATHS = ["/settings", "/runs"];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

/** 세션 쿠키를 갱신하고, 로그인하지 않은 사용자가 보호된 경로에 오면 /login으로 보낸다. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase 설정이 없으면 세션을 다룰 수 없다. 공개 화면은 그대로 열고 보호된 경로는 막는다.
  if (!isSupabaseConfigured()) {
    return isProtectedPath(request.nextUrl.pathname)
      ? redirectToLogin(request)
      : supabaseResponse;
  }

  // 요청마다 새 클라이언트를 만든다.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // createServerClient와 getClaims 사이에 다른 코드를 넣지 않는다.
  // getClaims를 빼면 사용자가 무작위로 로그아웃될 수 있다.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  if (!signedIn && isProtectedPath(request.nextUrl.pathname)) {
    return redirectToLogin(request);
  }

  // supabaseResponse를 그대로 돌려줘야 브라우저와 서버의 세션이 어긋나지 않는다.
  return supabaseResponse;
}
