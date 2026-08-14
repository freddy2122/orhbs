import type { DashboardRole, UserScope } from '../constants/dashboard'

export type DepartementRef = {
  id: number
  code: string
  nom: string
}

export type StructureRef = {
  id: number
  code: string
  nom: string
  type_structure: string
  departement: DepartementRef
}

export type UserProfile = {
  role: DashboardRole
  role_label: string
  scope: UserScope
  scope_label: string
  departement: DepartementRef | null
  structure: StructureRef | null
  organisation: string
  poste: string
}

export type AuthUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  profile: UserProfile
}

export type LoginResponse = {
  access: string
  refresh: string
  user: AuthUser
}
