import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { Region } from "@/lib/regions";
import { CurrentLocationButton } from "./current-location-button";

const SEARCH_INPUT_ID = "region-query";

/** 지역명 검색과 현재 위치 버튼. 검색은 GET 폼이라 결과가 주소(?q=)에 남는다. */
export function LocationPicker({
  query,
  results,
}: {
  query?: string;
  /** 검색어가 있을 때의 검색 결과 */
  results?: Region[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <form action="/" method="get">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={SEARCH_INPUT_ID}>지역명으로 찾기</FieldLabel>
            <div className="flex gap-2">
              <Input
                key={query ?? ""}
                id={SEARCH_INPUT_ID}
                name="q"
                type="search"
                defaultValue={query}
                placeholder="예: 종로구 청운효자동, 잠실"
                autoComplete="off"
              />
              <Button type="submit">검색</Button>
            </div>
          </Field>
        </FieldGroup>
      </form>

      <CurrentLocationButton searchInputId={SEARCH_INPUT_ID} />

      {results && (
        <section aria-label="검색 결과" className="flex flex-col gap-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {`'${query}'에 맞는 지역이 없습니다. 다른 이름으로 검색해 보세요.`}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((region) => (
                <li key={region.areaNo}>
                  <Link
                    href={`/?region=${region.areaNo}`}
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
          )}
        </section>
      )}
    </div>
  );
}
