alter table public.ai_evaluations
  add column provider text,
  add column prompt_version text,
  add column latency_ms integer,
  add column reference_transcription text,
  add column student_transcription text,
  add column uncertain_content jsonb not null default '[]'::jsonb;

alter table public.ai_evaluations
  add constraint ai_evaluations_latency_nonnegative_check
    check (latency_ms is null or latency_ms >= 0),
  add constraint ai_evaluations_uncertain_content_array_check
    check (jsonb_typeof(uncertain_content) = 'array');
