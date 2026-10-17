import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let vite
before(async () => {
  vite = await createServer({ appType: 'custom', logLevel: 'silent',
    root: fileURLToPath(new URL('../..', import.meta.url)), server: { middlewareMode: true } })
})
after(async () => { await vite.close() })

async function render(state) {
  const { AiUsageContent } = await vite.ssrLoadModule('/src/components/AdminAiUsagePanel.jsx')
  return renderToStaticMarkup(React.createElement(AiUsageContent, { state }))
}
test('AI panel renders loading, empty, error, priced and unpriced states', async () => {
  assert.match(await render({ status: 'loading' }), /role="status".*Đang tải thống kê AI/)
  assert.match(await render({ status: 'error', message: 'API chưa sẵn sàng' }), /role="alert".*API chưa sẵn sàng/)
  const empty = await render({ status: 'success', data: { total_calls: 0, priced_calls: 0 } })
  assert.match(empty, /Chưa có lượt gọi AI/)
  assert.match(empty, /Chưa có số liệu chi phí/)
  const priced = await render({ status: 'success', data: { total_calls: 1234, priced_calls: 40, unpriced_calls: 1194,
    avg_cost_usd: 0.0003, avg_latency_ms: 1423, failed_calls: 2, refused_calls: 3 } })
  assert.match(priced, /1\.234/)
  assert.match(priced, /0,0003/)
  assert.match(priced, /40 lượt có giá/)
  assert.match(priced, /1194 lượt chưa có giá/)
  assert.match(priced, /từ log đã lưu/)
})

test('wrong-role or locked user renders no AI data panel', async () => {
  const { default: Panel } = await vite.ssrLoadModule('/src/components/AdminAiUsagePanel.jsx')
  const { default: AuthContext } = await vite.ssrLoadModule('/src/contexts/AuthContext.js')
  for (const user of [null, { role: 'STUDENT', status: 'active' }, { role: 'ADMIN', status: 'locked' }]) {
    const markup = renderToStaticMarkup(React.createElement(AuthContext.Provider,
      { value: { user } }, React.createElement(Panel)))
    assert.equal(markup, '')
  }
})
