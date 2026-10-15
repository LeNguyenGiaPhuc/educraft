import '../../styles/admin-kinetic.css'
export default function AdminPendingState({ standalone=false, message='Đang mở sổ quản lý…' }) {
 const content=<section className="admin-state-panel ar-loading" role="status"><h1>{message}</h1><p>Dữ liệu sẽ xuất hiện sau khi kiểm tra quyền truy cập.</p><div className="ar-skeleton" aria-hidden="true"><span/><span/><span/></div></section>
 return standalone?<main className="admin-kinetic ar-neutral"><div className="ar-neutral-brand">EduCraft</div>{content}</main>:content
}

