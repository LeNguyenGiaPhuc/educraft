-- Finalize one Teacher review and its submission in a single transaction.

begin;

create or replace function public.finalize_submission_review(
  target_submission_id uuid,
  target_final_status text,
  target_final_score numeric,
  target_feedback text
)
returns public.teacher_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_teacher_id uuid := auth.uid();
  target_submission_status public.submission_status;
  target_class_id uuid;
  assigned_teacher_id uuid;
  existing_review_finalized boolean;
  finalized_time timestamptz;
  finalized_review public.teacher_reviews%rowtype;
begin
  if current_teacher_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_teacher_id
      and profile.role = 'TEACHER'::public.user_role
      and profile.status = 'ACTIVE'::public.account_status
  ) then
    raise exception using errcode = 'P0001', message = 'REVIEW_ROLE_FORBIDDEN';
  end if;

  if target_final_status is null
    or target_final_status not in ('COMPLETED', 'NEEDS_COMPLETION')
  then
    raise exception using errcode = 'P0001', message = 'INVALID_FINAL_STATUS';
  end if;

  if target_final_score is not null
    and (target_final_score < 0 or target_final_score > 100)
  then
    raise exception using errcode = 'P0001', message = 'INVALID_FINAL_SCORE';
  end if;

  if target_feedback is null or length(trim(target_feedback)) = 0 then
    raise exception using errcode = 'P0001', message = 'FEEDBACK_REQUIRED';
  end if;

  select submission.status, assignment.class_id
  into target_submission_status, target_class_id
  from public.submissions as submission
  join public.assignments as assignment
    on assignment.id = submission.assignment_id
  where submission.id = target_submission_id
  for update of submission, assignment;

  if not found then
    raise exception using errcode = 'P0001', message = 'SUBMISSION_NOT_FOUND';
  end if;

  if target_submission_status = 'FINALIZED'::public.submission_status then
    raise exception using errcode = 'P0001', message = 'SUBMISSION_ALREADY_FINALIZED';
  end if;

  select class.teacher_id
  into assigned_teacher_id
  from public.classes as class
  where class.id = target_class_id
  for share;

  if assigned_teacher_id is distinct from current_teacher_id then
    raise exception using errcode = 'P0001', message = 'CLASS_FORBIDDEN';
  end if;

  select review.is_finalized
  into existing_review_finalized
  from public.teacher_reviews as review
  where review.submission_id = target_submission_id
  for update;

  if found and existing_review_finalized then
    raise exception using errcode = 'P0001', message = 'REVIEW_ALREADY_FINALIZED';
  end if;

  finalized_time := pg_catalog.clock_timestamp();

  insert into public.teacher_reviews (
    submission_id,
    teacher_id,
    final_status,
    final_score,
    feedback,
    is_finalized,
    finalized_at
  )
  values (
    target_submission_id,
    current_teacher_id,
    target_final_status,
    target_final_score,
    trim(target_feedback),
    true,
    finalized_time
  )
  on conflict (submission_id) do update
  set teacher_id = excluded.teacher_id,
      final_status = excluded.final_status,
      final_score = excluded.final_score,
      feedback = excluded.feedback,
      is_finalized = true,
      finalized_at = excluded.finalized_at
  returning * into finalized_review;

  update public.submissions
  set status = 'FINALIZED'::public.submission_status
  where id = target_submission_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'SUBMISSION_FINALIZE_FAILED';
  end if;

  return finalized_review;
end;
$$;

revoke all on function public.finalize_submission_review(uuid, text, numeric, text)
from public, anon, authenticated;

grant execute on function public.finalize_submission_review(uuid, text, numeric, text)
to authenticated;

-- Review writes must go through the transactional RPC. RLS still protects reads.
revoke insert, update, delete on table public.teacher_reviews from authenticated;

commit;
