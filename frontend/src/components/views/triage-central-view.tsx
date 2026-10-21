import { useState, useMemo } from "react"
import {
  CarIcon,
  FlameIcon,
  HeartPulseIcon,
  InfoIcon,
  SearchIcon,
  TrafficConeIcon,
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
import type { Incident } from "@/types/incidents"
import { Criticality, IncidentCategory, IncidentStatus } from "@/api/model"

interface TriageCentralViewProps {
  incidents: Incident[]
  onAssumeTriage: (incidentId: string) => void
  onSelectAndNavigate: (incidentId: string) => void
}

function getCategoryIcon(category: Incident["category"]) {
  switch (category) {
    case "Acidente com Vítimas":
      return <HeartPulseIcon className="size-5 text-destructive" />
    case "Bloqueio de Pista":
      return <TrafficConeIcon className="size-5 text-destructive" />
    case "Acidente com Veículo":
      return <FlameIcon className="size-5 text-amber-500" />
    default:
      return <CarIcon className="size-5 text-destructive" />
  }
}

const criticality_items = [
  { label: "Por Criticidade", value: null },
  { label: "Alta Criticidade", value: Criticality.HIGH },
  { label: "Média Criticidade", value: Criticality.MEDIUM },
  { label: "Baixa Criticidade", value: Criticality.LOW },
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

export function TriageCentralView({
  incidents,
  onAssumeTriage,
  onSelectAndNavigate,
}: TriageCentralViewProps) {
  const [search, setSearch] = useState("")
  const [critFilter, setCritFilter] = useState<Criticality | null>(null)
  const [catFilter, setCatFilter] = useState<IncidentCategory | null>(null)
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | null>(null)

  const unattendedCritical = useMemo(
    () =>
      incidents
        .filter(
          (inc) =>
            inc.criticality === "Alta" &&
            !inc.lockedBy &&
            inc.status !== "Fechado"
        )
        .slice(0, 5),
    [incidents]
  )

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase()
    return incidents.filter((inc) => {
      const matchSearch =
        !q ||
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.vehiclePlate.toLowerCase().includes(q) ||
        inc.location.toLowerCase().includes(q)
      const matchCrit = critFilter == null || inc.criticality === critFilter
      const matchCat = catFilter == null || inc.category === catFilter
      const matchStatus = statusFilter == null || inc.status === statusFilter
      return matchSearch && matchCrit && matchCat && matchStatus
    })
  }, [incidents, search, critFilter, catFilter, statusFilter])

  return (
    <div className="space-y-6">
      {/* incidentes já associados ao usuario */}
      <section className="space-y-3">
        <Card className="border border-destructive/10 bg-destructive/10">
          <CardContent className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-destructive">
                    5 incidentes prioritários - Sem triagem
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
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
                    {getCategoryIcon(inc.category)}
                  </div>
                  <div className="space-y-1.5">
                    <Badge className="rounded-sm bg-destructive text-[10px] font-extrabold text-white uppercase">
                      ALTA
                    </Badge>
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
                          {inc.vehiclePlate} ({inc.vehicleModel})
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
                    onClick={() => onSelectAndNavigate(inc.id)}
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

      {/* migrar para pagina geral de incidentes */}
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

      {(search ||
        critFilter != null ||
        catFilter != null ||
        statusFilter != null) &&
        filteredQueue.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredQueue.map((inc) => (
              <Card
                key={inc.id}
                size="sm"
                onClick={() => onSelectAndNavigate(inc.id)}
                className="cursor-pointer transition-colors hover:bg-border/30"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="rounded-sm text-[10px]">
                      {inc.status}
                    </Badge>
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-sm text-[10px] font-bold uppercase"
                      >
                        #{inc.id}
                      </Badge>
                      <Badge className="rounded-sm bg-destructive text-[10px] font-extrabold text-white uppercase">
                        {inc.criticality}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <CardTitle>{inc.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {inc.vehiclePlate} • {inc.location}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}
