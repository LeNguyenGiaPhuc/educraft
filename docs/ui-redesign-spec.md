# EduCraft UI redesign specification

## Goal

Apply the supplied Stitch visual language to every existing EduCraft route in four reviewed groups while preserving backend behavior, role access, data meaning, and current Vietnamese workflows.

## Visual system

- Use Plus Jakarta Sans for product UI text.
- Use a light academic canvas (`#F8F9FF`), white panels, pale blue surfaces (`#EFF4FF`), dark navy text (`#0B1C30`), muted text (`#434655`), and clear blue primary actions (`#2563EB`).
- Use semantic green, amber, orange, and red only for success, pending/in-progress, needs-attention, and errors.
- Use 12px panel corners, modest borders/shadows, 44px controls, visible keyboard focus, and readable spacing.
- Use a white sidebar shell for Admin and Teacher; retain a compact top-navigation shell for Student; use a focused split/card layout for Login.
- Keep layouts responsive: full sidebar and columns on wide screens, collapsible/stacking navigation and one-column content on narrow screens.

## Workflow and data constraints

- Retain all routes, service calls, access guards, CRUD actions, confirmations, validation, loading/error/empty/success states, and form labels needed by current workflows.
- Admin student import uses only `STT`, `Họ và tên`, and `Email`; all rows must validate before import confirmation is enabled. Do not implement partial import or include unsupported birthday/gender/student-code fields.
- Teacher review displays real assignment, reference, submission-attempt, AI-evaluation, and teacher-finalization data. Do not invent numeric AI scores or administrative/audit features absent from the application.
- Student progress indicators reflect real assignment/submission/finalization states; no fake course journey or fabricated result is shown.
- Sample content may appear only where the running application already provides it.

## Review order

1. Shared design tokens, role shells, and Login.
2. Admin dashboard, accounts, classes, class detail, and Excel import.
3. Teacher dashboard, class detail, assignment create/detail, reference files, and review/finalize.
4. Student dashboard and submission/history/result.

After each group, run frontend tests, lint, build, and a viewport smoke check before proceeding.

## Design contract

- **Thesis:** EduCraft presents each role's real next action and current work state as the first thing users see.
- **Own-world:** A bright blue academic workspace with Plus Jakarta Sans, pale blue working surfaces, white navigation, compact semantic status chips, and restrained shadows.
- **Story:** Admin manages records, Teacher reviews submissions and decides, Student submits and follows the real result.
- **First viewport:** Role navigation remains immediately available; page title and primary action lead; the current task/data panel begins above the fold on desktop and stacks on mobile.
- **Form:** Existing operational application shaped by the user-pinned Stitch interface, position 1 of 1, seed `stitch-educraft-pinned`.
- **Finish:** `unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`.
