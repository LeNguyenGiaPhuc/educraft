import { sendData } from '../../common/response.js'

export function createAiUsageController({ aiUsageService }) {
  return {
    async getSummary(request, response) {
      const summary = await aiUsageService.getSummary(request.auth)
      return sendData(response, summary)
    },
  }
}
