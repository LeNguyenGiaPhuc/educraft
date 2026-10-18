import { adminAccountService } from '../services/adminAccountService.js'

export function fetchDashboardStats(service = adminAccountService) {
  return service.getDashboardStats()
}
