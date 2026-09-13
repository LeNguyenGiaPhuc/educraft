-- EduCraft private buckets and Storage access policies.
-- Object paths:
--   reference-materials/{assignment_id}/{file_name}
--   student-submissions/{submission_id}/{file_name}

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'reference-materials',
    'reference-materials',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'student-submissions',
    'student-submissions',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_reference_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments as assignment
    join public.classes as class on class.id = assignment.class_id
    where assignment.id::text = (storage.foldername(object_name))[1]
      and class.teacher_id = (select auth.uid())
      and public.current_user_role() = 'TEACHER'::public.user_role
  )
$$;

create or replace function public.can_read_submission_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions as submission
    join public.assignments as assignment
      on assignment.id = submission.assignment_id
    join public.classes as class on class.id = assignment.class_id
    where submission.id::text = (storage.foldername(object_name))[1]
      and (
        (
          public.current_user_role() = 'TEACHER'::public.user_role
          and class.teacher_id = (select auth.uid())
        )
        or (
          public.current_user_role() = 'STUDENT'::public.user_role
          and submission.student_id = (select auth.uid())
        )
      )
  )
$$;

create or replace function public.can_upload_submission_storage_object(
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions as submission
    join public.assignments as assignment
      on assignment.id = submission.assignment_id
    join public.class_members as member
      on member.class_id = assignment.class_id
    where submission.id::text = (storage.foldername(object_name))[1]
      and submission.student_id = (select auth.uid())
      and member.student_id = (select auth.uid())
      and public.current_user_role() = 'STUDENT'::public.user_role
      and assignment.status = 'OPEN'::public.assignment_status
      and now() <= assignment.due_at
  )
$$;

revoke all on function public.can_manage_reference_storage_object(text)
from public, anon, authenticated;

revoke all on function public.can_read_submission_storage_object(text)
from public, anon, authenticated;

revoke all on function public.can_upload_submission_storage_object(text)
from public, anon, authenticated;

grant execute on function public.can_manage_reference_storage_object(text)
to authenticated;

grant execute on function public.can_read_submission_storage_object(text)
to authenticated;

grant execute on function public.can_upload_submission_storage_object(text)
to authenticated;

create policy reference_objects_teacher_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reference-materials'
  and public.can_manage_reference_storage_object(name)
);

create policy reference_objects_teacher_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reference-materials'
  and public.can_manage_reference_storage_object(name)
  and owner_id = (select auth.uid()::text)
);

create policy reference_objects_teacher_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reference-materials'
  and public.can_manage_reference_storage_object(name)
);

create policy submission_objects_allowed_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-submissions'
  and public.can_read_submission_storage_object(name)
);

create policy submission_objects_student_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-submissions'
  and public.can_upload_submission_storage_object(name)
  and owner_id = (select auth.uid()::text)
);

commit;
