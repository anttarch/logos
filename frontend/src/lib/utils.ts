import {
  IncidentCategory,
  IncidentCriticality,
  IncidentStatus,
} from "@/api/model"

export { cn } from "cn"

export function criticalityToString(criticality: IncidentCriticality): string {
  switch (criticality) {
    case IncidentCriticality.HIGH:
      return "Alta"
    case IncidentCriticality.MEDIUM:
      return "Média"
    case IncidentCriticality.LOW:
      return "Baixa"
  }
}

export function categoryToString(category: IncidentCategory): string {
  switch (category) {
    case IncidentCategory.VEHICLE_ACCIDENT:
      return "Acidente com Veículo"
    case IncidentCategory.VICTIM_ACCIDENT:
      return "Acidente com Vítimas"
    case IncidentCategory.WEIRD_WEATHER_CONDITION:
      return "Condição Climática Atípica na Pista"
    case IncidentCategory.MECHANICAL_ISSUE:
      return "Problema Mecânico"
    case IncidentCategory.ROAD_BLOCK:
      return "Bloqueio de Pista"
  }
}

export function statusToString(status: IncidentStatus): string {
  switch (status) {
    case IncidentStatus.OPEN:
      return "Aberto"
    case IncidentStatus.CLOSED:
      return "Fechado"
    case IncidentStatus.UNDER_INVESTIGATION:
      return "Em investigação"
    case IncidentStatus.INCONCLUSIVE:
      return "Inconclusivo"
  }
}
