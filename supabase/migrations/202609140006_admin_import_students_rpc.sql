-- Import new profiles and class memberships in one database transaction.
-- Auth users are created by the backend before this function is called. If the
-- function fails, the backend removes those Auth users as compensation.

begin;

create or replace function public.admin_import_students(
  target_class_id uuid,
  target_students jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_row jsonb;
  target_profile_id uuid;
  target_email text;
  target_name text;
  target_student_number text;
  existing_profile public.profiles%rowtype;
  created_count integer := 0;
  assigned_count integer := 0;
  membership_rows jsonb := '[]'::jsonb;
  created_member public.class_members%rowtype;
begin
  if not public.is_admin() then
    raise exception using errcode = 'P0001', message = 'IMPORT_NOT_ADMIN';
  end if;

  if target_students is null or jsonb_typeof(target_students) <> 'array' then
    raise exception using errcode = 'P0001', message = 'IMPORT_INVALID_ROWS';
  end if;

  if not exists (
    select 1
    from public.classes
    where id = target_class_id
  ) then
    raise exception using errcode = 'P0001', message = 'CLASS_NOT_FOUND';
  end if;

  for student_row in
    select value
    from jsonb_array_elements(target_students)
  loop
    target_profile_id := (student_row ->> 'profile_id')::uuid;
    target_email := lower(trim(student_row ->> 'email'));
    target_name := trim(student_row ->> 'full_name');
    target_student_number := trim(student_row ->> 'student_number');

    select profile.*
    into existing_profile
    from public.profiles as profile
    where profile.id = target_profile_id
    for update;

    if found then
      if existing_profile.role <> 'STUDENT'::public.user_role then
        raise exception using errcode = 'P0001', message = 'IMPORT_ROLE_CONFLICT';
      end if;
      if existing_profile.email <> target_email then
        raise exception using errcode = 'P0001', message = 'IMPORT_EMAIL_CONFLICT';
      end if;
      if lower(regexp_replace(trim(existing_profile.full_name), '\s+', ' ', 'g'))
        <> lower(regexp_replace(target_name, '\s+', ' ', 'g')) then
        raise exception using errcode = 'P0001', message = 'IMPORT_NAME_CONFLICT';
      end if;
    else
      insert into public.profiles (
        id,
        email,
        username,
        full_name,
        role,
        status,
        student_code
      )
      values (
        target_profile_id,
        target_email,
        'student_' || substr(replace(target_profile_id::text, '-', ''), 1, 12),
        target_name,
        'STUDENT'::public.user_role,
        'PENDING'::public.account_status,
        null
      )
      returning * into existing_profile;

      created_count := created_count + 1;
    end if;

    if exists (
      select 1
      from public.class_members as member
      where member.class_id = target_class_id
        and member.student_id = target_profile_id
    ) then
      raise exception using errcode = 'P0001', message = 'STUDENT_ALREADY_IN_CLASS';
    end if;

    if exists (
      select 1
      from public.class_members as member
      where member.class_id = target_class_id
        and member.student_number = target_student_number
    ) then
      raise exception using errcode = 'P0001', message = 'STUDENT_NUMBER_CONFLICT';
    end if;

    insert into public.class_members (
      class_id,
      student_id,
      student_number
    )
    values (
      target_class_id,
      target_profile_id,
      target_student_number
    )
    returning * into created_member;

    assigned_count := assigned_count + 1;
    membership_rows := membership_rows || jsonb_build_array(
      jsonb_build_object(
        'class_id', created_member.class_id,
        'student_id', created_member.student_id,
        'student_number', created_member.student_number,
        'joined_at', created_member.joined_at
      )
    );
  end loop;

  return jsonb_build_object(
    'created', created_count,
    'assigned', assigned_count - created_count,
    'skipped', 0,
    'memberships', membership_rows
  );
end;
$$;

revoke all on function public.admin_import_students(uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.admin_import_students(uuid, jsonb)
to authenticated;

commit;
