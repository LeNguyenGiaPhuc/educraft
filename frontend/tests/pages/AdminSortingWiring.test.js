import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const accountsPage = await readFile(new URL('../../src/pages/AdminAccountsPage.jsx', import.meta.url), 'utf8')
const classesPage = await readFile(new URL('../../src/pages/AdminClassesPage.jsx', import.meta.url), 'utf8')

test('account page filters, sorts, then paginates and resets the page through its view key', () => {
  assert.match(accountsPage, /const \[sortOrder, setSortOrder\] = useState\('default'\)/)
  assert.match(
    accountsPage,
    /filteredAccounts = filterAdminAccounts[\s\S]*sortedAccounts = sortAdminAccounts\(filteredAccounts, sortOrder\)[\s\S]*useRegistryPage\([\s\S]*sortedAccounts,[\s\S]*JSON\.stringify\(\[query, role, classId, sortOrder\]\)/,
  )
  assert.match(accountsPage, /useEffect\(\(\) => \{ void loadData\(\) \}, \[loadData\]\)/)
  assert.match(accountsPage, /aria-label="Sắp xếp tài khoản"/)
})

test('class page filters, sorts, then paginates without making sort a load dependency', () => {
  assert.match(classesPage, /const \[sortOrder, setSortOrder\] = useState\('default'\)/)
  assert.match(
    classesPage,
    /filteredClasses = filterAdminClasses[\s\S]*sortedClasses = sortAdminClasses\(filteredClasses, sortOrder\)[\s\S]*useRegistryPage\([\s\S]*sortedClasses,[\s\S]*JSON\.stringify\(\[query, teacher, status, sortOrder\]\)/,
  )
  assert.match(classesPage, /useEffect\(\(\)=>\{void loadData\(\)\},\[loadData\]\)/)
  assert.match(classesPage, /aria-label="Sắp xếp lớp học"/)
})
