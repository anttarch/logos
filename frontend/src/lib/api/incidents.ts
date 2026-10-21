import type {
  IncidentCreate,
  IncidentResponse,
  IncidentUpdate,
} from "@/api/model"
import { fetchRetry } from "./common"
import {
  CreateIncidentIncidentsPostResponse,
  GetIncidentsIncidentsGetResponseItem,
  UpdateIncidentIncidentsIncidentIdPatchResponse,
} from "@/api/generated/index.zod"

export const incidentsAPI = {
  async getIncidents(): Promise<IncidentResponse[]> {
    const res = await fetchRetry("/incidents")
    if (!res.ok) {
      throw new Error(`Failed to get incidents ${res.status}`)
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
      throw new Error("Weird data")
    }

    const incidents: IncidentResponse[] = []
    for (const i of data) {
      const p = GetIncidentsIncidentsGetResponseItem.safeParse(i)

      if (p.success) {
        incidents.push(p.data)
      }
    }

    return incidents
  },

  async createIncident(payload: IncidentCreate): Promise<IncidentResponse> {
    const res = await fetchRetry("/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`Failed to create incident ${res.status}`)
    }

    const data = await res.json()
    const p = CreateIncidentIncidentsPostResponse.safeParse(data)

    if (p.success) {
      return p.data
    }

    throw new Error(`Failed to parse createIncident response`)
  },

  async updateIncident(
    id: number,
    payload: IncidentUpdate
  ): Promise<IncidentResponse> {
    const res = await fetchRetry(`/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.status === 409) {
      throw new Error(`The object is outdated`)
    }

    if (!res.ok) {
      throw new Error(`Failed to update incident ${res.status}`)
    }

    const data = await res.json()
    const p = UpdateIncidentIncidentsIncidentIdPatchResponse.safeParse(data)

    if (p.success) {
      return p.data
    }

    throw new Error(`Failed to parse updateIncident response`)
  },
}
