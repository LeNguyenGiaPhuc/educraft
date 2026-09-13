-- Run this before migration 003: it should fail because the buckets do not exist yet.
-- Run it again after migration 003: it should finish successfully.

do $$
declare
  invalid_buckets text;
begin
  select string_agg(expected.bucket_id, ', ' order by expected.bucket_id)
  into invalid_buckets
  from (
    values
      ('reference-materials'),
      ('student-submissions')
  ) as expected(bucket_id)
  left join storage.buckets as bucket on bucket.id = expected.bucket_id
  where bucket.id is null
    or bucket.public is distinct from false
    or bucket.file_size_limit is distinct from 5242880
    or bucket.allowed_mime_types is null
    or not (
      bucket.allowed_mime_types @> array[
        'image/jpeg',
        'image/png',
        'image/webp'
      ]::text[]
      and bucket.allowed_mime_types <@ array[
        'image/jpeg',
        'image/png',
        'image/webp'
      ]::text[]
    );

  if invalid_buckets is not null then
    raise exception 'Missing or invalid private Storage buckets: %', invalid_buckets;
  end if;
end;
$$;

do $$
declare
  missing_functions text;
begin
  select string_agg(function_name, ', ' order by function_name)
  into missing_functions
  from unnest(array[
    'public.can_manage_reference_storage_object(text)',
    'public.can_read_submission_storage_object(text)',
    'public.can_upload_submission_storage_object(text)'
  ]) as expected(function_name)
  where to_regprocedure(function_name) is null;

  if missing_functions is not null then
    raise exception 'Missing Storage helper functions: %', missing_functions;
  end if;
end;
$$;

do $$
declare
  missing_policies text;
begin
  select string_agg(
    expected.policy_name,
    ', ' order by expected.policy_name
  )
  into missing_policies
  from (
    values
      ('reference_objects_teacher_read', 'SELECT'),
      ('reference_objects_teacher_upload', 'INSERT'),
      ('reference_objects_teacher_delete', 'DELETE'),
      ('submission_objects_allowed_read', 'SELECT'),
      ('submission_objects_student_upload', 'INSERT')
  ) as expected(policy_name, command)
  where not exists (
    select 1
    from pg_policies as actual
    where actual.schemaname = 'storage'
      and actual.tablename = 'objects'
      and actual.policyname = expected.policy_name
      and actual.cmd = expected.command
      and actual.roles @> array['authenticated']::name[]
  );

  if missing_policies is not null then
    raise exception 'Missing or invalid Storage policies: %', missing_policies;
  end if;
end;
$$;

select
  'EduCraft Storage policies are valid' as result,
  count(*) as policy_count
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = any(array[
    'reference_objects_teacher_read',
    'reference_objects_teacher_upload',
    'reference_objects_teacher_delete',
    'submission_objects_allowed_read',
    'submission_objects_student_upload'
  ]);
