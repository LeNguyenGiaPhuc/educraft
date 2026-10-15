/* eslint-disable react-refresh/only-export-components */
/* Synthetic React Admin fixture. It never calls a production endpoint.
   Fake transport is installed only here; this file is absent from production imports. */
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import AuthContext from '../../../src/contexts/AuthContext.js'
import AdminShell from '../../../src/components/AdminShell.jsx'
import AdminDashboardPage from '../../../src/pages/AdminDashboardPage.jsx'
import AdminAccountsPage from '../../../src/pages/AdminAccountsPage.jsx'
import AdminClassesPage from '../../../src/pages/AdminClassesPage.jsx'
import AdminClassDetailPage from '../../../src/pages/AdminClassDetailPage.jsx'
import { adminAccountService } from '../../../src/services/adminAccountService.js'
import { adminClassService } from '../../../src/services/adminClassService.js'
import { authService } from '../../../src/services/authService.js'
import { ApiError } from '../../../src/services/apiClient.js'
import '../../../src/index.css'
import '../../../src/App.css'
import '../../../src/styles/tokens.css'
import '../../../src/styles/shells.css'
import '../../../src/styles/login.css'
import '../../../src/styles/admin.css'
import '../../../src/styles/teacher.css'
import '../../../src/styles/student.css'
import '../../../src/styles/blueprint.css'
import '../../../src/styles/teacher-kinetic.css'
import '../../../src/styles/teacher-final-states.css'
import '../../../src/styles/common-kinetic.css'
let size=1000,rosterSize=300,candidateSize=5000,long=false,mode='success'
let gets=0,mutations=0,releases=[]
const id=i=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0')
const classroom=i=>({id:id(i),code:'11A'+(i+1),subject:long?'Môn lịch sử văn hóa và xã hội Việt Nam — tên môn học đầy đủ rất dài':'Lịch sử',semester:'Học kỳ 1',school_year:'2026–2027',status:i%7?'ACTIVE':'ARCHIVED',teacher_id:'teacher'})
const account=i=>({id:'account-'+i,username:'student-'+i,full_name:long?'Nguyễn Hoàng Anh — tên dài và trùng nhau cần giữ đúng ID':'Nguyễn An Bình',email:long?'nguyen.hoang.anh.ten.email.rat.dai.'+i+'@example.invalid':'student'+i+'@example.invalid',role:i%7===0?'TEACHER':'STUDENT',status:i%5?'ACTIVE':'PENDING',classes:Array.from({length:long?18:2},(_,j)=>({id:id(j),code:'11A'+(j+1)})),student_number:String(i+1)})
async function transport(value,mutation=false) {
 if(mutation)mutations++;else gets++
 if(mode==='pending')await new Promise(resolve=>releases.push(resolve))
 if(mode==='error')throw new ApiError({status:503,code:'NETWORK_ERROR',message:'Lỗi kết nối giả lập; không có thay đổi trên backend thật.'})
 if(mode==='field-error'&&mutation)throw new ApiError({status:400,message:'Kiểm tra các trường dữ liệu.',fields:value?.code!==undefined?{code:'Mã lớp không hợp lệ',teacher_id:'Giáo viên không hợp lệ',subject:'Môn học không hợp lệ'}:{full_name:'Họ tên không hợp lệ',email:'Email không hợp lệ'}})
 return value
}
Object.assign(adminAccountService,{
 getDashboardStats:()=>transport({users:size,teachers:1,students:Math.max(0,size-1),classes:size}),
 listAccounts:query=>transport(Array.from({length:query?.role==='STUDENT'?candidateSize:query?.role==='TEACHER'?1:size},(_,i)=>query?.role==='TEACHER'?{id:'teacher',full_name:'Trần Minh Phúc',role:'TEACHER',status:'ACTIVE'}:account(i))),
 listClasses:()=>transport(Array.from({length:size},(_,i)=>classroom(i))),
 createAccount:input=>transport({...input,id:'created-account'},true),updateAccount:(key,input)=>transport({...input,id:key},true),
 lockAccount:key=>transport({id:key},true),unlockAccount:key=>transport({id:key},true),deleteAccount:key=>transport({id:key},true),
})
Object.assign(adminClassService,{
 listClasses:()=>transport(Array.from({length:size},(_,i)=>classroom(i))),
 getClass:key=>transport({...classroom(Number(key.slice(-12))-1),id:key}),
 listStudents:()=>transport(Array.from({length:rosterSize},(_,i)=>account(i))),
 createClass:input=>transport({...input,id:'created-class'},true),updateClass:(key,input)=>transport({...input,id:key},true),
 addStudent:(key,input)=>transport({class_id:key,...input},true),removeStudent:(key,input)=>transport({class_id:key,...input},true),deleteClass:key=>transport({id:key},true),
 importStudents:(key,input)=>transport({class_id:key,created:input.students.length,assigned:0,skipped:0},true),
})
authService.me=()=>transport({id:'fixture-admin',name:'Admin kiểm thử',role:'ADMIN'})
function Fixture(){
 const navigate=useNavigate(),[epoch,setEpoch]=useState(0),[screen,setScreen]=useState('/admin'),[,refreshMetrics]=useState(0)
 useEffect(()=>{
  async function fixtureKey(event) {
   if(event.key==='F7'||event.key==='F8')event.preventDefault()
   if(event.key==='F8') { const pending=releases;releases=[];pending.forEach(fn=>fn()) }
   if(event.key==='F7') {
    const input=document.getElementById('student-import-file')
    if(!input||input.disabled)return
    const XLSX=await import('xlsx'),workbook=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([['STT','Họ và tên','Email'],[1,'Học sinh tổng hợp','synthetic@example.invalid']]),'Sheet1')
    const file=new File([XLSX.write(workbook,{type:'array',bookType:'xlsx'})],'danh-sach-tong-hop-fixture.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))
   }
  }
  document.addEventListener('keydown',fixtureKey)
  return()=>document.removeEventListener('keydown',fixtureKey)
 },[])
 const update=()=>setEpoch(n=>n+1)
 return <><details className="fixture-toolbar" style={{padding:12,background:'#f7f5e9',color:'#182b37'}}><summary>Fixture Admin Phase8 — dữ liệu tổng hợp, không gọi API thật</summary>
 <label>Màn <select value={screen} onChange={e=>{setScreen(e.target.value);navigate(e.target.value)}}>{['/admin','/admin/accounts','/admin/classes','/admin/classes/'+id(0),'/admin/classes/'+id(1)].map(x=><option key={x}>{x}</option>)}</select></label>
 <label> Records <select defaultValue="1000" onChange={e=>{size=Number(e.target.value);update()}}>{[0,1,25,100,1000].map(n=><option key={n}>{n}</option>)}</select></label>
 <label> Roster <select defaultValue="300" onChange={e=>{rosterSize=Number(e.target.value);update()}}>{[0,1,30,300,1000].map(n=><option key={n}>{n}</option>)}</select></label>
 <label> Candidates <select defaultValue="5000" onChange={e=>{candidateSize=Number(e.target.value);update()}}>{[1000,5000].map(n=><option key={n}>{n}</option>)}</select></label>
 <label> Response <select onChange={e=>{mode=e.target.value}}>{['success','pending','error','field-error'].map(n=><option key={n}>{n}</option>)}</select></label>
 <label>Tên dài <input type="checkbox" onChange={e=>{long=e.target.checked;update()}}/></label>
 <button type="button" onClick={()=>{const pending=releases;releases=[];pending.forEach(fn=>fn())}}>Hoàn tất request giả lập</button>
 <button type="button" onClick={update}>Tải lại fixture</button><p>GET {gets} · mutations {mutations}. Mutations chỉ giả lập; không lưu dữ liệu.</p>
 <button type="button" onClick={()=>refreshMetrics(n=>n+1)}>Đọc số request</button>
 <p>F7: chọn XLSX tổng hợp trong dialog import (không phải OS picker). F8: hoàn tất các request giả lập đang chờ.</p>
 </details><Routes key={epoch}><Route element={<AdminShell/>}><Route path="/admin" element={<AdminDashboardPage/>}/><Route path="/admin/accounts" element={<AdminAccountsPage/>}/><Route path="/admin/classes" element={<AdminClassesPage/>}/><Route path="/admin/classes/:classId" element={<AdminClassDetailPage/>}/></Route></Routes></>
}
createRoot(document.getElementById('root')).render(<AuthContext.Provider value={{user:{id:'fixture-admin',name:'Admin kiểm thử',username:'admin-fixture',role:'ADMIN'},logout:async()=>undefined}}><MemoryRouter initialEntries={['/admin']}><Fixture/></MemoryRouter></AuthContext.Provider>)

