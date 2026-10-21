import {
  IncidentCategory,
  IncidentCriticality,
  IncidentStatus,
  type IncidentCreate,
} from "@/api/model"

const CATEGORIES: IncidentCategory[] = [
  IncidentCategory.VEHICLE_ACCIDENT,
  IncidentCategory.VICTIM_ACCIDENT,
  IncidentCategory.WEIRD_WEATHER_CONDITION,
  IncidentCategory.MECHANICAL_ISSUE,
  IncidentCategory.ROAD_BLOCK,
]

const CRITICALITIES: IncidentCriticality[] = [
  IncidentCriticality.HIGH,
  IncidentCriticality.MEDIUM,
  IncidentCriticality.LOW,
]

const STATUSES: IncidentStatus[] = [
  IncidentStatus.OPEN,
  IncidentStatus.UNDER_INVESTIGATION,
  IncidentStatus.CLOSED,
  IncidentStatus.INCONCLUSIVE,
]

const HIGHWAYS = ["BR-116", "BR-101", "BR-040", "BR-381", "SP-330"]

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function normalizePlate(plateInput: string): string {
  return plateInput
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .padEnd(7, "0")
    .slice(0, 7)
}

export function generateRandomPlate(): string {
  return `FRO${Math.floor(1000 + Math.random() * 9000)}`
}

export function buildStressLoadPayloads(
  truckId: number,
  count = 10
): IncidentCreate[] {
  return Array.from({ length: count }, (_, idx) => {
    const index = idx + 1
    const category = pickRandom(CATEGORIES)
    const criticality = pickRandom(CRITICALITIES)
    const status = pickRandom(STATUSES)
    const highway = pickRandom(HIGHWAYS)
    const km = Math.floor(Math.random() * 500) + 10
    const location = `${highway} KM ${km}`

    return {
      category,
      criticality,
      status,
      title: `${category} - ${location}`,
      description: `Ocorrência gerada via carga de estresse (#${index}) em ${location}.`,
      location,
      truck_id: truckId,
    }
  })
}
