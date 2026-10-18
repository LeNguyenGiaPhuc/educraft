import { useState } from 'react'

function EvidenceImage({ url, fileName, source }) {
  const [failed, setFailed] = useState(false)
  return <figure className="tk-evidence-document">
    <figcaption><strong>{source}</strong><span>{fileName}</span></figcaption>
    {!url ? <p role="status">Không có đường dẫn ảnh để xem.</p> : failed ?
      <p role="alert">Không thể tải ảnh. Đường dẫn có thể đã hết hạn hoặc kết nối bị gián đoạn. Hãy mở ảnh gốc hoặc tải lại trang để kiểm tra.</p> :
      <div className="tk-evidence-image"><img src={url} alt={`${source}: ${fileName}`} onError={() => setFailed(true)} /></div>}
    {url && <a href={url} target="_blank" rel="noreferrer">Mở ảnh gốc — {source.toLowerCase()}</a>}
  </figure>
}

export default function SubmissionEvidence({ submission, references }) {
  const [referenceId, setReferenceId] = useState(references[0]?.id ?? '')
  const reference = references.find(row => row.id === referenceId) ?? references[0]
  return <section className="tk-evidence" aria-labelledby="evidence-title">
    <header><h2 id="evidence-title">Bằng chứng đối chiếu</h2><p>Ảnh gốc không thay đổi nội dung. Chỉ tải ảnh của lượt đang xem và bài mẫu đang chọn.</p></header>
    <EvidenceImage key={submission.fileUrl ?? submission.id} url={submission.fileUrl} fileName={submission.fileName} source="Bài học sinh" />
    {references.length > 0 ? <>
      <label htmlFor="evidence-reference">Bài mẫu đối chiếu</label>
      <select id="evidence-reference" value={reference?.id ?? ''} onChange={event => setReferenceId(event.target.value)}>
        {references.map(row => <option value={row.id} key={row.id}>{row.fileName}</option>)}
      </select>
      <EvidenceImage key={reference?.url ?? reference?.id} url={reference?.url} fileName={reference?.fileName} source="Bài mẫu giáo viên" />
    </> : <p className="tk-evidence-empty">Chưa có ảnh bài mẫu để đối chiếu.</p>}
  </section>
}
