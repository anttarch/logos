import { useMemo } from "react"
import { EyeIcon, InfoIcon, LockIcon, SearchIcon, ZapIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IncidentCriticality,
  IncidentCategory,
  IncidentStatus,
  type IncidentResponse,
} from "@/api/model"
import { useIncidentFilters } from "@/hooks/use-incident-filters"
import { CriticalityBadge } from "../criticality-badge"
import { StatusBadge } from "../status-badge"
import { CategoryIcon } from "../category-icon"
import { IncidentsView } from "./incidents-view"

interface CentralViewProps {
  incidents: IncidentResponse[]
  selectedIncidentId: number | null
  onSelectIncident: (incidentId: number | null) => void
  onAssumeTriage: (incidentId: number) => void
  onLockAndAssume: (id: number) => void
  onReleaseLock: (id: number) => void
  getViewersForIncident: (incidentId: number) => string[]
  currentUserName: string
}

const criticality_items = [
  { label: "Por Criticidade", value: null },
  { label: "Alta Criticidade", value: IncidentCriticality.HIGH },
  { label: "Média Criticidade", value: IncidentCriticality.MEDIUM },
  { label: "Baixa Criticidade", value: IncidentCriticality.LOW },
]

const category_items = [
  { label: "Por Categoria", value: null },
  { label: "Acidente com Veículo", value: IncidentCategory.VEHICLE_ACCIDENT },
  { label: "Acidente com Vítimas", value: IncidentCategory.VICTIM_ACCIDENT },
  {
    label: "Condição Climática",
    value: IncidentCategory.WEIRD_WEATHER_CONDITION,
  },
  { label: "Problema Mecânico", value: IncidentCategory.MECHANICAL_ISSUE },
  { label: "Bloqueio de Pista", value: IncidentCategory.ROAD_BLOCK },
]

const status_items = [
  { label: "Por Status", value: null },
  { label: "Aberto", value: IncidentStatus.OPEN },
  { label: "Fechado", value: IncidentStatus.CLOSED },
  { label: "Em Investigação", value: IncidentStatus.UNDER_INVESTIGATION },
  { label: "Inconclusivo", value: IncidentStatus.INCONCLUSIVE },
]

export function CentralView({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onAssumeTriage,
  onLockAndAssume,
  onReleaseLock,
  getViewersForIncident,
  currentUserName,
}: CentralViewProps) {
  const {
    search,
    setSearch,
    critFilter,
    setCritFilter,
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    filteredIncidents: filteredQueue,
  } = useIncidentFilters(incidents)

  const unattendedCritical = useMemo(
    () =>
      incidents
        .filter(
          (inc) =>
            inc.criticality === IncidentCriticality.HIGH &&
            inc.status === IncidentStatus.OPEN
        )
        .slice(0, 5),
    [incidents]
  )

  if (selectedIncidentId !== null) {
    return (
      <IncidentsView
        incidents={incidents}
        selectedIncidentId={selectedIncidentId}
        onBack={() => onSelectIncident(null)}
        onLockAndAssume={onLockAndAssume}
        onReleaseLock={onReleaseLock}
        getViewersForIncident={getViewersForIncident}
        currentUserName={currentUserName}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* incidentes já associados ao usuario */}
      {unattendedCritical.length > 0 && (
        <section className="space-y-3">
          <Card className="border border-destructive/10 bg-destructive/10">
            <CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-destructive">
                      {unattendedCritical.length} incidentes prioritários - Sem
                      triagem
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Atualizado em tempo real
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {unattendedCritical.map((inc) => (
              <Card
                key={inc.id}
                className="border-destructive/30 transition-colors"
              >
                <CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex gap-3.5">
                    <CategoryIcon category={inc.category} />
                    <div className="space-y-1.5">
                      <CriticalityBadge criticality={inc.criticality} />
                      <h3 className="flex flex-wrap gap-2 text-[16px] font-extrabold text-foreground">
                        {inc.title}
                        <Badge
                          variant="secondary"
                          className="rounded-sm text-[10px] font-bold uppercase"
                        >
                          #{inc.id}
                        </Badge>
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>
                          Veículo:{" "}
                          <strong className="text-foreground">
                            {inc.truck.plate} ({inc.truck.model})
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Local:{" "}
                          <strong className="text-foreground">
                            {inc.location}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t pt-3 md:flex-col md:justify-end md:gap-1 md:border-t-0 md:pt-0">
                    <Button
                      size="sm"
                      onClick={() => onSelectIncident(inc.id)}
                      className="gap-1.5 md:w-full"
                    >
                      <InfoIcon className="size-3.5" />
                      <span>Ver detalhes</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAssumeTriage(inc.id)
                      }}
                      className="gap-1.5 md:w-full"
                    >
                      <ZapIcon className="size-3.5" />
                      <span>Assumir Triagem</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card size="sm" className="bg-muted/30">
        <CardContent className="flex flex-wrap justify-between gap-3">
          <div className="relative min-w-65 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa, rodovia, ID..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex w-full flex-wrap gap-2">
            <Select
              items={criticality_items}
              value={critFilter}
              onValueChange={(v) => setCritFilter(v)}
            >
              <SelectTrigger className="w-full min-w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1">
                {criticality_items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={category_items}
              value={catFilter}
              onValueChange={(v) => setCatFilter(v)}
            >
              <SelectTrigger className="w-full min-w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1">
                {category_items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={status_items}
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-full min-w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-1">
                {status_items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredQueue.map((inc) => {
          const owner = inc.assigned_to ?? null
          const otherViewers = owner
            ? []
            : [
                ...new Set(
                  getViewersForIncident(inc.id).filter(
                    (viewer) => viewer !== currentUserName
                  )
                ),
              ]

          return (
            <Card
              key={inc.id}
              size="sm"
              onClick={() => onSelectIncident(inc.id)}
              className="cursor-pointer transition-colors hover:bg-border/30"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={inc.status} />
                  <div className="flex items-center gap-2">
                    {owner ? (
                      <Badge
                        variant="outline"
                        title={`Em posse de ${owner}`}
                        aria-label={`Em posse de ${owner}`}
                        className="gap-1 rounded-sm border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <LockIcon className="size-3" />
                      </Badge>
                    ) : otherViewers.length > 0 ? (
                      <Badge
                        variant="outline"
                        title={`Vendo agora: ${otherViewers.join(", ")}`}
                        aria-label={`Vendo agora: ${otherViewers.join(", ")}`}
                        className="gap-1 rounded-sm border-sky-500/30 bg-sky-500/10 px-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400"
                      >
                        <EyeIcon className="size-3" />
                        <span>{otherViewers.length}</span>
                      </Badge>
                    ) : null}
                    <Badge
                      variant="secondary"
                      className="rounded-sm text-[10px] font-bold uppercase"
                    >
                      #{inc.id}
                    </Badge>
                    <CriticalityBadge criticality={inc.criticality} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <CardTitle>{inc.title}</CardTitle>
                <CardDescription className="text-xs">
                  {inc.truck.plate} • {inc.location}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
