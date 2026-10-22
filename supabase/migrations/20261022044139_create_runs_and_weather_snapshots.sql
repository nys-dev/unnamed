-- 러닝 기록. 기록에는 그 시간대의 날씨 값을 복사해 붙이므로 weather는 이후 저장 값이 지워져도 남는다.
create table public.runs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  run_date date not null,
  start_hour smallint not null,
  end_hour smallint not null,
  area_no text not null,
  region_name text not null,
  satisfied boolean not null,
  dissatisfaction text[] not null default '{}',
  weather jsonb,
  created_at timestamptz not null default now(),
  primary key (id),
  constraint runs_hours_valid check (
    start_hour between 0 and 23 and end_hour between 1 and 24 and end_hour > start_hour
  ),
  constraint runs_dissatisfaction_items check (
    dissatisfaction <@ array['바람', '비', '햇빛', '미세먼지', '더위', '추위', '기타']
  ),
  constraint runs_satisfied_has_no_items check (not satisfied or cardinality(dissatisfaction) = 0)
);

-- 히스토리는 본인 기록을 최신순으로 읽는다. RLS 조건(user_id)이 맨 앞에 온다.
create index runs_user_run_date_idx on public.runs (user_id, run_date desc, start_hour desc);

alter table public.runs enable row level security;

-- 기록은 남기고, 읽고, 지우기만 한다. 수정은 없다.
grant select, insert, delete on public.runs to authenticated;
grant select, insert, update, delete on public.runs to service_role;

create policy "runs_select_own" on public.runs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "runs_insert_own" on public.runs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "runs_delete_own" on public.runs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 사용자가 추천 화면을 열 때 저장해 두는 시간별 날씨 값. 지역, 날짜, 시간마다 가장 최근 값 하나.
create table public.weather_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_no text not null,
  snapshot_date date not null,
  hour smallint not null,
  temperature numeric,
  wind_speed numeric,
  precipitation_probability numeric,
  uv_index numeric,
  dust_grade text,
  updated_at timestamptz not null default now(),
  primary key (user_id, area_no, snapshot_date, hour),
  constraint weather_snapshots_hour_valid check (hour between 0 and 23),
  constraint weather_snapshots_dust_grade_valid check (
    dust_grade is null or dust_grade in ('좋음', '보통', '나쁨', '매우나쁨')
  )
);

alter table public.weather_snapshots enable row level security;

grant select, insert, update, delete on public.weather_snapshots to authenticated;
grant select, insert, update, delete on public.weather_snapshots to service_role;

create policy "weather_snapshots_select_own" on public.weather_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "weather_snapshots_insert_own" on public.weather_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "weather_snapshots_update_own" on public.weather_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "weather_snapshots_delete_own" on public.weather_snapshots for delete to authenticated
  using ((select auth.uid()) = user_id);
