import * as React from "react"
import { CheckIcon, WrenchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { UserRole, type UserSession } from "@/types/session"

interface AnalystSessionViewProps {
  user: UserSession
  onStartTriage: (updated: UserSession) => void
  onStartSupervisor?: () => void
  onCancel?: () => void
  hasActiveSession?: boolean
}

export function AnalystSessionView({
  user,
  onStartTriage,
  onStartSupervisor,
}: AnalystSessionViewProps) {
  const [nameInput, setNameInput] = React.useState(user.name)

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    const trimmed = nameInput.trim() || "Larissa Rocha"
    onStartTriage({
      ...user,
      name: trimmed,
      role: UserRole.ANALYST,
    })
    toast.success(`Sessão iniciada como ${trimmed}.`)
  }

  const handleSupervisorClick = () => {
    if (onStartSupervisor) {
      onStartSupervisor()
    } else {
      onStartTriage({
        ...user,
        name: "Supervisor de Frota",
        role: UserRole.SUPERVISOR,
      })
    }
    toast.success("Modo Supervisor ativado.")
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12">
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

            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleSupervisorClick}
            >
              <WrenchIcon className="size-4" />
              <span>Testar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
