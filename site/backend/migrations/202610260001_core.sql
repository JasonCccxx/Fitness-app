-- JY FITNESS ATLAS: production schema and authorization. Apply once as project owner.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=100),
  avatar_url text not null default '' check (length(avatar_url)<=2000),
  timezone text not null default 'Asia/Tokyo' check (length(timezone)<=100),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin'))
);
create table public.contents (
  id text primary key check (length(id) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  content_type text not null check (content_type in ('exercise','guide','workout-template')),
  title text not null check (length(title) between 1 and 150),
  english_title text not null default '' check (length(english_title)<=150),
  summary text not null default '' check (length(summary)<=2000),
  aliases text[] not null default '{}',
  publication_status text not null default 'draft' check (publication_status in ('draft','published','archived')),
  review_status text not null default 'needs-review' check (review_status in ('prototype','needs-review','reviewed')),
  theme_links jsonb not null default '[]' check (jsonb_typeof(theme_links)='array'),
  discipline_ids text[] not null default '{}', equipment_ids text[] not null default '{}',
  primary_muscle_ids text[] not null default '{}', secondary_muscle_ids text[] not null default '{}',
  details jsonb not null default '{}' check (jsonb_typeof(details)='object' and pg_column_size(details)<=100000),
  display_order integer not null default 100, revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.media_assets (
  id text primary key, content_id text not null references public.contents(id) on delete cascade,
  kind text not null check (kind in ('model','gif','image','video')),
  bucket_id text not null default 'exercise-media' check (bucket_id='exercise-media'),
  object_path text not null unique check (length(object_path) between 1 and 500 and object_path !~ '(^|/)\.\.(/|$)' and left(object_path,1)<>'/'),
  mime_type text not null, byte_size bigint not null check (byte_size between 1 and 20971520),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  attribution jsonb not null default '{}', created_at timestamptz not null default now(),
  unique(content_id,kind)
);
create table public.plans (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 120), notes text not null default '' check(length(notes)<=4000),
  revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index plans_owner_updated on public.plans(owner_id,updated_at desc);
create table public.plan_days (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.plans(id) on delete cascade,
  title text not null check(length(title) between 1 and 100), day_order integer not null check(day_order>=0),
  unique(plan_id,day_order)
);
create table public.plan_items (
  id uuid primary key default gen_random_uuid(), day_id uuid not null references public.plan_days(id) on delete cascade,
  content_id text not null references public.contents(id) on delete restrict,
  snapshot_title text not null, item_order integer not null check(item_order>=0),
  prescription jsonb not null default '{}' check(jsonb_typeof(prescription)='object' and pg_column_size(prescription)<=4000),
  unique(day_id,item_order)
);
create index plan_days_plan on public.plan_days(plan_id);
create index plan_items_day on public.plan_items(day_id);
create index media_content on public.media_assets(content_id);
create table private.audit_events (
  id bigint generated always as identity primary key, actor_id uuid, action text not null,
  object_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table private.activity_events (
  id bigint generated always as identity primary key, user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null, path text not null, content_id text, created_at timestamptz not null default now()
);
create index activity_user_time on private.activity_events(user_id,created_at desc);

create function public.is_active_user() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active')
$$;
create function public.is_content_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.user_roles r join public.profiles p on p.id=r.user_id where r.user_id=auth.uid() and r.role='admin' and p.account_status='active')
$$;
create function private.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name,avatar_url) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),100),left(coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture',''),2000));
  insert into private.user_roles(user_id,role) values(new.id,'member');
  return new;
end $$;
create trigger atlas_auth_user_created after insert on auth.users for each row execute function private.on_auth_user_created();
-- Existing managed-auth users are imported without trusting their profile role metadata.
insert into public.profiles(id,display_name,avatar_url)
select id,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),100),left(coalesce(raw_user_meta_data->>'avatar_url',raw_user_meta_data->>'picture',''),2000) from auth.users on conflict(id) do nothing;
insert into private.user_roles(user_id) select id from auth.users on conflict(user_id) do nothing;

create function private.touch_row() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger profile_touch before update on public.profiles for each row execute function private.touch_row();
create trigger plan_touch before update on public.plans for each row execute function private.touch_row();

create function private.content_guard_and_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.publication_status='published' and new.content_type='exercise' and not exists(select 1 from public.media_assets m join storage.objects o on o.bucket_id=m.bucket_id and o.name=m.object_path where m.content_id=new.id and m.kind in ('model','gif','video')) then
    raise exception 'Exercise requires an uploaded demonstration before publishing' using errcode='23514';
  end if;
  if tg_op='UPDATE' then new.revision=old.revision+1; end if;
  new.updated_at=now();
  insert into private.audit_events(actor_id,action,object_id,metadata) values(auth.uid(),'content_'||lower(tg_op),new.id,jsonb_build_object('status',new.publication_status,'revision',new.revision));
  return new;
end $$;
create trigger content_guard before insert or update on public.contents for each row execute function private.content_guard_and_audit();

alter table public.profiles enable row level security;
alter table public.contents enable row level security;
alter table public.media_assets enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_items enable row level security;
revoke all on public.profiles,public.contents,public.media_assets,public.plans,public.plan_days,public.plan_items from public,anon,authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant select on public.contents,public.media_assets to anon,authenticated;
grant select,insert,update,delete on public.contents,public.media_assets to authenticated;
grant select on public.profiles,public.plans,public.plan_days,public.plan_items to authenticated;
grant update(display_name,avatar_url,timezone) on public.profiles to authenticated;
grant delete on public.plans to authenticated;
grant all on public.profiles,public.contents,public.media_assets,public.plans,public.plan_days,public.plan_items to service_role;
create policy profiles_self_select on public.profiles for select to authenticated using(id=auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid() and public.is_active_user()) with check(id=auth.uid() and public.is_active_user());
create policy content_read on public.contents for select to anon,authenticated using(publication_status='published' or public.is_content_admin());
create policy content_insert on public.contents for insert to authenticated with check(public.is_content_admin());
create policy content_update on public.contents for update to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
-- Archive contents instead of deleting rows referenced by user plans.
create policy media_read on public.media_assets for select to anon,authenticated using(public.is_content_admin() or exists(select 1 from public.contents c where c.id=content_id and c.publication_status='published'));
create policy media_insert on public.media_assets for insert to authenticated with check(public.is_content_admin());
create policy media_update on public.media_assets for update to authenticated using(public.is_content_admin()) with check(public.is_content_admin());
create policy media_delete on public.media_assets for delete to authenticated using(public.is_content_admin());
create policy plans_self_read on public.plans for select to authenticated using(owner_id=auth.uid() and public.is_active_user());
create policy plans_self_delete on public.plans for delete to authenticated using(owner_id=auth.uid() and public.is_active_user());
create policy days_self_read on public.plan_days for select to authenticated using(exists(select 1 from public.plans p where p.id=plan_id and p.owner_id=auth.uid() and public.is_active_user()));
create policy items_self_read on public.plan_items for select to authenticated using(exists(select 1 from public.plan_days d join public.plans p on p.id=d.plan_id where d.id=day_id and p.owner_id=auth.uid() and public.is_active_user()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('exercise-media','exercise-media',false,20971520,array['model/gltf-binary','application/octet-stream','image/gif','image/png','image/jpeg','image/webp','video/mp4','video/webm']) on conflict(id) do nothing;
create policy atlas_media_download on storage.objects for select to anon,authenticated using(bucket_id='exercise-media' and (public.is_content_admin() or exists(select 1 from public.media_assets m join public.contents c on c.id=m.content_id where m.bucket_id=storage.objects.bucket_id and m.object_path=storage.objects.name and c.publication_status='published')));
create policy atlas_media_upload on storage.objects for insert to authenticated with check(bucket_id='exercise-media' and public.is_content_admin());
create policy atlas_media_update on storage.objects for update to authenticated using(bucket_id='exercise-media' and public.is_content_admin()) with check(bucket_id='exercise-media' and public.is_content_admin());
create policy atlas_media_delete on storage.objects for delete to authenticated using(bucket_id='exercise-media' and public.is_content_admin());

create function public.get_my_access() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('role',r.role,'account_status',p.account_status) from public.profiles p join private.user_roles r on r.user_id=p.id where p.id=auth.uid()
$$;
create function public.bootstrap_initial_admin(target_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  if exists(select 1 from private.user_roles where role='admin') then raise exception 'An administrator already exists' using errcode='23514'; end if;
  if not exists(select 1 from public.profiles where id=target_user_id and account_status='active') then raise exception 'User must sign in first' using errcode='23514'; end if;
  update private.user_roles set role='admin' where user_id=target_user_id;
  insert into private.audit_events(action,object_id) values('initial_admin',target_user_id::text);
end $$;
create function public.admin_list_users() returns table(id uuid,email text,display_name text,role text,account_status text,created_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  return query select p.id,u.email::text,p.display_name,r.role,p.account_status,p.created_at from public.profiles p join auth.users u on u.id=p.id join private.user_roles r on r.user_id=p.id order by p.created_at desc limit 500;
end $$;
create function public.admin_set_role(target_user_id uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if new_role not in ('member','admin') then raise exception 'Invalid role' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(90426001);
  if new_role='member' and exists(select 1 from private.user_roles where user_id=target_user_id and role='admin') and (select count(*) from private.user_roles r join public.profiles p on p.id=r.user_id where r.role='admin' and p.account_status='active')<=1 then raise exception 'Cannot remove the last active administrator' using errcode='23514'; end if;
  update private.user_roles set role=new_role where user_id=target_user_id;
  if not found then raise exception 'Unknown user' using errcode='22023'; end if;
  insert into private.audit_events(actor_id,action,object_id,metadata) values(auth.uid(),'set_role',target_user_id::text,jsonb_build_object('role',new_role));
end $$;
create function public.admin_set_account_status(target_user_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  if new_status not in ('active','suspended') then raise exception 'Invalid account state' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(90426001);
  if new_status='suspended' and exists(select 1 from private.user_roles where user_id=target_user_id and role='admin') and (select count(*) from private.user_roles r join public.profiles p on p.id=r.user_id where r.role='admin' and p.account_status='active')<=1 then raise exception 'Cannot suspend the last active administrator' using errcode='23514'; end if;
  update public.profiles set account_status=new_status where id=target_user_id;
  if not found then raise exception 'Unknown user' using errcode='22023'; end if;
  insert into private.audit_events(actor_id,action,object_id,metadata) values(auth.uid(),'set_account_status',target_user_id::text,jsonb_build_object('status',new_status));
end $$;

create function public.save_plan(p_plan_id uuid,p_expected_revision integer,p_title text,p_notes text,p_days jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  saved public.plans; day jsonb; item jsonb; day_id uuid; day_index integer:=0; item_index integer;
  snapshots jsonb:='{}'; item_title text; entry record; total_items integer:=0;
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode='42501'; end if;
  if p_title is null or p_days is null or length(trim(p_title)) not between 1 and 120 or length(coalesce(p_notes,''))>4000 or jsonb_typeof(p_days)<>'array' or jsonb_array_length(p_days) not between 1 and 14 then raise exception 'Invalid plan' using errcode='22023'; end if;
  if p_plan_id is null then
    insert into public.plans(owner_id,title,notes) values(auth.uid(),trim(p_title),coalesce(p_notes,'')) returning * into saved;
  else
    select * into saved from public.plans where id=p_plan_id and owner_id=auth.uid() for update;
    if not found then raise exception 'Plan unavailable' using errcode='42501'; end if;
    if p_expected_revision is distinct from saved.revision then raise exception 'Plan changed in another session; reload before saving' using errcode='40001'; end if;
    select coalesce(jsonb_object_agg(i.content_id,i.snapshot_title),'{}') into snapshots from public.plan_items i join public.plan_days d on d.id=i.day_id where d.plan_id=p_plan_id;
    update public.plans set title=trim(p_title),notes=coalesce(p_notes,''),revision=revision+1 where id=p_plan_id returning * into saved;
    delete from public.plan_days where plan_id=p_plan_id;
  end if;
  for day in select value from jsonb_array_elements(p_days) loop
    if length(trim(coalesce(day->>'title',''))) not between 1 and 100 or jsonb_typeof(day->'items')<>'array' or jsonb_array_length(day->'items')>100 then raise exception 'Invalid training day' using errcode='22023'; end if;
    insert into public.plan_days(plan_id,title,day_order) values(saved.id,trim(day->>'title'),day_index) returning id into day_id;
    item_index:=0;
    for item in select value from jsonb_array_elements(day->'items') loop
      total_items:=total_items+1;
      if total_items>200 or jsonb_typeof(coalesce(item->'prescription','{}'))<>'object' or pg_column_size(item->'prescription')>4000 then raise exception 'Invalid plan items' using errcode='22023'; end if;
      for entry in select * from jsonb_each(coalesce(item->'prescription','{}')) loop
        if entry.key not in ('sets','reps','load_kg','duration_seconds','distance_m','rest_seconds','notes') then raise exception 'Unknown training parameter' using errcode='22023'; end if;
        if entry.key='notes' then
          if jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>1000 then raise exception 'Invalid item notes' using errcode='22023'; end if;
        else
          if jsonb_typeof(entry.value)<>'number' or (entry.value#>>'{}')::numeric<0 or (entry.value#>>'{}')::numeric>1000000 then raise exception 'Invalid numeric parameter' using errcode='22023'; end if;
          if entry.key in ('sets','reps') and ((entry.value#>>'{}')::numeric<1 or (entry.value#>>'{}')::numeric<>floor((entry.value#>>'{}')::numeric)) then raise exception 'Sets and reps must be positive integers' using errcode='22023'; end if;
        end if;
      end loop;
      select title into item_title from public.contents where id=item->>'content_id' and content_type='exercise' and publication_status='published';
      if not found then item_title:=snapshots->>(item->>'content_id'); end if;
      if item_title is null then raise exception 'Exercise is not published' using errcode='22023'; end if;
      insert into public.plan_items(day_id,content_id,snapshot_title,item_order,prescription) values(day_id,item->>'content_id',item_title,item_index,coalesce(item->'prescription','{}'));
      item_index:=item_index+1;
    end loop;
    day_index:=day_index+1;
  end loop;
  return to_jsonb(saved);
end $$;

create function public.record_activity(p_event_type text,p_path text,p_content_id text default null) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_active_user() then raise exception 'Active account required' using errcode='42501'; end if;
  if p_event_type not in ('page_view','content_view','login','plan_saved') or left(p_path,1)<>'/' or left(p_path,2)='//' or length(p_path)>200 or p_path like '%?%' then raise exception 'Invalid event' using errcode='22023'; end if;
  if (select count(*) from private.activity_events where user_id=auth.uid() and created_at>now()-interval '1 minute')>=60 then return; end if;
  insert into private.activity_events(user_id,event_type,path,content_id) values(auth.uid(),p_event_type,p_path,p_content_id);
end $$;
create function public.admin_activity() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  select jsonb_build_object(
    'recent',coalesce((select jsonb_agg(to_jsonb(e)) from (select a.event_type,a.path,a.content_id,a.created_at,p.display_name from private.activity_events a join public.profiles p on p.id=a.user_id order by a.created_at desc limit 100)e),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(to_jsonb(e)) from (select action,object_id,metadata,created_at from private.audit_events order by created_at desc limit 100)e),'[]'::jsonb),
    'last_30_days',(select count(*) from private.activity_events where created_at>now()-interval '30 days')
  ) into result;
  return result;
end $$;

revoke all on function public.is_active_user(),public.is_content_admin(),public.get_my_access(),public.bootstrap_initial_admin(uuid),public.admin_list_users(),public.admin_set_role(uuid,text),public.admin_set_account_status(uuid,text),public.save_plan(uuid,integer,text,text,jsonb),public.record_activity(text,text,text),public.admin_activity() from public,anon,authenticated;
grant execute on function public.is_active_user(),public.is_content_admin() to anon,authenticated,service_role;
grant execute on function public.get_my_access(),public.admin_list_users(),public.admin_set_role(uuid,text),public.admin_set_account_status(uuid,text),public.save_plan(uuid,integer,text,text,jsonb),public.record_activity(text,text,text),public.admin_activity() to authenticated;
grant execute on function public.bootstrap_initial_admin(uuid) to service_role;
commit;
