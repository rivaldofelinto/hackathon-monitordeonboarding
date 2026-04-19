'use client'

import { CheckCircleIcon as CheckCircle2, CircleIcon as Circle, ClockIcon as Clock } from '@/lib/icons'

interface Stage {
  stage_number: number
  stage_name: string
  status: string
  sla_color: string | null
}

interface Props {
  stages: Stage[]
}

const PHASE_GROUPS = [
  {
    label: 'Iniciando',
    shortLabel: 'Inicio',
    phases: ['Backlog', 'Fase 1 - Contato Franquia', 'Fase 2 - Setup Interno'],
    numbers: [0, 1, 2],
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  {
    label: 'Vistoria',
    shortLabel: 'Vist.',
    phases: ['Fase 3 - Vistoria Inicial'],
    numbers: [3],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    label: 'Adequação',
    shortLabel: 'Adeq.',
    phases: ['Fase 4 - Configuração', 'Fase 5 - Adequação/Enxoval'],
    numbers: [4, 5],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  {
    label: 'Ativação',
    shortLabel: 'Ativ.',
    phases: ['Fase 6 - Handover', 'Fase 7 - Revisão/Limpeza', 'Fase 8 - Ativação'],
    numbers: [6, 7, 8],
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  {
    label: 'Fotos',
    shortLabel: 'Fotos',
    phases: ['Fase 9 - Fotografia', 'Fase 10 - Pendências'],
    numbers: [9, 10],
    color: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
]

function getStageStatus(stage: Stage): 'completed' | 'active' | 'blocked' | 'pending' {
  if (stage.status === 'completed') return 'completed'
  if (stage.status === 'blocked') return 'blocked'
  if (stage.status === 'in_progress') return 'active'
  return 'pending'
}

function getStageGroupIndex(stageNumber: number): number {
  const n = stageNumber - 1
  if (n <= 2) return 0
  if (n === 3) return 1
  if (n <= 5) return 2
  if (n <= 8) return 3
  return 4
}

function getSlaDotColor(sla_color: string | null): string {
  if (sla_color === 'red') return 'bg-red-500 ring-red-200'
  if (sla_color === 'yellow') return 'bg-amber-400 ring-amber-100'
  return 'bg-emerald-400 ring-emerald-100'
}

export function StageTimeline({ stages }: Props) {
  const completedStages = stages.filter((s) => s.status === 'completed')
  const totalStages = stages.length

  const activeStage = stages.find(
    (s) => s.status === 'in_progress' || s.status === 'blocked' || s.status === 'pending'
  )
  const activeGroupIndex = activeStage ? getStageGroupIndex(activeStage.stage_number) : -1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Progresso
        </span>
        <span className="text-xs text-slate-400">
          {completedStages.length}/{totalStages} etapas
        </span>
      </div>

      <div className="flex items-start gap-1">
        {PHASE_GROUPS.map((group, groupIdx) => {
          const isComplete = groupIdx < activeGroupIndex
          const isActive = groupIdx === activeGroupIndex
          const isPending = groupIdx > activeGroupIndex

          const groupStages = stages.filter(
            (s) => group.numbers.includes(s.stage_number - 1)
          )
          const completedInGroup = groupStages.filter((s) => s.status === 'completed').length
          const hasBlocked = groupStages.some((s) => s.status === 'blocked')
          const hasRed = groupStages.some((s) => s.sla_color === 'red')

          let dotClass = group.dot
          if (hasBlocked || hasRed) dotClass = 'bg-red-500'
          else if (isComplete) dotClass = group.dot.replace('bg-', 'bg-')

          return (
            <div key={groupIdx} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Connector line */}
              {groupIdx > 0 && (
                <div
                  className={`absolute h-0.5 top-3 -left-1 right-0 ${
                    isComplete || isActive ? group.dot : 'bg-slate-200'
                  }`}
                  style={{ width: 'calc(100% + 4px)', left: '-4px' }}
                />
              )}

              {/* Dot */}
              <div className="relative flex flex-col items-center">
                {isComplete ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : isActive ? (
                  <div className={`w-5 h-5 rounded-full ring-4 ${getSlaDotColor(
                    activeStage?.sla_color ?? null
                  )}`} />
                ) : (
                  <Circle size={20} className="text-slate-200" />
                )}

                {/* Label */}
                <span
                  className={`text-[10px] font-medium mt-1 text-center leading-tight ${
                    isActive ? 'text-slate-700' : isPending ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {group.shortLabel}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-400">No prazo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] text-slate-400">Atenção</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-slate-400">Atrasado</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <CheckCircle2 size={10} className="text-emerald-500" />
          <span className="text-[10px] text-slate-400">Concluído</span>
        </div>
      </div>
    </div>
  )
}
