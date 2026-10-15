// Admin-only loaded browsing and lifecycle safety; no HTTP, cache or permission policy.
export const normalizeRegistryText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim()
export function searchRegistry(rows, query, fields) {
  const needle=normalizeRegistryText(query)
  return rows.filter(row=>!needle||fields.some(field=>normalizeRegistryText(row[field]).includes(needle)))
}
export function pageRegistry(rows,page=1,size=25) {
  const pageCount=Math.max(1,Math.ceil(rows.length/size))
  const current=Math.max(1,Math.min(pageCount,Number(page)||1)),start=(current-1)*size
  return { items:rows.slice(start,start+size),page:current,pageCount,start,total:rows.length,size }
}
export function registryFieldErrors(fields={}) {
  const aliases={code:'id',teacher_id:'teacherId',full_name:'name',school_year:'schoolYear',subject:'name'}
  return Object.fromEntries(Object.entries(fields).map(([key,value])=>[aliases[key]??key,Array.isArray(value)?value[0]:value]))
}
export function createAdminScope() {
  let active=true, epoch=0, serial=0
  const reads=new Map(), locks=new Map()
  async function run(key,work,handlers={},latest=false) {
    if(!active||(!latest&&locks.has(key))) return false
    const token=++serial, generation=epoch
    ;(latest?reads:locks).set(key,token)
    const valid=()=>active&&epoch===generation&&(latest?reads:locks).get(key)===token
    try { const result=await work();if(valid()) await handlers.success?.(result) }
    catch(error) { if(valid()) await handlers.error?.(error) }
    finally { const accepted=valid();if(!latest&&locks.get(key)===token)locks.delete(key);if(accepted) handlers.settled?.() }
    return true
  }
  return {
    read:(key,work,handlers)=>run(key,work,handlers,true),
    mutate:(key,work,handlers)=>run(key,work,handlers),
    invalidate(key){reads.delete(key)},
    activate(){active=true},
    deactivate(){active=false;epoch++;reads.clear();locks.clear()},
  }
}

