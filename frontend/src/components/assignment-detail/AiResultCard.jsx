import { finalStatusLabel } from './assignmentDetailView.js'

export default function AiResultCard({ evaluation }) {
  return (
    <section className="ai-result-card teacher-ai-card" aria-labelledby="ai-result-title">
      <div className="ai-result-heading teacher-ai-heading">
        <div>
          <p className="state-kicker">Gợi ý AI</p>
          <h3 id="ai-result-title">AI đề xuất</h3>
        </div>
        <strong>{Math.round(evaluation.confidence * 100)}% tin cậy</strong>
      </div>
      <p className="ai-provider-disclosure">
        Đây là gợi ý hỗ trợ giáo viên; kết quả cuối cùng do giáo viên quyết định.
      </p>
      <div className="ai-score-row teacher-ai-status-row">
        <span>Trạng thái AI đề xuất</span>
        <strong>{finalStatusLabel(evaluation.suggestedStatus)}</strong>
      </div>
      <div className="ai-result-columns teacher-ai-columns">
        <div>
          <h4>Điểm mạnh</h4>
          <ul>{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4>Cần cải thiện</h4>
          <ul>{evaluation.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <div className="ai-transcripts teacher-ai-transcripts">
        <details>
          <summary>Bản chép bài mẫu</summary>
          <p>{evaluation.referenceTranscription || 'Chưa có bản chép bài mẫu.'}</p>
        </details>
        <details>
          <summary>Bản chép bài nộp</summary>
          <p>{evaluation.studentTranscription || 'Chưa có bản chép bài nộp.'}</p>
        </details>
      </div>
      <div className="ai-uncertainty teacher-ai-uncertainty">
        <h4>Không chắc chắn</h4>
        {evaluation.uncertainContent.length === 0 ? (
          <p>Không ghi nhận đoạn chưa chắc chắn.</p>
        ) : (
          <ul>
            {evaluation.uncertainContent.map((item, index) => (
              <li key={`${item.source}-${item.page}-${index}`}>
                <strong>{item.source === 'reference' ? 'Bài mẫu' : 'Bài nộp'} · trang {item.page}</strong>
                <span>{item.text} — {item.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
