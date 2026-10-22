import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnProfile, getSignedInUser, signOut } from "@/features/account";
import { SettingsForm } from "@/features/account/ui";

export default async function SettingsPage() {
  // proxy가 한 번 막지만, 권한 판단은 서버에서 검증한 사용자로 다시 한다.
  const user = await getSignedInUser();
  if (!user) redirect("/login");

  const profile = await getOwnProfile();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        러닝 타임 추천으로 돌아가기
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-lg font-semibold">설정</h1>
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SettingsForm displayName={profile?.display_name ?? ""} />
          <form action={signOut}>
            <Button type="submit" variant="outline">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
