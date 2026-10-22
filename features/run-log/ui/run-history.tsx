import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { deleteRunAction } from "../actions";
import type { RunRecord } from "../data";
import { summarizeWeather } from "../weather";
import { formatRunDate, formatRunTime, formatSummary } from "./format";

export function RunHistory({ runs }: { runs: RunRecord[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">아직 남긴 기록이 없습니다.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {runs.map((run) => (
        <li key={run.id}>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{formatRunDate(run.runDate)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatRunTime(run.startHour, run.endHour)}
                  </span>
                  <Badge variant={run.satisfied ? "default" : "destructive"}>
                    {run.satisfied ? "만족" : "불만족"}
                  </Badge>
                </span>
              </CardTitle>
              <CardDescription>{run.regionName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {run.dissatisfaction.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {run.dissatisfaction.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {formatSummary(summarizeWeather(run.weather)).join(" · ")}
              </p>
              <form action={deleteRunAction}>
                <input type="hidden" name="id" value={run.id} />
                <Button type="submit" variant="outline" size="sm">
                  지우기
                </Button>
              </form>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
