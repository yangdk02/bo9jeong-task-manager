create table if not exists public.people (
  person_id text primary key,
  name text not null,
  department text not null
);

create table if not exists public.projects (
  project_id text primary key,
  vendor_name text not null,
  project_name text not null,
  management_category text not null default '',
  start_date text not null,
  end_date text not null,
  status text not null check (status in ('planned', 'active', 'completed')),
  created_by text not null,
  created_at text not null
);

create table if not exists public.project_assignees (
  project_assignee_id text primary key,
  project_id text not null,
  person_id text not null,
  unique (project_id, person_id)
);

create table if not exists public.tasks (
  task_id text primary key,
  project_id text not null,
  target_scope text not null check (target_scope in ('SNS', '블로그', '디자인', '촬영', '영상', '네이버 플레이스', '광고', '기타')),
  task_name text not null,
  cycle text not null check (cycle in ('monthly', 'once')),
  target_count integer not null check (target_count >= 0),
  target_unit text not null check (target_unit in ('건', '장', '곳', '회', '기타')),
  status text not null check (status in ('planned', 'active', 'completed')),
  created_by text not null,
  created_at text not null
);

create table if not exists public.task_assignees (
  task_assignee_id text primary key,
  task_id text not null,
  person_id text not null,
  unique (task_id, person_id)
);

create table if not exists public.works (
  work_id text primary key,
  task_id text not null,
  work_date text not null,
  title text not null,
  result_url text not null default '',
  memo text not null default '',
  status text not null check (status in ('draft', 'completed')),
  created_by text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists public.work_assignees (
  work_assignee_id text primary key,
  work_id text not null,
  person_id text not null,
  unique (work_id, person_id)
);

create table if not exists public.work_files (
  work_file_id text primary key,
  work_id text not null,
  file_path text not null,
  file_name text not null,
  uploaded_by text not null,
  uploaded_at text not null
);

create table if not exists public.assets (
  asset_id text primary key,
  project_id text not null,
  asset_name text not null,
  asset_category text not null check (asset_category in ('로고', '로고 배치 가이드', '브랜드 가이드', '패키지 시안', '카드뉴스', '배너', '썸네일', '상세페이지', '사진 원본', '영상 원본', '보고서', '기타')),
  version text not null,
  file_path text not null,
  file_name text not null,
  status text not null check (status in ('planned', 'active', 'completed')),
  note text not null default '',
  owner_person_id text not null default '',
  uploaded_by text not null,
  uploaded_at text not null
);

create table if not exists public.comments (
  comment_id text primary key,
  target_type text not null check (target_type in ('work', 'asset')),
  target_id text not null,
  author_person_id text not null default '',
  comment_type text not null check (comment_type in ('assignee', 'system')),
  body text not null,
  created_at text not null
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists works_task_id_idx on public.works (task_id);
create index if not exists assets_project_id_idx on public.assets (project_id);
create index if not exists comments_target_idx on public.comments (target_type, target_id);

alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.works enable row level security;
alter table public.work_assignees enable row level security;
alter table public.work_files enable row level security;
alter table public.assets enable row level security;
alter table public.comments enable row level security;

revoke all on table public.people, public.projects, public.project_assignees, public.tasks,
  public.task_assignees, public.works, public.work_assignees, public.work_files,
  public.assets, public.comments from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('bo9jeong-files', 'bo9jeong-files', false)
on conflict (id) do update set public = excluded.public;

grant usage on schema storage to anon;
grant select, insert, update, delete on table storage.objects to anon;

drop policy if exists "bo9jeong anon storage access" on storage.objects;
create policy "bo9jeong anon storage access"
on storage.objects
for all
to anon
using (bucket_id = 'bo9jeong-files')
with check (bucket_id = 'bo9jeong-files');

