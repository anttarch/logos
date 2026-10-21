from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["ws"])


# server    -> envia PRESENCE com quem tá vendo algum incidente
# cliente   -> envia START_VIEW pra dizer que começou a ver um
#           -> envia END_VIEW pra dizer que terminou de ver
#
# PRESENCE => {event, payload}
# START_VIEW/END_VIEW => {event, incident_id, user}
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.active_viewers: dict[int, list[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await websocket.send_json({"event": "PRESENCE", "payload": self.active_viewers})

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect, RuntimeError:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()

            if data.get("event") == "START_VIEW":
                incident_id = data.get("incident_id")
                manager.active_viewers[incident_id].append(data.get("user"))
                await manager.broadcast(
                    {"event": "PRESENCE", "payload": manager.active_viewers}
                )
            elif data.get("event") == "END_VIEW":
                incident_id = data.get("incident_id")
                manager.active_viewers[incident_id].remove(data.get("user"))
                await manager.broadcast(
                    {"event": "PRESENCE", "payload": manager.active_viewers}
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
