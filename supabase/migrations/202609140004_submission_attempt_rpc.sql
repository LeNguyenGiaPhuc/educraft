-- Atomically allocate student submission attempts and make the deadline rule strict.

begin;

create or replace function public.can_submit_to_assignment(
  target_assignment_id uuid
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
    join public.class_members as member
      on member.class_id = assignment.class_id
    where assignment.id = target_assignment_id
      and member.student_id = (select auth.uid())
      and public.current_user_role() = 'STUDENT'::public.user_role
      and assignment.status = 'OPEN'::public.assignment_status
      and now() < assignment.due_at
  )
$$;

create or replace function public.can_upload_submission_file(
  target_submission_id uuid
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
    where submission.id = target_submission_id
      and submission.student_id = (select auth.uid())
      and member.student_id = (select auth.uid())
      and public.current_user_role() = 'STUDENT'::public.user_role
      and assignment.status = 'OPEN'::public.assignment_status
      and now() < assignment.due_at
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
      and now() < assignment.due_at
  )
$$;

create or replace function public.create_submission_attempt(
  target_assignment_id uuid
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_student_id uuid := auth.uid();
  target_assignment public.assignments%rowtype;
  next_attempt_number integer;
  created_submission public.submissions%rowtype;
begin
  if current_student_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_student_id
      and profile.role = 'STUDENT'::public.user_role
      and profile.status = 'ACTIVE'::public.account_status
  ) then
    raise exception using errcode = 'P0001', message = 'SUBMISSION_ROLE_FORBIDDEN';
  end if;

  -- The transaction-scoped lock serializes attempts for this assignment/student pair.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_assignment_id::text || ':' || current_student_id::text,
      0
    )
  );

  select assignment.*
  into target_assignment
  from public.assignments as assignment
  where assignment.id = target_assignment_id
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'ASSIGNMENT_NOT_FOUND';
  end if;

  perform 1
  from public.class_members as member
  where member.class_id = target_assignment.class_id
    and member.student_id = current_student_id
  for key share;

  if not found then
    raise exception using errcode = 'P0001', message = 'STUDENT_NOT_ENROLLED';
  end if;

  if target_assignment.status = 'DRAFT'::public.assignment_status then
    raise exception using errcode = 'P0001', message = 'ASSIGNMENT_DRAFT';
  end if;

  if target_assignment.status = 'CLOSED'::public.assignment_status then
    raise exception using errcode = 'P0001', message = 'ASSIGNMENT_CLOSED';
  end if;

  select coalesce(max(submission.attempt_number), 0) + 1
  into next_attempt_number
  from public.submissions as submission
  where submission.assignment_id = target_assignment_id
    and submission.student_id = current_student_id;

  -- Check wall-clock time after allocation, immediately before the insert.
  if pg_catalog.clock_timestamp() >= target_assignment.due_at then
    raise exception using errcode = 'P0001', message = 'ASSIGNMENT_EXPIRED';
  end if;

  insert into public.submissions (
    assignment_id,
    student_id,
    attempt_number,
    status
  )
  values (
    target_assignment_id,
    current_student_id,
    next_attempt_number,
    'SUBMITTED'::public.submission_status
  )
  returning * into created_submission;

  return created_submission;
end;
$$;

revoke all on function public.create_submission_attempt(uuid)
from public, anon, authenticated;

grant execute on function public.create_submission_attempt(uuid)
to authenticated;

-- Authenticated callers must allocate attempts through the RPC rather than
-- supplying student_id or attempt_number through the table endpoint.
revoke insert on table public.submissions from authenticated;

commit;
