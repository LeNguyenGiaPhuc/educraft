import { useEffect, useState } from 'react'
import { createAdminScope, pageRegistry } from '../../data/adminRegistry.js'

export function useAdminScope() {
  const [scope] = useState(createAdminScope)
  useEffect(() => {
    scope.activate()
    return () => scope.deactivate()
  }, [scope])
  return scope
}

export function useRegistryPage(rows, size, key) {
  const [cursor, setCursor] = useState({ key, page: 1 })
  const currentPage = cursor.key === key ? cursor.page : 1

  return {
    ...pageRegistry(rows, currentPage, size),
    setPage: page => setCursor({ key, page }),
  }
}

