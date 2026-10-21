import { IncidentCategory } from "@/api/model"
import {
  CarIcon,
  CloudAlertIcon,
  FlameIcon,
  HeartPulseIcon,
  TrafficConeIcon,
  WrenchIcon,
} from "lucide-react"

interface CategoryIconProps {
  category: IncidentCategory
}

export function CategoryIcon({ category }: CategoryIconProps) {
  function getCategoryIcon(category: IncidentCategory) {
    switch (category) {
      case IncidentCategory.VEHICLE_ACCIDENT:
        return <FlameIcon className="size-5 text-destructive" />
      case IncidentCategory.VICTIM_ACCIDENT:
        return <HeartPulseIcon className="size-5 text-destructive" />
      case IncidentCategory.WEIRD_WEATHER_CONDITION:
        return <CloudAlertIcon className="size-5 text-destructive" />
      case IncidentCategory.MECHANICAL_ISSUE:
        return <WrenchIcon className="size-5 text-destructive" />
      case IncidentCategory.ROAD_BLOCK:
        return <TrafficConeIcon className="size-5 text-destructive" />
      default:
        return <CarIcon className="size-5 text-destructive" />
    }
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
      {getCategoryIcon(category)}
    </div>
  )
}
