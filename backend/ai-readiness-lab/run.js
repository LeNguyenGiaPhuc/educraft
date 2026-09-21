import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createGeminiAiProvider } from '../src/modules/ai-evaluations/providers/geminiAiProvider.js'

const LAB_ROOT = path.dirname(fileURLToPath(import.meta.url))
const TEMPERATURES = [0.1, 0.7]
const MIME_TYPES = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
})

export function requireApiKey(env = process.env) {
  if (!String(env.GEMINI_API_KEY ?? '').trim()) {
    throw new Error('GEMINI_API_KEY is required to run the AI readiness lab.')
  }

  return env.GEMINI_API_KEY.trim()
}

function timestampLabel(value = Date.now()) {
  return new Date(value).toISOString().replace(/[:.]/g, '-')
}

function modelName(env) {
  return String(env.GEMINI_MODEL ?? 'gemini-3.8-flash').trim()
}

function mimeTypeFor(filePath) {
  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()]
  if (!mimeType) throw new Error(`Unsupported readiness-lab image type: ${filePath}`)
  return mimeType
}

async function loadImage(labRoot, relativePath) {
  const resolvedPath = path.resolve(labRoot, relativePath)
  const fixtureRoot = path.resolve(labRoot, 'fixtures')
  if (!resolvedPath.startsWith(`${fixtureRoot}${path.sep}`)) {
    throw new Error('Readiness-lab images must stay inside fixtures/.')
  }

  return {
    buffer: await readFile(resolvedPath),
    mimeType: mimeTypeFor(resolvedPath),
  }
}

async function loadCases(labRoot) {
  const value = JSON.parse(await readFile(path.join(labRoot, 'cases.json'), 'utf8'))
  if (!Array.isArray(value) || value.length !== 5) {
    throw new Error('Readiness lab manifest must contain exactly five cases.')
  }

  return value
}

function safeFailure(error) {
  return {
    status: error?.status ?? 502,
    code: error?.code ?? 'AI_LAB_CASE_FAILED',
    message: error instanceof Error && error.name === 'AppError'
      ? error.message
      : 'Readiness-lab case failed before a safe evaluation result was produced.',
  }
}

function resultRecord({ caseId, temperature, model, result, error }) {
  if (error) {
    return {
      case_id: caseId,
      temperature,
      model,
      prompt_version: null,
      latency_ms: null,
      schema_valid: false,
      confidence: null,
      error: safeFailure(error),
      evaluation: null,
      observed_quality: '',
      failure_notes: 'Điền sau khi xem thủ công case này.',
    }
  }

  return {
    case_id: caseId,
    temperature,
    model,
    prompt_version: result.prompt_version,
    latency_ms: result.latency_ms,
    schema_valid: true,
    confidence: result.confidence,
    error: null,
    evaluation: {
      coverage_score: result.coverage_score,
      suggested_status: result.suggested_status,
      missing_content: result.missing_content,
      feedback_draft: result.feedback_draft,
      reference_transcription: result.reference_transcription,
      student_transcription: result.student_transcription,
      uncertain_content: result.uncertain_content,
      provider: result.provider,
      model_name: result.model_name,
      model_version: result.model_version,
    },
    observed_quality: '',
    failure_notes: '',
  }
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function buildReport(records) {
  const lines = [
    '# EduCraft AI readiness lab',
    '',
    'Các cột `observed quality` và `failure/hallucination notes` cần được nhóm điền sau khi xem thủ công đủ 10 output.',
    '',
    '| Case | Temperature | Model | Prompt | Latency (ms) | Schema valid | Confidence | Observed quality | Failure / hallucination notes |',
    '| --- | ---: | --- | --- | ---: | --- | ---: | --- | --- |',
  ]

  records.forEach((record) => {
    lines.push([
      record.case_id,
      record.temperature,
      record.model,
      record.prompt_version ?? '-',
      record.latency_ms ?? '-',
      record.schema_valid ? 'yes' : 'no',
      record.confidence ?? '-',
      record.observed_quality,
      record.failure_notes || record.error?.message || '',
    ].map(markdownCell).join(' | ').replace(/^/, '| ').concat(' |'))
  })

  return `${lines.join('\n')}\n`
}

export async function runLab({
  env = process.env,
  labRoot = LAB_ROOT,
  outputRoot = path.join(labRoot, 'outputs'),
  now = Date.now,
} = {}) {
  const apiKey = requireApiKey(env)
  const cases = await loadCases(labRoot)
  const model = modelName(env)
  const outputDirectory = path.join(outputRoot, timestampLabel(now()))
  const records = []

  for (const testCase of cases) {
    const referenceImages = await Promise.all(
      testCase.reference.map((filePath) => loadImage(labRoot, filePath)),
    )
    const submissionImages = await Promise.all(
      testCase.submission.map((filePath) => loadImage(labRoot, filePath)),
    )

    for (const temperature of TEMPERATURES) {
      let record
      try {
        const provider = createGeminiAiProvider({
          apiKey,
          model,
          timeoutMs: Number(env.AI_TIMEOUT_MS ?? 30000),
          temperature,
        })
        const result = await provider.evaluate({
          assignmentTitle: 'Lực ma sát',
          coverageThreshold: 80,
          referenceImages: referenceImages.map((image, index) => ({ ...image, order: index + 1 })),
          submissionImages: submissionImages.map((image, index) => ({ ...image, order: index + 1 })),
        })
        record = resultRecord({
          caseId: testCase.id,
          temperature,
          model,
          result,
        })
      } catch (error) {
        record = resultRecord({
          caseId: testCase.id,
          temperature,
          model,
          error,
        })
      }

      await mkdir(outputDirectory, { recursive: true })
      await writeFile(
        path.join(outputDirectory, `${testCase.id}-temp-${temperature}.json`),
        `${JSON.stringify(record, null, 2)}\n`,
        'utf8',
      )
      records.push(record)
    }
  }

  await writeFile(path.join(outputDirectory, 'report.md'), buildReport(records), 'utf8')
  return { outputDirectory, records }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runLab()
    .then(({ outputDirectory }) => {
      console.log(`AI readiness lab completed: ${outputDirectory}`)
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'AI readiness lab failed.')
      process.exitCode = 1
    })
}
