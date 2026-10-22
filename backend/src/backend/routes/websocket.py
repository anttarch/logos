from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["ws"])


# server    -> envia PRESENCE com quem tá vendo algum incidente
#           -> envia NEW_INCIDENT com o novo incidente
#           -> envia PATCH_INCIDENT com o novo incidente
#
# cliente   -> envia START_VIEW pra dizer que começou a ver um
#           -> envia END_VIEW pra dizer que terminou de ver
#
# PRESENCE/NEW_INCIDENT/PATCH_INCIDENT => {event, payload}
# START_VIEW/END_VIEW => {event, incident_id, user}
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._views: dict[WebSocket, tuple[str, set[int]]] = {}

    @property
    def active_viewers(self) -> dict[int, list[str]]:
        viewers: dict[int, list[str]] = {}
        for user, incident_ids in self._views.values():
            for incident_id in incident_ids:
                names = viewers.setdefault(incident_id, [])
                if user not in names:
                    names.append(user)
        return viewers

    def presence_payload(self) -> dict:
        return {"event": "PRESENCE", "payload": self.active_viewers}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await websocket.send_json(self.presence_payload())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self._views.pop(websocket, None)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                dead.append(connection)
        for d in dead:
            self.disconnect(d)

    def start_view(
        self, websocket: WebSocket, incident_id: object, user: object
    ) -> bool:
        if not isinstance(incident_id, int) or not isinstance(user, str) or not user:
            return False

        _, incidents = self._views.get(websocket, (user, set()))
        incidents.add(incident_id)
        self._views[websocket] = (user, incidents)
        return True

    def end_view(self, websocket: WebSocket, incident_id: object, user: object) -> bool:
        entry = self._views.get(websocket)
        if entry is None:
            return False

        _, incidents = entry
        if incident_id not in incidents:
            return False

        incidents.discard(incident_id)
        if not incidents:
            self._views.pop(websocket, None)
        return True


ws = ConnectionManager()


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await ws.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")

            if (
                event == "START_VIEW"
                and ws.start_view(websocket, data.get("incident_id"), data.get("user"))
                or (
                    event == "END_VIEW"
                    and ws.end_view(
                        websocket, data.get("incident_id"), data.get("user")
                    )
                )
            ):
                await ws.broadcast(ws.presence_payload())

    except WebSocketDisconnect:
        pass
    finally:
        ws.disconnect(websocket)
        await ws.broadcast(ws.presence_payload())
