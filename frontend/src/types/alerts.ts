export type DashboardAlertType = 'critical' | 'warning' | 'info'

export type DashboardAlert = {
  id: string
  type: DashboardAlertType
  message: string
  date: string
  href?: string
}
