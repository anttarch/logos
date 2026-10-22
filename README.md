# Logos — Central de Resposta a Incidentes

MVP da **Logos**, a central de triagem e resposta a incidentes da AutoU para
operações logísticas de missão crítica. O objetivo é substituir o caos de
planilhas e WhatsApp por uma fila priorizada, com atualização em tempo real,
controle de concorrência e rastreabilidade do ciclo de vida de cada ocorrência.

> **Repositório:** https://github.com/anttarch/logos
>
> **Aplicação online:** https://logos-autou-ljjz.vercel.app/
>
> **Vídeo de demonstração:** https://youtu.be/bJ8q_TRsZpw

---

## Visão geral

A aplicação foi construída em torno de quatro perguntas do desafio:

1. **Como um analista identifica prioridade em milissegundos?**  
   O topo da tela mostra um quadro fixo com os 5 incidentes `OPEN` mais
   críticos. A ordenação é criticidade → categoria → mais antigo. O restante da
   fila aparece logo abaixo, com busca e filtros por criticidade, categoria e
   status.

2. **Como dois analistas não resolvem o mesmo incidente ao mesmo tempo?**  
   Cada incidente tem um campo `version`. Toda atualização envia a versão lida
   e o backend só grava se ela ainda for a atual, usando um `UPDATE ... WHERE
version = ?` atômico. Atualizações concorrentes recebem `409 Conflict`. Além
   disso, o status `UNDER_INVESTIGATION` funciona como lock operacional via
   `assigned_to`, e a presença de quem está vendo cada chamado é compartilhada
   por WebSocket.

3. **Como a interface continua utilizável com rede instável?**  
   O cliente HTTP tem timeout de 8 s, retry com backoff exponencial para erros
   de servidor e falhas de rede em `GET`, reconexão automática do WebSocket
   (1 s a 15 s), toasts de erro e deduplicação de incidentes recebidos por HTTP
   e WebSocket. A carga de estresse cria os incidentes em sequência para não
   disputar escritas no SQLite.

4. **Como o analista faz gestão por exceção?**  
   Busca e filtros combináveis por criticidade, categoria e status reduzem a
   fila ao recorte relevante. O backend também aceita os mesmos filtros por
   query string, permitindo integrações e evolução para paginação.

## Funcionalidades

- Central de triagem com quadro de prioridades e fila operacional.
- Busca por ID, título, rodovia, placa ou modelo do veículo.
- Filtros combináveis por criticidade, categoria e status.
- Detalhe do incidente com dados da ocorrência e do veículo.
- Assumir/liberar lock, presença em tempo real e finalização da triagem com
  notas operacionais.
- Modo claro/escuro com persistência em `localStorage` e atalho `D`.
- Zona de testes para supervisor: criação/edição de incidentes, frota e injeção
  de carga.
- Feedback de carregamento, erro, vazio e processamento em ações assíncronas.
- API documentada automaticamente em `/docs` (Swagger UI) e `/redoc`.

## Stack

| Camada            | Tecnologias                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Backend           | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2 async, aiosqlite, WebSockets               |
| Banco             | SQLite no MVP, com caminho para PostgreSQL                                                  |
| Frontend          | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui + Base UI                            |
| Dados no frontend | `fetch` tipado, Zod para validação em runtime, tipos gerados pelo Orval a partir do OpenAPI |
| Testes            | pytest + pytest-asyncio + httpx/ASGI (backend)                                              |
| Ferramentas       | uv, Bun, ESLint, Prettier                                                                   |

## Arquitetura

```text
┌──────────────────────────────┐
│ React + TypeScript (Vite)    │
│                              │
│ CentralView / TestingView    │
│ useIncidentFilters           │
│ useIncidentsData ────────────┼── HTTP (fetch + retry + timeout)
│ usePresence ─────────────────┼── WebSocket
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ FastAPI                      │
│                              │
│ routes/incidents.py          │
│ routes/trucks.py             │
│ routes/websocket.py          │
│ Pydantic schemas             │
└──────────────┬───────────────┘
               │ SQLAlchemy async
               ▼
┌──────────────────────────────┐
│ SQLite (backend/logos.db)    │
│ incidents / trucks           │
└──────────────────────────────┘
```

### Estrutura de pastas

```text
.
├── backend/
│   ├── src/backend/
│   │   ├── config.py             # settings via .env
│   │   ├── database.py           # engine, sessão e criação do schema
│   │   ├── main.py               # app FastAPI, CORS e routers
│   │   ├── models/               # Incident, Truck
│   │   ├── routes/               # incidents, trucks, websocket
│   │   └── schemas/              # validação Pydantic e enums
│   ├── tests/                    # 53 testes de rotas, validação e lock
│   ├── migrations/               # configuração do Alembic
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/views/     # CentralView, TestingView, IncidentsView
│   │   ├── components/ui/        # componentes shadcn/Base UI
│   │   ├── hooks/                # dados, filtros, presença, navegação
│   │   ├── lib/api/              # clientes HTTP com retry/timeout
│   │   └── api/                  # tipos e schemas gerados pelo Orval
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Como rodar localmente

### Requisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) 1.2+ (ou npm/pnpm, se preferir)
- Git

### 1. Backend

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Banco padrão: `backend/logos.db` (criado automaticamente no primeiro start)

Opcional: para começar com uma base limpa, pare o servidor e remova
`backend/logos.db`; as tabelas são recriadas no próximo start.

### 2. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env.local
bun install
bun run dev
```

- Interface: http://localhost:5173
- Por padrão, a API aponta para `http://localhost:8000`.

### 3. Acesso ao MVP

Na tela inicial:

- **Usuário/Analista:** informe um nome e clique em **Iniciar Triagem**.
- **Supervisor:** clique em **Testar**. O perfil de supervisor libera a aba
  **Testes**, onde é possível criar incidentes, editar e injetar carga.

A sessão é propositalmente simples e vive apenas em memória no navegador. Ela
não é um mecanismo de autenticação de produção — veja
[Segurança e limitações](#segurança-e-limitações).

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável       | Padrão                           | Descrição                            |
| -------------- | -------------------------------- | ------------------------------------ |
| `APP_NAME`     | `backend`                        | Nome exibido na documentação OpenAPI |
| `DATABASE_URL` | `sqlite+aiosqlite:///./logos.db` | URL assíncrona do SQLAlchemy         |

Exemplo:

```dotenv
APP_NAME=Logos
DATABASE_URL="sqlite+aiosqlite:///./logos.db"
```

O caminho relativo do SQLite é resolvido a partir do diretório em que o
processo é iniciado. Rodando com `cd backend`, o arquivo fica em
`backend/logos.db`.

### Frontend (`frontend/.env.local`)

| Variável           | Padrão                  | Descrição                        |
| ------------------ | ----------------------- | -------------------------------- |
| `VITE_BACKEND_URL` | `http://localhost:8000` | URL base da API, sem barra final |

Exemplo:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
```

Como o Vite embute variáveis `VITE_*` no build, alterar essa URL exige um novo
build/deploy do frontend. No ambiente local, pare e suba o `bun run dev`
novamente depois de alterar o `.env.local`; o Vite não recarrega variáveis de
ambiente com o servidor já em execução.

Se o frontend continuar chamando `http://localhost:8000`, confirme:

1. o arquivo está em `frontend/.env.local`, não na raiz do repositório nem em
   `backend/.env`;
2. a variável começa com `VITE_` e não tem espaços antes do `=`;
3. o processo do Vite foi reiniciado;
4. no deploy, a variável foi configurada **no serviço do frontend** e um novo
   build foi disparado.

## API

A documentação interativa fica em `/docs`. Resumo dos endpoints:

| Método  | Rota              | Descrição                                                                                    |
| ------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `GET`   | `/health`         | Verificação de liveness; retorna `{"status": "ok"}`                                          |
| `GET`   | `/incidents/`     | Lista incidentes; aceita `category`, `criticality` e `status` como query params              |
| `POST`  | `/incidents/`     | Cria um incidente; retorna `201`, `404` se o caminhão não existir, `422` em payload inválido |
| `PATCH` | `/incidents/{id}` | Atualiza status, notas e responsável; exige `version`; retorna `409` em conflito             |
| `GET`   | `/trucks/`        | Lista caminhões                                                                              |
| `POST`  | `/trucks/`        | Cria caminhão; `409` para placa duplicada                                                    |
| `PATCH` | `/trucks/{id}`    | Atualiza motorista/localização                                                               |
| `WS`    | `/ws/`            | Presença e eventos `NEW_INCIDENT` / `PATCH_INCIDENT`                                         |

### Ordenação e prioridade

`GET /incidents/` devolve os incidentes ordenados por:

1. criticidade: `HIGH` → `MEDIUM` → `LOW`;
2. categoria: `VICTIM_ACCIDENT` → `VEHICLE_ACCIDENT` →
   `WEIRD_WEATHER_CONDITION` → `MECHANICAL_ISSUE` → `ROAD_BLOCK`;
3. `created_at` mais antigo primeiro (desempate operacional).

No frontend, o quadro de prioridades aplica a mesma regra, mas considera apenas
incidentes `OPEN` e limita o painel aos 5 primeiros. A fila abaixo mostra todos
os demais incidentes e continua suportando busca e filtros.

### Enums

- **Criticidade:** `HIGH`, `MEDIUM`, `LOW`
- **Categoria:** `VEHICLE_ACCIDENT`, `VICTIM_ACCIDENT`,
  `WEIRD_WEATHER_CONDITION`, `MECHANICAL_ISSUE`, `ROAD_BLOCK`
- **Status:** `OPEN`, `CLOSED`, `UNDER_INVESTIGATION`, `INCONCLUSIVE`

## Concorrência e integridade

O fluxo de atualização foi desenhado para evitar last-write-wins:

1. O cliente lê o incidente com `version = N`.
2. O `PATCH` envia `version: N` no corpo.
3. O backend valida a versão e executa:

```sql
UPDATE incidents
SET ..., version = N + 1
WHERE id = :id AND version = :N
RETURNING *;
```

4. Se nenhuma linha for retornada, outro analista alterou o registro primeiro:
   a API responde `409 Conflict` e o frontend recarrega os dados.

O lock operacional usa `assigned_to`:

- ao entrar em `UNDER_INVESTIGATION`, o analista pode assumir o chamado;
- outro analista não pode sobrescrever o responsável enquanto o status estiver
  em investigação;
- ao sair de `UNDER_INVESTIGATION`, o campo é limpo;
- a presença (`START_VIEW` / `END_VIEW`) é transmitida por WebSocket para indicar
  quem está olhando o mesmo incidente.

## Resiliência

- **Timeout:** 8 s por requisição, com `AbortController`.
- **Retry:** até 2 novas tentativas para respostas `5xx` e falhas de rede em
  `GET`, com backoff de 500 ms e 1 s.
- **WebSocket:** reconexão automática com backoff de 1 s até 15 s.
- **Deduplicação:** incidentes recebidos por HTTP e WebSocket são mesclados por
  `id`, evitando cards duplicados.
- **Carga de estresse:** criação sequencial de 10 incidentes por clique, com
  tratamento de falha parcial e mensagem de quantos foram criados.
- **Feedback:** toasts para sucesso, erro e processamento; spinners em ações
  demoradas.

## Testes e qualidade

### Backend

```bash
cd backend
uv run pytest -q
```

Cobertura atual: **53 testes** de rotas, validação, ordenação, filtros,
relacionamento `Truck → Incident`, lock e conflito de versão.

### Frontend

```bash
cd frontend
bun run typecheck
bun run lint
bun run build
```

O frontend ainda não possui testes automatizados de componentes; a validação
atual é feita por TypeScript, ESLint, Prettier e build de produção.

### Regenerar os tipos da API

Com o backend configurado e o `uv` disponível:

```bash
cd frontend
bun run generate:api
```

Esse comando exporta o OpenAPI do FastAPI para `frontend/openapi.json` e roda o
Orval para atualizar `src/api/generated` e `src/api/model`.

## Deploy

O repositório não possui uma URL pública publicada nesta versão. Abaixo está o
caminho recomendado para publicar o MVP.

### Backend no Render (ou Railway/Fly.io)

1. Crie um **Web Service** apontando para o repositório.
2. Configure o **Root Directory** como `backend`.
3. Build command:

   ```bash
   pip install uv && uv sync --frozen
   ```

4. Start command:

   ```bash
   uv run uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```

5. Variáveis:

   ```dotenv
   APP_NAME=Logos
   DATABASE_URL=sqlite+aiosqlite:////var/data/logos.db
   ```

6. Anexe um **Persistent Disk** em `/var/data`. Sem disco persistente, o SQLite
   é perdido a cada deploy/restart.
7. Configure o **Health Check Path** como `/health`.

> Para uma operação real, prefira PostgreSQL gerenciado. O código usa SQLAlchemy
> async e exige apenas trocar a URL e instalar o driver (`asyncpg`).

### Frontend na Vercel (ou Netlify/Render Static Site)

1. Importe o repositório.
2. Configure o **Root Directory** como `frontend`.
3. Install command: `bun install --frozen-lockfile`.
4. Build command: `bun run build`.
5. Output directory: `dist`.
6. Variável de ambiente:

   ```dotenv
   VITE_BACKEND_URL=https://sua-api-publica.example.com
   ```

7. Faça o deploy e atualize os links no topo deste README e no vídeo.

A aplicação usa query string para navegação, não rotas de servidor; por isso não
é necessário configurar rewrites de SPA.

## Segurança e limitações

### Medidas implementadas

- Validação de entrada com Pydantic: enums, tamanhos mínimos/máximos e campos
  obrigatórios.
- Integridade referencial: não é possível criar incidente para caminhão
  inexistente (`404`).
- Erros HTTP explícitos: `404`, `409` e `422`.
- Concorrência otimista com `version` e atualização atômica.
- Restrição visual da Zona de Testes a supervisores no frontend.
- CORS habilitado para permitir o consumo pelo frontend.

### Limitações do MVP

Estas decisões são conscientes para o escopo do case, mas precisam evoluir antes
de uso em produção:

- **Autenticação/autorização:** a sessão é apenas local e a restrição de
  supervisor é uma barreira de UX. A API não valida identidade nem papel. Em
  produção, usar JWT/OIDC e RBAC no backend.
- **CORS:** está com `allow_origins=["*"]` para facilitar a demonstração. Em
  produção, restringir às origens do frontend.
- **CRUD:** incidentes e caminhões têm `GET`, `POST` e `PATCH`; não há `DELETE`.
  A remoção pode ser adicionada com soft delete/auditoria.
- **Máquina de estados:** a API aceita transições diretas entre os quatro
  status. Para produção, validar transições permitidas e registrar histórico.
- **Idempotência:** o retry de `5xx` também cobre mutações. Antes de produção,
  usar `Idempotency-Key` ou restringir retry a operações idempotentes.
- **Escala:** SQLite atende bem ao MVP e a uma demonstração, mas não é o banco
  ideal para múltiplas instâncias concorrentes. Migrar para PostgreSQL.
- **Paginação:** a API devolve a lista completa. Para milhares de registros,
  adicionar paginação/cursor e virtualização da grade.
- **Sincronização após reconexão:** o WebSocket reconecta, mas eventos perdidos
  durante a queda não são reaplicados automaticamente; um refetch ao reconectar
  resolveria.
- **Migrations:** o Alembic está configurado, mas o MVP usa `create_all` no
  startup e ainda não possui revisões versionadas.

## Decisões de arquitetura

- **FastAPI + Pydantic:** gera OpenAPI, valida entradas e mantém os contratos
  próximos das rotas, com baixo custo para o MVP.
- **SQLAlchemy async + SQLite:** permite persistência real sem infraestrutura
  externa, mantendo o caminho aberto para PostgreSQL.
- **Concorrência otimista:** simples de operar e suficiente para o cenário de
  dois analistas; não exige lock pessimista no banco.
- **Filtros no cliente:** com até algumas centenas de incidentes, filtrar em
  memória dá resposta imediata e evita round-trips. A API também suporta filtros
  para integrações e futura paginação.
- **WebSocket separado do HTTP:** eventos de novos incidentes, patches e
  presença não bloqueiam o fluxo principal de leitura/escrita.
- **Tailwind + shadcn/Base UI:** componentes acessíveis e consistentes,
  mantendo a possibilidade de ajustar o design para uma operação de alta pressão.

## Histórico de desenvolvimento

O repositório mantém commits incrementais por área (`backend:`, `frontend:`),
com 110 commits no momento desta documentação. O histórico inclui a evolução da
fila, do lock, da presença, dos filtros, da zona de testes e dos estados vazios.

## Licença

Projeto desenvolvido como case técnico para a AutoU. Uso restrito ao processo
seletivo, salvo autorização dos responsáveis.
