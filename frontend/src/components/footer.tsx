import { UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FooterProps {
  userName?: string
}

export function Footer({ userName }: FooterProps) {
  const name = userName?.trim()

  return (
    <footer className="border-t bg-background text-xs text-muted-foreground">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-end gap-3 px-4 sm:px-6 lg:px-8">
        {name && (
          <Badge
            variant="outline"
            title={`Sessão ativa: ${name}`}
            className="mr-auto min-w-0 gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1 text-[11px] font-medium"
          >
            <UserIcon className="size-3 shrink-0" />
            <span className="truncate">{name}</span>
          </Badge>
        )}

        <div className="flex shrink-0 items-center gap-4 text-[11px]">
          <span className="hidden sm:inline">
            Central de Resposta a Incidentes
          </span>
          <span className="font-mono text-muted-foreground/70">v2.4.0</span>
        </div>
      </div>
    </footer>
  )
}
