import { apiClient } from './apiClient.js'
import { pathSegment } from './serviceUtils.js'

export function createAdminAccountService({ api = apiClient } = {}) {
  function buildAccountQuery(query = {}) {
    const params = new URLSearchParams()

    if (query.search) {
      params.set('search', query.search)
    }

    if (query.role && query.role !== 'all') {
      params.set('role', query.role)
    }

    if (query.status && query.status !== 'all') {
      params.set('status', query.status)
    }

    const suffix = params.toString()
    return suffix ? `/api/admin/accounts?${suffix}` : '/api/admin/accounts'
  }

  return {
    listAccounts(query = {}) {
      return api.get(buildAccountQuery(query))
    },

    listClasses(query = {}) {
      const params = new URLSearchParams()

      if (query.search) {
        params.set('search', query.search)
      }

      if (query.status && query.status !== 'all') {
        params.set('status', query.status)
      }

      const suffix = params.toString()
      return api.get(suffix ? `/api/admin/classes?${suffix}` : '/api/admin/classes')
    },

    getAccount(accountId) {
      return api.get(`/api/admin/accounts/${pathSegment(accountId)}`)
    },

    createAccount(input) {
      return api.post('/api/admin/accounts', input)
    },

    updateAccount(accountId, input) {
      return api.patch(`/api/admin/accounts/${pathSegment(accountId)}`, input)
    },

    lockAccount(accountId) {
      return api.post(`/api/admin/accounts/${pathSegment(accountId)}/lock`)
    },

    unlockAccount(accountId) {
      return api.post(`/api/admin/accounts/${pathSegment(accountId)}/unlock`)
    },

    deleteAccount(accountId) {
      return api.delete(`/api/admin/accounts/${pathSegment(accountId)}`)
    },
  }
}

export const adminAccountService = createAdminAccountService()
