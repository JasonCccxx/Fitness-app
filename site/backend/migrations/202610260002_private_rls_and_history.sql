begin;
alter table private.user_roles enable row level security;
alter table private.audit_events enable row level security;
alter table private.activity_events enable row level security;
revoke all on private.user_roles,private.audit_events,private.activity_events from public,anon,authenticated;
create table private.schema_versions(version text primary key,description text not null,applied_at timestamptz not null default now());
alter table private.schema_versions enable row level security;
revoke all on private.schema_versions from public,anon,authenticated;
insert into private.schema_versions(version,description) values
('202610260001','Core profiles, content, media, plans and authorization'),
('202610260002','Private-table RLS and migration history');
commit;
