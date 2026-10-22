"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <Alert variant="destructive">
        <AlertTitle>러닝 기록을 불러오지 못했습니다</AlertTitle>
        <AlertDescription>잠시 뒤에 다시 시도해 주세요.</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={reset} className="self-start">
        다시 시도
      </Button>
    </main>
  );
}
