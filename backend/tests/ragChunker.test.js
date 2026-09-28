import assert from 'node:assert/strict'
import test from 'node:test'

import { chunkTranscription } from '../src/modules/ai-evaluations/ragChunker.js'

test('chunks Vietnamese headings and paragraphs without losing their order', () => {
  const chunks = chunkTranscription(
    '1. Tiền đề của cách mạng tư sản\n\nKinh tế hàng hóa phát triển mạnh ở Tây Âu và Bắc Mỹ.',
    { chunkSize: 70, overlap: 12 },
  )

  assert.ok(chunks.length >= 2)
  assert.equal(chunks[0].index, 0)
  assert.deepEqual(chunks.map((chunk) => chunk.index), chunks.map((_, index) => index))
  assert.ok(chunks.some((chunk) => chunk.content.includes('Tiền đề')))
  assert.ok(chunks.some((chunk) => chunk.content.includes('Kinh tế')))
})

test('keeps an overlap when one paragraph is longer than the chunk size', () => {
  const text = [
    'Kinh tế hàng hóa phát triển mạnh tạo điều kiện cho sản xuất tư bản chủ nghĩa.',
    'Những công trường thủ công và hoạt động thương nghiệp ngày càng mở rộng.',
    'Mâu thuẫn với chế độ phong kiến trở nên sâu sắc hơn.',
  ].join(' ')
  const chunks = chunkTranscription(text, { chunkSize: 90, overlap: 18 })

  assert.ok(chunks.length > 1)
  const firstWords = chunks[0].content.split(' ').slice(-2).join(' ')
  assert.ok(firstWords.length > 0)
  assert.ok(chunks[1].content.includes(firstWords))
})

test('returns no chunks for empty or whitespace-only input', () => {
  assert.deepEqual(chunkTranscription(''), [])
  assert.deepEqual(chunkTranscription('  \n\t  '), [])
})

test('does not return empty chunks and is deterministic', () => {
  const text = 'Đặc biệt, tư tưởng mới góp phần thức tỉnh quần chúng nhân dân.'
  const first = chunkTranscription(text, { chunkSize: 25, overlap: 5 })
  const second = chunkTranscription(text, { chunkSize: 25, overlap: 5 })

  assert.ok(first.every((chunk) => chunk.content.trim().length > 0))
  assert.deepEqual(second, first)
})

