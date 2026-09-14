import { sendData } from '../../common/response.js'

export function createAccountController({ accountService }) {
  return {
    async list(request, response) {
      const result = await accountService.listAccounts(request.auth, request.validated.query)
      return sendData(response, result)
    },

    async get(request, response) {
      const account = await accountService.getAccount(request.auth, request.validated.params.accountId)
      return sendData(response, account)
    },

    async create(request, response) {
      const account = await accountService.createAccount(request.auth, request.validated.body)
      return sendData(response, account, 201)
    },

    async update(request, response) {
      const account = await accountService.updateAccount(request.auth, request.validated.params.accountId, request.validated.body)
      return sendData(response, account)
    },

    async lock(request, response) {
      const account = await accountService.lockAccount(request.auth, request.validated.params.accountId)
      return sendData(response, account)
    },

    async unlock(request, response) {
      const account = await accountService.unlockAccount(request.auth, request.validated.params.accountId)
      return sendData(response, account)
    },

    async remove(request, response) {
      await accountService.deleteAccount(request.auth, request.validated.params.accountId)
      return response.status(204).end()
    },
  }
}
