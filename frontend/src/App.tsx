import { useCallback } from "react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Toaster, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CentralView } from "@/components/views/central-view"
import { CrudManagementView } from "@/components/views/crud-management-view"
import { SessionView } from "@/components/views/session-view"
import { useIncidentsData } from "@/hooks/use-incidents-data"
import { useNavigation } from "@/hooks/use-navigation"
import { usePresence } from "@/hooks/use-presence"

export function App() {
  const {
    user,
    activeView,
    selectedIncidentId,
    setSelectedIncidentId,
    showLoginPage,
    hasCompletedInitialSession,
    startTriageSession,
    changeView,
    selectIncident,
    openLoginPage,
    closeLoginPage,
  } = useNavigation()

  const {
    incidents,
    fleet,
    criticalUnattendedCount,
    prependIncident,
    replaceIncident,
    lockAndAssume,
    releaseLock,
    injectStressLoad,
    resetData,
    saveIncident,
  } = useIncidentsData()

  usePresence({
    selectedIncidentId,
    userName: user.name,
    enabled: !showLoginPage,
    onNewIncident: prependIncident,
    onPatchIncident: replaceIncident,
  })

  const handleLockAndAssume = useCallback(
    async (id: number) => {
      await lockAndAssume(id)
      setSelectedIncidentId(id)
    },
    [lockAndAssume, setSelectedIncidentId]
  )

  const handleAssumeFromCentral = useCallback(
    (id: number) => {
      selectIncident(id)
      void handleLockAndAssume(id)
    },
    [handleLockAndAssume, selectIncident]
  )

  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="flex min-h-svh flex-col justify-between bg-background text-foreground antialiased">
          <Navbar
            activeView={activeView}
            onViewChange={changeView}
            user={user}
            onLogOut={openLoginPage}
            criticalUnattendedCount={criticalUnattendedCount}
            minimal={showLoginPage}
          />

          {showLoginPage ? (
            <SessionView
              user={user}
              onStart={startTriageSession}
              hasActiveSession={hasCompletedInitialSession}
              onCancel={closeLoginPage}
            />
          ) : (
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {activeView === "triagem" && (
                <CentralView
                  incidents={incidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={selectIncident}
                  onAssumeTriage={handleAssumeFromCentral}
                  onLockAndAssume={handleLockAndAssume}
                  onReleaseLock={releaseLock}
                />
              )}

              {activeView === "testes" && (
                <CrudManagementView
                  incidents={incidents}
                  fleet={fleet}
                  onInjectStressLoad={injectStressLoad}
                  onResetData={resetData}
                  onSaveIncident={saveIncident}
                />
              )}
            </main>
          )}

          <Footer />
        </div>
        <Toaster />
      </ToastProvider>
    </TooltipProvider>
  )
}

export default App
