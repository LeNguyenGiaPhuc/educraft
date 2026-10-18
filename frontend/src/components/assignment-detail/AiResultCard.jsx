import { finalStatusLabel } from './assignmentDetailView.js'

// Model lists have no backend item IDs. Content + duplicate occurrence is stable
// when a different item is inserted, unlike a key based on its array position.
function keyedItems(items, identify = item => String(item)) {
  const occurrences = new Map()
  return items.map(item => {
    const identity = identify(item)
    const occurrence = occurrences.get(identity) ?? 0
    occurrences.set(identity, occurrence + 1)
    return { item, key: `${identity}:${occurrence}` }
  })
}

export default function AiResultCard({ evaluation, coverageThreshold }) {
  const confidence = Number.isFinite(evaluation.confidence) ? Math.round(evaluation.confidence * 100) : null
  return (
    <section className="tk-ai-result" aria-labelledby="ai-result-title">
      <header className="tk-ai-result-heading"><h3 id="ai-result-title">Gợi ý AI</h3><span>Đề xuất, không phải quyết định</span></header>
      <dl className="tk-ai-measures">
        <div><dt>Độ bao phủ nội dung</dt><dd>{Number.isFinite(evaluation.coverageScore) ? `${evaluation.coverageScore}%` : 'Chưa có dữ liệu'}</dd></div>
        <div><dt>Ngưỡng đạt của bài</dt><dd>{Number.isFinite(Number(coverageThreshold)) && coverageThreshold != null ? `${coverageThreshold}%` : 'Chưa có dữ liệu'}</dd></div>
        <div><dt>Độ tin cậy do AI cung cấp</dt><dd>{confidence == null ? 'Chưa có dữ liệu' : `${confidence}%`}</dd></div>
      </dl>
      <p className="tk-ai-disclosure">Độ tin cậy là tự đánh giá của model, không phải độ chính xác đã được kiểm chứng. Giáo viên quyết định kết quả cuối cùng.</p>
      <p className="tk-ai-proposal">AI đề xuất: <strong>{finalStatusLabel(evaluation.suggestedStatus)}</strong></p>
      <div className="tk-ai-result-columns">
        <div><h4>Điểm mạnh</h4><ul tabIndex="0" aria-label="Điểm mạnh do AI cung cấp, có thể cuộn">{keyedItems(evaluation.strengths).map(({ item, key }) => <li key={key}>{item}</li>)}</ul></div>
        <div><h4>Nội dung cần bổ sung</h4><ul tabIndex="0" aria-label="Nội dung cần bổ sung do AI cung cấp, có thể cuộn">{keyedItems(evaluation.weaknesses).map(({ item, key }) => <li key={key}>{item}</li>)}</ul></div>
      </div>
      {evaluation.feedbackDraft && <details className="tk-review-disclosure"><summary>Nhận xét nháp của AI</summary><p tabIndex="0" aria-label="Nhận xét nháp có thể cuộn">{evaluation.feedbackDraft}</p></details>}
      <details className="tk-review-disclosure"><summary>Bản chép bài mẫu</summary><p tabIndex="0" aria-label="Bản chép bài mẫu có thể cuộn">{evaluation.referenceTranscription || 'Chưa có bản chép bài mẫu.'}</p></details>
      <details className="tk-review-disclosure"><summary>Bản chép bài nộp</summary><p tabIndex="0" aria-label="Bản chép bài nộp có thể cuộn">{evaluation.studentTranscription || 'Chưa có bản chép bài nộp.'}</p></details>
      <details className="tk-review-disclosure"><summary>Đoạn AI chưa chắc chắn ({evaluation.uncertainContent.length})</summary>
        {evaluation.uncertainContent.length === 0 ? <p>Không ghi nhận đoạn chưa chắc chắn.</p> : <ul tabIndex="0" aria-label="Các đoạn chưa chắc chắn có thể cuộn">{keyedItems(evaluation.uncertainContent, item => JSON.stringify([item.source, item.page, item.text, item.reason])).map(({ item, key }) => <li key={key}><strong>{item.source === 'reference' ? 'Bài mẫu' : 'Bài nộp'} · trang {item.page}</strong><p>{item.text} — {item.reason}</p></li>)}</ul>}
      </details>
    </section>
  )
}
