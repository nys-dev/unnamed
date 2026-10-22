import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RunForecast } from "../get-run-recommendation";
import type { Level } from "../recommend-day";
import { formatDate, formatHour, formatWindow } from "./format";

type Day = RunForecast["days"][number];

const LEVEL_BADGE = {
  좋음: "default",
  보통: "secondary",
  부적합: "destructive",
} as const satisfies Record<Level, string>;

function LevelBadge({ level }: { level: Level }) {
  return <Badge variant={LEVEL_BADGE[level]}>{level}</Badge>;
}

const dash = (value: number | undefined, unit: string) =>
  value === undefined ? "–" : `${value}${unit}`;

export function DayCard({ day }: { day: Day }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
            {day.label}
            <span className="text-sm font-normal text-muted-foreground">
              {formatDate(day.date)}
            </span>
          </h2>
        </CardTitle>
        {day.dust && (
          <CardDescription>미세먼지 {day.dust}</CardDescription>
        )}
        {day.missing.length > 0 && (
          <CardDescription>
            {day.missing.map((name) => `${name} 정보 없음`).join(", ")}, 나머지
            기준으로 판단
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {day.windows.length > 0 && (
          <section
            aria-label="추천 시간"
            className="flex flex-col gap-2"
          >
            {day.windows.map((window) => (
              <div
                key={window.startHour}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <LevelBadge level={window.level} />
                <span className="text-base font-medium tabular-nums">
                  {formatWindow(window.startHour, window.endHour)}
                </span>
                {window.cautions.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    감점 요소: {window.cautions.join(", ")}
                  </span>
                )}
              </div>
            ))}
          </section>
        )}

        {day.kind === "unfit" && day.fallback && (
          <>
            <Alert>
              <AlertTitle>추천 시간 없음</AlertTitle>
              <AlertDescription>
                이 날은 러닝 가능 시간대 전체가 적합하지 않습니다.
              </AlertDescription>
            </Alert>
            <section
              aria-label="참고용"
              className="flex flex-col gap-1 text-sm text-muted-foreground"
            >
              <p>그래도 뛴다면 가장 덜 나쁜 시간대입니다. 추천하지 않습니다.</p>
              <p className="tabular-nums">
                <span className="font-medium text-foreground">
                  {formatWindow(day.fallback.startHour, day.fallback.endHour)}
                </span>
                {" · "}부적합 요소: {day.fallback.reasons.join(", ")}
              </p>
            </section>
          </>
        )}

        {day.kind === "empty" && (
          <p className="text-sm text-muted-foreground">
            남은 러닝 시간이 없습니다.
          </p>
        )}

        {day.hours.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>판정</TableHead>
                <TableHead>기온</TableHead>
                <TableHead>풍속</TableHead>
                <TableHead>강수확률</TableHead>
                <TableHead>자외선</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {day.hours.map((hour) => (
                <TableRow key={hour.hour}>
                  <TableCell className="tabular-nums">
                    {formatHour(hour.hour)}
                  </TableCell>
                  <TableCell>
                    <LevelBadge level={hour.level} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dash(hour.temperature, "℃")}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dash(hour.windSpeed, "m/s")}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dash(hour.precipitationProbability, "%")}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dash(hour.uvIndex, "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
