-- Run after migration 004 to verify the atomic submission-attempt RPC.

do $$
declare
  rpc_definition text;
begin
  if to_regprocedure('public.create_submission_attempt(uuid)') is null then
    raise exception 'Missing create_submission_attempt(uuid) RPC';
  end if;

  select lower(pg_get_functiondef('public.create_submission_attempt(uuid)'::regprocedure))
  into rpc_definition;

  if rpc_definition not like '%security definer%'
    or rpc_definition not like '%set search_path to%'
    or rpc_definition not like '%auth.uid()%'
    or rpc_definition not like '%pg_advisory_xact_lock%'
    or rpc_definition not like '%from public.class_members%'
    or rpc_definition not like '%for key share%'
    or rpc_definition not like '%target_assignment.status = ''draft''%'
    or rpc_definition not like '%target_assignment.status = ''closed''%'
    or rpc_definition not like '%max(submission.attempt_number)%'
    or rpc_definition not like '%clock_timestamp() >= target_assignment.due_at%'
    or rpc_definition not like '%''submitted''::public.submission_status%'
  then
    raise exception 'Submission-attempt RPC is missing a required security or allocation rule';
  end if;
end;
$$;

do $$
declare
  argument_count integer;
  argument_names text[];
begin
  select procedure.pronargs, procedure.proargnames
  into argument_count, argument_names
  from pg_proc as procedure
  where procedure.oid = 'public.create_submission_attempt(uuid)'::regprocedure;

  if argument_count <> 1
    or argument_names is distinct from array['target_assignment_id']::text[]
  then
    raise exception 'Submission-attempt RPC must accept only target_assignment_id';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.create_submission_attempt(uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role cannot execute submission-attempt RPC';
  end if;

  if has_function_privilege('anon', 'public.create_submission_attempt(uuid)', 'EXECUTE') then
    raise exception 'Submission-attempt RPC has unintended execution grants';
  end if;

  if has_table_privilege('authenticated', 'public.submissions', 'INSERT') then
    raise exception 'Authenticated role can bypass RPC attempt allocation';
  end if;
end;
$$;

do $$
declare
  helper_definition text;
  helper_signature text;
begin
  foreach helper_signature in array array[
    'public.can_submit_to_assignment(uuid)',
    'public.can_upload_submission_file(uuid)',
    'public.can_upload_submission_storage_object(text)'
  ]
  loop
    select lower(pg_get_functiondef(helper_signature::regprocedure))
    into helper_definition;

    if helper_definition not like '%now() < assignment.due_at%'
      or helper_definition like '%now() <= assignment.due_at%'
    then
      raise exception 'Deadline helper % does not use the strict rule', helper_signature;
    end if;
  end loop;
end;
$$;

select 'EduCraft submission-attempt RPC is valid' as result;
