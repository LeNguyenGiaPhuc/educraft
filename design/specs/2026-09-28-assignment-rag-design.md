# EduCraft Assignment RAG Design

**Date:** 2026-09-28  
**Status:** Approved design  
**Scope:** Teacher AI evaluation for one assignment  

## 1. Objective

Add retrieval-augmented generation (RAG) to the existing Teacher evaluation flow. The system must use the reference images already attached to an assignment as the only knowledge source for that assignment.

The first evaluation builds and persists the reference index. Later evaluations reuse it until a reference image, embedding model, or chunking version changes.

The implementation must preserve all current behavior:

- Teachers can request an AI suggestion for a submitted assignment.
- AI output remains a suggestion that a Teacher must review.
- The backend, not the model, derives the final suggested status from `coverage_score` and the assignment threshold.
- Existing finalized submissions and existing evaluations remain compatible.
- Provider failures restore a submission from `PROCESSING` to `SUBMITTED`.

## 2. Simplicity Constraint

The code is part of a student project and must be easy to learn and explain. Prefer a short, visible pipeline over many abstractions.

Only add three main RAG modules:

```text
backend/src/modules/ai-evaluations/
├── providers/
│   └── ollamaEmbeddingProvider.js
├── ragChunker.js
└── ragService.js
```

Responsibilities:

- `ragChunker.js`: one pure function for deterministic text chunking.
- `ollamaEmbeddingProvider.js`: only communicates with Ollama `/api/embed`.
- `ragService.js`: checks the cache, builds the index, writes/reads Supabase, and returns retrieved context.

Do not create separate repository, index, retrieval, strategy, factory, or job layers in this version. Extract another module only if a file becomes difficult to understand or a responsibility is reused independently.

Existing AI providers should expose a small shared contract rather than introduce a large provider hierarchy:

```js
provider.transcribeImages({ images, source })
provider.generateEvaluation({
  assignmentTitle,
  coverageThreshold,
  studentTranscription,
  retrievedContext,
  uncertainContent,
})
```

## 3. Approved Architecture

```text
Teacher starts AI analysis
        |
        v
AiEvaluationService authorizes the request
        |
        v
RagService checks the assignment reference index
        | cache stale or missing
        +------------------------------+
        | download reference images    |
        | OCR reference images         |
        | chunk transcription          |
        | Ollama embeds chunks         |
        | Supabase stores vectors      |
        +------------------------------+
        |
        v
AI provider transcribes the student images
        |
        v
Ollama embeds the student transcription
        |
        v
Supabase pgvector retrieves top-k assignment chunks
        |
        v
AI provider generates strict JSON from retrieved context
        |
        v
Zod validates output and coverage policy derives status
        |
        v
Evaluation and RAG evidence are saved
        |
        v
Teacher reviews and finalizes the result
```

RAG failures must not silently fall back to the previous full-reference prompt. A silent fallback would make the interface claim RAG behavior that did not occur.

## 4. Embedding Configuration

The local Ollama installation was probed with `nomic-embed-text-v2-moe:latest`. It returns vectors with exactly 768 dimensions.

New environment settings:

```env
OLLAMA_EMBEDDING_MODEL=nomic-embed-text-v2-moe:latest
RAG_EMBEDDING_DIMENSIONS=768
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
RAG_MATCH_COUNT=5
RAG_MIN_SIMILARITY=0.35
RAG_INDEX_VERSION=1
```

`RAG_MIN_SIMILARITY=0.35` is an initial demo configuration, not an academic correctness threshold. It must remain configurable and be adjusted using recorded test cases.

## 5. Database Design

Enable the Supabase `vector` extension and add two tables.

### 5.1 `rag_reference_documents`

One row describes the cached OCR/index state for one `reference_files` row.

```text
id                    uuid primary key
assignment_id         uuid not null
reference_file_id     uuid not null unique
transcription         text not null
source_fingerprint    text not null
embedding_model       text not null
embedding_dimensions  integer not null
chunking_version      integer not null
index_status          text not null: PENDING | READY | FAILED
indexed_at            timestamptz
error_message         text
created_at            timestamptz
updated_at            timestamptz
```

Foreign keys cascade from assignments and reference files so deleting a source removes its cached index.

The source fingerprint is based on stable reference metadata and/or a SHA-256 hash of downloaded bytes. A replacement must produce a different fingerprint even when it keeps the same reference ID.

### 5.2 `rag_reference_chunks`

```text
id             uuid primary key
document_id    uuid not null
assignment_id  uuid not null
chunk_index    integer not null
content        text not null
embedding      vector(768) not null
created_at     timestamptz
```

Constraints:

- Unique `(document_id, chunk_index)`.
- Foreign key to the document uses `ON DELETE CASCADE`.
- Assignment ID is stored directly to keep retrieval simple and explicitly scoped.

### 5.3 Evaluation evidence

Add these fields to `ai_evaluations`:

```text
retrieved_context  jsonb not null default '[]'
embedding_model    text
rag_version        integer
```

Each retrieved item contains only explainable evidence:

```json
{
  "reference_file_id": "uuid",
  "original_filename": "sample01.png",
  "chunk_index": 2,
  "content": "...",
  "similarity": 0.78
}
```

Existing evaluation rows remain valid because the new JSON field has a default and the other fields are nullable.

## 6. Chunking Rules

`chunkTranscription(text, { chunkSize, overlap })` is deterministic and uses these rules:

1. Normalize line endings and repeated whitespace without removing Vietnamese characters.
2. Prefer boundaries at headings, blank lines, and paragraphs.
3. Keep each chunk at or below approximately 800 characters.
4. Carry approximately 120 trailing characters into the next chunk.
5. Never return empty chunks.
6. Preserve source order using `chunk_index`.

The first version uses character-based chunking because it is transparent, dependency-free, and easy to demonstrate. Token-aware chunking is outside this scope.

## 7. Supabase Retrieval Contract

Add an RPC:

```text
match_assignment_reference_chunks(
  target_assignment_id uuid,
  query_embedding vector(768),
  match_count integer,
  minimum_similarity double precision
)
```

It must filter by assignment before returning results and order by cosine distance:

```sql
1 - (embedding <=> query_embedding) AS similarity
```

The function returns chunk ID, document/source identity, filename, content, chunk index, and similarity. It never performs an unscoped global search.

Replacing all chunks for a document must be atomic: the document is marked `READY` only after every chunk was written successfully. Unique constraints and upsert behavior prevent duplicate index rows if two first-time evaluations overlap.

## 8. Evaluation Flow Changes

`AiEvaluationService.runEvaluation()` remains the top-level orchestrator so the main flow is visible in one file.

New sequence:

1. Authorize the Teacher and validate submission state.
2. Return the existing evaluation when one already exists.
3. Load assignment, references, and student images.
4. Move `SUBMITTED` to `PROCESSING`.
5. Call `ragService.ensureAssignmentIndexed(...)`.
6. Call `provider.transcribeImages(...)` for student images.
7. Call `ragService.retrieveContext(...)` using the student transcription.
8. Call `provider.generateEvaluation(...)` with only the retrieved reference chunks.
9. Validate provider JSON.
10. Apply the deterministic coverage policy.
11. Persist evaluation, transcription, and retrieved evidence.
12. Move `PROCESSING` to `REQUIRES_REVIEW`.

On any error after entering `PROCESSING`, reuse the existing recovery behavior to restore `SUBMITTED`.

## 9. Cache and Invalidation

The index is rebuilt when any of these values changes:

- Reference source fingerprint.
- Embedding model name.
- Embedding dimension.
- RAG/chunking version.

Behavior by reference operation:

- Upload: no document exists, so the next evaluation indexes it.
- Replace: fingerprint changes, so the next evaluation rebuilds that document.
- Delete: foreign-key cascade removes its document and chunks.
- Unchanged reference: cached transcription and vectors are reused.

This lazy design avoids slowing down reference upload and keeps the first implementation synchronous and understandable.

## 10. Error Contract

Use specific application errors:

```text
RAG_REFERENCE_REQUIRED
RAG_INDEX_FAILED
RAG_EMBEDDING_FAILED
RAG_RETRIEVAL_FAILED
RAG_CONTEXT_EMPTY
```

The frontend maps them to useful Vietnamese messages. Logs may include operation names and durations, but must not print image base64, complete vectors, API keys, or complete student content.

## 11. Teacher Interface

Keep the existing page structure and enhance the AI result area.

While processing:

```text
Đang lập chỉ mục bài mẫu và phân tích bài nộp...
Lần phân tích đầu tiên có thể mất vài phút khi chạy AI local.
```

Do not display fake percentage progress. The current endpoint is synchronous and does not expose real phases.

After success, show:

- `RAG đang hoạt động` badge.
- Number of retrieved chunks.
- Embedding model name.
- Expandable `Nguồn kiến thức được truy xuất` section.
- Filename, similarity, and excerpt for each retrieved chunk.

The UI reads saved `retrieved_context`; it does not trigger another retrieval request merely to render the card.

The analyze/retry button remains disabled while a request is active.

## 12. Authorization and Privacy

- The browser never receives the Supabase service-role key.
- The backend verifies that the Teacher owns the assignment/class before indexing or retrieval.
- Vector search is always scoped to one assignment.
- RLS protects documents and chunks; backend-controlled writes occur only after authorization.
- Ollama mode keeps images, OCR text, embeddings, prompts, and generated responses local except for data intentionally persisted to Supabase.
- If `AI_PROVIDER=gemini` is selected later, retrieved text and student transcription leave the local machine; that deployment choice must be documented separately.

## 13. Verification Strategy

### Unit tests

- Chunk boundaries, overlap, empty input, Vietnamese text, and determinism.
- Ollama embed request, batch response, 768-dimension validation, timeout, and unavailable model.
- Cache hit, stale fingerprint, model/version invalidation, failed partial index, and retry.
- Assignment filtering, similarity cutoff, ordering, and empty retrieval.

### Service/integration tests

- Reference OCR to persisted vectors.
- Student OCR to top-k retrieval.
- Generation prompt contains retrieved chunks instead of all reference images/text.
- Evaluation persists RAG evidence.
- Provider/RAG error restores submission status.
- Coverage threshold continues to override the provider's suggested status.
- Reference deletion cascades to RAG records.

### Frontend tests

- Processing message and disabled button.
- RAG metadata and evidence rendering.
- Specific error messages.
- Compatibility with older evaluations that have no RAG evidence.

### Manual live verification

Use the existing Ollama and Supabase environment to prove:

1. The first evaluation creates document and chunk vectors.
2. The second evaluation reuses the reference index.
3. Replacing one reference rebuilds only that document.
4. Assignment A never retrieves a chunk from assignment B.
5. The UI evidence matches the chunks saved with the evaluation.

## 14. Acceptance Criteria

The feature is complete when:

- Existing Teacher evaluation and finalization workflows still work.
- RAG uses persisted 768-dimensional Ollama embeddings.
- Retrieval is assignment-scoped and returns explainable sources.
- Reference OCR and embeddings are reused when inputs are unchanged.
- Reference changes invalidate the correct cached content.
- No RAG failure silently falls back to non-RAG evaluation.
- Submission status recovery works for every failure stage.
- Deterministic threshold behavior remains covered by tests.
- The implementation follows the simplicity constraint and avoids unnecessary layers.

## 15. Out of Scope

- PDF or DOCX knowledge libraries.
- Class-wide or school-wide retrieval.
- Hybrid keyword/vector search.
- Background queues and worker processes.
- Streaming progress.
- Teacher editing of OCR text before indexing.
- Automatic grading without Teacher review.

