import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getSignedInUser,
  isSupabaseConfigured,
} from "@/features/account";
import { AuthForm } from "@/features/account/ui";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSignedInUser()) redirect("/settings");

  const { mode } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        러닝 타임 추천으로 돌아가기
      </Link>
      {isSupabaseConfigured() ? (
        <AuthForm mode={mode === "signup" ? "signup" : "signin"} />
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            Supabase 연결이 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 .env.local에 넣어 주세요.
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
