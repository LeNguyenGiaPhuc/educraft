function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function validateOptions(chunkSize, overlap) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new TypeError('chunkSize must be a positive integer.')
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new TypeError('overlap must be an integer smaller than chunkSize.')
  }
}

function splitLongParagraph(paragraph, chunkSize, overlap) {
  const chunks = []
  let start = 0

  while (start < paragraph.length) {
    const maxEnd = Math.min(start + chunkSize, paragraph.length)
    let end = maxEnd

    if (maxEnd < paragraph.length) {
      const lastSpace = paragraph.lastIndexOf(' ', maxEnd)
      const minimumUsefulEnd = start + Math.floor(chunkSize / 2)
      if (lastSpace >= minimumUsefulEnd) end = lastSpace
    }

    const content = paragraph.slice(start, end).trim()
    if (content) chunks.push(content)
    if (end >= paragraph.length) break

    start = Math.max(start + 1, end - overlap)
  }

  return chunks
}

export function chunkTranscription(text, {
  chunkSize = 800,
  overlap = 120,
} = {}) {
  validateOptions(chunkSize, overlap)

  const normalized = normalizeText(text)
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const contents = []
  let current = ''

  function pushCurrent() {
    if (current) contents.push(current)
    current = ''
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      pushCurrent()
      contents.push(...splitLongParagraph(paragraph, chunkSize, overlap))
      continue
    }

    const combined = current ? `${current}\n\n${paragraph}` : paragraph
    if (combined.length <= chunkSize) {
      current = combined
    } else {
      pushCurrent()
      current = paragraph
    }
  }

  pushCurrent()
  return contents.map((content, index) => ({ index, content }))
}

