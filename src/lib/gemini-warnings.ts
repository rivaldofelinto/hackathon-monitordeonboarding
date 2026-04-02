import { GoogleGenerativeAI } from '@google/generative-ai'

export interface WarningItem {
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  responsible_pipe: string | null
  action: string
  imoveis?: string[]
}

export interface WarningsResult {
  warnings: WarningItem[]
  summary: string
  analyzed_at: string
  source: 'gemini' | 'rules'
}

export interface RawWarningData {
  fotos_nao_agendadas: {
    count: number
    titles: string[]
  }
  vistorias_a_agendar: {
    count: number
    by_phase: { phase: string; count: number }[]
  }
  vistorias_agendadas_atrasadas: {
    count: number
    titles: string[]
    max_days: number
  }
}

export async function analyzeWarningsWithGemini(data: RawWarningData): Promise<WarningsResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return buildRuleBasedWarnings(data)

  try {
    const genai = new GoogleGenerativeAI(apiKey)
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const vistoriasPhaseText = data.vistorias_a_agendar.by_phase
      .map(p => `    - ${p.phase}: ${p.count} imóveis`)
      .join('\n')

    const prompt = `Você é um analista sênior de operações imobiliárias. Analise os dados abaixo e gere warnings priorizados sobre o processo de onboarding de imóveis no Brasil.

PIPES DO SISTEMA:
- Pipe 1 (Mãe/Implantação): 23 etapas de onboarding principal
- Pipe 3 (Vistoria): agendamento e execução de vistorias
- Pipe 4 (Fotografia): agendamento e execução de fotos profissionais

DADOS ATUAIS (${new Date().toLocaleDateString('pt-BR')}):

1. FOTOS NÃO AGENDADAS (Pipe 4 — fases iniciais):
   Total: ${data.fotos_nao_agendadas.count} imóveis aguardando agendamento de fotografia
   Exemplos: ${data.fotos_nao_agendadas.titles.slice(0, 5).join(', ') || 'sem dados'}

2. VISTORIAS A AGENDAR (Pipe 3 — fases iniciais):
   Total: ${data.vistorias_a_agendar.count} imóveis aguardando agendamento de vistoria
${vistoriasPhaseText}

3. VISTORIAS AGENDADAS PRESAS (Pipe 3 — Fase 2 - Agendada, há mais de 2 dias):
   Total: ${data.vistorias_agendadas_atrasadas.count} imóveis
   Máximo de dias parado: ${data.vistorias_agendadas_atrasadas.max_days} dias
   Exemplos: ${data.vistorias_agendadas_atrasadas.titles.slice(0, 3).join(', ') || 'nenhum'}

TAREFA: Gere exatamente 3 warnings, um para cada item acima. Severity: use "high" se count > 30, "medium" se entre 5-30, "low" se < 5 ou count = 0. Se count = 0, severity = "low" e informe que está sob controle. Use português brasileiro. Seja direto e acionável.

Responda APENAS com JSON válido:
{
  "warnings": [
    {
      "severity": "high|medium|low",
      "title": "título curto (máx 60 chars)",
      "description": "descrição com números reais",
      "count": <número>,
      "responsible_pipe": null,
      "action": "ação concreta e específica",
      "imoveis": ["cod1", "cod2"]
    }
  ],
  "summary": "resumo executivo em 1 frase com os pontos mais críticos"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonText)

    return {
      warnings: (parsed.warnings ?? []).slice(0, 3),
      summary: parsed.summary ?? '',
      analyzed_at: new Date().toISOString(),
      source: 'gemini',
    }
  } catch {
    return buildRuleBasedWarnings(data)
  }
}

function buildRuleBasedWarnings(data: RawWarningData): WarningsResult {
  const warnings: WarningItem[] = [
    {
      severity: data.fotos_nao_agendadas.count > 30 ? 'high' : data.fotos_nao_agendadas.count > 5 ? 'medium' : 'low',
      title: `${data.fotos_nao_agendadas.count} imóveis sem foto agendada`,
      description: `${data.fotos_nao_agendadas.count} imóveis no Pipe Fotografia aguardando contato/agendamento (fases iniciais).`,
      count: data.fotos_nao_agendadas.count,
      responsible_pipe: null,
      action: 'Contactar franquias e fotógrafos para agendar sessões pendentes.',
      imoveis: data.fotos_nao_agendadas.titles,
    },
    {
      severity: data.vistorias_a_agendar.count > 30 ? 'high' : data.vistorias_a_agendar.count > 5 ? 'medium' : 'low',
      title: `${data.vistorias_a_agendar.count} vistorias a agendar`,
      description: `${data.vistorias_a_agendar.count} imóveis no Pipe Vistoria aguardando agendamento.${
        data.vistorias_a_agendar.by_phase.length > 0
          ? ' Maior concentração: ' + (data.vistorias_a_agendar.by_phase[0]?.phase ?? '') + ' (' + (data.vistorias_a_agendar.by_phase[0]?.count ?? 0) + ').'
          : ''
      }`,
      count: data.vistorias_a_agendar.count,
      responsible_pipe: null,
      action: 'Priorizar agendamento de vistorias, especialmente imóveis em Stand-by.',
    },
    {
      severity: data.vistorias_agendadas_atrasadas.count > 5 ? 'medium' : data.vistorias_agendadas_atrasadas.count > 0 ? 'medium' : 'low',
      title: `${data.vistorias_agendadas_atrasadas.count} vistorias agendadas paradas`,
      description: `${data.vistorias_agendadas_atrasadas.count} imóveis em "Fase 2 - Agendada" há mais de 2 dias sem atualização. Máximo: ${data.vistorias_agendadas_atrasadas.max_days} dias.`,
      count: data.vistorias_agendadas_atrasadas.count,
      responsible_pipe: null,
      action: 'Verificar se vistorias foram realizadas e atualizar os cards no Pipefy.',
      imoveis: data.vistorias_agendadas_atrasadas.titles,
    },
  ]

  const critical = warnings.filter(w => w.severity === 'high').length
  const total = data.fotos_nao_agendadas.count + data.vistorias_a_agendar.count

  return {
    warnings,
    summary: `${total} imóveis requerem atenção: ${data.fotos_nao_agendadas.count} sem foto agendada, ${data.vistorias_a_agendar.count} vistorias pendentes.${critical > 0 ? ` ${critical} alerta(s) crítico(s).` : ''}`,
    analyzed_at: new Date().toISOString(),
    source: 'rules',
  }
}
