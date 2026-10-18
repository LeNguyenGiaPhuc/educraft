import { AppError } from '../../common/errors.js'

const ALLOWED_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'REFUSED'])

function optionalNonNegativeNumber(value) {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function safeText(value, maxLength = 200) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, maxLength) : null
}

function usageRow({ submissionId, evaluationId, interaction }) {
  const status = ALLOWED_STATUSES.has(interaction.status)
    ? interaction.status
    : 'FAILED'

  return {
    submission_id: submissionId,
    evaluation_id: evaluationId ?? null,
    stage: safeText(interaction.stage, 50) ?? 'unknown',
    provider: safeText(interaction.provider, 50) ?? 'unknown',
    model_name: safeText(interaction.model_name),
    prompt_version: safeText(interaction.prompt_version, 100),
    status,
    input_tokens: optionalNonNegativeNumber(interaction.input_tokens),
    output_tokens: optionalNonNegativeNumber(interaction.output_tokens),
    latency_ms: optionalNonNegativeNumber(interaction.latency_ms),
    cost_usd: optionalNonNegativeNumber(interaction.cost_usd),
    error_code: status === 'SUCCEEDED'
      ? null
      : safeText(interaction.error_code, 100) ?? 'AI_PROVIDER_FAILED',
  }
}

export function createAiUsageRecorder({ adminClient, logger = console } = {}) {
  return {
    async record({ submissionId, evaluationId = null, interactions = [] }) {
      if (!adminClient?.from || interactions.length === 0) return

      const rows = interactions.map((interaction) => usageRow({
        submissionId,
        evaluationId,
        interaction,
      }))

      try {
        const result = await adminClient.from('ai_usage_logs').insert(rows)
        if (result.error) throw result.error
      } catch (error) {
        logger.error({
          event: 'ai_usage_log_failed',
          submissionId,
          errorCode: error?.code ?? 'AI_USAGE_LOG_FAILED',
        })
      }
    },
  }
}

function requireAdmin(auth) {
  if (auth?.profile?.role !== 'ADMIN' || auth.profile.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem thống kê AI.')
  }
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

export function createAiUsageService({ adminClient } = {}) {
  return {
    async getSummary(auth) {
      requireAdmin(auth)

      let result
      try {
        result = await adminClient.rpc('get_ai_usage_summary')
      } catch {
        throw new AppError(500, 'AI_USAGE_READ_FAILED', 'Không thể tải thống kê AI.')
      }

      if (result.error) {
        throw new AppError(500, 'AI_USAGE_READ_FAILED', 'Không thể tải thống kê AI.')
      }

      const row = Array.isArray(result.data) ? result.data[0] : result.data
      return {
        total_calls: numberOrZero(row?.total_calls),
        failed_calls: numberOrZero(row?.failed_calls),
        refused_calls: numberOrZero(row?.refused_calls),
        avg_latency_ms: row?.avg_latency_ms == null
          ? null
          : numberOrZero(row.avg_latency_ms),
        avg_cost_usd: row?.avg_cost_usd == null
          ? null
          : numberOrZero(row.avg_cost_usd),
        priced_calls: numberOrZero(row?.priced_calls),
        unpriced_calls: numberOrZero(row?.unpriced_calls),
      }
    },
  }
}
