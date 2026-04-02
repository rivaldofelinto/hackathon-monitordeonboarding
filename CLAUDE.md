# CLAUDE.md — Monitor de Onboarding

## Sobre
Monitoramento agregado de 7 Pipefy paralelos com 23 etapas de onboarding de imóveis. Dashboard centralizado com visibilidade 100% + alertas visuais.

## Repositório
- `./` — Next.js TypeScript + Tailwind + Clerk (frontend + backend)

## Documentos
- `PRD.md` — Requisitos, user stories (US-01 a US-05) e tasks (T-01 a T-27)
- `Progress.txt` — Tracker de progresso (compatível com ralph-loop / /code)

## Docker Compose

```bash
# Subir tudo (frontend + database)
docker compose --profile all up

# Subir apenas onboarding app
docker compose --profile onboarding up

# Subir sem rebuild
docker compose --profile all up

# Ver status dos containers
docker compose ps

# Ver logs
docker compose logs -f onboarding-frontend
docker compose logs -f onboarding-db
```

### Mapa de portas
| Serviço | Porta | Descrição |
|---|---|---|
| Frontend (Next.js) | 3000 | http://localhost:3000 |
| Database (PostgreSQL) | 5432 | postgresql://monitor_user:monitor_pass@localhost:5432/monitor_onboarding |

## Fluxo de trabalho

1. Leia `PRD.md` para entender requisitos e US
2. Verifique `Progress.txt` para encontrar próxima tarefa `[ ]`
3. Implemente no Sprint correto
4. Escreva testes conforme aplicável
5. Rode verificação (lint + type-check)
6. Commit com Conventional Commits (feat:, fix:, test:, refactor:)
7. Atualize `Progress.txt` marcando tarefa como `[x]`

## Branch
Todas as mudanças no branch `feat/monitor-onboarding`.

## Quando estiver preso
Marque a task como `[-]` (bloqueado) no Progress.txt, documente o motivo e passe para próxima.

## Comandos úteis

### Next.js
```bash
# Desenvolvimento
npm run dev                    # inicia dev server (localhost:3000)
npm run build                  # otimiza para produção
npm start                      # inicia servidor produção

# Validação
npm run type-check             # valida TypeScript
npm run lint                   # ESLint + fix automático

# Com Docker Compose
docker compose exec onboarding-frontend npm run type-check
docker compose exec onboarding-frontend npm run lint
```

### Database (Neon PostgreSQL)
```bash
# Conectar (depois de provisionar)
psql "postgresql://monitor_user:monitor_pass@localhost:5432/monitor_onboarding"

# Com Docker Compose
docker compose exec onboarding-db psql -U monitor_user -d monitor_onboarding
```

### Git
```bash
# Antes de começar
git checkout feat/monitor-onboarding
git pull origin feat/monitor-onboarding

# Depois de implementar
git add .
git commit -m "feat: descrição clara"
git push origin feat/monitor-onboarding
```

## Tecnologias
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Clerk Auth
- **Backend:** Next.js API Routes
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Deployment:** Vercel
- **VCS:** GitHub (público)
- **Data Sync:** Nekt polling (05h/12h)
