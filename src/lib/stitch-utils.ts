/**
 * Stitch Utilities — Formatação, KPIs, Status badges
 * Extraído do modelo de Rivaldo e adaptado para React
 */

export interface Imovel {
  id: string
  codigo_imovel: string
  status: string
  data_ativacao?: string
  data_prazo?: string
  responsavel?: string
}

export interface KPIs {
  total: number
  ativar_hoje: number
  atrasados: number
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (diffMs < 86_400_000) return `Hoje, ${time}`
  if (diffMs < 172_800_000) return `Ontem, ${time}`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function normalizeStatus(status: string): string {
  return status
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

export function diasRestantes(dataPrazo: string | undefined): number | null {
  if (!dataPrazo) return null
  const prazo = new Date(dataPrazo).getTime()
  const agora = Date.now()
  const dias = Math.ceil((prazo - agora) / (24 * 60 * 60 * 1000))
  return dias
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function calcularKPIs(lista: Imovel[]): KPIs {
  const dataHoje = today()
  return {
    total: lista.length,
    ativar_hoje: lista.filter(i => i.data_ativacao === dataHoje).length,
    atrasados: lista.filter(
      i =>
        i.data_prazo &&
        i.data_prazo < dataHoje &&
        normalizeStatus(i.status) !== 'ativado'
    ).length,
  }
}

// ─── STATUS STYLES ────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, string> = {
  ativado: 'bg-green-100 text-green-800',
  adequacoes: 'bg-blue-100 text-blue-800',
  onboarding: 'bg-slate-100 text-slate-800',
  vistoria: 'bg-amber-100 text-amber-800',
  atrasado: 'bg-red-100 text-red-800',
  prontoparativar: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
}

export function getStatusStyle(status: string | undefined): string {
  const normalized = normalizeStatus(status ?? '')
  return (STATUS_STYLES[normalized] as string) ?? STATUS_STYLES.pending
}

// ─── STEPPER ──────────────────────────────────────────────────────────────────

export const STEP_ORDER = ['onboarding', 'vistoria', 'adequacoes', 'prontoparativar', 'ativado']

export const STEP_META: Record<string, { label: string; icon: string }> = {
  onboarding: { label: 'Onboarding', icon: 'home_work' },
  vistoria: { label: 'Vistoria', icon: 'fact_check' },
  adequacoes: { label: 'Adequações', icon: 'engineering' },
  prontoparativar: { label: 'Pronto p/ Ativar', icon: 'rocket_launch' },
  ativado: { label: 'Ativado', icon: 'verified' },
}

export function stepIndex(status: string | undefined): number {
  const s = normalizeStatus(status ?? '')
  const i = STEP_ORDER.indexOf(s)
  return i >= 0 ? i : 0
}

export function progressPercent(status: string | undefined): number {
  const idx = stepIndex(status)
  return ([10, 25, 50, 75, 100][idx] as number) ?? 10
}

// ─── SLA COLOR ────────────────────────────────────────────────────────────────

export function slaColor(
  dataPrazo: string | undefined,
  status: string | undefined
): 'green' | 'yellow' | 'red' {
  if (normalizeStatus(status ?? '') === 'ativado') return 'green'
  if (!dataPrazo) return 'green'

  const dias = diasRestantes(dataPrazo)
  if (dias === null) return 'green'
  if (dias > 5) return 'green'
  if (dias > 2) return 'yellow'
  return 'red'
}
