import { apiFetch } from './api-client'
import type {
  CartographyResponse,
  CompetencesResponse,
  InteroperabiliteResponse,
  PlanificationResponse,
} from '../types/acteurs'

export function fetchPlanification() {
  return apiFetch<PlanificationResponse>('/api/acteurs/planification/')
}

export function fetchCartography() {
  return apiFetch<CartographyResponse>('/api/acteurs/cartographie/')
}

export function fetchCompetences() {
  return apiFetch<CompetencesResponse>('/api/acteurs/competences/')
}

export function fetchInteroperabilite() {
  return apiFetch<InteroperabiliteResponse>('/api/acteurs/interoperabilite/')
}
