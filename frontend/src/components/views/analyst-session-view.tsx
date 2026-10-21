import * as React from "react"
import {
  AlertOctagonIcon,
  CheckIcon,
  MoonIcon,
  SunIcon,
  WrenchIcon,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { AnalystSession } from "@/types/incidents"
import { toast } from "sonner"

interface AnalystSessionViewProps {
  analyst: AnalystSession
  onStartTriage: (updated: AnalystSession) => void
  onCancel?: () => void
  hasActiveSession?: boolean
}

export function AnalystSessionView({
  analyst,
  onStartTriage,
}: AnalystSessionViewProps) {
  const { theme, setTheme } = useTheme()
  const [nameInput, setNameInput] = React.useState(analyst.name)

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    const trimmed = nameInput.trim() || "Larissa Rocha"
    onStartTriage({
      ...analyst,
      name: trimmed,
    })
    toast.success(`Sessão iniciada como ${trimmed}.`)
  }

  return (
    <div className="flex min-h-svh flex-col justify-between bg-background text-foreground antialiased">
      {/* Top Minimal Header */}
      <header className="w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <AlertOctagonIcon className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Central de Incidentes
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
            >
              <SunIcon className="size-3.5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <MoonIcon className="absolute size-3.5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </Button>
          </div>
        </div>
      </header>

      {/* Full-Page Centered Session Card */}
      <main className="mx-auto flex w-full max-w-2xl flex-col justify-center px-4 py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <p className="mt-1.5 text-lg text-muted-foreground">
            Escolha o modo de uso do MVP
          </p>
        </div>
        <Card className="shadow-sm">
          <CardContent className="flex flex-row">
            <div className="flex w-1/2 flex-col">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Usuário
              </h1>
              <p className="my-5 text-sm">
                Analista do sistema: investiga e resolve os incidentes recebidos
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                <Label htmlFor="analyst-name-page" className="text-xs">
                  Nome
                </Label>
                <div>
                  <Input
                    id="analyst-name-page"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  <CheckIcon className="size-4" />
                  <span>Iniciar Triagem</span>
                </Button>
              </form>
            </div>

            <Separator className="mx-4" orientation="vertical" />

            <div className="flex w-1/2 flex-col justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Supervisor
                </h1>
                <p className="my-5 text-sm">
                  Usuário de teste: Pode gerar Incidentes novos e gerencia a
                  frota. Acesso completo ao CRUD.
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                <WrenchIcon className="size-4" />
                <span>Testar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t bg-background text-xs text-muted-foreground">
        <div className="mx-auto flex h-12 max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] text-foreground/80">
              Sincronização Ativa
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-[11px]">
              Buffer em memória local 100% íntegro
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Central de Resposta a Incidentes</span>
            <span className="font-mono text-muted-foreground/70">v2.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
