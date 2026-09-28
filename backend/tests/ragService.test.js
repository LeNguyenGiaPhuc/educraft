import assert from 'node:assert/strict'
import test from 'node:test'

import { AppError } from '../src/common/errors.js'
import { createRagService } from '../src/modules/ai-evaluations/ragService.js'

const assignmentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const referenceId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const documentId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function referenceFile(overrides = {}) {
  return {
    id: referenceId,
    assignment_id: assignmentId,
    storage_path: 'assignment/reference-1.png',
    original_filename: 'sample01.png',
    size_bytes: 120,
    created_at: '2026-09-28T00:00:00.000Z',
    ...overrides,
  }
}

function referenceImage(file = referenceFile()) {
  return {
    reference_file_id: file.id,
    original_filename: file.original_filename,
    mimeType: 'image/png',
    order: 1,
    buffer: Buffer.from('image bytes'),
  }
}

function fingerprint(file) {
  return [file.storage_path, file.size_bytes, file.created_at].join('|')
}

function createAdminClient({ documents = [], rpcResult = { data: [], error: null }, failOn = null } = {}) {
  const calls = []
  const rpcCalls = []
  const client = {
    calls,
    rpcCalls,
    from(table) {
      const call = { table, operation: 'select', value: null, filters: [] }
      calls.push(call)
      const builder = {
        select(columns) {
          call.select = columns
          return builder
        },
        eq(column, value) {
          call.filters.push([column, value])
          return builder
        },
        upsert(value, options) {
          call.operation = 'upsert'
          call.value = value
          call.options = options
          return builder
        },
        update(value) {
          call.operation = 'update'
          call.value = value
          return builder
        },
        delete() {
          call.operation = 'delete'
          return builder
        },
        insert(value) {
          call.operation = 'insert'
          call.value = value
          return builder
        },
        single() {
          return builder
        },
        then(resolve, reject) {
          if (failOn === call.operation || failOn === table) {
            return Promise.resolve(reject(new Error('database failure')))
          }
          if (table === 'rag_reference_documents' && call.operation === 'select') {
            return Promise.resolve(resolve({ data: documents, error: null }))
          }
          if (table === 'rag_reference_documents' && call.operation === 'upsert') {
            return Promise.resolve(resolve({
              data: { id: call.value.id ?? documentId },
              error: null,
            }))
          }
          return Promise.resolve(resolve({ data: null, error: null }))
        },
      }
      return builder
    },
    async rpc(name, params) {
      rpcCalls.push({ name, params })
      return rpcResult
    },
  }
  return client
}

function createFixture(options = {}) {
  const file = options.file ?? referenceFile()
  const adminClient = createAdminClient(options)
  const visionCalls = []
  const embeddingCalls = []
  const service = createRagService({
    adminClient,
    visionProvider: {
      async transcribeImages(input) {
        visionCalls.push(input)
        return {
          transcription: 'Nội dung bài mẫu về cách mạng tư sản.',
          uncertain_content: [],
        }
      },
    },
    embeddingProvider: {
      async embedTexts(texts) {
        embeddingCalls.push(texts)
        if (options.embeddingError) throw options.embeddingError
        return texts.map(() => [0.1, 0.2, 0.3])
      },
    },
    config: {
      embeddingModel: 'nomic-test',
      embeddingDimensions: 3,
      chunkSize: 800,
      chunkOverlap: 120,
      matchCount: 5,
      minSimilarity: 0.35,
      indexVersion: 1,
    },
  })

  return {
    file,
    image: referenceImage(file),
    service,
    adminClient,
    visionCalls,
    embeddingCalls,
  }
}

test('reuses a READY reference index when its fingerprint and configuration match', async () => {
  const file = referenceFile()
  const fixture = createFixture({
    file,
    documents: [{
      id: documentId,
      assignment_id: assignmentId,
      reference_file_id: file.id,
      source_fingerprint: fingerprint(file),
      embedding_model: 'nomic-test',
      embedding_dimensions: 3,
      chunking_version: 1,
      index_status: 'READY',
    }],
  })

  const result = await fixture.service.ensureAssignmentIndexed({
    assignmentId,
    referenceFiles: [file],
    referenceImages: [fixture.image],
  })

  assert.deepEqual(result, { indexedReferenceIds: [], reusedReferenceIds: [referenceId] })
  assert.equal(fixture.visionCalls.length, 0)
  assert.equal(fixture.embeddingCalls.length, 0)
})

test('indexes a missing reference by transcribing, chunking, embedding, and storing it', async () => {
  const fixture = createFixture()

  const result = await fixture.service.ensureAssignmentIndexed({
    assignmentId,
    referenceFiles: [fixture.file],
    referenceImages: [fixture.image],
  })

  assert.deepEqual(result, { indexedReferenceIds: [referenceId], reusedReferenceIds: [] })
  assert.equal(fixture.visionCalls.length, 1)
  assert.deepEqual(fixture.visionCalls[0].images, [fixture.image])
  assert.deepEqual(fixture.embeddingCalls, [['Nội dung bài mẫu về cách mạng tư sản.']])
  const pendingWrite = fixture.adminClient.calls.find(
    (call) => call.table === 'rag_reference_documents' && call.operation === 'upsert',
  )
  assert.ok(pendingWrite.value.transcription.trim().length > 0)
  assert.ok(fixture.adminClient.calls.some((call) => call.operation === 'insert'))
  assert.ok(fixture.adminClient.calls.some((call) => call.operation === 'update'))
})

test('rebuilds a reference when its source fingerprint is stale', async () => {
  const file = referenceFile({ storage_path: 'assignment/replaced-reference.png' })
  const fixture = createFixture({
    file,
    documents: [{
      id: documentId,
      assignment_id: assignmentId,
      reference_file_id: file.id,
      source_fingerprint: 'old-fingerprint',
      embedding_model: 'nomic-test',
      embedding_dimensions: 3,
      chunking_version: 1,
      index_status: 'READY',
    }],
  })

  await fixture.service.ensureAssignmentIndexed({
    assignmentId,
    referenceFiles: [file],
    referenceImages: [fixture.image],
  })

  assert.equal(fixture.visionCalls.length, 1)
  assert.equal(fixture.embeddingCalls.length, 1)
})

test('maps an indexing dependency failure to a safe RAG error', async () => {
  const fixture = createFixture({
    embeddingError: new AppError(502, 'AI_EMBEDDING_FAILED', 'provider detail'),
  })

  await assert.rejects(
    fixture.service.ensureAssignmentIndexed({
      assignmentId,
      referenceFiles: [fixture.file],
      referenceImages: [fixture.image],
    }),
    (error) => error.code === 'RAG_INDEX_FAILED'
      && !error.message.includes('provider detail'),
  )
})

test('retrieves context with the exact assignment filter and configured top-k', async () => {
  const fixture = createFixture({
    rpcResult: {
      data: [{
        chunk_id: 'chunk-id',
        document_id: documentId,
        reference_file_id: referenceId,
        original_filename: 'sample01.png',
        chunk_index: 0,
        content: 'Nội dung liên quan.',
        similarity: 0.82,
      }],
      error: null,
    },
  })

  const result = await fixture.service.retrieveContext({
    assignmentId,
    studentTranscription: 'Bài nộp nói về tiền đề cách mạng.',
  })

  assert.equal(result.embeddingModel, 'nomic-test')
  assert.equal(result.ragVersion, 1)
  assert.equal(result.chunks[0].similarity, 0.82)
  assert.deepEqual(fixture.adminClient.rpcCalls[0], {
    name: 'match_assignment_reference_chunks',
    params: {
      target_assignment_id: assignmentId,
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
      minimum_similarity: 0.35,
    },
  })
})

test('rejects retrieval when no assignment context reaches the similarity cutoff', async () => {
  const fixture = createFixture({ rpcResult: { data: [], error: null } })

  await assert.rejects(
    fixture.service.retrieveContext({
      assignmentId,
      studentTranscription: 'Bài nộp.',
    }),
    (error) => error.code === 'RAG_CONTEXT_EMPTY',
  )
})

