-- Run this before migration 002: it should fail because the policies do not exist yet.
-- Run it again after migration 002: it should finish successfully.

do $$
declare
  missing_functions text;
begin
  select string_agg(function_name, ', ' order by function_name)
  into missing_functions
  from unnest(array[
    'public.current_user_role()',
    'public.is_admin()',
    'public.is_assigned_teacher(uuid)',
    'public.is_class_member(uuid)',
    'public.is_assigned_teacher_for_assignment(uuid)',
    'public.is_class_member_for_assignment(uuid)',
    'public.can_submit_to_assignment(uuid)',
    'public.owns_submission(uuid)',
    'public.is_assigned_teacher_for_submission(uuid)',
    'public.can_upload_submission_file(uuid)'
  ]) as expected(function_name)
  where to_regprocedure(function_name) is null;

  if missing_functions is not null then
    raise exception 'Missing RLS helper functions: %', missing_functions;
  end if;
end;
$$;

do $$
declare
  missing_policies text;
  unexpected_policies text;
begin
  select string_agg(
    expected.table_name || '.' || expected.policy_name,
    ', ' order by expected.table_name, expected.policy_name
  )
  into missing_policies
  from (
    values
      ('profiles', 'profiles_admin_read'),
      ('profiles', 'profiles_admin_update'),
      ('profiles', 'profiles_teacher_read_class_students'),
      ('profiles', 'profiles_student_read_class_teacher'),
      ('profiles', 'profiles_user_read_own'),
      ('classes', 'classes_admin_manage'),
      ('classes', 'classes_teacher_read_assigned'),
      ('classes', 'classes_student_read_enrolled'),
      ('class_members', 'class_members_admin_manage'),
      ('class_members', 'class_members_teacher_read_assigned'),
      ('class_members', 'class_members_student_read_own'),
      ('assignments', 'assignments_teacher_read'),
      ('assignments', 'assignments_teacher_create'),
      ('assignments', 'assignments_teacher_update'),
      ('assignments', 'assignments_teacher_delete'),
      ('assignments', 'assignments_student_read'),
      ('reference_files', 'reference_files_teacher_read'),
      ('reference_files', 'reference_files_teacher_create'),
      ('reference_files', 'reference_files_teacher_update'),
      ('reference_files', 'reference_files_teacher_delete'),
      ('reference_content_units', 'reference_content_units_teacher_manage'),
      ('submissions', 'submissions_teacher_read'),
      ('submissions', 'submissions_student_read_own'),
      ('submissions', 'submissions_student_create'),
      ('submission_files', 'submission_files_teacher_read'),
      ('submission_files', 'submission_files_student_read_own'),
      ('submission_files', 'submission_files_student_create'),
      ('ai_evaluations', 'ai_evaluations_teacher_read'),
      ('teacher_reviews', 'teacher_reviews_teacher_read'),
      ('teacher_reviews', 'teacher_reviews_teacher_create'),
      ('teacher_reviews', 'teacher_reviews_teacher_update'),
      ('teacher_reviews', 'teacher_reviews_teacher_delete'),
      ('teacher_reviews', 'teacher_reviews_student_read_final')
  ) as expected(table_name, policy_name)
  where not exists (
    select 1
    from pg_policies actual
    where actual.schemaname = 'public'
      and actual.tablename = expected.table_name
      and actual.policyname = expected.policy_name
  );

  if missing_policies is not null then
    raise exception 'Missing RLS policies: %', missing_policies;
  end if;

  select string_agg(
    actual.tablename || '.' || actual.policyname,
    ', ' order by actual.tablename, actual.policyname
  )
  into unexpected_policies
  from pg_policies as actual
  where actual.schemaname = 'public'
    and actual.tablename = any(array[
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
    and (actual.tablename, actual.policyname) not in (
      values
        ('profiles', 'profiles_admin_read'),
        ('profiles', 'profiles_admin_update'),
        ('profiles', 'profiles_teacher_read_class_students'),
        ('profiles', 'profiles_student_read_class_teacher'),
        ('profiles', 'profiles_user_read_own'),
        ('classes', 'classes_admin_manage'),
        ('classes', 'classes_teacher_read_assigned'),
        ('classes', 'classes_student_read_enrolled'),
        ('class_members', 'class_members_admin_manage'),
        ('class_members', 'class_members_teacher_read_assigned'),
        ('class_members', 'class_members_student_read_own'),
        ('assignments', 'assignments_teacher_read'),
        ('assignments', 'assignments_teacher_create'),
        ('assignments', 'assignments_teacher_update'),
        ('assignments', 'assignments_teacher_delete'),
        ('assignments', 'assignments_student_read'),
        ('reference_files', 'reference_files_teacher_read'),
        ('reference_files', 'reference_files_teacher_create'),
        ('reference_files', 'reference_files_teacher_update'),
        ('reference_files', 'reference_files_teacher_delete'),
        ('reference_content_units', 'reference_content_units_teacher_manage'),
        ('submissions', 'submissions_teacher_read'),
        ('submissions', 'submissions_student_read_own'),
        ('submissions', 'submissions_student_create'),
        ('submission_files', 'submission_files_teacher_read'),
        ('submission_files', 'submission_files_student_read_own'),
        ('submission_files', 'submission_files_student_create'),
        ('ai_evaluations', 'ai_evaluations_teacher_read'),
        ('teacher_reviews', 'teacher_reviews_teacher_read'),
        ('teacher_reviews', 'teacher_reviews_teacher_create'),
        ('teacher_reviews', 'teacher_reviews_teacher_update'),
        ('teacher_reviews', 'teacher_reviews_teacher_delete'),
        ('teacher_reviews', 'teacher_reviews_student_read_final')
    );

  if unexpected_policies is not null then
    raise exception 'Unexpected RLS policies: %', unexpected_policies;
  end if;
end;
$$;

do $$
declare
  exposed_tables text;
begin
  select string_agg(table_name, ', ' order by table_name)
  into exposed_tables
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
  where has_table_privilege('anon', 'public.' || table_name, 'SELECT')
    or has_table_privilege('anon', 'public.' || table_name, 'INSERT')
    or has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
    or has_table_privilege('anon', 'public.' || table_name, 'DELETE');

  if exposed_tables is not null then
    raise exception 'Anonymous role still has table privileges: %', exposed_tables;
  end if;
end;
$$;

do $$
declare
  missing_grants text;
begin
  select string_agg(
    expected.table_name || ':' || expected.privilege,
    ', ' order by expected.table_name, expected.privilege
  )
  into missing_grants
  from (
    values
      ('profiles', 'SELECT'),
      ('profiles', 'UPDATE'),
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
      ('submission_files', 'SELECT'),
      ('submission_files', 'INSERT'),
      ('ai_evaluations', 'SELECT'),
      ('teacher_reviews', 'SELECT'),
      ('teacher_reviews', 'INSERT'),
      ('teacher_reviews', 'UPDATE'),
      ('teacher_reviews', 'DELETE')
  ) as expected(table_name, privilege)
  where not has_table_privilege(
    'authenticated',
    'public.' || expected.table_name,
    expected.privilege
  );

  if missing_grants is not null then
    raise exception 'Missing authenticated grants: %', missing_grants;
  end if;
end;
$$;

select
  'EduCraft RLS policies are valid' as result,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename = any(array[
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
