import { AlertOctagonIcon } from "lucide-react"

interface NavbarBrandProps {
  onClick?: () => void
}

export function NavbarBrand({ onClick }: NavbarBrandProps) {
  const content = (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
        <AlertOctagonIcon className="size-4" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        Central de Incidentes
      </span>
    </div>
  )

  if (!onClick) {
    return content
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left transition-opacity hover:opacity-90"
    >
      {content}
    </button>
  )
}
