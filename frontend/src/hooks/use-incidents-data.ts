import { useCallback, useEffect, useMemo, useState } from "react"
import {
  IncidentCriticality,
  IncidentStatus,
  type IncidentResponse,
  type TruckResponse,
} from "@/api/model"
import { toast } from "@/components/ui/toast"
import type { TestingFormPayload } from "@/components/views/testing-view"
import { incidentsAPI } from "@/lib/api/incidents"
import { trucksAPI } from "@/lib/api/trucks"
import { statusToString } from "@/lib/utils"
import {
  buildStressLoadPayloads,
  generateRandomPlate,
  normalizePlate,
} from "@/lib/stress-load"

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function useIncidentsData() {
  const [incidents, setIncidents] = useState<IncidentResponse[]>([])
  const [fleet, setFleet] = useState<TruckResponse[]>([])

  const refreshData = useCallback(async () => {
    try {
      const [loadedIncidents, loadedTrucks] = await Promise.all([
        incidentsAPI.getIncidents(),
        trucksAPI.getTrucks(),
      ])
      setIncidents(loadedIncidents)
      setFleet(loadedTrucks)
    } catch (err) {
      toast.add({
        type: "error",
        description: getErrorMessage(err, "Falha ao carregar dados da API."),
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all([incidentsAPI.getIncidents(), trucksAPI.getTrucks()])
      .then(([loadedIncidents, loadedTrucks]) => {
        if (cancelled) return
        setIncidents(loadedIncidents)
        setFleet(loadedTrucks)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        toast.add({
          type: "error",
          description: getErrorMessage(err, "Falha ao carregar dados da API."),
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const criticalUnattendedCount = useMemo(
    () =>
      incidents.filter(
        (i) =>
          i.criticality === IncidentCriticality.HIGH &&
          i.status === IncidentStatus.OPEN
      ).length,
    [incidents]
  )

  const prependIncident = useCallback((created: IncidentResponse) => {
    setIncidents((prev) =>
      prev.some((inc) => inc.id === created.id) ? prev : [created, ...prev]
    )
  }, [])

  const replaceIncident = useCallback((updated: IncidentResponse) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === updated.id ? updated : inc))
    )
  }, [])

  const lockAndAssume = useCallback(
    async (id: number, assignedTo: string) => {
      const target = incidents.find((inc) => inc.id === id)
      if (!target) return

      try {
        const updated = await incidentsAPI.updateIncident(id, {
          version: target.version,
          status: IncidentStatus.UNDER_INVESTIGATION,
          assigned_to: assignedTo,
        })
        replaceIncident(updated)
        toast.add({
          type: "success",
          description: `Você assumiu o lock do chamado #${id}. Cronômetro de SLA ativo.`,
        })
      } catch (err) {
        toast.add({
          type: "error",
          description: getErrorMessage(
            err,
            `Falha ao assumir o chamado #${id}.`
          ),
        })
        void refreshData()
      }
    },
    [incidents, refreshData, replaceIncident]
  )

  const releaseLock = useCallback(
    async (id: number) => {
      const target = incidents.find((inc) => inc.id === id)
      if (!target) return

      try {
        const updated = await incidentsAPI.updateIncident(id, {
          version: target.version,
          status: IncidentStatus.OPEN,
        })
        replaceIncident(updated)
        toast.add({
          type: "info",
          description: `Incidente #${id} liberado.`,
        })
      } catch (err) {
        toast.add({
          type: "error",
          description: getErrorMessage(
            err,
            `Falha ao liberar incidente #${id}.`
          ),
        })
        void refreshData()
      }
    },
    [incidents, refreshData, replaceIncident]
  )

  const finishTriage = useCallback(
    async (
      id: number,
      status: IncidentStatus,
      notes: string
    ): Promise<boolean> => {
      const target = incidents.find((inc) => inc.id === id)
      if (!target) return false

      try {
        const updated = await incidentsAPI.updateIncident(id, {
          version: target.version,
          status,
          notes,
        })
        replaceIncident(updated)
        toast.add({
          type: "success",
          description: `Triagem do incidente #${id} finalizada como ${statusToString(status)}.`,
        })
        return true
      } catch (err) {
        toast.add({
          type: "error",
          description: getErrorMessage(
            err,
            `Falha ao finalizar a triagem do incidente #${id}.`
          ),
        })
        void refreshData()
        return false
      }
    },
    [incidents, refreshData, replaceIncident]
  )

  const updateStatus = useCallback(
    async (id: number, status: IncidentStatus) => {
      const target = incidents.find((inc) => inc.id === id)
      if (!target) return

      try {
        const updated = await incidentsAPI.updateIncident(id, {
          version: target.version,
          status,
        })
        replaceIncident(updated)
        toast.add({
          type: "success",
          description: `Status de #${id} alterado para '${status}'.`,
        })
      } catch (err) {
        toast.add({
          type: "error",
          description: getErrorMessage(err, `Falha ao atualizar #${id}.`),
        })
        void refreshData()
      }
    },
    [incidents, refreshData, replaceIncident]
  )

  const ensureTruck = useCallback(
    async (
      plateInput: string,
      model: string,
      driverName: string,
      location: string
    ): Promise<TruckResponse> => {
      const normalizedPlate = normalizePlate(plateInput)
      const existing = fleet.find((t) => t.plate === normalizedPlate)
      if (existing) {
        return existing
      }

      const createdTruck = await trucksAPI.createTruck({
        plate: normalizedPlate,
        model: model.slice(0, 30),
        driver_name: driverName,
        location,
      })
      setFleet((prev) => [...prev, createdTruck])
      return createdTruck
    },
    [fleet]
  )

  const injectStressLoad = useCallback(async () => {
    try {
      const targetTruck =
        fleet[0] ??
        (await ensureTruck(
          generateRandomPlate(),
          "Scania R450",
          "Motorista Frota #1",
          "BR-116 KM 100"
        ))

      const payloads = buildStressLoadPayloads(targetTruck.id, 10)
      const created = await Promise.all(
        payloads.map((payload) => incidentsAPI.createIncident(payload))
      )
      setIncidents((prev) => [...created, ...prev])
      toast.add({
        type: "success",
        description: `${created.length} incidentes injetados!`,
      })
    } catch (err) {
      toast.add({
        type: "error",
        description: getErrorMessage(
          err,
          "Falha ao injetar incidentes na API."
        ),
      })
    }
  }, [ensureTruck, fleet])

  const resetData = useCallback(async () => {
    await refreshData()
    toast.add({
      type: "info",
      description: "Registros sincronizados com o servidor.",
    })
  }, [refreshData])

  const saveIncident = useCallback(
    async (data: TestingFormPayload, existingId?: number) => {
      try {
        if (existingId !== undefined) {
          const target = incidents.find((inc) => inc.id === existingId)
          if (!target) return

          if (
            data.driverName !== target.truck.driver_name ||
            data.location !== target.truck.location
          ) {
            const updatedTruck = await trucksAPI.updateTruck(target.truck.id, {
              driver_name: data.driverName,
              location: data.location,
            })
            setFleet((prev) =>
              prev.map((t) => (t.id === updatedTruck.id ? updatedTruck : t))
            )
          }

          const updatedIncident = await incidentsAPI.updateIncident(
            existingId,
            {
              version: target.version,
              status: data.status,
              notes: data.notes ?? "",
            }
          )
          replaceIncident(updatedIncident)
          toast.add({
            type: "success",
            description: `Incidente #${existingId} atualizado com sucesso.`,
          })
        } else {
          const truck = await ensureTruck(
            data.vehiclePlate,
            data.vehicleModel,
            data.driverName,
            data.location
          )

          const created = await incidentsAPI.createIncident({
            title: data.title,
            description: data.description,
            category: data.category,
            criticality: data.criticality,
            status: data.status,
            location: data.location,
            notes: data.notes,
            truck_id: truck.id,
          })

          setIncidents((prev) => [created, ...prev])
          toast.add({
            type: "success",
            description: `Novo incidente #${created.id} criado com sucesso.`,
          })
        }
      } catch (err) {
        toast.add({
          type: "error",
          description: getErrorMessage(err, "Falha ao salvar o incidente."),
        })
        void refreshData()
      }
    },
    [ensureTruck, incidents, refreshData, replaceIncident]
  )

  return {
    incidents,
    fleet,
    criticalUnattendedCount,
    prependIncident,
    replaceIncident,
    lockAndAssume,
    releaseLock,
    finishTriage,
    updateStatus,
    injectStressLoad,
    resetData,
    saveIncident,
  }
}
