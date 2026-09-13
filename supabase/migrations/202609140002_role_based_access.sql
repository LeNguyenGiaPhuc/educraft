-- EduCraft role-based access for Supabase Data API.
-- The service_role used by the future backend bypasses RLS. Never expose it in FE code.

begin;

-- These helper functions run with the migration owner's privileges so policies can
-- safely check related tables without creating circular RLS rules.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = (select auth.uid())
    and profile.status = 'ACTIVE'::public.account_status
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_user_role() = 'ADMIN'::public.user_role,
    false
  )
$$;

create or replace function public.is_assigned_teacher(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.current_user_role() = 'TEACHER'::public.user_role
    and exists (
      select 1
      from public.classes as class
      where class.id = target_class_id
        and class.teacher_id = (select auth.uid())
    )
$$;

create or replace function public.is_class_member(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.current_user_role() = 'STUDENT'::public.user_role
    and exists (
      select 1
      from public.class_members as member
      where member.class_id = target_class_id
        and member.student_id = (select auth.uid())
    )
$$;

create or replace function public.is_assigned_teacher_for_assignment(
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
    join public.classes as class on class.id = assignment.class_id
    where assignment.id = target_assignment_id
      and class.teacher_id = (select auth.uid())
      and public.current_user_role() = 'TEACHER'::public.user_role
  )
$$;

create or replace function public.is_class_member_for_assignment(
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
  )
$$;

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
      and now() <= assignment.due_at
  )
$$;

create or replace function public.owns_submission(target_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.current_user_role() = 'STUDENT'::public.user_role
    and exists (
      select 1
      from public.submissions as submission
      where submission.id = target_submission_id
        and submission.student_id = (select auth.uid())
    )
$$;

create or replace function public.is_assigned_teacher_for_submission(
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
    join public.classes as class on class.id = assignment.class_id
    where submission.id = target_submission_id
      and class.teacher_id = (select auth.uid())
      and public.current_user_role() = 'TEACHER'::public.user_role
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
      and now() <= assignment.due_at
  )
$$;

revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_assigned_teacher(uuid) from public, anon, authenticated;
revoke all on function public.is_class_member(uuid) from public, anon, authenticated;
revoke all on function public.is_assigned_teacher_for_assignment(uuid) from public, anon, authenticated;
revoke all on function public.is_class_member_for_assignment(uuid) from public, anon, authenticated;
revoke all on function public.can_submit_to_assignment(uuid) from public, anon, authenticated;
revoke all on function public.owns_submission(uuid) from public, anon, authenticated;
revoke all on function public.is_assigned_teacher_for_submission(uuid) from public, anon, authenticated;
revoke all on function public.can_upload_submission_file(uuid) from public, anon, authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_assigned_teacher(uuid) to authenticated;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.is_assigned_teacher_for_assignment(uuid) to authenticated;
grant execute on function public.is_class_member_for_assignment(uuid) to authenticated;
grant execute on function public.can_submit_to_assignment(uuid) to authenticated;
grant execute on function public.owns_submission(uuid) to authenticated;
grant execute on function public.is_assigned_teacher_for_submission(uuid) to authenticated;
grant execute on function public.can_upload_submission_file(uuid) to authenticated;

-- Account profiles
create policy profiles_admin_read
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_user_read_own
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  and status = 'ACTIVE'::public.account_status
);

create policy profiles_teacher_read_class_students
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'TEACHER'::public.user_role
  and role = 'STUDENT'::public.user_role
  and exists (
    select 1
    from public.class_members as member
    join public.classes as class on class.id = member.class_id
    where member.student_id = profiles.id
      and class.teacher_id = (select auth.uid())
  )
);

create policy profiles_student_read_class_teacher
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'STUDENT'::public.user_role
  and role = 'TEACHER'::public.user_role
  and exists (
    select 1
    from public.classes as class
    join public.class_members as member on member.class_id = class.id
    where class.teacher_id = profiles.id
      and member.student_id = (select auth.uid())
  )
);

-- Classes and enrolments
create policy classes_admin_manage
on public.classes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy classes_teacher_read_assigned
on public.classes
for select
to authenticated
using (public.is_assigned_teacher(id));

create policy classes_student_read_enrolled
on public.classes
for select
to authenticated
using (public.is_class_member(id));

create policy class_members_admin_manage
on public.class_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy class_members_teacher_read_assigned
on public.class_members
for select
to authenticated
using (public.is_assigned_teacher(class_id));

create policy class_members_student_read_own
on public.class_members
for select
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'STUDENT'::public.user_role
);

-- Assignments and teacher reference content
create policy assignments_teacher_read
on public.assignments
for select
to authenticated
using (public.is_assigned_teacher(class_id));

create policy assignments_teacher_create
on public.assignments
for insert
to authenticated
with check (
  public.is_assigned_teacher(class_id)
  and created_by = (select auth.uid())
);

create policy assignments_teacher_update
on public.assignments
for update
to authenticated
using (public.is_assigned_teacher(class_id))
with check (public.is_assigned_teacher(class_id));

create policy assignments_teacher_delete
on public.assignments
for delete
to authenticated
using (public.is_assigned_teacher(class_id));

create policy assignments_student_read
on public.assignments
for select
to authenticated
using (
  status <> 'DRAFT'::public.assignment_status
  and public.is_class_member(class_id)
);

create policy reference_files_teacher_read
on public.reference_files
for select
to authenticated
using (public.is_assigned_teacher_for_assignment(assignment_id));

create policy reference_files_teacher_create
on public.reference_files
for insert
to authenticated
with check (
  public.is_assigned_teacher_for_assignment(assignment_id)
  and uploaded_by = (select auth.uid())
);

create policy reference_files_teacher_update
on public.reference_files
for update
to authenticated
using (public.is_assigned_teacher_for_assignment(assignment_id))
with check (public.is_assigned_teacher_for_assignment(assignment_id));

create policy reference_files_teacher_delete
on public.reference_files
for delete
to authenticated
using (public.is_assigned_teacher_for_assignment(assignment_id));

create policy reference_content_units_teacher_manage
on public.reference_content_units
for all
to authenticated
using (public.is_assigned_teacher_for_assignment(assignment_id))
with check (public.is_assigned_teacher_for_assignment(assignment_id));

-- Student submissions
create policy submissions_teacher_read
on public.submissions
for select
to authenticated
using (public.is_assigned_teacher_for_assignment(assignment_id));

create policy submissions_student_read_own
on public.submissions
for select
to authenticated
using (
  student_id = (select auth.uid())
  and public.current_user_role() = 'STUDENT'::public.user_role
);

create policy submissions_student_create
on public.submissions
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and public.can_submit_to_assignment(assignment_id)
);

create policy submission_files_teacher_read
on public.submission_files
for select
to authenticated
using (public.is_assigned_teacher_for_submission(submission_id));

create policy submission_files_student_read_own
on public.submission_files
for select
to authenticated
using (public.owns_submission(submission_id));

create policy submission_files_student_create
on public.submission_files
for insert
to authenticated
with check (public.can_upload_submission_file(submission_id));

-- AI results stay hidden from students until a teacher finalizes a review.
create policy ai_evaluations_teacher_read
on public.ai_evaluations
for select
to authenticated
using (public.is_assigned_teacher_for_submission(submission_id));

create policy teacher_reviews_teacher_read
on public.teacher_reviews
for select
to authenticated
using (public.is_assigned_teacher_for_submission(submission_id));

create policy teacher_reviews_teacher_create
on public.teacher_reviews
for insert
to authenticated
with check (
  teacher_id = (select auth.uid())
  and public.is_assigned_teacher_for_submission(submission_id)
);

create policy teacher_reviews_teacher_update
on public.teacher_reviews
for update
to authenticated
using (public.is_assigned_teacher_for_submission(submission_id))
with check (
  teacher_id = (select auth.uid())
  and public.is_assigned_teacher_for_submission(submission_id)
);

create policy teacher_reviews_teacher_delete
on public.teacher_reviews
for delete
to authenticated
using (public.is_assigned_teacher_for_submission(submission_id));

create policy teacher_reviews_student_read_final
on public.teacher_reviews
for select
to authenticated
using (
  is_finalized
  and public.owns_submission(submission_id)
);

-- RLS and SQL GRANT are separate controls. Anonymous users get no table access.
revoke all on table
  public.profiles,
  public.classes,
  public.class_members,
  public.assignments,
  public.reference_files,
  public.reference_content_units,
  public.submissions,
  public.submission_files,
  public.ai_evaluations,
  public.teacher_reviews
from anon, authenticated;

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.reference_files to authenticated;
grant select, insert, update, delete on public.reference_content_units to authenticated;
grant select, insert on public.submissions to authenticated;
grant select, insert on public.submission_files to authenticated;
grant select on public.ai_evaluations to authenticated;
grant select, insert, update, delete on public.teacher_reviews to authenticated;

commit;
