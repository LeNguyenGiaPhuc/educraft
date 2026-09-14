-- The backend uses the Supabase service_role for server-side database writes.
-- RLS bypass does not replace SQL table privileges, so grant the backend the
-- permissions it needs explicitly. The service_role key must never be exposed
-- to the frontend.

begin;

grant usage on schema public to service_role;

grant select, insert, update, delete on table
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
to service_role;

commit;
