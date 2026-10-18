begin;

alter table public.ai_evaluations
  add column checker_status text,
  add column checker_summary text,
  add column checker_findings jsonb not null default '[]'::jsonb,
  add column checker_prompt_version text;

alter table public.ai_evaluations
  add constraint ai_evaluations_checker_status_check
    check (checker_status is null or checker_status in ('PASSED', 'NEEDS_TEACHER_REVIEW')),
  add constraint ai_evaluations_checker_findings_array_check
    check (jsonb_typeof(checker_findings) = 'array');

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  evaluation_id uuid references public.ai_evaluations(id) on delete set null,
  stage text not null,
  provider text not null,
  model_name text,
  prompt_version text,
  status text not null,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  cost_usd numeric(12, 6),
  error_code text,
  created_at timestamptz not null default now(),
  constraint ai_usage_logs_status_check
    check (status in ('SUCCEEDED', 'FAILED', 'REFUSED')),
  constraint ai_usage_logs_input_tokens_check
    check (input_tokens is null or input_tokens >= 0),
  constraint ai_usage_logs_output_tokens_check
    check (output_tokens is null or output_tokens >= 0),
  constraint ai_usage_logs_latency_check
    check (latency_ms is null or latency_ms >= 0),
  constraint ai_usage_logs_cost_check
    check (cost_usd is null or cost_usd >= 0)
);

create index ai_usage_logs_created_at_idx
  on public.ai_usage_logs (created_at desc);
create index ai_usage_logs_submission_id_idx
  on public.ai_usage_logs (submission_id);

alter table public.ai_usage_logs enable row level security;

grant select, insert on public.ai_usage_logs to service_role;

create or replace function public.get_ai_usage_summary()
returns table (
  total_calls bigint,
  failed_calls bigint,
  refused_calls bigint,
  avg_latency_ms numeric,
  avg_cost_usd numeric,
  priced_calls bigint,
  unpriced_calls bigint
)
language sql
stable
set search_path = public
as $$
  select
    count(*) as total_calls,
    count(*) filter (where status = 'FAILED') as failed_calls,
    count(*) filter (where status = 'REFUSED') as refused_calls,
    round(avg(latency_ms), 2) as avg_latency_ms,
    round(avg(cost_usd), 6) as avg_cost_usd,
    count(*) filter (where cost_usd is not null) as priced_calls,
    count(*) filter (where cost_usd is null) as unpriced_calls
  from public.ai_usage_logs;
$$;

revoke all on function public.get_ai_usage_summary() from public;
grant execute on function public.get_ai_usage_summary() to service_role;

commit;
