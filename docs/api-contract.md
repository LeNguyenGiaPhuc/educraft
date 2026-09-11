# EduCraft Mock API Contract

This document defines the API contract for the EduCraft frontend prototype.
The current homework uses mock data instead of a running HTTP server. The
assignment creation flow persists data in browser `localStorage` under the
`educraft.assignments` key. The submission and review endpoints are the
contract for the next workflow step.

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
  dashboard and class-detail mock data functions.
- `POST /api/classes/:classId/assignments` is represented by
  `submitAssignmentDraft()` and the `localStorage` mock store.
- `POST /api/assignments/:assignmentId/submissions` is represented by
  `submitNote()` and the `educraft.submissions` localStorage mock store.
- The review endpoint is documented here and will be connected to the next
  frontend workflow step.
