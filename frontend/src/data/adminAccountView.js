import { normalizeRegistryText } from './adminRegistry.js'

const accountCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
})

const accountComparators = {
  'name-asc': (left, right) => accountCollator.compare(left.name ?? '', right.name ?? ''),
  'name-desc': (left, right) => accountCollator.compare(right.name ?? '', left.name ?? ''),
  'username-asc': (left, right) => accountCollator.compare(left.username ?? '', right.username ?? ''),
}

export function normalizeAdminAccount(row = {}) {
  return {
    ...row,
    id: row.id,
    email: row.email ?? '',
    username: row.username ?? '',
    name: row.full_name ?? row.name ?? '',
    role: String(row.role ?? '').toUpperCase(),
    status: String(row.status ?? '').toLowerCase(),
    classes: Array.isArray(row.classes) ? row.classes : [],
  }
}

export function getAccountClassLabel(account) {
  const classes = account?.classes ?? []

  if (classes.length > 0) {
    return classes.map((classroom) => classroom.code).join(', ')
  }

  return account?.role === 'STUDENT' ? 'Chưa phân lớp' : 'Chưa gán'
}

export function filterAdminAccounts(accounts, { query = '', role = 'all', classId = 'all' } = {}) {
  const normalizedQuery = normalizeRegistryText(query)

  return accounts.filter((account) => {
    const matchesQuery = !normalizedQuery ||
      normalizeRegistryText(account.username).includes(normalizedQuery) ||
      normalizeRegistryText(account.name).includes(normalizedQuery)
    const matchesRole = role === 'all' || account.role === role
    const matchesClass = classId === 'all' || account.classes.some((classroom) => classroom.id === classId)

    return matchesQuery && matchesRole && matchesClass
  })
}

export function sortAdminAccounts(accounts, sort = 'default') {
  const compare = accountComparators[sort]
  if (!compare) return [...accounts]

  return accounts
    .map((account, index) => ({ account, index }))
    .sort((left, right) => compare(left.account, right.account) || left.index - right.index)
    .map(({ account }) => account)
}
