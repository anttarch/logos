export function Footer() {
  return (
    <footer className="border-t bg-background text-xs text-muted-foreground">
      <div className="mx-auto flex h-12 max-w-7xl flex-col items-center justify-end gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 text-[11px]">
          <span>Central de Resposta a Incidentes</span>
          <span className="font-mono text-muted-foreground/70">v2.4.0</span>
        </div>
      </div>
    </footer>
  )
}
