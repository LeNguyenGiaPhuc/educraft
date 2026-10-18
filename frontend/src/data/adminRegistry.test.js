import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageRegistry, searchRegistry, registryFieldErrors, createAdminScope } from './adminRegistry.js'
import { filterAdminAccounts } from './adminAccountView.js'
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise,resolve,reject } }
test('loaded pages preserve API order and every distinct ID across large datasets', () => {
  for (const count of [0,1,25,100,1000,5000]) {
    const rows=Array.from({length:count},(_,i)=>({id:'id-'+i,name:'Trùng tên'}))
    const seen=[]
    for(let page=1;page<=Math.max(1,Math.ceil(count/30));page++) seen.push(...pageRegistry(rows,page,30).items.map(r=>r.id))
    assert.equal(new Set(seen).size,count)
    assert.deepEqual(seen,rows.map(r=>r.id))
    assert.ok(pageRegistry(rows,999,25).items.length<=25)
  }
})
test('Vietnamese search uses only approved fields; role and class filters keep backend IDs',()=>{
 const rows=[{id:'a',username:'hocsinh',name:'Đặng Ánh',role:'STUDENT',classes:[{id:'c'}],email:'secret-match'},{id:'b',username:'hocsinh2',name:'Đặng Ánh',role:'TEACHER',classes:[]}]
 assert.deepEqual(filterAdminAccounts(rows,{query:'DANG ANH',role:'STUDENT',classId:'c'}).map(r=>r.id),['a'])
 assert.equal(filterAdminAccounts(rows,{query:'secret-match'}).length,0)
 assert.deepEqual(searchRegistry(rows,'dang', ['username','name']).map(r=>r.id),['a','b'])
})
test('field errors map code/teacher_id/full_name to actual controls without dropping summary',()=>{
 assert.deepEqual(registryFieldErrors({code:'Trùng mã',teacher_id:['Sai giáo viên'],full_name:'Thiếu tên'}),{id:'Trùng mã',teacherId:'Sai giáo viên',name:'Thiếu tên'})
})
test('synchronous mutation lock prevents duplicate POST and releases on rejection for explicit retry',async()=>{
 const scope=createAdminScope(), d=deferred(); let calls=0, errors=0
 const run=()=>scope.mutate('save',()=>{calls++;return d.promise},{error:()=>errors++})
 const p=run();assert.equal(await run(),false);assert.equal(calls,1)
 d.reject(new Error('network'));await p;assert.equal(errors,1)
 await scope.mutate('save',async()=>{calls++});assert.equal(calls,2)
})
test('latest read wins; stale error/finally cannot overwrite newer context',async()=>{
 const s=createAdminScope(),a=deferred(),b=deferred(),seen=[]
 const p=s.read('load',()=>a.promise,{success:v=>seen.push(v),error:()=>seen.push('old-error'),settled:()=>seen.push('old-end')})
 const q=s.read('load',()=>b.promise,{success:v=>seen.push(v)})
 b.resolve('new');await q;a.reject(Error('old'));await p;assert.deepEqual(seen,['new'])
})
test('unmount and reactivation invalidate reads and mutation callbacks without unlocking a new request',async()=>{
 const s=createAdminScope(),a=deferred(),b=deferred(),seen=[]
 const p=s.mutate('save',()=>a.promise,{success:v=>seen.push(v)})
 s.deactivate();s.activate()
 const q=s.mutate('save',()=>b.promise,{success:v=>seen.push(v)})
 a.resolve('old');await p;assert.equal(await s.mutate('save',async()=>0),false)
 b.resolve('new');await q;assert.deepEqual(seen,['new'])
 s.deactivate();let called=false;assert.equal(await s.mutate('save',async()=>{called=true}),false);assert.equal(called,false)
})
test('clearing or replacing a parsed file invalidates its late preview',async()=>{
 const scope=createAdminScope(),old=deferred(),seen=[]
 const pending=scope.read('file',()=>old.promise,{success:value=>seen.push(value)})
 scope.invalidate('file')
 old.resolve('old-file');await pending;assert.deepEqual(seen,[])
 await scope.read('file',async()=>'new-file',{success:value=>seen.push(value)})
 assert.deepEqual(seen,['new-file'])
})

