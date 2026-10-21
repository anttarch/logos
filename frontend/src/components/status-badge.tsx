import { IncidentStatus } from "@/api/model"
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: IncidentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  function getStatusLabel(status: IncidentStatus) {
    switch (status) {
      case IncidentStatus.OPEN:
        return "Aberto"
      case IncidentStatus.CLOSED:
        return "Fechado"
      case IncidentStatus.UNDER_INVESTIGATION:
        return "Em investigação"
      case IncidentStatus.INCONCLUSIVE:
        return "Inconclusivo"
    }
  }

  return (
    <Badge variant="outline" className="rounded-sm text-[10px] font-semibold">
      {getStatusLabel(status)}
    </Badge>
  )
}
