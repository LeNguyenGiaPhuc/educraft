-- Run after migration 006 to verify the Admin student import RPC.

do $$
declare
  rpc_definition text;
begin
  if to_regprocedure('public.admin_import_students(uuid,jsonb)') is null then
    raise exception 'Missing admin_import_students RPC';
  end if;

  select lower(pg_get_functiondef(
    'public.admin_import_students(uuid,jsonb)'::regprocedure
  ))
  into rpc_definition;

  if rpc_definition not like '%security definer%'
    or rpc_definition not like '%set search_path to%'
    or rpc_definition not like '%public.is_admin()%'
    or rpc_definition not like '%jsonb_array_elements%'
    or rpc_definition not like '%insert into public.profiles%'
    or rpc_definition not like '%insert into public.class_members%'
    or rpc_definition not like '%student_number%'
    or rpc_definition not like '%return jsonb_build_object%'
  then
    raise exception 'Admin import RPC is missing a required validation or transaction rule';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.admin_import_students(uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role cannot execute Admin import RPC';
  end if;

  if has_function_privilege(
    'anon',
    'public.admin_import_students(uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role can execute Admin import RPC';
  end if;
end;
$$;

select 'EduCraft Admin import RPC is valid' as result;
