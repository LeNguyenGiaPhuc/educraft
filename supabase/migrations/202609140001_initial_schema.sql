-- EduCraft initial PostgreSQL schema for Supabase.
-- Scope: enums, tables, constraints, indexes, updated_at triggers and RLS enablement.
-- Policies, Storage buckets and seed data are added in later migrations.

begin;

create extension if not exists pgcrypto;

create type public.user_role as enum (
  'ADMIN',
  'TEACHER',
  'STUDENT'
);

create type public.account_status as enum (
  'PENDING',
  'ACTIVE',
  'LOCKED'
);

create type public.class_status as enum (
  'ACTIVE',
  'ARCHIVED'
);

create type public.assignment_status as enum (
  'DRAFT',
  'OPEN',
  'CLOSED'
);

create type public.submission_status as enum (
  'SUBMITTED',
  'PROCESSING',
  'REQUIRES_REVIEW',
  'FINALIZED',
  'FAILED'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username varchar(50) not null,
  full_name varchar(120) not null,
  role public.user_role not null,
  status public.account_status not null default 'PENDING',
  student_code varchar(30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_email_unique unique (email),
  constraint profiles_username_unique unique (username),
  constraint profiles_student_code_unique unique (student_code),
  constraint profiles_email_lowercase_check check (email = lower(email)),
  constraint profiles_email_not_blank_check check (length(trim(email)) > 0),
  constraint profiles_username_not_blank_check check (length(trim(username)) > 0),
  constraint profiles_full_name_not_blank_check check (length(trim(full_name)) > 0)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) not null,
  subject varchar(120) not null,
  semester varchar(30) not null,
  school_year varchar(20) not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  status public.class_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint classes_code_unique unique (code),
  constraint classes_code_not_blank_check check (length(trim(code)) > 0),
  constraint classes_subject_not_blank_check check (length(trim(subject)) > 0),
  constraint classes_semester_not_blank_check check (length(trim(semester)) > 0),
  constraint classes_school_year_not_blank_check check (length(trim(school_year)) > 0)
);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_number varchar(20) not null,
  joined_at timestamptz not null default now(),

  constraint class_members_primary_key primary key (class_id, student_id),
  constraint class_members_student_number_unique unique (class_id, student_number),
  constraint class_members_student_number_not_blank_check
    check (length(trim(student_number)) > 0)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title varchar(160) not null,
  due_at timestamptz not null,
  coverage_threshold numeric(5, 2) not null default 80,
  status public.assignment_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assignments_title_not_blank_check check (length(trim(title)) > 0),
  constraint assignments_coverage_threshold_check
    check (coverage_threshold between 0 and 100)
);

create table public.reference_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type varchar(100) not null,
  size_bytes bigint not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint reference_files_storage_path_unique unique (storage_path),
  constraint reference_files_storage_path_not_blank_check
    check (length(trim(storage_path)) > 0),
  constraint reference_files_original_filename_not_blank_check
    check (length(trim(original_filename)) > 0),
  constraint reference_files_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint reference_files_size_bytes_check check (size_bytes > 0)
);

create table public.reference_content_units (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  content_text text not null,
  is_mandatory boolean not null default true,
  keywords jsonb not null default '[]'::jsonb,
  weight numeric(5, 2) not null default 1,
  order_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reference_content_units_order_unique unique (assignment_id, order_index),
  constraint reference_content_units_content_not_blank_check
    check (length(trim(content_text)) > 0),
  constraint reference_content_units_keywords_array_check
    check (jsonb_typeof(keywords) = 'array'),
  constraint reference_content_units_weight_check check (weight > 0),
  constraint reference_content_units_order_index_check check (order_index >= 0)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  attempt_number integer not null,
  status public.submission_status not null default 'SUBMITTED',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint submissions_attempt_unique
    unique (assignment_id, student_id, attempt_number),
  constraint submissions_attempt_number_check check (attempt_number > 0)
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type varchar(100) not null,
  size_bytes bigint not null,
  page_order integer not null,
  created_at timestamptz not null default now(),

  constraint submission_files_storage_path_unique unique (storage_path),
  constraint submission_files_page_order_unique unique (submission_id, page_order),
  constraint submission_files_storage_path_not_blank_check
    check (length(trim(storage_path)) > 0),
  constraint submission_files_original_filename_not_blank_check
    check (length(trim(original_filename)) > 0),
  constraint submission_files_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint submission_files_size_bytes_check check (size_bytes > 0),
  constraint submission_files_page_order_check check (page_order > 0)
);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  coverage_score numeric(5, 2),
  confidence numeric(4, 3),
  suggested_status text,
  missing_content jsonb not null default '[]'::jsonb,
  feedback_draft text,
  model_name text,
  model_version text,
  created_at timestamptz not null default now(),

  constraint ai_evaluations_submission_unique unique (submission_id),
  constraint ai_evaluations_submission_foreign_key
    foreign key (submission_id) references public.submissions(id) on delete cascade,
  constraint ai_evaluations_coverage_score_check
    check (coverage_score is null or coverage_score between 0 and 100),
  constraint ai_evaluations_confidence_check
    check (confidence is null or confidence between 0 and 1),
  constraint ai_evaluations_suggested_status_check
    check (
      suggested_status is null
      or suggested_status in (
        'COMPLETED',
        'NEEDS_COMPLETION',
        'REQUIRES_TEACHER_REVIEW'
      )
    ),
  constraint ai_evaluations_missing_content_array_check
    check (jsonb_typeof(missing_content) = 'array')
);

create table public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  final_status text,
  final_score numeric(5, 2),
  feedback text,
  is_finalized boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teacher_reviews_submission_unique unique (submission_id),
  constraint teacher_reviews_submission_foreign_key
    foreign key (submission_id) references public.submissions(id) on delete cascade,
  constraint teacher_reviews_final_status_check
    check (
      final_status is null
      or final_status in ('COMPLETED', 'NEEDS_COMPLETION')
    ),
  constraint teacher_reviews_final_score_check
    check (final_score is null or final_score between 0 and 100),
  constraint teacher_reviews_finalized_state_check
    check (
      (not is_finalized and finalized_at is null)
      or (is_finalized and final_status is not null and finalized_at is not null)
    )
);

create index classes_teacher_id_index
  on public.classes (teacher_id);

create index class_members_student_id_index
  on public.class_members (student_id);

create index assignments_class_id_index
  on public.assignments (class_id);

create index assignments_created_by_index
  on public.assignments (created_by);

create index assignments_status_due_at_index
  on public.assignments (status, due_at);

create index reference_files_assignment_id_index
  on public.reference_files (assignment_id);

create index reference_files_uploaded_by_index
  on public.reference_files (uploaded_by);

create index reference_content_units_assignment_id_index
  on public.reference_content_units (assignment_id);

create index submissions_assignment_id_index
  on public.submissions (assignment_id);

create index submissions_student_id_index
  on public.submissions (student_id);

create index submissions_status_index
  on public.submissions (status);

create index submission_files_submission_id_index
  on public.submission_files (submission_id);

create index teacher_reviews_teacher_id_index
  on public.teacher_reviews (teacher_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger classes_set_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create trigger reference_content_units_set_updated_at
before update on public.reference_content_units
for each row execute function public.set_updated_at();

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

create trigger teacher_reviews_set_updated_at
before update on public.teacher_reviews
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.reference_files enable row level security;
alter table public.reference_content_units enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.teacher_reviews enable row level security;

comment on table public.profiles is
  'Application profile linked one-to-one with Supabase Auth.';

comment on table public.class_members is
  'Students assigned to classes. student_number stores the imported STT.';

comment on table public.ai_evaluations is
  'AI suggestions only. The teacher decision is stored in teacher_reviews.';

comment on table public.teacher_reviews is
  'Final teacher-confirmed result for a submission.';

commit;
