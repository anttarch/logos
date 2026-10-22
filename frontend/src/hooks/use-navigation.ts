import { useCallback, useEffect, useState } from "react"
import type { ActiveNavView } from "@/components/navbar"
import { UserRole, type UserSession } from "@/types/session"

interface HistoryNavState {
  activeView: ActiveNavView
  selectedIncidentId: number | null
  showLoginPage: boolean
}

function buildUrlFromState(state: HistoryNavState): string {
  const url = new URL(window.location.href)
  if (state.showLoginPage) {
    url.searchParams.delete("view")
    url.searchParams.delete("incident")
  } else {
    url.searchParams.set("view", state.activeView)
    if (state.selectedIncidentId !== null) {
      url.searchParams.set("incident", String(state.selectedIncidentId))
    } else {
      url.searchParams.delete("incident")
    }
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function useNavigation() {
  const [showLoginPage, setShowLoginPage] = useState(true)
  const [hasCompletedInitialSession, setHasCompletedInitialSession] =
    useState(false)
  const [activeView, setActiveView] = useState<ActiveNavView>("triagem")
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(
    null
  )
  const [user, setUser] = useState<UserSession>({
    name: "",
    role: UserRole.ANALYST,
  })

  const pushNavState = useCallback(
    (next: Partial<HistoryNavState>) => {
      const nextState: HistoryNavState = {
        activeView: next.activeView ?? activeView,
        selectedIncidentId:
          next.selectedIncidentId !== undefined
            ? next.selectedIncidentId
            : selectedIncidentId,
        showLoginPage: next.showLoginPage ?? showLoginPage,
      }
      window.history.pushState(nextState, "", buildUrlFromState(nextState))
    },
    [activeView, selectedIncidentId, showLoginPage]
  )

  useEffect(() => {
    const initialState: HistoryNavState = {
      activeView: "triagem",
      selectedIncidentId: null,
      showLoginPage: true,
    }
    if (!window.history.state) {
      window.history.replaceState(
        initialState,
        "",
        buildUrlFromState(initialState)
      )
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryNavState | null
      if (state) {
        const selectedId =
          state.activeView === "triagem" ? state.selectedIncidentId : null

        setActiveView(state.activeView)
        setSelectedIncidentId(selectedId)
        setShowLoginPage(state.showLoginPage)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const startTriageSession = useCallback(
    (updatedUser: UserSession) => {
      setUser(updatedUser)
      setHasCompletedInitialSession(true)
      setShowLoginPage(false)
      pushNavState({ showLoginPage: false })
    },
    [pushNavState]
  )

  const changeView = useCallback(
    (view: ActiveNavView) => {
      if (view === "testes" && user.role !== UserRole.SUPERVISOR) return

      setSelectedIncidentId(null)
      setActiveView(view)
      pushNavState({ activeView: view, selectedIncidentId: null })
    },
    [pushNavState, user.role]
  )

  const selectIncident = useCallback(
    (incidentId: number | null) => {
      setSelectedIncidentId(incidentId)
      pushNavState({ selectedIncidentId: incidentId })
    },
    [pushNavState]
  )

  const openLoginPage = useCallback(() => {
    setUser({ name: "", role: UserRole.ANALYST })
    setActiveView("triagem")
    setSelectedIncidentId(null)
    setShowLoginPage(true)
    pushNavState({
      activeView: "triagem",
      selectedIncidentId: null,
      showLoginPage: true,
    })
  }, [pushNavState])

  const closeLoginPage = useCallback(() => {
    setShowLoginPage(false)
    pushNavState({ showLoginPage: false })
  }, [pushNavState])

  return {
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
  }
}
