import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="러닝 기록을 불러오는 중"
    >
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}
