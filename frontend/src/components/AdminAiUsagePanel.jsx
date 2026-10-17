import { useEffect, useState } from 'react'

import { useAuth } from '../contexts/useAuth.js'
import { aiUsageMetrics, mapAiUsage } from '../data/adminDashboard.js'
import { aiUsageService } from '../services/aiUsageService.js'
import { canAccessRole, ROLES } from '../services/authService.js'

export function AiUsageContent({ state }) {
  const usage = mapAiUsage(state.data)
  return (
    <section className="admin-panel admin-ai-usage" aria-labelledby="ai-usage-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="ai-usage-title">Sử dụng AI</h2>
          <p>Thống kê từ log đã lưu, tính theo từng lượt gọi AI.</p>
        </div>
      </div>
      {state.status === 'loading' && <p role="status">Đang tải thống kê AI...</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'success' && <>
        {usage.total === 0 && <p>Chưa có lượt gọi AI trong log đã lưu.</p>}
        <div className="admin-stat-grid admin-ai-stat-grid">
          {aiUsageMetrics(state.data).map((metric) => (
            <section className="admin-stat-card" key={metric.label}>
              <span className="admin-stat-value">{metric.value}</span>
              <strong>{metric.label}</strong>
            </section>
          ))}
        </div>
        <p>Chi phí trung bình trên {usage.priced ?? 'chưa xác định'} lượt có giá;
          {' '}{usage.unpriced ?? 'chưa xác định'} lượt chưa có giá. Chi phí máy chạy AI local chưa được đo.</p>
      </>}
    </section>
  )
}

export default function AdminAiUsagePanel() {
  const { user } = useAuth()
  const allowed = canAccessRole(user, [ROLES.ADMIN])
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    if (!allowed) return
    let active = true
    aiUsageService.getSummary()
      .then((data) => { if (active) setState({ status: 'success', data }) })
      .catch((error) => {
        if (active) setState({ status: 'error', message: error?.message ?? 'Không thể tải thống kê AI.' })
      })
    return () => { active = false }
  }, [allowed])
  return allowed ? <AiUsageContent state={state} /> : null
}
