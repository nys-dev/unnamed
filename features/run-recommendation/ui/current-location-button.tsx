"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type State =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "failed"; message: string };

/** 브라우저 위치 권한으로 현재 위치를 얻어 그 위치 기준 결과 화면으로 이동한다. */
export function CurrentLocationButton({
  searchInputId,
}: {
  /** 위치를 얻지 못할 때 포커스를 옮길 지역명 검색 입력의 id */
  searchInputId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "idle" });

  function fail(message: string) {
    setState({ status: "failed", message });
    document.getElementById(searchInputId)?.focus();
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      fail("이 브라우저에서는 현재 위치를 쓸 수 없습니다. 지역명으로 검색해 주세요.");
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        router.push(
          `/?lat=${coords.latitude.toFixed(5)}&lon=${coords.longitude.toFixed(5)}`,
        );
      },
      (error) =>
        fail(
          error.code === error.PERMISSION_DENIED
            ? "위치 권한이 거부되었습니다. 지역명으로 검색해 주세요."
            : "현재 위치를 확인하지 못했습니다. 지역명으로 검색해 주세요.",
        ),
      { timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={locate}
        disabled={state.status === "locating"}
      >
        {state.status === "locating" ? "위치 확인 중…" : "현재 위치로 보기"}
      </Button>
      {state.status === "failed" && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
