-- Run this before migration 202609280001: it should fail because the RAG
-- extension, tables, RPC, and evaluation evidence fields do not exist yet.
-- Run it again after the migration: it should finish successfully.

set search_path = public, extensions;

do $$
begin
  if not exists (
    select 1
    from pg_extension
    where extname = 'vector'
  ) then
    raise exception 'Missing vector extension';
  end if;

  if to_regclass('public.rag_reference_documents') is null
     or to_regclass('public.rag_reference_chunks') is null then
    raise exception 'Missing RAG tables';
  end if;

  if to_regtype('vector') is null then
    raise exception 'Missing vector type';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rag_reference_chunks'
      and column_name = 'embedding'
      and udt_name = 'vector'
  ) then
    raise exception 'Missing rag_reference_chunks.embedding vector column';
  end if;

  if not exists (
    select 1
    from pg_attribute
    join pg_class on pg_class.oid = pg_attribute.attrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'rag_reference_chunks'
      and pg_attribute.attname = 'embedding'
      and format_type(pg_attribute.atttypid, pg_attribute.atttypmod) = 'vector(768)'
  ) then
    raise exception 'RAG embedding must be vector(768)';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_evaluations'
      and column_name = 'retrieved_context'
      and data_type = 'jsonb'
  ) then
    raise exception 'Missing ai_evaluations.retrieved_context';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_evaluations'
      and column_name = 'embedding_model'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_evaluations'
      and column_name = 'rag_version'
  ) then
    raise exception 'Missing AI evaluation RAG metadata fields';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'match_assignment_reference_chunks'
  ) then
    raise exception 'Missing assignment RAG retrieval RPC';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rag_reference_documents_reference_file_id_key'
  ) then
    raise exception 'Missing unique reference document constraint';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rag_reference_chunks_document_id_chunk_index_key'
  ) then
    raise exception 'Missing unique RAG chunk constraint';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rag_reference_documents_reference_file_id_fkey'
      and confdeltype = 'c'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'rag_reference_chunks_document_id_fkey'
      and confdeltype = 'c'
  ) then
    raise exception 'Missing RAG cascade constraints';
  end if;
end;
$$;

do $$
begin
  if not has_table_privilege('service_role', 'public.rag_reference_documents', 'select')
     or not has_table_privilege('service_role', 'public.rag_reference_documents', 'insert')
     or not has_table_privilege('service_role', 'public.rag_reference_documents', 'update')
     or not has_table_privilege('service_role', 'public.rag_reference_documents', 'delete')
     or not has_table_privilege('service_role', 'public.rag_reference_chunks', 'select')
     or not has_table_privilege('service_role', 'public.rag_reference_chunks', 'insert')
     or not has_table_privilege('service_role', 'public.rag_reference_chunks', 'update')
     or not has_table_privilege('service_role', 'public.rag_reference_chunks', 'delete') then
    raise exception 'Missing service_role RAG table grants';
  end if;
end;
$$;

