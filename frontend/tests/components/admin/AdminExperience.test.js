import assert from 'node:assert/strict'
import { before,after,test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { pageRegistry } from '../../../src/data/adminRegistry.js'
import {
 buildClassPayload,
 filterAdminClasses as filterClasses,
 getClassStatusAction as classStatusAction,
 getClassStatusLabel as classStatusLabel,
 getDeleteClassConfirmation as deleteClassConfirmation,
} from '../../../src/data/adminClass.js'
import { fetchDashboardStats } from '../../../src/data/adminDashboard.js'
let vite,AccountForm,ClassForm,Candidates,Pending,Roster
before(async()=>{
 vite=await createServer({root:fileURLToPath(new URL('../../..', import.meta.url)),appType:'custom',logLevel:'silent',server:{middlewareMode:true}})
 AccountForm=(await vite.ssrLoadModule('/src/pages/AdminAccountsPage.jsx')).AccountForm
 const classDetailModule=await vite.ssrLoadModule('/src/pages/AdminClassDetailPage.jsx')
 Candidates=classDetailModule.StudentAddModal
 const classFormModule=await vite.ssrLoadModule('/src/components/AdminClassForm.jsx')
 ClassForm=classFormModule.default
 Pending=(await vite.ssrLoadModule('/src/components/admin/AdminPendingState.jsx')).default
 Roster=(await vite.ssrLoadModule('/src/components/admin/ClassRoster.jsx')).default
})
after(async()=>{await vite?.close()})
const render=(Component,props)=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Component,props)))
test('candidate picker renders at most30 distinct IDs without grouping duplicate names',()=>{
 for(const size of [0,1,30,300,1000,5000]){
  const html=render(Candidates,{students:Array.from({length:size},(_,i)=>({id:'id-'+i,username:'u-'+i,name:'Trùng tên'}))})
  assert.equal((html.match(/type="radio"/g)||[]).length,Math.min(size,30))
  assert.equal((html.match(/Thêm vào lớp/g)||[]).length,1)
  assert.doesNotMatch(html,/u-30</)
 }
})
test('account create/edit keep role default, optional edit password and native reveal controls',()=>{
 const create=render(AccountForm,{initialForm:{role:'ADMIN'}})
 assert.match(create,/value="ADMIN" selected/)
 assert.match(create,/type="password"/)
 assert.match(create,/aria-label="Hiện mật khẩu"/)
 const edit=render(AccountForm,{initialForm:{id:'account-id',username:'u',name:'Tên gốc',role:'STUDENT'}})
 assert.match(edit,/Mật khẩu mới \(không bắt buộc\)/)
 assert.match(edit,/value="STUDENT" selected/)
 assert.doesNotMatch(edit,/bulk|localStorage/)
})
test('class form preserves an archived class status when editing metadata',()=>{
 assert.equal(typeof buildClassPayload,'function')
 assert.deepEqual(buildClassPayload({
  id:'11A2',name:'Lịch sử',semester:'Học kỳ 1',schoolYear:'2026-2027',teacherId:'',status:'ARCHIVED'
 }),{
  code:'11A2',subject:'Lịch sử',semester:'Học kỳ 1',school_year:'2026-2027',teacher_id:null,status:'ARCHIVED'
 })
 const html=render(ClassForm,{initialClass:{id:'uuid',code:'11A2',subject:'Lịch sử',status:'ARCHIVED'},teachers:[{id:'t',full_name:'Giáo viên'}]})
 assert.match(html,/<input disabled=""[^>]*value="11A2"/)
 assert.doesNotMatch(html,/luồng chỉnh sửa hiện gửi trạng thái ACTIVE/)
})
test('class status labels translate uppercase backend enums to Vietnamese',()=>{
 assert.equal(typeof classStatusLabel,'function')
 assert.equal(classStatusLabel('ACTIVE'),'Đang hoạt động')
 assert.equal(classStatusLabel('ARCHIVED'),'Đã lưu trữ')
 assert.equal(classStatusLabel('UNKNOWN'),'Không xác định')
})
test('admin class status controls preserve enum values and filter loaded rows',()=>{
 const html=render(ClassForm,{initialClass:{id:'uuid',code:'11A2',subject:'Lịch sử',status:'ARCHIVED'},teachers:[]})
 assert.match(html,/Trạng thái lớp/)
 assert.match(html,/value="ARCHIVED" selected/)
 assert.deepEqual(classStatusAction('ACTIVE'),{nextStatus:'ARCHIVED',label:'Lưu trữ lớp'})
 assert.deepEqual(classStatusAction('ARCHIVED'),{nextStatus:'ACTIVE',label:'Khôi phục lớp'})
 const rows=[
  {id:'1',code:'10A1',subject:'Toán',teacher_id:'t1',status:'ACTIVE'},
  {id:'2',code:'10A2',subject:'Văn',teacher_id:'t1',status:'ARCHIVED'},
 ]
 assert.deepEqual(filterClasses(rows,'','all','ARCHIVED').map(row=>row.id),['2'])
})
test('admin dashboard requests aggregate metrics without downloading registries',async()=>{
 const calls=[]
 const service={async getDashboardStats(){calls.push('stats');return{users:12,teachers:3,students:8,classes:5}}}
 assert.equal(typeof fetchDashboardStats,'function')
 assert.deepEqual(await fetchDashboardStats(service),{users:12,teachers:3,students:8,classes:5})
 assert.deepEqual(calls,['stats'])
})
test('class delete confirmation identifies the familiar class code instead of its UUID',()=>{
 assert.equal(typeof deleteClassConfirmation,'function')
 const message=deleteClassConfirmation({id:'2061435d-109a-44c4-816e-08668426eee5',code:'12A2'})
 assert.match(message,/lớp 12A2/)
 assert.doesNotMatch(message,/2061435d/)
})
test('Admin pending before permissions carries no account/class identity or controls',()=>{
 const html=render(Pending,{standalone:true})
 assert.match(html,/role="status"/)
 assert.match(html,/aria-hidden="true"/)
 assert.doesNotMatch(html,/input|data-record-id|student-|teacher_id/)
})
test('roster uses30 loaded records with original student numbers and membership-only actions',()=>{
 for(const count of [0,1,30,300,1000]){
  const students=Array.from({length:count},(_,i)=>({id:'member-'+i,username:'student-'+i,name:'Trùng tên',importedStudentNumber:String(1000+i),email:'test@example.invalid',status:'active'}))
  const html=render(Roster,{students,query:'',page:pageRegistry(students,1,30)})
  assert.equal((html.match(/data-record-id=/g)||[]).length,Math.min(count,30))
  if(count) assert.match(html,/1000<\/td>/)
  assert.doesNotMatch(html,/Xóa tài khoản|AI|Chốt kết quả/)
 }
})

test('Admin uses a compact Operations Desk command bar and token-based readable statuses',async()=>{
 const shell=await readFile(new URL('../../../src/components/AdminShell.jsx',import.meta.url),'utf8')
 const css=await readFile(new URL('../../../src/styles/admin-kinetic.css',import.meta.url),'utf8')
 assert.match(shell,/className="admin-command-bar"/)
 assert.match(shell,/EduCraft Operations Desk/)
 assert.doesNotMatch(shell,/admin-sidebar/)
 assert.match(css,/--ar-navy:\s*var\(--ec-color-ink-navy\)/)
 assert.match(css,/\.admin-shell\.admin-kinetic\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
 assert.match(css,/\.admin-command-bar\s*\{[^}]*position:\s*sticky/s)
 assert.match(css,/\.admin-command-link\s*\{[^}]*white-space:\s*nowrap/s)
 assert.match(css,/\.admin-page-actions\s*\{[^}]*flex-wrap:\s*wrap/s)
 assert.match(css,/\.status-active[^}]*color:\s*var\(--ec-color-success\)/s)
 assert.match(css,/\.status-locked[^}]*color:\s*var\(--ec-color-danger\)/s)
})
