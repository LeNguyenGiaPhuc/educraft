begin;

-- Supabase may install pgvector in either public or extensions. Keeping both
-- schemas on the search path lets this migration work in either setup.
set local search_path = public, extensions;

create extension if not exists vector;

alter table public.ai_evaluations
  add column retrieved_context jsonb not null default '[]'::jsonb,
  add column embedding_model text,
  add column rag_version integer;

alter table public.ai_evaluations
  add constraint ai_evaluations_retrieved_context_array_check
    check (jsonb_typeof(retrieved_context) = 'array'),
  add constraint ai_evaluations_rag_version_nonnegative_check
    check (rag_version is null or rag_version >= 0);

create table public.rag_reference_documents (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  reference_file_id uuid not null unique
    references public.reference_files(id) on delete cascade,
  transcription text not null,
  source_fingerprint text not null,
  embedding_model text not null,
  embedding_dimensions integer not null,
  chunking_version integer not null,
  index_status text not null default 'PENDING',
  indexed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rag_reference_documents_transcription_not_blank_check
    check (length(trim(transcription)) > 0),
  constraint rag_reference_documents_fingerprint_not_blank_check
    check (length(trim(source_fingerprint)) > 0),
  constraint rag_reference_documents_embedding_dimensions_check
    check (embedding_dimensions > 0),
  constraint rag_reference_documents_chunking_version_check
    check (chunking_version >= 1),
  constraint rag_reference_documents_status_check
    check (index_status in ('PENDING', 'READY', 'FAILED'))
);

create table public.rag_reference_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_reference_documents(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),

  constraint rag_reference_chunks_content_not_blank_check
    check (length(trim(content)) > 0),
  constraint rag_reference_chunks_chunk_index_check
    check (chunk_index >= 0),
  constraint rag_reference_chunks_document_id_chunk_index_key
    unique (document_id, chunk_index)
);

create index rag_reference_documents_assignment_id_index
  on public.rag_reference_documents (assignment_id);

create index rag_reference_chunks_assignment_id_index
  on public.rag_reference_chunks (assignment_id);

create index rag_reference_chunks_document_id_index
  on public.rag_reference_chunks (document_id);

create trigger rag_reference_documents_set_updated_at
before update on public.rag_reference_documents
for each row execute function public.set_updated_at();

create or replace function public.match_assignment_reference_chunks(
  target_assignment_id uuid,
  query_embedding vector(768),
  match_count integer default 5,
  minimum_similarity double precision default 0.35
)
returns table (
  chunk_id uuid,
  document_id uuid,
  reference_file_id uuid,
  original_filename text,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
security invoker
set search_path = public, extensions
as $$
  select
    chunks.id as chunk_id,
    chunks.document_id,
    documents.reference_file_id,
    files.original_filename,
    chunks.chunk_index,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from public.rag_reference_chunks as chunks
  join public.rag_reference_documents as documents
    on documents.id = chunks.document_id
  join public.reference_files as files
    on files.id = documents.reference_file_id
  where chunks.assignment_id = target_assignment_id
    and documents.assignment_id = target_assignment_id
    and documents.index_status = 'READY'
    and 1 - (chunks.embedding <=> query_embedding) >= minimum_similarity
  order by chunks.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 50);
$$;

alter table public.rag_reference_documents enable row level security;
alter table public.rag_reference_chunks enable row level security;

revoke all on table
  public.rag_reference_documents,
  public.rag_reference_chunks
from anon, authenticated;

grant select, insert, update, delete on table
  public.rag_reference_documents,
  public.rag_reference_chunks
to service_role;

revoke all on function public.match_assignment_reference_chunks(uuid, vector, integer, double precision)
from public, anon, authenticated;

grant execute on function public.match_assignment_reference_chunks(uuid, vector, integer, double precision)
to service_role;

commit;

