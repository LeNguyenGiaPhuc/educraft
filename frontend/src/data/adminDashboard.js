function nonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function mapAiUsage(data = {}) {
  data ??= {}
  const count = (value) => Number.isInteger(nonNegative(value)) ? value : null
  const total = count(data.total_calls)
  const priced = count(data.priced_calls)
  const unpriced = count(data.unpriced_calls)
  return {
    total, failed: count(data.failed_calls), refused: count(data.refused_calls),
    latency: nonNegative(data.avg_latency_ms),
    cost: priced > 0 ? nonNegative(data.avg_cost_usd) : null,
    priced, unpriced,
  }
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const cost = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD',
  minimumFractionDigits: 2, maximumFractionDigits: 8 })

export function aiUsageMetrics(data) {
  const usage = mapAiUsage(data)
  const format = (value) => value === null ? 'Chưa có số liệu' : number.format(value)
  return [
    { label: 'Lượt gọi AI', value: format(usage.total) },
    { label: 'Lượt gọi lỗi', value: format(usage.failed) },
    { label: 'Lượt bị từ chối', value: format(usage.refused) },
    { label: 'Độ trễ trung bình', value: usage.latency === null ? 'Chưa có số liệu' : `${format(usage.latency)} ms` },
    { label: 'Chi phí API trung bình', value: usage.cost === null ? 'Chưa có số liệu chi phí' : cost.format(usage.cost) },
  ]
}
