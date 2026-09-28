import { randomUUID } from 'node:crypto'

import { AppError } from '../../common/errors.js'
import { chunkTranscription } from './ragChunker.js'

const DOCUMENT_COLUMNS = [
  'id',
  'assignment_id',
  'reference_file_id',
  'source_fingerprint',
  'embedding_model',
  'embedding_dimensions',
  'chunking_version',
  'index_status',
].join(',')

function indexFailed() {
  return new AppError(
    502,
    'RAG_INDEX_FAILED',
    'Không thể lập chỉ mục bài mẫu cho đánh giá AI.',
  )
}

function retrievalFailed() {
  return new AppError(
    502,
    'RAG_RETRIEVAL_FAILED',
    'Không thể truy xuất nội dung bài mẫu cho đánh giá AI.',
  )
}

function contextEmpty() {
  return new AppError(
    422,
    'RAG_CONTEXT_EMPTY',
    'Không tìm thấy nội dung phù hợp trong bài mẫu.',
  )
}

function sourceFingerprint(file) {
  return [
    file?.storage_path,
    file?.size_bytes,
    file?.created_at,
  ].map((value) => String(value ?? '')).join('|')
}

function isFresh(document, fingerprint, config) {
  return document?.index_status === 'READY'
    && document.source_fingerprint === fingerprint
    && document.embedding_model === config.embeddingModel
    && Number(document.embedding_dimensions) === config.embeddingDimensions
    && Number(document.chunking_version) === config.indexVersion
}

async function readQuery(builder, errorFactory) {
  try {
    const result = await builder
    if (result?.error) throw errorFactory()
    return result?.data
  } catch (error) {
    if (error instanceof AppError) throw error
    throw errorFactory()
  }
}

export function createRagService({
  adminClient,
  embeddingProvider,
  visionProvider,
  config = {},
} = {}) {
  const settings = {
    embeddingModel: config.embeddingModel ?? 'nomic-embed-text-v2-moe:latest',
    embeddingDimensions: config.embeddingDimensions ?? 768,
    chunkSize: config.chunkSize ?? 800,
    chunkOverlap: config.chunkOverlap ?? 120,
    matchCount: config.matchCount ?? 5,
    minSimilarity: config.minSimilarity ?? 0.35,
    indexVersion: config.indexVersion ?? 1,
  }

  async function readDocuments(assignmentId) {
    const data = await readQuery(
      adminClient
        .from('rag_reference_documents')
        .select(DOCUMENT_COLUMNS)
        .eq('assignment_id', assignmentId),
      indexFailed,
    )
    return data ?? []
  }

  function findImage(referenceFile, referenceFiles, referenceImages) {
    const referenceIndex = referenceFiles.indexOf(referenceFile)
    return referenceImages.find((image) => image.reference_file_id === referenceFile.id)
      ?? referenceImages.find((image) => image.order === referenceIndex + 1)
  }

  async function indexReference({ assignmentId, referenceFile, referenceFiles, referenceImages, existing }) {
    const image = findImage(referenceFile, referenceFiles, referenceImages)
    if (!image || typeof visionProvider?.transcribeImages !== 'function') throw indexFailed()

    const fingerprint = sourceFingerprint(referenceFile)
    const documentId = existing?.id ?? randomUUID()
    const pendingDocument = {
      id: documentId,
      assignment_id: assignmentId,
      reference_file_id: referenceFile.id,
      transcription: existing?.transcription || 'Đang lập chỉ mục',
      source_fingerprint: fingerprint,
      embedding_model: settings.embeddingModel,
      embedding_dimensions: settings.embeddingDimensions,
      chunking_version: settings.indexVersion,
      index_status: 'PENDING',
      indexed_at: null,
      error_message: null,
    }

    try {
      const transcriptionResult = await visionProvider.transcribeImages({
        images: [image],
        source: 'reference',
      })
      const transcription = String(transcriptionResult?.transcription ?? '').trim()
      if (!transcription) throw indexFailed()

      const chunks = chunkTranscription(transcription, {
        chunkSize: settings.chunkSize,
        overlap: settings.chunkOverlap,
      })
      if (chunks.length === 0 || typeof embeddingProvider?.embedTexts !== 'function') {
        throw indexFailed()
      }

      const embeddings = await embeddingProvider.embedTexts(
        chunks.map((chunk) => chunk.content),
      )
      if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
        throw indexFailed()
      }

      await readQuery(
        adminClient
          .from('rag_reference_documents')
          .upsert(pendingDocument, { onConflict: 'reference_file_id' })
          .select('id')
          .single(),
        indexFailed,
      )
      await readQuery(
        adminClient
          .from('rag_reference_chunks')
          .delete()
          .eq('document_id', documentId),
        indexFailed,
      )
      await readQuery(
        adminClient
          .from('rag_reference_chunks')
          .insert(chunks.map((chunk, index) => ({
            document_id: documentId,
            assignment_id: assignmentId,
            chunk_index: chunk.index,
            content: chunk.content,
            embedding: embeddings[index],
          }))),
        indexFailed,
      )
      await readQuery(
        adminClient
          .from('rag_reference_documents')
          .update({
            transcription,
            index_status: 'READY',
            indexed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', documentId),
        indexFailed,
      )
    } catch (error) {
      if (error instanceof AppError && error.code === 'RAG_INDEX_FAILED') throw error
      throw indexFailed()
    }
  }

  return {
    async ensureAssignmentIndexed({ assignmentId, referenceFiles, referenceImages }) {
      if (!assignmentId || !Array.isArray(referenceFiles) || !referenceFiles.length) {
        throw indexFailed()
      }

      const documents = await readDocuments(assignmentId)
      const indexedReferenceIds = []
      const reusedReferenceIds = []

      for (const referenceFile of referenceFiles) {
        const existing = documents.find(
          (document) => document.reference_file_id === referenceFile.id,
        )
        if (isFresh(existing, sourceFingerprint(referenceFile), settings)) {
          reusedReferenceIds.push(referenceFile.id)
          continue
        }

        await indexReference({
          assignmentId,
          referenceFile,
          referenceFiles,
          referenceImages,
          existing,
        })
        indexedReferenceIds.push(referenceFile.id)
      }

      return { indexedReferenceIds, reusedReferenceIds }
    },

    async retrieveContext({ assignmentId, studentTranscription }) {
      const text = String(studentTranscription ?? '').trim()
      if (!text || typeof embeddingProvider?.embedTexts !== 'function') throw retrievalFailed()

      let embedding
      try {
        const embeddings = await embeddingProvider.embedTexts([text])
        embedding = embeddings?.[0]
      } catch {
        throw retrievalFailed()
      }
      if (!Array.isArray(embedding)) throw retrievalFailed()

      let result
      try {
        result = await adminClient.rpc('match_assignment_reference_chunks', {
          target_assignment_id: assignmentId,
          query_embedding: embedding,
          match_count: settings.matchCount,
          minimum_similarity: settings.minSimilarity,
        })
      } catch {
        throw retrievalFailed()
      }
      if (result?.error) throw retrievalFailed()
      if (!Array.isArray(result?.data) || result.data.length === 0) throw contextEmpty()

      return {
        chunks: result.data,
        embeddingModel: settings.embeddingModel,
        ragVersion: settings.indexVersion,
      }
    },
  }
}

