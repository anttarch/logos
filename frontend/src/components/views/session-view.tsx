import { type SubmitEvent, useState } from "react"
import { CheckIcon, WrenchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { UserRole, type UserSession } from "@/types/session"
import { Field, FieldLabel } from "@/components/ui/field"

interface SessionViewProps {
  user: UserSession
  onStart: (updated: UserSession) => void
  onCancel?: () => void
  hasActiveSession?: boolean
}

export function SessionView({ user, onStart: onStart }: SessionViewProps) {
  const [nameInput, setNameInput] = useState("")

  const trimmedName = nameInput.trim()

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    if (!trimmedName) {
      toast.add({
        type: "error",
        description: "Informe seu nome para iniciar a sessão.",
      })
      return
    }

    onStart({
      ...user,
      name: trimmedName,
      role: UserRole.ANALYST,
    })
    toast.add({
      type: "success",
      description: `Sessão iniciada como ${trimmedName}.`,
    })
  }

  const handleSupervisorClick = () => {
    onStart({
      ...user,
      name: "Supervisor",
      role: UserRole.SUPERVISOR,
    })
    toast.add({
      type: "success",
      description: `Modo Supervisor ativado.`,
    })
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
              <Field>
                <FieldLabel htmlFor="analyst-name-page">Nome</FieldLabel>
                <Input
                  id="analyst-name-page"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Digite o nome completo"
                />
              </Field>
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto"
                disabled={!trimmedName}
              >
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
