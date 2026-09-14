-- Run after migration 005 to verify transactional Teacher finalization.

do $$
declare
  rpc_definition text;
begin
  if to_regprocedure(
    'public.finalize_submission_review(uuid,text,numeric,text)'
  ) is null then
    raise exception 'Missing finalize_submission_review RPC';
  end if;

  select lower(pg_get_functiondef(
    'public.finalize_submission_review(uuid,text,numeric,text)'::regprocedure
  ))
  into rpc_definition;

  if rpc_definition not like '%security definer%'
    or rpc_definition not like '%set search_path to%'
    or rpc_definition not like '%auth.uid()%'
    or rpc_definition not like '%profile.role = ''teacher''%'
    or rpc_definition not like '%profile.status = ''active''%'
    or rpc_definition not like '%for update of submission, assignment%'
    or rpc_definition not like '%class.teacher_id%'
    or rpc_definition not like '%insert into public.teacher_reviews%'
    or rpc_definition not like '%on conflict (submission_id) do update%'
    or rpc_definition not like '%is_finalized = true%'
    or rpc_definition not like '%clock_timestamp()%'
    or rpc_definition not like '%update public.submissions%'
    or rpc_definition not like '%''finalized''::public.submission_status%'
    or rpc_definition like '%ai_evaluations%'
  then
    raise exception 'Finalization RPC is missing a required transaction or security rule';
  end if;
end;
$$;

do $$
declare
  input_arguments text;
begin
  select pg_get_function_identity_arguments(procedure.oid)
  into input_arguments
  from pg_proc as procedure
  where procedure.oid = (
    'public.finalize_submission_review(uuid,text,numeric,text)'::regprocedure
  );

  if input_arguments <> (
    'target_submission_id uuid, target_final_status text, '
    || 'target_final_score numeric, target_feedback text'
  ) then
    raise exception 'Finalization RPC has unexpected identity arguments: %', input_arguments;
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.finalize_submission_review(uuid,text,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role cannot execute finalization RPC';
  end if;

  if has_function_privilege(
    'anon',
    'public.finalize_submission_review(uuid,text,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role can execute finalization RPC';
  end if;

  if has_table_privilege('authenticated', 'public.teacher_reviews', 'INSERT')
    or has_table_privilege('authenticated', 'public.teacher_reviews', 'UPDATE')
    or has_table_privilege('authenticated', 'public.teacher_reviews', 'DELETE')
  then
    raise exception 'Authenticated role can bypass transactional finalization';
  end if;
end;
$$;

select 'EduCraft finalization RPC is valid' as result;
