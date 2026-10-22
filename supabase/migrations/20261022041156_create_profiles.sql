-- 프로필: Auth 사용자 한 명당 한 행. 표시 이름만 가진다.
create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  primary key (id),
  constraint profiles_display_name_length check (char_length(display_name) <= 50)
);

alter table public.profiles enable row level security;

-- Data API로 새 테이블이 자동 노출되지 않으므로 필요한 권한만 명시한다.
-- 로그인한 사용자는 읽고, 표시 이름만 고칠 수 있다. 행 생성과 삭제는 트리거와 cascade가 맡는다.
grant select, update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 새 Auth 사용자가 만들어질 때 프로필 행을 만든다.
-- security definer라 RLS를 우회하므로 search_path를 비우고, API로 직접 호출하지 못하게 막는다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
