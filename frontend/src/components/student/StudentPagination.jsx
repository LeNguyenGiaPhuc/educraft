function StudentPagination({ view, onPage, label }) {
  return (
    <div className="sf-pagination">
      <p aria-live="polite">{view.matchCount ? `${view.start + 1}–${view.end}` : '0'} / {view.matchCount} kết quả đã tải</p>
      {view.pageCount > 1 && <nav aria-label={label}>
        <button type="button" disabled={view.page <= 1} onClick={() => onPage(view.page - 1)}>Trang trước</button>
        <span>Trang {view.page}/{view.pageCount}</span>
        <button type="button" disabled={view.page >= view.pageCount} onClick={() => onPage(view.page + 1)}>Trang sau</button>
      </nav>}
    </div>
  )
}
export default StudentPagination
