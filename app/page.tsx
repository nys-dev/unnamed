import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ForecastUnavailableError,
  dataGoKrSources,
  getRunRecommendation,
} from "@/features/run-recommendation";
import { getSignedInUser } from "@/features/account";
import { saveWeatherSnapshots } from "@/features/run-log";
import { kstNow, kstToday } from "@/lib/kst";
import {
  findRegion,
  nearestRegion,
  searchRegions,
  type Region,
} from "@/lib/regions";
import { DayCard, LocationPicker } from "@/features/run-recommendation/ui";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function resolveRegion(params: SearchParams): Region | undefined {
  const code = first(params.region);
  if (code) return findRegion(code);

  const lat = first(params.lat);
  const lon = first(params.lon);
  if (lat && lon && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)))
    return nearestRegion(Number(lat), Number(lon));
}

async function Forecast({
  region,
  href,
  signedIn,
}: {
  region: Region;
  href: string;
  signedIn: boolean;
}) {
  let forecast;
  try {
    forecast = await getRunRecommendation(region, kstNow(), dataGoKrSources);
  } catch (error) {
    if (!(error instanceof ForecastUnavailableError)) throw error;
    return (
      <Alert variant="destructive">
        <AlertTitle>기상청 예보를 받지 못했습니다</AlertTitle>
        <AlertDescription>
          <p>
            예보가 없으면 러닝 시간대를 판단할 수 없습니다. 잠시 뒤에 다시
            시도해 주세요.
          </p>
          <a
            href={href}
            className={buttonVariants({ variant: "outline", className: "mt-2" })}
          >
            다시 시도
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  // 로그인한 사용자가 본 값은 이후 기록에 붙일 수 있도록 저장해 둔다. 실패해도 화면은 그대로 보여 준다.
  if (signedIn) {
    try {
      await saveWeatherSnapshots(region.areaNo, forecast.snapshot, kstToday());
    } catch (error) {
      console.error("날씨 값을 저장하지 못했습니다.", error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {forecast.notices.map((notice) => (
        <Alert key={notice}>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ))}
      {forecast.days.map((day) => (
        <DayCard key={day.date} day={day} />
      ))}
    </div>
  );
}

function ForecastSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="예보를 불러오는 중"
    >
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const user = await getSignedInUser();
  const region = resolveRegion(params);
  const query = first(params.q)?.trim();
  const fromCurrentLocation = Boolean(first(params.lat));
  const regionNotFound = Boolean(first(params.region)) && !region;
  const retryHref = region
    ? fromCurrentLocation
      ? `/?lat=${first(params.lat)}&lon=${first(params.lon)}`
      : `/?region=${region.areaNo}`
    : "/";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            러닝 타임 추천
          </h1>
          <p className="text-sm text-muted-foreground">
            오늘부터 모레까지, 날씨가 러닝에 적합한 시간대를 알려 드립니다.
          </p>
        </div>
        <nav className="flex shrink-0 gap-4 text-sm text-muted-foreground">
          {user && (
            <Link href="/runs" className="underline underline-offset-4">
              기록
            </Link>
          )}
          <Link
            href={user ? "/settings" : "/login"}
            className="underline underline-offset-4"
          >
            {user ? "설정" : "로그인"}
          </Link>
        </nav>
      </header>

      <LocationPicker
        query={query}
        results={query ? searchRegions(query) : undefined}
      />

      {regionNotFound && (
        <Alert variant="destructive">
          <AlertDescription>
            알 수 없는 지역입니다. 지역명으로 다시 검색해 주세요.
          </AlertDescription>
        </Alert>
      )}

      {region && (
        <section className="flex flex-col gap-4" aria-label="러닝 추천">
          <h2 className="text-base font-medium">
            {fromCurrentLocation ? "현재 위치 근처" : "선택한 지역"}:{" "}
            <span className="font-semibold">{region.name}</span>
          </h2>
          <Suspense key={retryHref} fallback={<ForecastSkeleton />}>
            <Forecast region={region} href={retryHref} signedIn={Boolean(user)} />
          </Suspense>
        </section>
      )}
    </main>
  );
}
