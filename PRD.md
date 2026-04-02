# PRD — Monitor de Onboarding

## Visão Geral

Sistema de **monitoramento agregado** de 7 Pipefy paralelos que rastreiam **23 etapas** de onboarding de imóveis. Atualmente, responsáveis não têm visibilidade centralizada — etapas atrasam silenciosamente. Esta solução oferece dashboard centralizado com visibilidade 100% + alertas visuais + timeline de eventos.

**Métrica de sucesso:** Redução do tempo de onboarding + zero surpresas por atrasos + visibilidade 100% dos responsáveis.

## Arquitetura

```
Portal 4-telas (Next.js + Tailwind + Clerk)
├── Dashboard          → KPIs (8 macros) + cards status + alertas visuais
├── Imóveis            → Lista com filtros (responsável, fase, status)
├── Calendário         → Timeline de eventos + datas SLA
└── Documentos         → Anexos agregados (contratos, fotos, etc)
    ↓
API Routes (Next.js)
├── GET /api/properties        → lista imóveis com todas as etapas
├── GET /api/properties/{id}   → detalhe imóvel
├── POST /api/sync             → trigger manual de sincronização
└── GET /api/activities        → timeline de eventos
    ↓
Database (Neon PostgreSQL + Drizzle)
├── properties         → imóveis (id, codigo_imovel, status, sla_date, etc)
├── stages             → estágios de cada imóvel (etapas dos 7 pipes)
├── activities         → timeline de eventos
└── sync_log           → log de sincronizações Nekt
    ↓
Nekt Polling (05h/12h)
└── sincroniza dados dos 7 Pipefy
```

## User Stories

### US-01: Visualizar Dashboard com KPIs
Como gerente, quero ver um dashboard com KPIs agregados dos 7 pipelines, para ter visibilidade rápida do progresso geral.

**Critérios de aceite:**
- Dashboard mostra 8 macros (Onboarding, Franquia, Vistoria, Adequações, Fotos, Revisões, Ativação de Anúncio, Publicação)
- Cada macro exibe total de imóveis na fase
- Cards com status (verde ✅, amarelo ⚠️, vermelho 🔴)
- Atualiza a cada sincronização Nekt (05h/12h)

### US-02: Listar e Filtrar Imóveis
Como analista, quero filtrar imóveis por responsável, fase e status, para focar nos que precisam atenção.

**Critérios de aceite:**
- Filtros funcionam em tempo real (client-side)
- Suporta múltiplas seleções simultâneas
- Lista mostra ~500 imóveis com paginação (100 por página)
- Clique leva ao detalhe

### US-03: Ver Timeline de Eventos
Como coordenador, quero ver uma timeline de eventos (últimas 10 atualizações) de cada imóvel, para entender o histórico.

**Critérios de aceite:**
- Timeline mostra responsável, data, evento, etapa
- Ordena por data decrescente
- Exibe no detalhe do imóvel
- Dados vêm do sync_log

### US-04: Alertas Visuais por SLA
Como implantador, quero badges de cor indicando se um imóvel está no prazo, próximo ao vencimento ou atrasado.

**Critérios de aceite:**
- Verde ✅: data_sla > hoje
- Amarelo ⚠️: data_sla entre hoje e hoje+2dias
- Vermelho 🔴: data_sla < hoje
- Badges visíveis em cards e timeline

### US-05: Agrupar por Fase (KPI Principal)
Como CPO, quero que a fase "Ativação de Anúncio" (fase 8) seja destacada como KPI principal, para saber quando imóveis ficam prontos para anunciar.

**Critérios de aceite:**
- Dashboard exibe contagem de imóveis na fase 8
- Cor diferenciada (destaque visual)
- Filtragem rápida para "Fase 8"

## Regras de Negócio

- **FK Codigo Imóvel:** Todos os 7 pipes compartilham campo "Codigo do imóvel" — permite agregação única
- **SLA:** Data de validade do card Pipefy = SLA esperado
- **Polling:** Nekt sincroniza 2x/dia (05h e 12h) — suficiente para MVP v0.1
- **Permissões MVP:** Todos veem tudo, todos editam igual. Granularidade em v0.2+
- **Volume:** ~500 imóveis em implantação = máximo 3.5k cards (gerenciável)

## Tasks

### Sprint 0 (2-4h) — Setup & Repo
- **T-01:** Criar repo GitHub + linkar Vercel
- **T-02:** Setup Next.js local + Tailwind + TypeScript
- **T-03:** Provisionar Neon database + connection string
- **T-04:** Configurar Clerk auth (sign-in rápido)
- **T-05:** Criar .env.local via `vercel env pull`

**Repo:** hackathon-monitordeonboarding | **Status:** Scaffold created

### Sprint 1 (6-8h) — Backend & Nekt Polling
- **T-06:** Criar schema Drizzle (properties, stages, activities, sync_log)
- **T-07:** Rodar migrations em Neon
- **T-08:** Implementar GET `/api/properties` (lista agregada)
- **T-09:** Parser: 7 Pipefy → schema normalizado (validação FK)
- **T-10:** Nekt polling cron job (05h/12h) + retry logic
- **T-11:** Unit tests para parser

**Repo:** hackathon-monitordeonboarding | **US relacionadas:** US-01, US-02

### Sprint 2 (6-8h) — Frontend & Stitch Integration
- **T-12:** Receber Stitch frontend de Rivaldo
- **T-13:** Integrar Stitch components → Next.js (sem erros de build)
- **T-14:** Dashboard 4-telas (layout básico)
- **T-15:** Data binding: API → Dashboard atualiza
- **T-16:** Implementar filtros (responsável, status, fase)
- **T-17:** Mobile responsiveness (Lighthouse >= 70)

**Repo:** hackathon-monitordeonboarding | **US relacionadas:** US-01, US-02, US-05

### Sprint 3 (2-3h) — Alertas & Testes
- **T-18:** Alert logic (SLA detection: verde/amarelo/vermelho)
- **T-19:** Visual badges render no dashboard e timeline
- **T-20:** E2E test (happy path: login → dashboard → filtros → detalhe)
- **T-21:** Lighthouse >= 80 desktop, >= 70 mobile

**Repo:** hackathon-monitordeonboarding | **US relacionadas:** US-04, US-03

### Sprint 4-5 (2-4h) — Deploy & Documentação
- **T-22:** Build otimizado (`npm run build`)
- **T-23:** Migrations Neon produção
- **T-24:** Clerk configurado para produção
- **T-25:** 1 usuário testa fluxo completo
- **T-26:** README.md (setup, stack, env, API)
- **T-27:** Changelog v0.1

**Repo:** hackathon-monitordeonboarding | **Status:** Deploy

## O que já existe

- 7 Pipefy paralelos com FK "Codigo do imóvel" confirmada
- Nekt sincroniza dados automaticamente (05h/12h)
- 4 mockups Stitch referência (visão, detalhes, agenda, documentos)
- Handoff completo com especificação técnica + assunções + riscos

## Fora de escopo (v0.2+)

- Edição própria de dados (apenas leitura em v0.1)
- Slack direto para alertas (alertas visuais suficientes)
- Permissões granulares por role (todos veem tudo em v0.1)
- Admin panel para SLA config

## Referências

- **Handoff Técnico:** /tmp/discovery-session/handoffs/2026-04-01-monitor-onboarding/01-ESPECIFICACAO-TECNICA.md
- **Visual Portal:** /tmp/discovery-session/handoffs/2026-04-01-monitor-onboarding/02-VISUAL-PORTAL-4TELAS.html
- **Assunções & Riscos:** /tmp/discovery-session/handoffs/2026-04-01-monitor-onboarding/03-ASSUNCOES-RISCOS.md
- **Tipo:** Produto novo | **Tamanho:** 18h MVP viável | **Squad:** Rivaldo Felinto | **Data:** 2026-04-01
