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
  const normalizedQuery = query.trim().toLowerCase()

  return accounts.filter((account) => {
    const matchesQuery = !normalizedQuery ||
      account.username.toLowerCase().includes(normalizedQuery) ||
      account.name.toLowerCase().includes(normalizedQuery)
    const matchesRole = role === 'all' || account.role === role
    const matchesClass = classId === 'all' || account.classes.some((classroom) => classroom.id === classId)

    return matchesQuery && matchesRole && matchesClass
  })
}
