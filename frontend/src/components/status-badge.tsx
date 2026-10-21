import { IncidentStatus } from "@/api/model"
import { Badge } from "@/components/ui/badge"
import { statusToString } from "@/lib/utils"

interface StatusBadgeProps {
  status: IncidentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className="rounded-sm text-[10px] font-semibold">
      {statusToString(status)}
    </Badge>
  )
}
