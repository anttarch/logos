import type { TruckCreate, TruckResponse, TruckUpdate } from "@/api/model"
import { fetchRetry } from "./common"
import {
  CreateTruckTrucksPostResponse,
  GetTrucksTrucksGetResponseItem,
  UpdateTruckTrucksTruckIdPatchResponse,
} from "@/api/generated/index.zod"

export const trucksAPI = {
  async getTrucks(): Promise<TruckResponse[]> {
    const res = await fetchRetry("/trucks")
    if (!res.ok) {
      throw new Error(`Failed to get trucks ${res.status}`)
    }

    const data: unknown = await res.json()
    if (!Array.isArray(data)) {
      throw new Error("Weird data")
    }

    const trucks: TruckResponse[] = []
    for (const i of data) {
      const p = GetTrucksTrucksGetResponseItem.safeParse(i)
      console.log(`${p.error} as`)

      if (p.success) {
        trucks.push(p.data)
      }
    }

    return trucks
  },

  async createTruck(payload: TruckCreate): Promise<TruckResponse> {
    const res = await fetchRetry("/trucks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`Failed to create truck ${res.status}`)
    }

    const data = await res.json()
    const p = CreateTruckTrucksPostResponse.safeParse(data)

    if (p.success) {
      return p.data
    }

    throw new Error(`Failed to parse createTruck response`)
  },

  async updateTruck(id: number, payload: TruckUpdate): Promise<TruckResponse> {
    const res = await fetchRetry(`/trucks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(`Failed to update truck ${res.status}`)
    }

    const data = await res.json()
    const p = UpdateTruckTrucksTruckIdPatchResponse.safeParse(data)

    if (p.success) {
      return p.data
    }

    throw new Error(`Failed to parse updateTruck response: ${p.error}`)
  },
}
