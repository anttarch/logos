import { useCallback, useMemo, useState } from "react"
import type {
  IncidentCategory,
  IncidentCriticality,
  IncidentResponse,
  IncidentStatus,
} from "@/api/model"

export function matchesIncidentQuery(
  incident: IncidentResponse,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return (
    `#${incident.id.toString()}`.includes(q) ||
    incident.title.toLowerCase().includes(q) ||
    incident.location.toLowerCase().includes(q) ||
    incident.truck.plate.toLowerCase().includes(q) ||
    incident.truck.model.toLowerCase().includes(q)
  )
}

export function useIncidentFilters(incidents: IncidentResponse[]) {
  const [search, setSearch] = useState("")
  const [critFilter, setCritFilter] = useState<IncidentCriticality | null>(null)
  const [catFilter, setCatFilter] = useState<IncidentCategory | null>(null)
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | null>(null)

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSearch = matchesIncidentQuery(inc, search)
      const matchCrit = critFilter == null || inc.criticality === critFilter
      const matchCat = catFilter == null || inc.category === catFilter
      const matchStatus = statusFilter == null || inc.status === statusFilter
      return matchSearch && matchCrit && matchCat && matchStatus
    })
  }, [incidents, search, critFilter, catFilter, statusFilter])

  const resetFilters = useCallback(() => {
    setSearch("")
    setCritFilter(null)
    setCatFilter(null)
    setStatusFilter(null)
  }, [])

  return {
    search,
    setSearch,
    critFilter,
    setCritFilter,
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    filteredIncidents,
    resetFilters,
  }
}
