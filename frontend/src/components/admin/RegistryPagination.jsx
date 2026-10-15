export default function RegistryPagination({ view, label }) {
 return <div className="ar-pagination"><p>{view.total?view.start+1:0}–{Math.min(view.start+view.size,view.total)} / {view.total} kết quả đã tải</p>{view.pageCount>1&&<nav aria-label={label}><button className="button button-outline" type="button" disabled={view.page===1} onClick={()=>view.setPage(view.page-1)}>Trang trước</button><span>Trang {view.page}/{view.pageCount}</span><button className="button button-outline" type="button" disabled={view.page===view.pageCount} onClick={()=>view.setPage(view.page+1)}>Trang sau</button></nav>}</div>
}

