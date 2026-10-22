import { useMemo, useState } from "react"
import {
  EditIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  SearchIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  IncidentCategory,
  IncidentCriticality,
  IncidentStatus,
  type IncidentResponse,
  type TruckResponse,
} from "@/api/model"
import { useIncidentFilters } from "@/hooks/use-incident-filters"
import { toast } from "@/components/ui/toast"
import { CriticalityBadge } from "@/components/criticality-badge"
import { StatusBadge } from "@/components/status-badge"
import { categoryToString } from "@/lib/utils"

export interface TestingFormPayload {
  title: string
  description: string | null
  category: IncidentCategory
  criticality: IncidentCriticality
  status: IncidentStatus
  location: string
  notes: string | null
  vehiclePlate: string
  vehicleModel: string
  driverName: string
}

interface TestingViewProps {
  incidents: IncidentResponse[]
  fleet: TruckResponse[]
  onInjectStressLoad: () => Promise<void> | void
  onResetData: () => Promise<void> | void
  onSaveIncident: (
    incidentData: TestingFormPayload,
    existingId?: number
  ) => Promise<void> | void
}

export function TestingView({
  incidents,
  fleet,
  onInjectStressLoad,
  onSaveIncident,
}: TestingViewProps) {
  const {
    search: incidentSearch,
    setSearch: setIncidentSearch,
    critFilter,
    setCritFilter,
    catFilter,
    setCatFilter,
    statusFilter,
    setStatusFilter,
    filteredIncidents,
  } = useIncidentFilters(incidents)
  const [fleetSearch, setFleetSearch] = useState("")
  const [isInjecting, setIsInjecting] = useState(false)

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | undefined>(undefined)
  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState<IncidentCategory>(
    IncidentCategory.VICTIM_ACCIDENT
  )
  const [formCriticality, setFormCriticality] = useState<IncidentCriticality>(
    IncidentCriticality.HIGH
  )
  const [formStatus, setFormStatus] = useState<IncidentStatus>(
    IncidentStatus.OPEN
  )
  const [formVehiclePlate, setFormVehiclePlate] = useState("BRA2E19")
  const [formVehicleModel, setFormVehicleModel] = useState("Volvo FH 540")
  const [formDriverName, setFormDriverName] = useState("Roberto Alencar")
  const [formLocation, setFormLocation] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formCreatedAt, setFormCreatedAt] = useState("")

  // Only notes and status may change when editing an existing incident.
  const isEditing = editingId !== undefined

  const readOnlyFieldClass =
    "text-xs read-only:bg-muted/40 read-only:text-muted-foreground"

  const filteredFleet = useMemo(() => {
    const q = fleetSearch.trim().toLowerCase()
    return fleet.filter(
      (t) =>
        !q ||
        t.plate.toLowerCase().includes(q) ||
        t.driver_name.toLowerCase().includes(q) ||
        t.model.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
    )
  }, [fleet, fleetSearch])

  const handleTriggerStress = async () => {
    setIsInjecting(true)
    try {
      await onInjectStressLoad()
    } finally {
      setIsInjecting(false)
    }
  }

  const openCreateModal = () => {
    const defaultTruck = fleet[0]
    setEditingId(undefined)
    setFormTitle("")
    setFormCategory(IncidentCategory.VICTIM_ACCIDENT)
    setFormCriticality(IncidentCriticality.HIGH)
    setFormStatus(IncidentStatus.OPEN)
    setFormVehiclePlate(defaultTruck?.plate ?? "BRA2E19")
    setFormVehicleModel(defaultTruck?.model ?? "Volvo FH 540")
    setFormDriverName(defaultTruck?.driver_name ?? "Roberto Alencar")
    setFormLocation(
      defaultTruck?.location ?? "BR-116 KM 218 - Régis Bittencourt, SP"
    )
    setFormDescription("")
    setFormNotes("")
    setFormCreatedAt(new Date().toISOString())
    setDialogOpen(true)
  }

  const openEditModal = (inc: IncidentResponse) => {
    setEditingId(inc.id)
    setFormTitle(inc.title)
    setFormCategory(inc.category)
    setFormCriticality(inc.criticality)
    setFormStatus(inc.status)
    setFormVehiclePlate(inc.truck.plate)
    setFormVehicleModel(inc.truck.model)
    setFormDriverName(inc.truck.driver_name)
    setFormLocation(inc.location)
    setFormDescription(inc.description ?? "")
    setFormNotes(inc.notes ?? "")
    setFormCreatedAt(inc.created_at)
    setDialogOpen(true)
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditing && (formTitle.trim().length < 3 || !formLocation.trim())) {
      toast.add({
        type: "error",
        description:
          "Preencha o título (mín. 3 caracteres) e a localização do incidente.",
      })
      return
    }

    await onSaveIncident(
      {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory,
        criticality: formCriticality,
        status: formStatus,
        location: formLocation.trim(),
        notes: formNotes.trim() || null,
        vehiclePlate:
          formVehiclePlate.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7) ||
          "BRA2E19",
        vehicleModel: formVehicleModel.trim() || "Volvo FH 540",
        driverName: formDriverName.trim() || "Roberto Alencar",
      },
      editingId
    )
    setDialogOpen(false)
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

  const form_status_items = [
    { label: "Aberto", value: IncidentStatus.OPEN },
    { label: "Fechado", value: IncidentStatus.CLOSED },
    { label: "Em Investigação", value: IncidentStatus.UNDER_INVESTIGATION },
    { label: "Inconclusivo", value: IncidentStatus.INCONCLUSIVE },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Zona de testes
          </h1>
          <p className="text-sm text-muted-foreground">
            Ambiente para homologação e gerenciamento de incidentes e veículos
            da frota.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerStress}
            disabled={isInjecting}
            className="gap-1.5 text-xs"
          >
            {isInjecting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ZapIcon className="size-3.5" />
            )}
            <span>{isInjecting ? "Injetando..." : "Injetar Incidentes"}</span>
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="gap-1.5 text-xs"
          >
            <PlusIcon className="size-3.5" />
            <span>Novo Incidente</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="incidents" className="gap-0 space-y-4">
        <TabsList className="px-1 py-4.5">
          <TabsTrigger value="incidents" className="p-3">
            <span className="text-xs font-bold">Incidentes</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="p-3">
            <span className="text-xs font-bold">Veículos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-65 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={incidentSearch}
                  onChange={(e) => setIncidentSearch(e.target.value)}
                  placeholder="Buscar por ID, Rodovia, Veículo..."
                  className="pl-9 text-xs"
                />
              </div>

              <div className="w-full sm:w-48">
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
              </div>

              <div className="w-full sm:w-48">
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
              </div>

              <div className="w-full sm:w-48">
                <Select
                  items={status_items}
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as IncidentStatus)}
                >
                  <SelectTrigger className="w-full text-xs">
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
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-10 px-4 font-bold">Id</TableHead>
                  <TableHead className="w-28 font-bold">
                    Título & Categoria
                  </TableHead>
                  <TableHead className="w-28 font-bold">Criticidade</TableHead>
                  <TableHead className="w-28 font-bold">Status</TableHead>
                  <TableHead className="w-28 font-bold">Veículo</TableHead>
                  <TableHead className="w-28 font-bold">Versão</TableHead>
                  <TableHead className="w-28 font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 text-xs font-medium">
                      #{item.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {categoryToString(item.category)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <CriticalityBadge criticality={item.criticality} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground">
                          {item.truck.plate} - {item.truck.model}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.location}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1.5 rounded-md text-[11px] text-muted-foreground"
                      >
                        <span>v{item.version}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openEditModal(item)}
                          className="gap-1"
                        >
                          <EditIcon className="size-3" />
                          <span>Editar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="relative w-full max-w-md flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
                placeholder="Buscar por placa, motorista ou modelo..."
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/40 text-xs">
                <TableRow>
                  <TableHead className="w-10 px-4 font-bold">Id</TableHead>
                  <TableHead className="w-28 font-bold">
                    Placa / Modelo
                  </TableHead>
                  <TableHead className="w-28 font-bold">Motorista</TableHead>
                  <TableHead className="w-28 font-bold">Localização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFleet.map((trk) => (
                  <TableRow key={trk.id}>
                    <TableCell className="px-4 text-xs font-medium">
                      #{trk.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {trk.plate}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {trk.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {trk.driver_name}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {trk.location}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                {editingId ? "Editar Incidente" : "Novo Incidente"}
              </DialogTitle>
              {editingId && (
                <Badge variant="secondary" className="text-xs">
                  #{editingId}
                </Badge>
              )}
            </div>
            <DialogDescription>
              {isEditing
                ? "Somente as notas operacionais e o status podem ser alterados."
                : "Atualize os parâmetros operacionais e telemetria do incidente."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="form-inc-title" className="text-xs">
                  Título do Incidente
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Obrigatório
                </span>
              </div>
              <Input
                id="form-inc-title"
                required
                readOnly={isEditing}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Colisão Frontal com Vítimas Graves"
                className={readOnlyFieldClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select
                  items={category_items}
                  value={formCategory}
                  disabled={isEditing}
                  onValueChange={(v) => setFormCategory(v as IncidentCategory)}
                >
                  <SelectTrigger className="w-full text-xs">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Criticidade</Label>
                <Select
                  items={criticality_items}
                  value={formCriticality}
                  disabled={isEditing}
                  onValueChange={(v) =>
                    setFormCriticality(v as IncidentCriticality)
                  }
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
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status do Ciclo de Vida</Label>
                <Select
                  items={form_status_items}
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as IncidentStatus)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="p-1">
                    {form_status_items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-inc-location" className="text-xs">
                  Localização na Rodovia
                </Label>
                <Input
                  id="form-inc-location"
                  required
                  readOnly={isEditing}
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="BR-116 KM 218 - Régis Bittencourt, SP"
                  className={readOnlyFieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="form-inc-plate" className="text-xs">
                  Placa (7 caracteres)
                </Label>
                <Input
                  id="form-inc-plate"
                  maxLength={7}
                  readOnly={isEditing}
                  value={formVehiclePlate}
                  onChange={(e) => setFormVehiclePlate(e.target.value)}
                  className={`font-mono ${readOnlyFieldClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-inc-model" className="text-xs">
                  Modelo da Carreta
                </Label>
                <Input
                  id="form-inc-model"
                  readOnly={isEditing}
                  value={formVehicleModel}
                  onChange={(e) => setFormVehicleModel(e.target.value)}
                  className={readOnlyFieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="form-inc-driver" className="text-xs">
                  Motorista
                </Label>
                <Input
                  id="form-inc-driver"
                  readOnly={isEditing}
                  value={formDriverName}
                  onChange={(e) => setFormDriverName(e.target.value)}
                  className={readOnlyFieldClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-inc-description" className="text-xs">
                Descrição Detalhada do Evento
              </Label>
              <Textarea
                id="form-inc-description"
                rows={2}
                readOnly={isEditing}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className={`resize-none ${readOnlyFieldClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-inc-notes" className="text-xs">
                Notas Operacionais
              </Label>
              <Textarea
                id="form-inc-notes"
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="resize-none text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="form-inc-created-at"
                  className="text-xs text-muted-foreground"
                >
                  Data e Hora de Criação (created_at)
                </Label>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <LockIcon className="size-3" />
                  Somente Leitura
                </span>
              </div>
              <Input
                id="form-inc-created-at"
                disabled
                readOnly
                value={formCreatedAt}
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
