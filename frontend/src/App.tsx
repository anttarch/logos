import { useCallback } from "react"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Toaster, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CentralView } from "@/components/views/central-view"
import { TestingView } from "@/components/views/testing-view"
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
    finishTriage,
    injectStressLoad,
    resetData,
    saveIncident,
  } = useIncidentsData()

  // Presence must mirror what is actually on screen: the incident detail view
  // only exists while the triage view is active and the user is logged in.
  // Deriving it from navigation state keeps it correct on browser back/forward.
  const viewedIncidentId =
    !showLoginPage && activeView === "triagem" && selectedIncidentId !== null
      ? selectedIncidentId
      : null

  const { getViewersForIncident } = usePresence({
    viewedIncidentId,
    userName: user.name,
    enabled: !showLoginPage,
    onNewIncident: prependIncident,
    onPatchIncident: replaceIncident,
  })

  const handleLockAndAssume = useCallback(
    async (id: number) => {
      await lockAndAssume(id, user.name)
      setSelectedIncidentId(id)
    },
    [lockAndAssume, setSelectedIncidentId, user.name]
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
                  onFinishTriage={finishTriage}
                  getViewersForIncident={getViewersForIncident}
                  currentUserName={user.name}
                />
              )}

              {activeView === "testes" && (
                <TestingView
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
