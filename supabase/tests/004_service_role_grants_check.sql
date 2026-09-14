do $$
declare
  missing_grants text;
begin
  select string_agg(table_name || ':' || privilege_type, ', ' order by table_name, privilege_type)
  into missing_grants
  from (
    select expected.table_name, expected.privilege_type
    from (
      values
        ('profiles', 'SELECT'),
        ('profiles', 'INSERT'),
        ('profiles', 'UPDATE'),
        ('profiles', 'DELETE'),
        ('classes', 'SELECT'),
        ('classes', 'INSERT'),
        ('classes', 'UPDATE'),
        ('classes', 'DELETE'),
        ('class_members', 'SELECT'),
        ('class_members', 'INSERT'),
        ('class_members', 'UPDATE'),
        ('class_members', 'DELETE'),
        ('assignments', 'SELECT'),
        ('assignments', 'INSERT'),
        ('assignments', 'UPDATE'),
        ('assignments', 'DELETE'),
        ('reference_files', 'SELECT'),
        ('reference_files', 'INSERT'),
        ('reference_files', 'UPDATE'),
        ('reference_files', 'DELETE'),
        ('reference_content_units', 'SELECT'),
        ('reference_content_units', 'INSERT'),
        ('reference_content_units', 'UPDATE'),
        ('reference_content_units', 'DELETE'),
        ('submissions', 'SELECT'),
        ('submissions', 'INSERT'),
        ('submissions', 'UPDATE'),
        ('submissions', 'DELETE'),
        ('submission_files', 'SELECT'),
        ('submission_files', 'INSERT'),
        ('submission_files', 'UPDATE'),
        ('submission_files', 'DELETE'),
        ('ai_evaluations', 'SELECT'),
        ('ai_evaluations', 'INSERT'),
        ('ai_evaluations', 'UPDATE'),
        ('ai_evaluations', 'DELETE'),
        ('teacher_reviews', 'SELECT'),
        ('teacher_reviews', 'INSERT'),
        ('teacher_reviews', 'UPDATE'),
        ('teacher_reviews', 'DELETE')
    ) as expected(table_name, privilege_type)
    where not has_table_privilege(
      'service_role',
      format('public.%I', expected.table_name),
      expected.privilege_type
    )
  ) as missing;

  if missing_grants is not null then
    raise exception 'Missing service_role grants: %', missing_grants;
  end if;
end;
$$;

select 'EduCraft service_role grants are valid' as result;
