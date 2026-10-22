import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Region } from "@/lib/regions";

/** 기록할 지역을 고른다. 검색은 GET 폼이고 고른 지역은 ?region= 으로 주소에 남는다. */
export function RegionSearch({
  query,
  results,
}: {
  query?: string;
  results?: Region[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <form action="/runs" method="get">
        <Field>
          <FieldLabel htmlFor="run-region-query">기록할 지역 찾기</FieldLabel>
          <div className="flex gap-2">
            <Input
              key={query ?? ""}
              id="run-region-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="예: 종로구 청운효자동"
              autoComplete="off"
            />
            <Button type="submit" variant="outline">
              검색
            </Button>
          </div>
        </Field>
      </form>
      {results &&
        (results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {`'${query}'에 맞는 지역이 없습니다.`}
          </p>
        ) : (
          <ul aria-label="검색 결과" className="flex flex-col gap-1">
            {results.map((region) => (
              <li key={region.areaNo}>
                <Link
                  href={`/runs?region=${region.areaNo}`}
                  className={buttonVariants({
                    variant: "ghost",
                    className: "w-full justify-start",
                  })}
                >
                  {region.name}
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
