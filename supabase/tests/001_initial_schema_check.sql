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

do $$
declare
  missing_columns text;
begin
  select string_agg(expected.column_name, ', ' order by expected.column_name)
  into missing_columns
  from unnest(array[
    'provider',
    'prompt_version',
    'latency_ms',
    'reference_transcription',
    'student_transcription',
    'uncertain_content'
  ]) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_evaluations'
      and column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception 'Missing AI evaluation columns: %', missing_columns;
  end if;
end;
$$;

do $$
declare
  missing_constraints text;
begin
  select string_agg(expected.constraint_name, ', ' order by expected.constraint_name)
  into missing_constraints
  from unnest(array[
    'ai_evaluations_latency_nonnegative_check',
    'ai_evaluations_uncertain_content_array_check'
  ]) as expected(constraint_name)
  where not exists (
    select 1
    from pg_constraint
    join pg_class on pg_class.oid = pg_constraint.conrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'ai_evaluations'
      and pg_constraint.conname = expected.constraint_name
  );

  if missing_constraints is not null then
    raise exception 'Missing AI evaluation constraints: %', missing_constraints;
  end if;
end;
$$;

do $$
declare
  unsafe_grants text;
begin
  select string_agg(expected.role_name || ':' || expected.privilege_type, ', ' order by expected.role_name, expected.privilege_type)
  into unsafe_grants
  from (
    values
      ('anon', 'INSERT'),
      ('anon', 'UPDATE'),
      ('authenticated', 'INSERT'),
      ('authenticated', 'UPDATE')
  ) as expected(role_name, privilege_type)
  where has_table_privilege(
    expected.role_name,
    'public.ai_evaluations',
    expected.privilege_type
  );

  if unsafe_grants is not null then
    raise exception 'Unsafe direct AI evaluation grants: %', unsafe_grants;
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
