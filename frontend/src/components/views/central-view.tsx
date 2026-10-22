import { useMemo } from "react"
import {
  EyeIcon,
  InboxIcon,
  InfoIcon,
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
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
  onFinishTriage: (
    id: number,
    status: IncidentStatus,
    notes: string
  ) => Promise<boolean>
  getViewersForIncident: (incidentId: number) => string[]
  currentUserName: string
}

const criticality_rank: Record<IncidentCriticality, number> = {
  [IncidentCriticality.HIGH]: 3,
  [IncidentCriticality.MEDIUM]: 2,
  [IncidentCriticality.LOW]: 1,
}

const category_rank: Record<IncidentCategory, number> = {
  [IncidentCategory.VICTIM_ACCIDENT]: 5,
  [IncidentCategory.VEHICLE_ACCIDENT]: 4,
  [IncidentCategory.WEIRD_WEATHER_CONDITION]: 3,
  [IncidentCategory.MECHANICAL_ISSUE]: 2,
  [IncidentCategory.ROAD_BLOCK]: 1,
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
  onFinishTriage,
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

  const priorityIncidents = useMemo(() => {
    const openIncidents = incidents.filter(
      (inc) => inc.status === IncidentStatus.OPEN
    )

    openIncidents.sort((a, b) => {
      const criticalityDiff =
        criticality_rank[b.criticality] - criticality_rank[a.criticality]
      if (criticalityDiff !== 0) return criticalityDiff

      const categoryDiff = category_rank[b.category] - category_rank[a.category]
      if (categoryDiff !== 0) return categoryDiff

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    return openIncidents.slice(0, 5)
  }, [incidents])

  const priorityIncidentIds = useMemo(
    () => new Set(priorityIncidents.map((inc) => inc.id)),
    [priorityIncidents]
  )

  const remainingQueue = useMemo(
    () => filteredQueue.filter((inc) => !priorityIncidentIds.has(inc.id)),
    [filteredQueue, priorityIncidentIds]
  )

  if (selectedIncidentId !== null) {
    return (
      <IncidentsView
        key={selectedIncidentId}
        incidents={incidents}
        selectedIncidentId={selectedIncidentId}
        onBack={() => onSelectIncident(null)}
        onLockAndAssume={onLockAndAssume}
        onReleaseLock={onReleaseLock}
        onFinishTriage={onFinishTriage}
        getViewersForIncident={getViewersForIncident}
        currentUserName={currentUserName}
      />
    )
  }

  return (
    <div className="space-y-6">
      {incidents.length === 0 && (
        <Card size="sm" className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <InboxIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">Nenhum incidente cadastrado</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Quando um incidente chegar, ele aparecerá aqui para triagem.
            </p>
          </CardContent>
        </Card>
      )}

      {incidents.length > 0 && priorityIncidents.length === 0 && (
        <Card size="sm" className="border-dashed bg-muted/20">
          <CardContent className="flex items-center gap-3 py-3.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                Quadro de prioridades vazio
              </p>
              <p className="text-[11px] text-muted-foreground">
                Não há incidentes abertos aguardando triagem.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {priorityIncidents.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Quadro de prioridades
              </h2>
              <Badge
                variant="destructive"
                className="rounded-sm text-[10px] font-extrabold"
              >
                {priorityIncidents.length}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Aguardando triagem
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {priorityIncidents.map((inc) => (
              <Card
                key={inc.id}
                size="sm"
                onClick={() => onSelectIncident(inc.id)}
                className="h-full cursor-pointer ring-destructive/30 transition-colors hover:bg-border/30 hover:ring-destructive/50"
              >
                <CardContent className="flex h-full flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CategoryIcon category={inc.category} />
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <CriticalityBadge criticality={inc.criticality} />
                      <Badge
                        variant="secondary"
                        className="rounded-sm text-[10px] font-bold uppercase"
                      >
                        #{inc.id}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3
                      className="line-clamp-2 text-sm leading-tight font-bold text-foreground"
                      title={inc.title}
                    >
                      {inc.title}
                    </h3>
                    <p
                      className="truncate text-[11px] text-muted-foreground"
                      title={`${inc.truck.plate} (${inc.truck.model}) • ${inc.location}`}
                    >
                      <strong className="text-foreground">
                        {inc.truck.plate}
                      </strong>{" "}
                      • {inc.location}
                    </p>
                  </div>

                  <div className="mt-auto flex gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="xs"
                      className="flex-1 px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectIncident(inc.id)
                      }}
                    >
                      <InfoIcon className="size-3" />
                      <span>Ver</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="xs"
                      className="flex-1 px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAssumeTriage(inc.id)
                      }}
                    >
                      <ZapIcon className="size-3" />
                      <span>Assumir</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {incidents.length > 0 && (
        <>
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
            {remainingQueue.map((inc) => {
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
        </>
      )}
    </div>
  )
}
