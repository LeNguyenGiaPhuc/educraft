import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSubmissionArchive } from './submissionArchive.js'
const rows = n => Array.from({ length: n }, (_, i) => ({ id: `attempt-${i}`, studentName: 'Nguyễn An Bình', studentCode: `HS${i % 10}`, attemptNumber: i + 1, fileName: `trang-${i}.png` }))
test('0/1/30/300/1000 attempt archive bounds rows and retains all loaded IDs in API order', () => {
  for (const n of [0,1,30,300,1000]) {
    const data = rows(n), first = buildSubmissionArchive({ submissions: data })
    assert.equal(first.items.length, Math.min(n,30))
    const all = Array.from({ length:first.pageCount }, (_, i) => buildSubmissionArchive({ submissions:data,page:i+1 }).items).flat()
    assert.deepEqual(all.map(row=>row.id),data.map(row=>row.id))
  }
})
test('Vietnamese name/code/file search preserves selected ID outside results; page clamps', () => {
  const data = rows(1000)
  const found = buildSubmissionArchive({ submissions:data,query:'NGUYEN AN BINH',page:999,selectedId:'attempt-0' })
  assert.equal(found.page,34)
  assert.equal(found.selectionVisible,false)
  assert.equal(found.selectedPage,1)
  assert.equal(buildSubmissionArchive({ submissions:data,query:'trang-999.png' }).items[0].id,'attempt-999')
  assert.equal(buildSubmissionArchive({ submissions:data,query:'không có' }).items.length,0)
})
