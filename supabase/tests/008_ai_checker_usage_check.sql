do $$
declare
  missing_columns text;
begin
  select string_agg(expected.column_name, ', ' order by expected.column_name)
  into missing_columns
  from unnest(array[
    'checker_status',
    'checker_summary',
    'checker_findings',
    'checker_prompt_version'
  ]) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_evaluations'
      and column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception 'Missing AI checker columns: %', missing_columns;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.ai_usage_logs') is null then
    raise exception 'Missing AI usage log table';
  end if;

  if not has_table_privilege('service_role', 'public.ai_usage_logs', 'SELECT')
    or not has_table_privilege('service_role', 'public.ai_usage_logs', 'INSERT') then
    raise exception 'Missing service_role AI usage grants';
  end if;

  if has_table_privilege('authenticated', 'public.ai_usage_logs', 'SELECT') then
    raise exception 'Authenticated users must not read raw AI usage logs';
  end if;
end;
$$;

select 'EduCraft AI checker and usage schema is valid' as result;
