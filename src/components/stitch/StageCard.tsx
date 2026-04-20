'use client'

import { useState } from 'react'
import {
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  AlertIcon as AlertCircle,
  CheckCircleIcon as CheckCircle2,
  ClockIcon as Clock,
  BanIcon as Ban,
} from '@/lib/icons'

interface Stage {
  id: number
  stage_number: number
  stage_name: string
  status: string
  sla_color: string | null
  due_date?: string | null
  started_at: string | null
  completed_at: string | null
  blocked_reason: string | null
}

interface Props {
  stages: Stage[]
}

function computeLocalSlaColor(
  status: string,
  dueDate: string | null | undefined
): 'green' | 'yellow' | 'red' {
  if (status === 'completed' || status === 'done') return 'green';
  if (!dueDate) return 'green';

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) return 'red';
  if (daysUntil <= 1) return 'yellow';
  return 'green';
}

function StatusBadge({ status, slaColor, dueDate }: { status: string; slaColor: string | null; dueDate?: string | null }) {
  const effectiveColor = (dueDate ? computeLocalSlaColor(status, dueDate) : slaColor) as 'green' | 'yellow' | 'red' | null;

  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={10} />
        Concluído
      </span>
    )
  }
  if (status === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
        <Ban size={10} />
        Bloqueado
      </span>
    )
  }
  if (effectiveColor === 'red') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
        <AlertCircle size={10} />
        Atrasado
      </span>
    )
  }
  if (effectiveColor === 'yellow') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
        <Clock size={10} />
        Atenção
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
      <Clock size={10} />
      Pendente
    </span>
  )
}

function StageRow({ stage }: { stage: Stage }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = stage.started_at || stage.completed_at || stage.blocked_reason

  const effectiveColor = stage.due_date
    ? computeLocalSlaColor(stage.status, stage.due_date)
    : stage.sla_color;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        stage.status === 'completed'
          ? 'border-emerald-100 bg-emerald-50/30'
          : stage.status === 'blocked' || effectiveColor === 'red'
          ? 'border-red-100 bg-red-50/30'
          : effectiveColor === 'yellow'
          ? 'border-amber-100 bg-amber-50/30'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        disabled={!hasDetails}
        className="w-full flex items-center justify-between px-4 py-3 text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              stage.status === 'completed'
                ? 'bg-emerald-100 text-emerald-700'
                : stage.status === 'blocked' || effectiveColor === 'red'
                ? 'bg-red-100 text-red-700'
                : effectiveColor === 'yellow'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {stage.stage_number}
          </div>
          <span className="text-sm font-medium text-slate-700">{stage.stage_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={stage.status} slaColor={stage.sla_color} dueDate={stage.due_date} />
          {hasDetails && (
            expanded ? (
              <ChevronUp size={14} className="text-slate-400" />
            ) : (
              <ChevronDown size={14} className="text-slate-400" />
            )
          )}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-100">
          <div className="pt-2 space-y-1.5">
            {stage.started_at && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-400 w-20">Início:</span>
                {new Date(stage.started_at).toLocaleDateString('pt-BR')}
              </div>
            )}
            {stage.completed_at && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-400 w-20">Conclusão:</span>
                {new Date(stage.completed_at).toLocaleDateString('pt-BR')}
              </div>
            )}
            {stage.blocked_reason && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2 mt-1">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{stage.blocked_reason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function StageCard({ stages }: Props) {
  const completed = stages.filter((s) => s.status === 'completed')
  const active = stages.filter((s) => s.status !== 'completed')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
          Etapas
        </h2>
        <span className="text-xs text-slate-400">
          {completed.length}/{stages.length} concluídas
        </span>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-amber-600">Em progresso</span>
          {active.map((stage) => (
            <StageRow key={stage.id} stage={stage} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-emerald-600">Concluídas</span>
          {completed.map((stage) => (
            <StageRow key={stage.id} stage={stage} />
          ))}
        </div>
      )}
    </div>
  )
}
