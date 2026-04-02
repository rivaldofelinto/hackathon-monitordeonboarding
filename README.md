# Monitor de Onboarding

Monitoramento agregado de 7 Pipefy paralelos com 23 etapas de onboarding de imóveis. Dashboard centralizado com visibilidade 100% + alertas visuais + timeline de eventos.

## Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Auth:** Clerk
- **Hosting:** Vercel
- **VCS:** GitHub
- **Data Sync:** Nekt polling (05h/12h)

## Setup Local

### Pré-requisitos
- Node.js 20+
- npm/pnpm/yarn
- Docker + Docker Compose (opcional, para dev local do database)

### Instalação

```bash
# Clone o repositório
git clone git@github.com:seazone-tech/hackathon-monitordeonboarding.git
cd hackathon-monitordeonboarding

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local

# Ajuste .env.local com suas credenciais (Clerk, Neon, etc.)
```

### Rodando localmente

**Opção A: Sem Docker (se Neon já está provisionado)**
```bash
npm run dev
```

**Opção B: Com Docker Compose (local database)**
```bash
docker compose --profile all up

# Em outro terminal
npm run dev
```

## Documentação

- **[PRD.md](./PRD.md)** — Requisitos, user stories, tasks
- **[CLAUDE.md](./CLAUDE.md)** — Fluxo de trabalho, comandos
- **[Progress.txt](./Progress.txt)** — Tracker de progresso (Sprint 0-5)

## API Endpoints

### GET `/api/properties`
Lista todos os imóveis com status de todas as 7 etapas.

**Query params:**
- `filter_status` — filtrar por status (em_progresso, concluido, atrasado)
- `filter_fase` — filtrar por fase (1-23)
- `filter_responsavel` — filtrar por responsável

**Response:**
```json
{
  "properties": [
    {
      "id": "uuid",
      "codigo_imovel": "PROP-001",
      "status": "em_progresso",
      "current_stage": 8,
      "sla_date": "2026-04-15",
      "stages": [ { "stage_number": 1, "status": "completo", ... } ],
      "activities": [ { "date": "2026-04-01", "event": "...", ... } ]
    }
  ],
  "total": 500
}
```

### GET `/api/properties/{id}`
Detalhe de um imóvel específico.

### POST `/api/sync`
Trigger manual de sincronização Nekt.

## Ambiente & Variáveis

Veja `.env.example` para a lista completa. Variáveis críticas:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk público
- `CLERK_SECRET_KEY` — Clerk secreto
- `DATABASE_URL` — Neon connection string
- `NEKT_API_KEY` — Chave API Nekt
- `PIPEFY_API_KEY` — Chave API Pipefy

## Deployment

```bash
# Linke o repo a Vercel
vercel link

# Puxe variáveis de ambiente
vercel env pull .env.local

# Deploy
vercel
```

## Status do Projeto

**MVP v0.1** (18h):
- ✅ Portal 4-telas (Dashboard | Imóveis | Calendário | Documentos)
- ✅ Leitura 7 Pipefy agregados
- ✅ Polling Nekt 05h/12h
- ✅ Alertas visuais (verde/amarelo/vermelho)
- ✅ Stack Next.js TS + Vercel + GitHub

**v0.2+** (future):
- Edição própria de dados
- Slack direto para alertas
- Permissões granulares por role
- Admin panel para SLA config

## Timeline

| Sprint | Duração | Status |
|--------|---------|--------|
| Sprint 0 | 2-4h | ⏳ Próximo |
| Sprint 1 | 6-8h | ⏳ Backend + Nekt |
| Sprint 2 | 6-8h | ⏳ Frontend + Stitch |
| Sprint 3 | 2-3h | ⏳ Alertas + Testes |
| Sprint 4-5 | 2-4h | ⏳ Deploy |
| **Total** | **18-27h** | **18h MVP viável ✅** |

## Referências

- [Handoff Técnico](https://github.com/seazone-tech/hackathon-monitordeonboarding/blob/feat/monitor-onboarding/HANDOFF.md)
- [Especificação Técnica](/tmp/discovery-session/handoffs/2026-04-01-monitor-onboarding/01-ESPECIFICACAO-TECNICA.md)
- [Assunções & Riscos](/tmp/discovery-session/handoffs/2026-04-01-monitor-onboarding/03-ASSUNCOES-RISCOS.md)

## Contato

Dúvidas? Revise `CLAUDE.md` e `PRD.md`.
