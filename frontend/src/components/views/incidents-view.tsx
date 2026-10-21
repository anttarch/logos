import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { IncidentStatus, type IncidentResponse } from "@/api/model"
import { CriticalityBadge } from "@/components/criticality-badge"
import { categoryToString, statusToString } from "@/lib/utils"
import { CategoryIcon } from "@/components/category-icon"

interface IncidentsViewProps {
  incidents: IncidentResponse[]
  selectedIncidentId: number | null
  onBack?: () => void
  onLockAndAssume: (id: number) => void
  onReleaseLock: (id: number) => void
}

export function IncidentsView({
  incidents,
  selectedIncidentId,
  onBack,
  onLockAndAssume,
  onReleaseLock,
  // onAddNote,
}: IncidentsViewProps) {
  // const [noteInput, setNoteInput] = useState("")

  const selectedIncident = useMemo(
    () =>
      incidents.find((i) => i.id === selectedIncidentId) ??
      incidents[0] ??
      null,
    [incidents, selectedIncidentId]
  )

  // const handleSubmitNote = () => {
  //   const trimmed = noteInput.trim()
  //   if (!trimmed || !selectedIncident) return
  //   onAddNote(selectedIncident.id, trimmed, notifySupervisor)
  //   setNoteInput("")
  // }

  const incidentDetails = [
    { label: "Status", value: statusToString(selectedIncident.status) },
    { label: "Categoria", value: categoryToString(selectedIncident.category) },
    { label: "Local da Ocorrência", value: selectedIncident.location },
    {
      label: "Atualizado em",
      value: Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(Date.parse(selectedIncident.updated_at)),
    },
  ]

  const truckDetails = [
    { label: "Placa", value: selectedIncident.truck.plate },
    { label: "Modelo", value: selectedIncident.truck.model },
    { label: "Motorista", value: selectedIncident.truck.driver_name },
    {
      label: "Localização do Veículo",
      value: selectedIncident.truck.location,
    },
  ]

  const isUnderInvestigation =
    selectedIncident.status === IncidentStatus.UNDER_INVESTIGATION

  return (
    <div className="space-y-6">
      {onBack && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="cursor-pointer" onClick={onBack}>
                Triagem
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ocorrência #{selectedIncident.id}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="mt-1 flex flex-row gap-3.5 border-b">
        <CategoryIcon category={selectedIncident.category} />
        <div className="flex flex-col gap-1.5 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {selectedIncident.title}
          </h1>
          <div className="flex flex-row gap-2">
            <CriticalityBadge criticality={selectedIncident.criticality} />
            <Badge variant="outline" className="rounded-sm text-xs font-bold">
              {Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "long",
              }).format(Date.parse(selectedIncident.created_at))}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between pt-3">
          <span className="text-sm font-semibold text-foreground">
            Dados da Ocorrência
          </span>
          <span className="text-xs text-muted-foreground">
            ID #{selectedIncident.id} · Versão #{selectedIncident.version}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {incidentDetails.map((inc) => (
            <div key={inc.label} className="rounded-md border bg-muted/40 p-2">
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {inc.label}
              </span>
              <span className="mt-1 text-xs font-semibold text-foreground">
                {inc.value}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-md border bg-muted/40 p-2">
          <span className="block text-[10px] font-semibold text-muted-foreground">
            Descrição
          </span>
          <p className="mt-1 text-xs font-semibold text-foreground">
            {selectedIncident.description || "Sem descrição informada."}
          </p>
        </div>
        <div className="pt-3">
          <span className="text-sm font-semibold text-foreground">
            Dados do Veículo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {truckDetails.map((inc) => (
            <div key={inc.label} className="rounded-md border bg-muted/40 p-2">
              <span className="block text-[10px] font-semibold text-muted-foreground">
                {inc.label}
              </span>
              <span className="mt-1 text-xs font-semibold text-foreground">
                {inc.value}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3">
          <span className="text-sm font-semibold tracking-wider text-foreground">
            Notas Registradas
          </span>
        </div>
        <div className="rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap text-foreground">
          {selectedIncident.notes || "Nenhuma nota operacional registrada."}
        </div>

        {/*<div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="operational-note-input"
              className="text-xs font-medium"
            >
              Registrar Nota Operacional
            </Label>
            <span className="font-mono text-[10px] text-muted-foreground">
              Salvo no log permanente
            </span>
          </div>

          <Textarea
            id="operational-note-input"
            rows={2}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Insira detalhes do contato com PRF, motorista ou seguradora..."
            className="resize-none text-xs"
          />

          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              onClick={handleSubmitNote}
              className="gap-1.5 text-xs"
            >
              <SendIcon className="size-3.5" />
              <span>Registrar Nota</span>
            </Button>
          </div>
        </div>*/}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button
          variant="destructive"
          size="lg"
          className="text-xs"
          onClick={() => onReleaseLock(selectedIncident.id)}
        >
          Liberar Lock do Incidente
        </Button>
        <Button
          size="lg"
          className="text-xs"
          disabled={isUnderInvestigation}
          onClick={() => onLockAndAssume(selectedIncident.id)}
        >
          Assumir Incidente
        </Button>
      </div>
    </div>
  )
}
