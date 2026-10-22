# Backend do Logos

API FastAPI da Central de Resposta a Incidentes, com persistência SQLite,
validação Pydantic e canal WebSocket para eventos e presença.

As instruções completas de setup, arquitetura e deploy estão no
[README principal](../README.md).

## Comandos rápidos

```bash
cp .env.example .env
uv sync
uv run uvicorn backend.main:app --reload
```

Testes:

```bash
uv run pytest -q
```
