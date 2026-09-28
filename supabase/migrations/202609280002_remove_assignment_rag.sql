begin;

-- The original RAG migration is kept as immutable history because it may have
-- already been applied to the shared Supabase project. This forward migration
-- removes the runtime-only RAG schema without touching reference or submission
-- images. The vector extension is intentionally left installed because it may
-- be shared by another database feature.

alter table if exists public.ai_evaluations
  drop column if exists retrieved_context,
  drop column if exists embedding_model,
  drop column if exists rag_version;

drop table if exists public.rag_reference_chunks;
drop table if exists public.rag_reference_documents;

do $$
declare
  function_oid oid;
begin
  select p.oid
    into function_oid
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'match_assignment_reference_chunks'
  limit 1;

  if function_oid is not null then
    execute format('drop function %s', function_oid::regprocedure);
  end if;
end;
$$;

commit;
