import { useCallback, useEffect, useState } from "react"
import type { ActiveNavView } from "@/components/navbar"
import { INITIAL_USER, type UserSession } from "@/types/session"

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
  const [user, setUser] = useState<UserSession>(INITIAL_USER)

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
        setActiveView(state.activeView)
        setSelectedIncidentId(state.selectedIncidentId)
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
      const nextIncidentId = view === "triagem" ? null : selectedIncidentId
      if (view === "triagem") {
        setSelectedIncidentId(null)
      }
      setActiveView(view)
      pushNavState({ activeView: view, selectedIncidentId: nextIncidentId })
    },
    [pushNavState, selectedIncidentId]
  )

  const selectIncident = useCallback(
    (incidentId: number | null) => {
      setSelectedIncidentId(incidentId)
      pushNavState({ selectedIncidentId: incidentId })
    },
    [pushNavState]
  )

  const openLoginPage = useCallback(() => {
    setShowLoginPage(true)
    pushNavState({ showLoginPage: true })
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
