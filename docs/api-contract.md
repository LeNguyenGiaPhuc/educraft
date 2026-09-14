# EduCraft API Contract

This document describes the HTTP API currently implemented by the EduCraft
backend. Resource identifiers in route parameters and response bodies are UUIDs.
JSON fields use `snake_case` names that match the backend and database model.

## Base URL

```text
/api
```

## Global conventions

### Authentication

Authentication is session based. Login and refresh set access and refresh tokens
as HttpOnly cookies; tokens are never returned in JSON. Browser clients must send
cookies with `credentials: 'include'`.

Protected routes return `401 AUTH_REQUIRED` when there is no valid session and
`403 FORBIDDEN` when the authenticated account has the wrong role. Resource
services and database policies apply the more specific ownership, class
assignment, and enrollment checks described below.

### Mutation origin

Every mutation request (`POST`, `PUT`, `PATCH`, or `DELETE`) must include an
`Origin` header exactly matching the backend's configured frontend origin.
Requests from another or missing origin return `403 INVALID_ORIGIN`.

### Response envelope

Successful responses with a body use:

```json
{
  "data": {}
}
```

List endpoints place an array in `data`. Create endpoints return `201`; successful
deletions and logout return `204` with no response body. Other successful
operations return `200`.

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Kiểm tra lại dữ liệu đã nhập.",
    "fields": {
      "title": "Nhập tên bài kiểm tra."
    }
  }
}
```

`fields` is included only when field-level details are available.

### Canonical values

| Group | Values |
| --- | --- |
| Role | `ADMIN`, `TEACHER`, `STUDENT` |
| Account status | `PENDING`, `ACTIVE`, `LOCKED` |
| Assignment status | `DRAFT`, `OPEN`, `CLOSED` |
| Submission status | `SUBMITTED`, `PROCESSING`, `REQUIRES_REVIEW`, `FINALIZED` |
| Mock AI suggested status | `COMPLETED`, `NEEDS_COMPLETION`, `REQUIRES_TEACHER_REVIEW` |
| Final Teacher status | `COMPLETED`, `NEEDS_COMPLETION` |

All date-time values are RFC 3339 timestamps. Assignment `due_at` input must
include a timezone offset or `Z`, for example `2026-09-18T23:59:00+07:00`.

## Health and authentication

```http
GET /api/health
```

Returns `{ "data": { "status": "ok" } }`.

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "teacher@educraft.test",
  "password": "teacher123"
}
```

Login returns the active profile in `data` and sets the HttpOnly cookies.

```http
POST /api/auth/refresh
POST /api/auth/logout
GET /api/auth/me
```

Refresh uses the refresh cookie, rotates both cookies, and returns the active
profile. Logout revokes the current session and clears both cookies. `GET
/api/auth/me` returns the profile for the current session. `PENDING` and `LOCKED`
accounts receive `403 ACCOUNT_NOT_ACTIVE`.

## Assignment CRUD

All assignment CRUD routes require an authenticated `TEACHER`. The Teacher may
list, create, read, update, or delete assignments only for a class currently
assigned to that Teacher. The Teacher identity and `created_by` value come from
the authenticated session and must not be supplied by the client.

### List assignments for a class

```http
GET /api/classes/:classId/assignments
```

Returns the assigned class's assignments in descending `created_at` order:

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "class_id": "22222222-2222-4222-8222-222222222222",
      "created_by": "33333333-3333-4333-8333-333333333333",
      "title": "Bài ghi Chuyện người con gái Nam Xương",
      "due_at": "2026-09-18T23:59:00+07:00",
      "coverage_threshold": 80,
      "status": "OPEN",
      "created_at": "2026-09-14T09:00:00Z",
      "updated_at": "2026-09-14T09:00:00Z"
    }
  ]
}
```

### Create an assignment

```http
POST /api/classes/:classId/assignments
Content-Type: application/json
```

```json
{
  "title": "Bài ghi Chuyện người con gái Nam Xương",
  "due_at": "2026-09-18T23:59:00+07:00",
  "coverage_threshold": 80,
  "status": "OPEN"
}
```

`title` is required and limited to 160 characters. `coverage_threshold` is a
number from 0 through 100 and defaults to `80`. `status` defaults to `DRAFT` and
must be `DRAFT`, `OPEN`, or `CLOSED`. An `OPEN` assignment must have a `due_at`
strictly in the future. Unknown and immutable fields are rejected. Returns the
created assignment with `201`.

### Read an assignment

```http
GET /api/assignments/:assignmentId
```

Returns the same assignment representation shown above.

### Update an assignment

```http
PATCH /api/assignments/:assignmentId
Content-Type: application/json
```

The body must contain at least one editable field:

```json
{
  "title": "Bài ghi nghị luận đã cập nhật",
  "due_at": "2026-09-20T23:59:00+07:00",
  "coverage_threshold": 85,
  "status": "OPEN"
}
```

The same field rules as creation apply. The class, creator, identifier, and
timestamps cannot be changed through this endpoint. If the resulting status is
`OPEN`, the resulting `due_at` must be in the future.

### Delete an assignment

```http
DELETE /api/assignments/:assignmentId
```

Returns `204` after deleting an assignment managed by the assigned Teacher.
Deletion is allowed only when the assignment has no reference files and no student
submissions. If related data exists, the API returns `409 ASSIGNMENT_HAS_DATA` so
the submission history and private Storage objects are not orphaned.

## Reference materials

An assignment may have multiple reference files. All reference routes require an
authenticated `TEACHER` currently assigned to the assignment's class.

Reference records have this shape:

```json
{
  "id": "44444444-4444-4444-8444-444444444444",
  "assignment_id": "11111111-1111-4111-8111-111111111111",
  "storage_path": "11111111-1111-4111-8111-111111111111/generated-file.png",
  "signed_url": "https://storage.example/signed/reference.png?token=...",
  "original_filename": "bai-mau.png",
  "mime_type": "image/png",
  "size_bytes": 1800000,
  "uploaded_by": "33333333-3333-4333-8333-333333333333",
  "created_at": "2026-09-14T09:15:00Z"
}
```

### List references

```http
GET /api/assignments/:assignmentId/references
```

Returns all reference records for the assignment as an array in `data`, ordered
by `created_at` ascending. Each record includes a short-lived `signed_url` that
can be used by the authorized Teacher to display the private image.

### Upload another reference

```http
POST /api/assignments/:assignmentId/references
Content-Type: multipart/form-data
```

The multipart field name is `file`. The file is required and must be JPEG, PNG,
or WebP with valid content matching its declared MIME type. Its maximum size is
5 MiB (`5 * 1024 * 1024` bytes). Each successful POST appends a new reference
record and returns it with `201`.

### Replace one reference

```http
PUT /api/assignments/:assignmentId/references/:referenceId
Content-Type: multipart/form-data
```

The `file` rules are the same as upload. This replaces only the reference
identified by `referenceId`; it does not replace the assignment's other
references. Returns the updated reference record.

### Delete one reference

```http
DELETE /api/assignments/:assignmentId/references/:referenceId
```

Deletes only the selected reference and returns `204`.

## Student submission

### Create an initial submission or resubmission

```http
POST /api/assignments/:assignmentId/submissions
Content-Type: multipart/form-data
```

This route requires an authenticated `STUDENT`. The only upload field is the
required `file`, with the same JPEG, PNG, WebP, content-signature, and 5 MiB rules
as reference uploads.

The client must not provide `student_id`, `studentId`, `attempt_number`, a
submission identifier, or a storage path. Student identity comes from the
authenticated session. The database assigns the next safe `attempt_number`, and
every successful POST creates a new submission record rather than overwriting an
earlier attempt.

The Student must currently be enrolled in the assignment's class. The assignment
must be `OPEN`, and database time must still be before `due_at`. These rules are
rechecked when the attempt is created. `DRAFT`, `CLOSED`, and expired assignments
reject new attempts.

Example `201` response:

```json
{
  "data": {
    "id": "55555555-5555-4555-8555-555555555555",
    "assignment_id": "11111111-1111-4111-8111-111111111111",
    "student_id": "66666666-6666-4666-8666-666666666666",
    "attempt_number": 2,
    "status": "SUBMITTED",
    "submitted_at": "2026-09-14T09:30:00Z",
    "created_at": "2026-09-14T09:30:00Z",
    "updated_at": "2026-09-14T09:30:00Z",
    "file": {
      "id": "77777777-7777-4777-8777-777777777777",
      "submission_id": "55555555-5555-4555-8555-555555555555",
      "storage_path": "55555555-5555-4555-8555-555555555555/generated-file.jpg",
      "signed_url": "https://storage.example/signed/submission.jpg?token=...",
      "original_filename": "bai-ghi.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 2480000,
      "page_order": 1,
      "created_at": "2026-09-14T09:30:00Z"
    }
  }
}
```

## Submission reads

### Student history for one assignment

```http
GET /api/assignments/:assignmentId/my-submissions
```

This route is `STUDENT` only. The Student must currently belong to the
assignment's class. It returns only that authenticated Student's attempts,
ordered by `attempt_number`, then submission time and ID. Closed or expired
assignments remain readable.

Each student item contains `id`, `assignment_id`, `attempt_number`, `status`,
`submitted_at`, and `files`. Each file includes a short-lived `signed_url` that
can be used by the submitting Student to display the private image. It does not
expose another Student's identity or any
AI evaluation. A `teacher_result` is included only when the Teacher review for
that exact attempt is finalized:

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "assignment_id": "11111111-1111-4111-8111-111111111111",
  "attempt_number": 2,
  "status": "FINALIZED",
  "submitted_at": "2026-09-14T09:30:00Z",
  "files": [],
  "teacher_result": {
    "final_status": "COMPLETED",
    "final_score": 92,
    "feedback": "Bài ghi đạt yêu cầu.",
    "is_finalized": true,
    "finalized_at": "2026-09-14T10:00:00Z"
  }
}
```

Before finalization, `teacher_result` is omitted entirely.

### Teacher submissions for one assignment

```http
GET /api/assignments/:assignmentId/submissions
```

This route is `TEACHER` only and requires the Teacher to be assigned to the
assignment's class. It returns all Students' attempts for that assignment. In
addition to common submission and file fields, each item includes `student_id`,
timestamps, a limited `student` profile (`id`, `full_name`, `student_code`), and
the attempt's `teacher_review` when one exists. AI evaluation data is retrieved
through the separate Teacher-only endpoints below.

### Read one submission

```http
GET /api/submissions/:submissionId
```

This route accepts an authenticated `STUDENT` or `TEACHER`:

- A Student may read only their own submission and must still belong to its
  assignment's class. The Student receives the student-safe representation
  described above.
- A Teacher may read only a submission whose assignment belongs to a class
  currently assigned to that Teacher. The Teacher receives the Teacher
  representation described above.

## Mock AI evaluation

```http
POST /api/submissions/:submissionId/ai-evaluation
GET /api/submissions/:submissionId/ai-evaluation
```

Both routes require an authenticated `TEACHER` currently assigned to the
submission's class. `POST` runs the deterministic mock evaluation workflow and
returns the resulting submission status and evaluation:

```json
{
  "data": {
    "submission_id": "55555555-5555-4555-8555-555555555555",
    "submission_status": "REQUIRES_REVIEW",
    "evaluation": {
      "id": "88888888-8888-4888-8888-888888888888",
      "submission_id": "55555555-5555-4555-8555-555555555555",
      "coverage_score": 82,
      "confidence": 0.84,
      "suggested_status": "REQUIRES_TEACHER_REVIEW",
      "missing_content": ["Bổ sung phần kết luận."],
      "feedback_draft": "Đánh giá mô phỏng: bài ghi đủ ý chính, cần giáo viên xem lại phần kết luận.",
      "model_name": "educraft-mock-evaluator",
      "model_version": "1.0",
      "created_at": "2026-09-14T09:45:00Z"
    }
  }
}
```

`GET` returns the evaluation object directly in `data`. The evaluation is an
internal mock suggestion for Teacher review. It never finalizes a submission or
sets the Teacher's final result. Students never receive coverage, confidence,
suggested status, missing-content, feedback-draft, or model fields. The AI
workflow cannot modify a `FINALIZED` submission.

## Teacher finalization

```http
PATCH /api/submissions/:submissionId/review
Content-Type: application/json
```

This route requires an authenticated `TEACHER` currently assigned to the
submission's class.

```json
{
  "final_status": "COMPLETED",
  "final_score": 92,
  "feedback": "Bài ghi đạt yêu cầu."
}
```

`final_status` is required and must be `COMPLETED` or `NEEDS_COMPLETION`.
`final_score` is optional; when supplied it must be a JSON number from 0 through
100. `feedback` is required and must remain nonblank after trimming. Unknown
fields are rejected.

The client must not provide a Teacher identity, `is_finalized`, `finalized_at`,
or submission status. Teacher identity comes from the authenticated session.
Finalization atomically writes the finalized Teacher review and changes only the
selected submission attempt to `FINALIZED`. Re-finalizing an already finalized
attempt is rejected.

Example response:

```json
{
  "data": {
    "submission_id": "55555555-5555-4555-8555-555555555555",
    "submission_status": "FINALIZED",
    "teacher_review": {
      "id": "99999999-9999-4999-8999-999999999999",
      "final_status": "COMPLETED",
      "final_score": 92,
      "feedback": "Bài ghi đạt yêu cầu.",
      "is_finalized": true,
      "finalized_at": "2026-09-14T10:00:00Z"
    }
  }
}
```

The AI suggestion remains separate and does not determine this decision. The
owning Student sees the Teacher result through submission read endpoints only
after finalization.
