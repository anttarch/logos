import { useMemo, useState } from "react"
import { CheckIcon, EyeIcon, Loader2Icon, LockIcon } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  onFinishTriage: (
    id: number,
    status: IncidentStatus,
    notes: string
  ) => Promise<boolean>
  getViewersForIncident: (incidentId: number) => string[]
  currentUserName: string
}

function formatViewers(viewers: string[]): string {
  if (viewers.length === 1) return `${viewers[0]} está vendo`
  if (viewers.length === 2) return `${viewers[0]} e ${viewers[1]} estão vendo`
  return `${viewers[0]} e mais ${viewers.length - 1} estão vendo`
}

export function IncidentsView({
  incidents,
  selectedIncidentId,
  onBack,
  onLockAndAssume,
  onReleaseLock,
  onFinishTriage,
  getViewersForIncident,
  currentUserName,
  // onAddNote,
}: IncidentsViewProps) {
  const selectedIncident = useMemo(
    () =>
      incidents.find((i) => i.id === selectedIncidentId) ??
      incidents[0] ??
      null,
    [incidents, selectedIncidentId]
  )

  const [noteInput, setNoteInput] = useState(
    () => selectedIncident?.notes ?? ""
  )
  const [finishStatus, setFinishStatus] = useState<IncidentStatus | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const otherViewers = useMemo(() => {
    if (!selectedIncident) return []

    return [
      ...new Set(
        getViewersForIncident(selectedIncident.id).filter(
          (viewer) => viewer !== currentUserName
        )
      ),
    ]
  }, [currentUserName, getViewersForIncident, selectedIncident])

  const handleFinishTriage = async () => {
    if (!selectedIncident || !finishStatus || isFinishing) return

    setIsFinishing(true)
    const finished = await onFinishTriage(
      selectedIncident.id,
      finishStatus,
      noteInput.trim()
    )
    setIsFinishing(false)

    if (finished) {
      setFinishStatus(null)
    }
  }

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

  const owner = selectedIncident.assigned_to ?? null
  const isOwnedByCurrentUser = owner === currentUserName

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

      <div className="mt-1 flex flex-row items-start gap-3.5 border-b">
        <CategoryIcon category={selectedIncident.category} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-6">
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

        {owner ? (
          <Badge
            variant="outline"
            title={`Em posse de ${owner}`}
            className="mt-1 hidden shrink-0 items-center gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 text-[11px] font-medium text-amber-600 sm:inline-flex dark:text-amber-400"
          >
            <LockIcon className="size-3.5" />
            <span>{isOwnedByCurrentUser ? "Seu lock" : owner}</span>
          </Badge>
        ) : otherViewers.length > 0 ? (
          <Badge
            variant="outline"
            title={otherViewers.join(", ")}
            className="mt-1 hidden shrink-0 items-center gap-1.5 rounded-full bg-muted/40 text-[11px] font-medium text-muted-foreground sm:inline-flex"
          >
            <EyeIcon className="size-3.5" />
            <span>{formatViewers(otherViewers)}</span>
          </Badge>
        ) : null}
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

        <div className="flex items-center justify-between gap-2 pt-3">
          <span className="text-sm font-semibold tracking-wider text-foreground">
            {isOwnedByCurrentUser ? "Finalizar Triagem" : "Notas Registradas"}
          </span>
          {isOwnedByCurrentUser && (
            <span className="font-mono text-[10px] text-muted-foreground">
              Notas e status são salvos juntos
            </span>
          )}
        </div>

        {isOwnedByCurrentUser ? (
          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="triage-notes" className="text-xs font-medium">
                Notas Operacionais
              </Label>
              <Textarea
                id="triage-notes"
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Registre o resultado da investigação, contatos e providências..."
                className="resize-none text-xs"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full space-y-1.5 sm:max-w-60">
                <Label htmlFor="triage-status" className="text-xs font-medium">
                  Resultado
                </Label>
                <Select
                  value={finishStatus}
                  onValueChange={(value) => {
                    if (value) setFinishStatus(value as IncidentStatus)
                  }}
                >
                  <SelectTrigger id="triage-status" className="w-full text-xs">
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IncidentStatus.CLOSED}>
                      Fechado
                    </SelectItem>
                    <SelectItem value={IncidentStatus.INCONCLUSIVE}>
                      Inconclusivo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="lg"
                className="gap-1.5 text-xs"
                disabled={finishStatus === null || isFinishing}
                onClick={handleFinishTriage}
              >
                {isFinishing ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <CheckIcon className="size-3.5" />
                )}
                <span>
                  {isFinishing ? "Finalizando..." : "Finalizar Triagem"}
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap text-foreground">
            {selectedIncident.notes || "Nenhuma nota operacional registrada."}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {isOwnedByCurrentUser && (
          <Button
            variant="destructive"
            size="lg"
            className="text-xs"
            onClick={() => onReleaseLock(selectedIncident.id)}
          >
            Liberar Lock do Incidente
          </Button>
        )}
        <Button
          size="lg"
          className="text-xs"
          disabled={owner !== null}
          onClick={() => onLockAndAssume(selectedIncident.id)}
        >
          Assumir Incidente
        </Button>
      </div>
    </div>
  )
}
