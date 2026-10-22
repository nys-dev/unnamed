import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSignedInUser } from "@/features/account";
import {
  earliestRunDate,
  lastViewedAreaNo,
  listRuns,
} from "@/features/run-log";
import { RegionSearch, RunForm, RunHistory } from "@/features/run-log/ui";
import { kstToday } from "@/lib/kst";
import { findRegion, searchRegions } from "@/lib/regions";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function RunsPage({ searchParams }: PageProps<"/runs">) {
  // proxy가 한 번 막지만, 권한 판단은 서버에서 검증한 사용자로 다시 한다.
  if (!(await getSignedInUser())) redirect("/login");

  const params = await searchParams;
  const query = first(params.q)?.trim();
  const today = kstToday();

  // 지역은 직접 고른 곳, 없으면 가장 최근에 추천을 본 곳이다.
  const areaNo = first(params.region) ?? (await lastViewedAreaNo());
  const region = areaNo ? findRegion(areaNo) : undefined;
  const runs = await listRuns();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        러닝 타임 추천으로 돌아가기
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        러닝 기록
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">기록 남기기</h2>
          </CardTitle>
          <CardDescription>
            추천 화면을 열어 둔 시간대의 날씨 값이 기록에 함께 붙습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <RegionSearch
            query={query}
            results={query ? searchRegions(query) : undefined}
          />
          <RunForm
            key={region?.areaNo ?? "none"}
            areaNo={region?.areaNo}
            regionName={region?.name}
            today={today}
            earliestDate={earliestRunDate(today)}
          />
        </CardContent>
      </Card>

      <section aria-label="지난 기록" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">지난 기록</h2>
        <RunHistory runs={runs} />
      </section>
    </main>
  );
}
