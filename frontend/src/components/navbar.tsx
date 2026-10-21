import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react"
import { NavbarBrand } from "@/components/navbar-brand"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { UserSession } from "@/types/session"

export type ActiveNavView = "triagem" | "fila-critica" | "testes"

interface NavbarProps {
  activeView?: ActiveNavView
  onViewChange?: (view: ActiveNavView) => void
  user?: UserSession
  onLogOut?: () => void
  criticalUnattendedCount?: number
  minimal?: boolean
}

export function Navbar({
  activeView = "triagem",
  onViewChange,
  onLogOut: onLogOut,
  minimal = false,
}: NavbarProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <NavbarBrand
            onClick={
              !minimal && onViewChange
                ? () => onViewChange("triagem")
                : undefined
            }
          />

          {!minimal && onViewChange && (
            <nav className="hidden items-center gap-1 md:flex">
              <Button
                variant={activeView === "triagem" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("triagem")}
                className="gap-1.5 text-xs"
              >
                <span>Triagem</span>
              </Button>
              <Button
                variant={activeView === "testes" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onViewChange("testes")}
                className="text-xs"
              >
                Testes
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {!minimal && (
            <>
              <Badge
                variant="outline"
                className="hidden h-7 items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1 text-xs sm:inline-flex"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span>Conectado</span>
              </Badge>

              {onLogOut && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogOut}
                  className="gap-1.5 text-xs"
                >
                  <LogOutIcon className="size-3.5" />
                  <span>Sair</span>
                </Button>
              )}
            </>
          )}

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={toggleTheme}
                  aria-label="Alternar tema"
                />
              }
            >
              <SunIcon className="size-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <MoonIcon className="absolute size-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </TooltipTrigger>
            <TooltipContent>Alternar tema (Atalho: D)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
