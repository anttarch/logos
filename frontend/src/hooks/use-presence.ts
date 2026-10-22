import { useCallback, useEffect, useRef, useState } from "react"
import type { IncidentResponse } from "@/api/model"
import { API_BASE } from "@/lib/api/common"

export type ActiveViewersMap = Record<number, string[]>

type ServerWsMessage =
  | { event: "PRESENCE"; payload: ActiveViewersMap }
  | { event: "NEW_INCIDENT"; payload: IncidentResponse }
  | { event: "PATCH_INCIDENT"; payload: IncidentResponse }

interface UsePresenceOptions {
  /**
   * Incident whose detail view is currently open, or `null` when the user is
   * not looking at an incident. Presence is only announced for this value, so
   * it must follow the rendered view (including browser back/forward).
   */
  viewedIncidentId: number | null
  userName: string
  enabled?: boolean
  onNewIncident?: (incident: IncidentResponse) => void
  onPatchIncident?: (incident: IncidentResponse) => void
}

function getWsUrl(): string {
  const base = API_BASE.replace(/\/+$/, "")
  if (base.startsWith("ws")) return `${base}/ws/`

  if (base.startsWith("http")) {
    return `${base.replace(/^http/, "ws")}/ws/`
  }

  // Relative API base (e.g. "/api"): derive the socket origin from the page.
  const origin = window.location.origin.replace(/^http/, "ws")
  return `${origin}${base}/ws/`
}

const RECONNECT_BASE_DELAY = 1_000
const RECONNECT_MAX_DELAY = 15_000

export function usePresence({
  viewedIncidentId,
  userName,
  enabled = true,
  onNewIncident,
  onPatchIncident,
}: UsePresenceOptions) {
  const [activeViewers, setActiveViewers] = useState<ActiveViewersMap>({})
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  // Incident the server currently believes this user is viewing.
  const announcedIncidentRef = useRef<number | null>(null)
  // Incident the UI currently wants to announce (kept in a ref so a socket
  // that opens later/reconnects can announce the latest view).
  const viewedIncidentRef = useRef<number | null>(viewedIncidentId)

  const onNewIncidentRef = useRef(onNewIncident)
  const onPatchIncidentRef = useRef(onPatchIncident)

  useEffect(() => {
    onNewIncidentRef.current = onNewIncident
    onPatchIncidentRef.current = onPatchIncident
  }, [onNewIncident, onPatchIncident])

  const sendEvent = useCallback(
    (
      ws: WebSocket,
      event: "START_VIEW" | "END_VIEW",
      incidentId: number,
      user: string
    ) => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(
        JSON.stringify({
          event,
          incident_id: incidentId,
          user,
        })
      )
    },
    []
  )

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let reconnectTimer: number | undefined
    let reconnectDelay = RECONNECT_BASE_DELAY
    let socket: WebSocket | null = null

    const connect = () => {
      if (disposed) return

      const nextSocket = new WebSocket(getWsUrl())
      socket = nextSocket
      wsRef.current = nextSocket

      nextSocket.onopen = () => {
        if (disposed) return
        reconnectDelay = RECONNECT_BASE_DELAY
        setIsConnected(true)

        const currentIncidentId = viewedIncidentRef.current
        if (currentIncidentId !== null) {
          sendEvent(nextSocket, "START_VIEW", currentIncidentId, userName)
          announcedIncidentRef.current = currentIncidentId
        }
      }

      nextSocket.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(String(msgEvent.data)) as ServerWsMessage
          if (data.event === "PRESENCE" && data.payload) {
            setActiveViewers(data.payload)
          } else if (data.event === "NEW_INCIDENT" && data.payload) {
            onNewIncidentRef.current?.(data.payload)
          } else if (data.event === "PATCH_INCIDENT" && data.payload) {
            onPatchIncidentRef.current?.(data.payload)
          }
        } catch {
          // Ignore malformed WS payloads
        }
      }

      nextSocket.onerror = () => {
        nextSocket.close()
      }

      nextSocket.onclose = () => {
        if (wsRef.current === nextSocket) {
          wsRef.current = null
          announcedIncidentRef.current = null
          setActiveViewers({})
          setIsConnected(false)
        }

        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
      }

      // Best effort: tell the server we stopped watching before closing. The
      // backend also clears presence when the socket drops, which covers hard
      // navigations (refresh/close) where this cleanup never runs.
      if (socket && announcedIncidentRef.current !== null) {
        sendEvent(socket, "END_VIEW", announcedIncidentRef.current, userName)
      }
      announcedIncidentRef.current = null

      socket?.close()
      if (wsRef.current === socket) {
        wsRef.current = null
        setIsConnected(false)
      }
    }
  }, [enabled, userName, sendEvent])

  useEffect(() => {
    viewedIncidentRef.current = viewedIncidentId

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const announced = announcedIncidentRef.current
    if (announced === viewedIncidentId) return

    if (announced !== null) {
      sendEvent(ws, "END_VIEW", announced, userName)
      announcedIncidentRef.current = null
    }

    if (viewedIncidentId !== null) {
      sendEvent(ws, "START_VIEW", viewedIncidentId, userName)
      announcedIncidentRef.current = viewedIncidentId
    }
  }, [viewedIncidentId, userName, sendEvent])

  const getViewersForIncident = useCallback(
    (incidentId: number): string[] => {
      return activeViewers[incidentId] ?? []
    },
    [activeViewers]
  )

  return {
    activeViewers,
    isConnected,
    getViewersForIncident,
  }
}
