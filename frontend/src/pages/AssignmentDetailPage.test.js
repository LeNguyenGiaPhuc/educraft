import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

import { mapTeacherSubmission } from '../data/teacherSubmissionView.js'

let vite

before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    root: fileURLToPath(new URL('../..', import.meta.url)),
    server: { middlewareMode: true },
  })
})

after(async () => {
  await vite.close()
})

function submission(id, attemptNumber) {
  return mapTeacherSubmission({
    id,
    student_id: 'student-profile-1',
    attempt_number: attemptNumber,
    status: 'SUBMITTED',
    submitted_at: '2026-09-17T13:00:00Z',
    student: {
      full_name: 'Nguyen An Binh',
      student_code: 'student01',
    },
    files: [{ original_filename: 'notes.png' }],
  })
}

function reference(id, fileName) {
  return {
    id,
    fileName,
    uploadedAt: '2026-09-17T13:00:00Z',
    url: `https://example.test/private/${id}?token=signed`,
  }
}

async function renderReferenceCard(references) {
  const { ReferenceCard } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  return renderToStaticMarkup(React.createElement(ReferenceCard, {
    assignment: { id: 'assignment-1' },
    onChanged() {},
    references,
  }))
}

test('reference panel shows its empty state and first-upload control', async () => {
  const markup = await renderReferenceCard([])

  assert.match(markup, /Chưa có bài mẫu cho bài kiểm tra này/)
  assert.match(markup, /\+ Thêm bài mẫu/)
  assert.doesNotMatch(markup, /type="file"/)
})

test('reference panel renders one compact reference while keeping add available', async () => {
  const markup = await renderReferenceCard([reference('reference-a', 'a.png')])

  assert.match(markup, /a\.png/)
  assert.match(markup, /Tạo lúc/)
  assert.doesNotMatch(markup, /Đã thêm/)
  assert.match(markup, /aria-label="Thay bài mẫu"/)
  assert.match(markup, /aria-label="Xóa bài mẫu"/)
  assert.match(markup, /\+ Thêm bài mẫu/)
  assert.doesNotMatch(markup, /type="file"/)
})

test('reference panel preserves a long original filename in text and tooltip metadata', async () => {
  const longFileName = 'bai-mau-van-ban-nghi-luan-rat-dai-ban-chinh-thuc.webp'
  const markup = await renderReferenceCard([reference('reference-long', longFileName)])

  assert.match(markup, new RegExp(`title="${longFileName}"`))
  assert.match(markup, new RegExp(`>${longFileName}</strong>`))
  assert.match(markup, /aria-label="Thay bài mẫu"/)
  assert.match(markup, /aria-label="Xóa bài mẫu"/)
})

test('reference panel renders every filename and signed private view URL', async () => {
  const references = [
    reference('reference-a', 'a.png'),
    reference('reference-b', 'b.webp'),
    reference('reference-c', 'c.jpg'),
  ]
  const markup = await renderReferenceCard(references)

  for (const item of references) {
    assert.match(markup, new RegExp(item.fileName.replace('.', '\\.')))
    assert.match(markup, new RegExp(item.url.replace('?', '\\?')))
  }
  assert.equal((markup.match(/aria-label="Thay bài mẫu"/g) ?? []).length, 3)
  assert.equal((markup.match(/aria-label="Xóa bài mẫu"/g) ?? []).length, 3)
  assert.doesNotMatch(markup, /type="file"/)
})

test('replace editor identifies only the selected reference and exposes cancel and save', async () => {
  const { ReferenceEditor } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(ReferenceEditor, {
    editor: {
      mode: 'replace',
      referenceId: 'reference-b',
      file: null,
      error: '',
      status: 'idle',
      message: '',
    },
    onCancel() {},
    onFileChange() {},
    onSubmit() {},
  }))

  assert.match(markup, /id="reference-file-reference-b"/)
  assert.match(markup, /Chọn file thay thế/)
  assert.match(markup, /Hủy/)
  assert.match(markup, /Lưu thay đổi/)
  assert.equal((markup.match(/type="file"/g) ?? []).length, 1)
})

test('add editor renders exactly one file input with cancel and add actions', async () => {
  const { ReferenceEditor } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(ReferenceEditor, {
    editor: {
      mode: 'add',
      referenceId: null,
      file: null,
      error: '',
      status: 'idle',
      message: '',
    },
    onCancel() {},
    onFileChange() {},
    onSubmit() {},
  }))

  assert.match(markup, /id="reference-file-add"/)
  assert.match(markup, /Chọn bài mẫu mới/)
  assert.match(markup, /Hủy/)
  assert.match(markup, /Thêm bài mẫu/)
  assert.match(markup, /image\/webp/)
  assert.equal((markup.match(/type="file"/g) ?? []).length, 1)
})

test('reference operation errors render without removing existing reference UI', async () => {
  const { ReferenceFeedback } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const referenceMarkup = await renderReferenceCard([reference('reference-a', 'a.png')])
  const errorMarkup = renderToStaticMarkup(React.createElement(ReferenceFeedback, {
    state: { status: 'error', message: 'Không thể thay bài mẫu.' },
    successMessage: 'Đã thay bài mẫu.',
  }))

  assert.match(errorMarkup, /Không thể thay bài mẫu/)
  assert.match(referenceMarkup, /a\.png/)
})

test('Teacher submission list renders full name and distinct backend attempt numbers', async () => {
  const { SubmissionList } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(SubmissionList, {
    onSelect() {},
    selectedId: 'submission-2',
    submissions: [submission('submission-1', 1), submission('submission-2', 2)],
  }))

  assert.match(markup, /Nguyen An Binh/)
  assert.match(markup, /student01/)
  assert.match(markup, /Lần 1/)
  assert.match(markup, /Lần 2/)
})

test('selected review panel keeps the Student name and attempt visible', async () => {
  const { SubmissionReviewPanel } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(SubmissionReviewPanel, {
    onReviewed() {},
    submission: submission('submission-2', 2),
  }))

  assert.match(markup, /Nguyen An Binh/)
  assert.match(markup, /student01 · Lần 2/)
})

test('AI result card discloses teacher ownership, transcriptions, and uncertain segments', async () => {
  const { AiResultCard } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const evaluation = {
    provider: 'gemini',
    coverage_score: 82,
    confidence: 0.84,
    suggestedStatus: 'REQUIRES_TEACHER_REVIEW',
    strengths: ['Độ bao phủ nội dung: 82%'],
    weaknesses: ['Bổ sung kết luận'],
    feedbackDraft: 'Cần xem lại phần kết luận.',
    referenceTranscription: 'Bản chép bài mẫu',
    studentTranscription: 'Bản chép bài nộp',
    uncertainContent: [{
      source: 'submission',
      page: 2,
      text: 'ma sát?',
      reason: 'Nét chữ bị mờ',
    }],
  }
  const markup = renderToStaticMarkup(React.createElement(AiResultCard, { evaluation }))

  assert.match(markup, /Gợi ý AI/)
  assert.match(markup, /Bản chép bài mẫu/)
  assert.match(markup, /Bản chép bài nộp/)
  assert.match(markup, /Không chắc chắn/)
  assert.match(markup, /Bài nộp · trang 2/)
  assert.match(markup, /kết quả cuối cùng do giáo viên quyết định/)
  assert.doesNotMatch(markup, /Kết quả mô phỏng/)
})

test('AI result card shows saved RAG evidence and model metadata', async () => {
  const { AiResultCard } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const evaluation = {
    provider: 'ollama',
    modelName: 'qwen3-vl:2b',
    embeddingModel: 'nomic-embed-text-v2-moe:latest',
    ragVersion: 1,
    coverageScore: 82,
    confidence: 0.84,
    suggestedStatus: 'REQUIRES_TEACHER_REVIEW',
    strengths: ['Độ bao phủ nội dung: 82%'],
    weaknesses: ['Bổ sung kết luận'],
    feedbackDraft: 'Cần xem lại phần kết luận.',
    referenceTranscription: 'Bản chép bài mẫu',
    studentTranscription: 'Bản chép bài nộp',
    uncertainContent: [],
    retrievedContext: [{
      referenceFileId: 'reference-a',
      originalFilename: 'sample01.png',
      content: 'Đoạn bài mẫu liên quan đến tiến trình kinh tế.',
      similarity: 0.82,
    }],
  }
  const markup = renderToStaticMarkup(React.createElement(AiResultCard, { evaluation }))

  assert.match(markup, /Ngữ cảnh RAG/)
  assert.match(markup, /nomic-embed-text-v2-moe:latest/)
  assert.match(markup, /sample01\.png/)
  assert.match(markup, /Đoạn bài mẫu liên quan đến tiến trình kinh tế/)
  assert.match(markup, /82% tương đồng/)
})

test('AI result card keeps older evaluations valid without RAG evidence', async () => {
  const { AiResultCard } = await vite.ssrLoadModule('/src/pages/AssignmentDetailPage.jsx')
  const markup = renderToStaticMarkup(React.createElement(AiResultCard, {
    evaluation: {
      suggestedStatus: 'REQUIRES_TEACHER_REVIEW',
      confidence: 0,
      strengths: [],
      weaknesses: [],
      feedbackDraft: '',
      referenceTranscription: '',
      studentTranscription: '',
      uncertainContent: [],
      retrievedContext: [],
    },
  }))

  assert.doesNotMatch(markup, /Ngữ cảnh RAG/)
  assert.match(markup, /Chưa có bản chép bài mẫu/)
})

test('evaluation mapping keeps RAG fields optional and source readable', async () => {
  const { mapEvaluation } = await vite.ssrLoadModule('/src/components/assignment-detail/assignmentDetailView.js')
  const mapped = mapEvaluation({
    coverage_score: 74,
    confidence: 0.7,
    retrieved_context: [{
      reference_file_id: 'reference-a',
      original_filename: 'sample01.png',
      content: 'Đoạn tham chiếu',
      similarity: 0.73,
    }],
    embedding_model: 'nomic-test',
    rag_version: 1,
  })

  assert.equal(mapped.embeddingModel, 'nomic-test')
  assert.equal(mapped.ragVersion, 1)
  assert.deepEqual(mapped.retrievedContext, [{
    referenceFileId: 'reference-a',
    originalFilename: 'sample01.png',
    content: 'Đoạn tham chiếu',
    similarity: 0.73,
  }])
})

test('AI error mapping gives teachers an actionable local RAG message', async () => {
  const { formatAiEvaluationError } = await vite.ssrLoadModule('/src/components/assignment-detail/aiEvaluationMessages.js')

  assert.match(formatAiEvaluationError({ code: 'RAG_INDEX_FAILED' }), /lập chỉ mục bài mẫu/i)
  assert.match(formatAiEvaluationError({ code: 'AI_EMBEDDING_TIMEOUT' }), /embedding local/i)
  assert.match(formatAiEvaluationError({ code: 'AI_PROVIDER_FAILED', message: 'provider detail' }), /Ollama hoặc Gemini/i)
})
