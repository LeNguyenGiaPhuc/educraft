import { AppError } from '../../common/errors.js'

function invalidThresholdError() {
  return new AppError(
    500,
    'AI_COVERAGE_THRESHOLD_INVALID',
    'Ngưỡng đạt của bài kiểm tra không hợp lệ.',
  )
}

function invalidCoverageScoreError() {
  return new AppError(
    502,
    'AI_PROVIDER_INVALID_RESPONSE',
    'Dịch vụ AI trả về điểm bao phủ không hợp lệ.',
  )
}

function toBoundedNumber(value, errorFactory) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    throw errorFactory()
  }

  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 100) {
    throw errorFactory()
  }

  return number
}

export function validateCoverageThreshold(value) {
  return toBoundedNumber(value, invalidThresholdError)
}

export function deriveSuggestedStatus({ coverageScore, coverageThreshold }) {
  const score = toBoundedNumber(coverageScore, invalidCoverageScoreError)
  const threshold = validateCoverageThreshold(coverageThreshold)

  return score >= threshold ? 'COMPLETED' : 'NEEDS_COMPLETION'
}

export function applyCoveragePolicy(providerResult, coverageThreshold) {
  return {
    ...providerResult,
    suggested_status: deriveSuggestedStatus({
      coverageScore: providerResult.coverage_score,
      coverageThreshold,
    }),
  }
}
