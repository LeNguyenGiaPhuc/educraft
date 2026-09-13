# EduCraft Mock API Contract

This document defines the API contract for the EduCraft frontend prototype.
The current homework uses mock data instead of a running HTTP server. The
class management, assignment creation, teacher reference, student submission
and review flows use browser `localStorage` mock stores while the frontend is
developed.

## Base URL

```text
/api
```

## Response conventions

Successful responses return the resource in a `data` property. Errors use the
following shape:

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

## Endpoints

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Example request:

```json
{
  "email": "teacher@educraft.test",
  "password": "teacher123"
}
```

The response returns the active user and its role (`ADMIN`, `TEACHER` or
`STUDENT`). `pending` and `locked` accounts are rejected. The frontend keeps
the mock session in `educraft.session`.

### Get and manage accounts (Admin)

```http
GET /api/admin/accounts
POST /api/admin/accounts
PATCH /api/admin/accounts/:accountId
DELETE /api/admin/accounts/:accountId
PATCH /api/admin/accounts/:accountId/status
```

Status values are `pending`, `active` and `locked`. Locking is allowed only
for an active account; unlocking is allowed only for a locked account. A
pending imported Student must complete a later activation flow before login.

### Assign a teacher to a class (Admin)

```http
PATCH /api/classes/:classId/teacher
Content-Type: application/json
```

Example request:

```json
{
  "teacherId": "teacher-phuc"
}
```

One class has at most one active `teacherId`. Reassigning the class removes
the previous teacher's access.

### Get teacher classes

```http
GET /api/classes
```

Example response:

```json
{
  "data": [
    {
      "id": "10A1",
      "subject": "Ngữ văn",
      "name": "Ngữ văn 10A1",
      "studentCount": 42,
      "assignmentCount": 3
    }
  ]
}
```

### Get class detail

```http
GET /api/classes/10A1
```

Example response:

```json
{
  "data": {
    "id": "10A1",
    "name": "Ngữ văn 10A1",
    "studentCount": 42,
    "assignments": [],
    "students": []
  }
}
```

### Create a class

```http
POST /api/classes
Content-Type: application/json
```

Example request:

```json
{
  "id": "12B1",
  "subject": "Toán",
  "semester": "Học kỳ 2",
  "schoolYear": "Năm học 2026–2027"
}
```

Example response:

```json
{
  "data": {
    "id": "12B1",
    "subject": "Toán",
    "name": "Toán 12B1",
    "studentCount": 0,
    "assignmentCount": 0
  }
}
```

### Update a class

```http
PATCH /api/classes/12B1
Content-Type: application/json
```

Example request:

```json
{
  "subject": "Toán nâng cao",
  "semester": "Học kỳ 2",
  "schoolYear": "Năm học 2026–2027"
}
```

### Delete a class

```http
DELETE /api/classes/12B1
```

### Import students into a class

```http
POST /api/classes/12B1/students/import
Content-Type: application/json
```

The frontend reads the `.xlsx` file locally and only enables confirmation when
every row has the required `STT`, `Họ và tên` and `Email` columns. `STT` is a
display/order value; the normalized email identifies an account. A future API
can receive rows such as:

```json
{
  "students": [
    {
      "studentNumber": "01",
      "name": "Lê Cẩm Chi",
      "email": "chi@example.com"
    }
  ]
}
```

The server should persist each row as a class membership, not as a field on
the account:

```json
{
  "classId": "10A1",
  "studentId": "student-chi",
  "studentNumber": "01"
}
```

The same Student account may be a member of multiple classes, with a
different `studentNumber` in each class. A conflict in any row returns a
validation error and must not create partial accounts or memberships.

### Create an assignment

```http
POST /api/classes/10A1/assignments
Content-Type: application/json
```

Example request:

```json
{
  "title": "Bài ghi Chuyện người con gái Nam Xương",
  "dueAt": "2026-09-18T23:59",
  "threshold": 80
}
```

Example response:

```json
{
  "data": {
    "id": "assignment-003",
    "classId": "10A1",
    "title": "Bài ghi Chuyện người con gái Nam Xương",
    "dueDate": "18/09/2026, 23:59",
    "threshold": "80%",
    "submission": "0 học sinh đã nộp",
    "status": "Đang mở",
    "statusTone": "active"
  }
}
```

### Submit a note

```http
POST /api/assignments/assignment-003/submissions
Content-Type: application/json
```

Example request:

```json
{
  "studentId": "HS260101",
  "fileName": "bai-ghi-nam-xuong.jpg",
  "fileSizeBytes": 2480000
}
```

Example response:

```json
{
  "data": {
    "id": "submission-001",
    "assignmentId": "assignment-003",
    "studentId": "HS260101",
    "status": "submitted",
    "submittedAt": "2026-09-10T09:30:00+07:00"
  }
}
```

### Get assignment detail

```http
GET /api/assignments/assignment-003/detail
```

Example response:

```json
{
  "data": {
    "id": "assignment-003",
    "title": "Bài ghi Chuyện người con gái Nam Xương",
    "reference": {
      "assignmentId": "assignment-003",
      "fileName": "bai-mau-nam-xuong.png",
      "fileSizeBytes": 1800000,
      "uploadedAt": "2026-09-10T09:15:00+07:00"
    },
    "submissions": []
  }
}
```

### Upload a teacher reference

```http
POST /api/assignments/assignment-003/reference
Content-Type: application/json
```

Example request:

```json
{
  "fileName": "bai-mau-nam-xuong.png",
  "fileSizeBytes": 1800000
}
```

### Review a submission

```http
PATCH /api/submissions/submission-001/review
Content-Type: application/json
```

Example request:

```json
{
  "status": "approved",
  "score": 86,
  "feedback": "Bài ghi đầy đủ, cần bổ sung phần kết luận."
}
```

Example response:

```json
{
  "data": {
    "id": "submission-001",
    "status": "approved",
    "score": 86,
    "feedback": "Bài ghi đầy đủ, cần bổ sung phần kết luận."
  }
}
```

## Current implementation status

- `GET /api/classes` and `GET /api/classes/:classId` are represented by the
  dashboard and class-detail mock data functions. Class records are stored in
  the `educraft.classes` localStorage mock store.
- `POST /api/classes`, `PATCH /api/classes/:classId` and
  `DELETE /api/classes/:classId` are represented by the class management panel
  and `mockClassStore.js`.
- The Admin account list and the mock login flow represent the auth and
  account endpoints. Teacher class access is checked against `teacherId` (or
  migrated legacy `users.classIds` data).
- `POST /api/classes/:classId/assignments` is represented by
  `submitAssignmentDraft()` and the `localStorage` mock store.
- `POST /api/classes/:classId/students/import` is represented by
  `readStudentExcel()`, `previewAdminStudentImport()` and
  `provisionMockStudentsForClass()`. New student accounts are stored in
  `educraft.users` with `role: STUDENT`, `status: pending`, no password, and
  a membership in `educraft.classMemberships`; the Admin must confirm a valid
  preview before any mock account or membership is written.
- `POST /api/assignments/:assignmentId/submissions` is represented by
  `submitNote()` and the `educraft.submissions` localStorage mock store; the
  student-facing submit/resubmit screen consumes the same mock contract.
- `GET /api/assignments/:assignmentId/detail` is represented by
  `getAssignmentDetailSnapshot()` and combines the assignment, reference,
  teacher-side mock submissions and stored submissions.
- `POST /api/assignments/:assignmentId/reference` is represented by
  `submitReference()` and the `educraft.references` localStorage mock store.
- `PATCH /api/submissions/:submissionId/review` is represented by
  `reviewSubmission()` and updates the stored submission with the teacher's
  final score and feedback.
