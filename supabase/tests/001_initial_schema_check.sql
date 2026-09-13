-- Run this before the migration: it should fail because the schema does not exist yet.
-- Run it again after the migration: it should finish successfully.

do $$
declare
  missing_tables text;
begin
  select string_agg(table_name, ', ' order by table_name)
  into missing_tables
  from unnest(array[
    'profiles',
    'classes',
    'class_members',
    'assignments',
    'reference_files',
    'reference_content_units',
    'submissions',
    'submission_files',
    'ai_evaluations',
    'teacher_reviews'
  ]) as expected(table_name)
  where to_regclass('public.' || table_name) is null;

  if missing_tables is not null then
    raise exception 'Missing EduCraft tables: %', missing_tables;
  end if;
end;
$$;

do $$
declare
  missing_types text;
begin
  select string_agg(type_name, ', ' order by type_name)
  into missing_types
  from unnest(array[
    'user_role',
    'account_status',
    'class_status',
    'assignment_status',
    'submission_status'
  ]) as expected(type_name)
  where not exists (
    select 1
    from pg_type
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = type_name
  );

  if missing_types is not null then
    raise exception 'Missing EduCraft enum types: %', missing_types;
  end if;
end;
$$;

do $$
declare
  tables_without_rls text;
begin
  select string_agg(relname, ', ' order by relname)
  into tables_without_rls
  from pg_class
  join pg_namespace on pg_namespace.oid = pg_class.relnamespace
  where pg_namespace.nspname = 'public'
    and relkind = 'r'
    and relname = any(array[
      'profiles',
      'classes',
      'class_members',
      'assignments',
      'reference_files',
      'reference_content_units',
      'submissions',
      'submission_files',
      'ai_evaluations',
      'teacher_reviews'
    ])
    and not relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'RLS is disabled on: %', tables_without_rls;
  end if;
end;
$$;

select
  'EduCraft initial schema is valid' as result,
  count(*) as table_count
from information_schema.tables
where table_schema = 'public'
  and table_name = any(array[
    'profiles',
    'classes',
    'class_members',
    'assignments',
    'reference_files',
    'reference_content_units',
    'submissions',
    'submission_files',
    'ai_evaluations',
    'teacher_reviews'
  ]);
