import { IncidentCriticality } from "@/api/model"
import { Badge } from "@/components/ui/badge"
import { criticalityToString } from "@/lib/utils"

interface CriticalityBadgeProps {
  criticality: IncidentCriticality
}

export function CriticalityBadge({ criticality }: CriticalityBadgeProps) {
  function getCriticalityBadge(criticality: IncidentCriticality) {
    switch (criticality) {
      case IncidentCriticality.HIGH:
        return (
          <Badge className="rounded-sm bg-destructive text-[10px] font-extrabold text-white uppercase">
            {criticalityToString(criticality)}
          </Badge>
        )
      case IncidentCriticality.MEDIUM:
        return (
          <Badge className="rounded-sm bg-amber-500 text-[10px] font-extrabold text-white uppercase">
            {criticalityToString(criticality)}
          </Badge>
        )
      case IncidentCriticality.LOW:
        return (
          <Badge className="rounded-sm bg-lime-700 text-[10px] font-extrabold text-white uppercase">
            {criticalityToString(criticality)}
          </Badge>
        )
    }
  }

  return getCriticalityBadge(criticality)
}
