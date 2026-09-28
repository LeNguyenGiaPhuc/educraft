# Assignment-scoped RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a simple, persistent, assignment-scoped RAG pipeline to Teacher AI evaluation while preserving the current workflow and keeping the code easy to learn.

**Architecture:** Keep `aiEvaluationService.js` as the visible orchestrator. Add one pure chunker, one Ollama embedding provider, and one `ragService.js` that owns index cache, Supabase persistence, and retrieval. Reuse the existing AI providers for image transcription and JSON generation through two small methods.

**Tech Stack:** Node.js 20, Express, Supabase/Postgres pgvector, Ollama `/api/embed`, existing Ollama/Gemini providers, Zod, Node test runner, React/Vite.

**Spec:** `design/specs/2026-09-28-assignment-rag-design.md`

## Global Constraints

- Scope is one assignment and its existing reference images; no PDF/DOCX library.
- Embedding model is `nomic-embed-text-v2-moe:latest` with exactly 768 dimensions.
- Chunk size is 800 characters with 120-character overlap.
- Retrieval defaults to 5 chunks and a configurable minimum similarity of 0.35.
- RAG failure must not silently fall back to non-RAG evaluation.
- Existing Teacher review/finalization and coverage-threshold behavior must remain intact.
- Keep only three main RAG modules: `ragChunker.js`, `ollamaEmbeddingProvider.js`, and `ragService.js`.
- Production code is written only after a focused failing test has been observed.

## Review Focus

- A Vietnamese paragraph near a chunk boundary must keep its heading/context — covered by Task 2 chunker tests.
- Ollama returning a wrong vector dimension must fail clearly — covered by Task 3 embedding tests.
- A stale or replaced reference must rebuild only its document — covered by Task 4 cache tests.
- Retrieval must never cross assignment boundaries — covered by Task 4 RPC/service tests.
- Any RAG/provider failure must restore submission state — covered by Task 6 evaluation-service tests.

## Files and Responsibilities

### Database/configuration

- Create: `supabase/migrations/202609280001_assignment_rag.sql` — vector extension, RAG tables, evaluation evidence fields, RPC, indexes, grants, and policies.
- Create: `supabase/tests/005_assignment_rag_check.sql` — schema, RPC, vector dimension, cascade, and grant assertions.
- Modify: `backend/src/config/env.js` — RAG model, vector, chunk, retrieval, and index-version settings.
- Modify: `backend/.env.example` — documented local defaults.

### RAG core

- Create: `backend/src/modules/ai-evaluations/ragChunker.js` — deterministic chunking only.
- Test: `backend/tests/ragChunker.test.js` — boundaries, overlap, empty input, Vietnamese text, determinism.
- Create: `backend/src/modules/ai-evaluations/providers/ollamaEmbeddingProvider.js` — `/api/embed`, batching, timeout, 768-dimension validation.
- Test: `backend/tests/ollamaEmbeddingProvider.test.js` — request shape, valid response, invalid dimension, timeout/error.
- Create: `backend/src/modules/ai-evaluations/ragService.js` — cache check, reference index build, Supabase writes, assignment-scoped retrieval.
- Test: `backend/tests/ragService.test.js` — cache hit, invalidation, replacement, failure, retrieval filter, empty context.

### Existing backend integration

- Modify: `backend/src/modules/ai-evaluations/aiEvaluationInputService.js` — retain reference identity/source metadata in downloaded images and return a separate ordered student/reference input shape.
- Modify: `backend/src/modules/ai-evaluations/providers/ollamaAiProvider.js` — expose image transcription and text/context evaluation without removing the existing public behavior until the service migration is complete.
- Modify: `backend/src/modules/ai-evaluations/providers/geminiAiProvider.js` — implement the same small provider methods for compatibility.
- Modify: `backend/src/modules/ai-evaluations/aiEvaluationSchema.js` — prompt builder accepts retrieved context and response metadata remains validated.
- Modify: `backend/src/modules/ai-evaluations/aiEvaluationService.js` — call RAG index/retrieval, pass context to provider, persist evidence, preserve rollback and threshold policy.
- Modify: `backend/src/createDependencies.js` — construct the embedding provider and `ragService` with the configured values.
- Test: `backend/tests/aiEvaluationService.test.js` — orchestration, evidence persistence, RAG error rollback, existing-evaluation compatibility.
- Modify: `backend/tests/aiEvaluationInputService.test.js` — source metadata remains ordered and available to indexing.
- Modify: existing provider/schema tests — preserve Ollama/Gemini compatibility and validate context prompt.

### Frontend

- Modify: `frontend/src/components/assignment-detail/SubmissionReviewPanel.jsx` — clear first-run/local-AI message and specific retry errors.
- Modify: `frontend/src/components/assignment-detail/AiResultCard.jsx` — RAG badge, model/chunk metadata, expandable evidence.
- Modify: `frontend/src/components/assignment-detail/assignmentDetailView.js` — map optional `retrieved_context`, model, and RAG version without breaking older evaluations.
- Modify: `frontend/src/services/aiEvaluationService.js` only if the existing error mapper needs new backend codes.

## Implementation Tasks

### Task 1: Add database and configuration contract

**Files:** migration, Supabase check, env config, `.env.example` listed above.

- [ ] Write the failing Supabase check for `vector`, both RAG tables, the three evaluation fields, the RPC, vector dimension 768, assignment/reference cascades, and backend grants.
- [ ] Run the project’s Supabase migration/test command or the repository’s documented SQL test command and observe the expected missing-schema failure.
- [ ] Add the migration with `vector(768)`, assignment-scoped indexes, `retrieved_context jsonb default '[]'`, and a similarity RPC that filters `assignment_id` before ordering.
- [ ] Add environment parsing and safe defaults for the exact settings in the Global Constraints.
- [ ] Run the SQL check and `node --check`/backend lint for configuration files.
- [ ] Commit: `feat(ai): add pgvector RAG schema and settings`.

### Task 2: Implement deterministic text chunking

**Interfaces:**

```js
chunkTranscription(text, { chunkSize = 800, overlap = 120 } = {})
// returns Array<{ index: number, content: string }>
```

- [ ] Write failing tests for a Vietnamese heading/paragraph, overlap, empty/whitespace input, no empty chunks, and deterministic repeated calls.
- [ ] Run `npm test -- --test-name-pattern="chunk"` from `backend` and verify the missing-module failure.
- [ ] Implement the smallest paragraph-aware character chunker in `ragChunker.js`; do not add a tokenizer dependency.
- [ ] Run the focused tests and then all backend tests.
- [ ] Commit: `feat(ai): add deterministic RAG chunker`.

### Task 3: Implement Ollama embeddings

**Interfaces:**

```js
createOllamaEmbeddingProvider({ baseUrl, model, dimensions = 768, timeoutMs, fetchImpl })
provider.embedTexts(texts) // Promise<number[][]>
```

- [ ] Write failing tests using an injected fetch implementation for request model/input, valid multi-text response, wrong dimensions, non-2xx response, and abort timeout.
- [ ] Run the focused tests and verify they fail because the provider does not exist.
- [ ] Implement one small provider that calls `/api/embed`, validates every returned vector length, maps errors to `AI_EMBEDDING_*` AppErrors, and clears its timer.
- [ ] Run focused tests, all backend tests, and backend lint.
- [ ] Commit: `feat(ai): add Ollama embedding provider`.

### Task 4: Build the persistent RAG service

**Interfaces:**

```js
createRagService({ adminClient, storageService, embeddingProvider, visionProvider, config })
ragService.ensureAssignmentIndexed({ assignmentId, referenceFiles, referenceImages })
ragService.retrieveContext({ assignmentId, studentTranscription })
// retrieveContext returns { chunks, embeddingModel, ragVersion }
```

- [ ] Write failing tests with small fake Supabase/storage/provider dependencies for cache hit, missing index, stale model/version, source replacement, partial failure, assignment-scoped retrieval, similarity cutoff, and empty retrieval.
- [ ] Run the focused tests and verify expected failures before production code.
- [ ] Implement `ensureAssignmentIndexed` in a readable sequence: inspect cache, transcribe only missing/stale reference images, chunk, embed, replace chunks, then mark `READY`.
- [ ] Implement `retrieveContext`: embed the student transcription, call the single RPC, reject an empty result with `RAG_CONTEXT_EMPTY`, and return explainable source metadata.
- [ ] Keep all database access in this one service; do not add a repository abstraction.
- [ ] Run focused tests, full backend tests, backend lint, and the SQL check.
- [ ] Commit: `feat(ai): add persistent assignment RAG service`.

### Task 5: Adapt provider/input contracts

- [ ] Write failing provider tests proving transcription and generation can be called separately and that the generation prompt includes retrieved context.
- [ ] Run the focused provider/schema tests and verify the expected failures.
- [ ] Extract the existing transcription loop into `transcribeImages({ images, source })` in Ollama and Gemini providers.
- [ ] Add `generateEvaluation({ assignmentTitle, coverageThreshold, studentTranscription, retrievedContext, uncertainContent })` and preserve strict JSON parsing.
- [ ] Update input descriptors to retain `reference_file_id` and `original_filename` without changing image bytes/order or size limits.
- [ ] Run all provider, schema, and input-service tests plus lint.
- [ ] Commit: `refactor(ai): expose readable transcription and context contracts`.

### Task 6: Integrate RAG into Teacher evaluation

- [ ] Write failing service tests for the full order: index, student transcription, retrieval, generation, persistence; also test existing evaluation short-circuit and rollback after any RAG error.
- [ ] Run the focused service tests and verify the missing orchestration/evidence failure.
- [ ] Add `ragService` and embedding provider wiring in `createDependencies.js`.
- [ ] Change `runEvaluation()` to call RAG and pass only retrieved context to generation, while preserving status transitions and `applyCoveragePolicy`.
- [ ] Persist `retrieved_context`, `embedding_model`, and `rag_version` in the existing evaluation insert/update path.
- [ ] Run all backend tests, lint, and a manual local Ollama smoke test with one assignment.
- [ ] Commit: `feat(ai): integrate assignment RAG into evaluation flow`.

### Task 7: Add Teacher-facing evidence and errors

- [ ] Write/update frontend tests for processing copy, disabled retry, optional RAG metadata/evidence, specific error messages, and old evaluations without evidence.
- [ ] Run frontend tests and verify missing-field failures where applicable.
- [ ] Update the three assignment-detail files to render saved evidence without adding another retrieval request.
- [ ] Keep the existing visual language and final Teacher decision controls unchanged.
- [ ] Run frontend tests, lint, and production build.
- [ ] Commit: `feat(ai): show RAG evidence in Teacher review`.

### Task 8: End-to-end verification and handoff

- [ ] Run backend tests and lint.
- [ ] Run frontend tests, lint, and build.
- [ ] Run Supabase schema checks/migrations in the configured disposable environment.
- [ ] Run a live Ollama check proving first-run indexing, second-run cache reuse, reference replacement invalidation, assignment isolation, and saved evidence.
- [ ] Review `git diff`, `git status`, migration grants/RLS, logs for secrets, and changed-file scope.
- [ ] Commit any only-if-needed verification fix with a focused message.
- [ ] Report exact commands/results, remaining live-environment limitations, and the commits.

