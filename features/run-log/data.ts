import { createClient } from "@/lib/supabase/server";

import {
  pickWeatherForRun,
  retentionCutoff,
  type DustGrade,
  type RunWeatherHour,
  type SavedHour,
} from "./weather";
import type { DissatisfactionItem, ValidRun } from "./validate-run";

/** 추천 화면에서 저장하려고 넘겨받는 시간별 값 */
export type SnapshotInput = {
  date: string;
  hour: number;
  temperature?: number;
  windSpeed?: number;
  precipitationProbability?: number;
  uvIndex?: number;
  dust?: DustGrade;
};

export type RunRecord = {
  id: string;
  runDate: string;
  startHour: number;
  endHour: number;
  areaNo: string;
  regionName: string;
  satisfied: boolean;
  dissatisfaction: DissatisfactionItem[];
  /** 기록할 때 붙인 시간별 값. 없으면 빈 목록 */
  weather: RunWeatherHour[];
};

/** 서버에서 검증한 로그인 사용자의 id. RLS와 별개로 쓰기 전에 한 번 더 확인한다. */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("로그인이 필요합니다.");
  return { supabase, userId };
}

/** 본 시간별 값을 본인 데이터로 저장하고, 보관 기간이 지난 값을 지운다. today: YYYY-MM-DD */
export async function saveWeatherSnapshots(
  areaNo: string,
  rows: SnapshotInput[],
  today: string,
) {
  const { supabase, userId } = await requireUserId();

  if (rows.length > 0) {
    const { error } = await supabase.from("weather_snapshots").upsert(
      rows.map((row) => ({
        user_id: userId,
        area_no: areaNo,
        snapshot_date: row.date,
        hour: row.hour,
        temperature: row.temperature ?? null,
        wind_speed: row.windSpeed ?? null,
        precipitation_probability: row.precipitationProbability ?? null,
        uv_index: row.uvIndex ?? null,
        dust_grade: row.dust ?? null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,area_no,snapshot_date,hour" },
    );
    if (error) throw error;
  }

  const { error } = await supabase
    .from("weather_snapshots")
    .delete()
    .lt("snapshot_date", retentionCutoff(today));
  if (error) throw error;
}

/** 가장 최근에 추천을 본 지역. 없으면 undefined */
export async function lastViewedAreaNo() {
  const { supabase } = await requireUserId();
  const { data } = await supabase
    .from("weather_snapshots")
    .select("area_no")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.area_no as string | undefined;
}

/** 기록을 남긴다. 기록한 지역과 날짜에 저장된 값이 있으면 그 시간대의 값을 붙인다. */
export async function createRun(run: ValidRun, regionName: string) {
  const { supabase, userId } = await requireUserId();

  const { data: saved, error: readError } = await supabase
    .from("weather_snapshots")
    .select(
      "snapshot_date, hour, temperature, wind_speed, precipitation_probability, uv_index, dust_grade",
    )
    .eq("area_no", run.areaNo)
    .eq("snapshot_date", run.runDate)
    .gte("hour", run.startHour)
    .lt("hour", run.endHour);
  if (readError) throw readError;

  const savedHours: SavedHour[] = (saved ?? []).map((row) => ({
    date: row.snapshot_date,
    hour: row.hour,
    temperature: row.temperature ?? undefined,
    windSpeed: row.wind_speed ?? undefined,
    precipitationProbability: row.precipitation_probability ?? undefined,
    uvIndex: row.uv_index ?? undefined,
    dust: (row.dust_grade as DustGrade | null) ?? undefined,
  }));
  const weather = pickWeatherForRun(savedHours, run);

  const { error } = await supabase.from("runs").insert({
    user_id: userId,
    run_date: run.runDate,
    start_hour: run.startHour,
    end_hour: run.endHour,
    area_no: run.areaNo,
    region_name: regionName,
    satisfied: run.satisfied,
    dissatisfaction: run.dissatisfaction,
    weather: weather.length > 0 ? weather : null,
  });
  if (error) throw error;
}

/** 본인 기록을 최신순으로. RLS가 본인 행만 돌려준다. */
export async function listRuns(): Promise<RunRecord[]> {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase
    .from("runs")
    .select(
      "id, run_date, start_hour, end_hour, area_no, region_name, satisfied, dissatisfaction, weather",
    )
    .order("run_date", { ascending: false })
    .order("start_hour", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    runDate: row.run_date,
    startHour: row.start_hour,
    endHour: row.end_hour,
    areaNo: row.area_no,
    regionName: row.region_name,
    satisfied: row.satisfied,
    dissatisfaction: row.dissatisfaction as DissatisfactionItem[],
    weather: (row.weather as RunWeatherHour[] | null) ?? [],
  }));
}

export async function deleteRun(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("runs").delete().eq("id", id);
  if (error) throw error;
}
