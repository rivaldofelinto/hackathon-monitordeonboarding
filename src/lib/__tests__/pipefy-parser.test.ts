/**
 * Unit Tests para Pipefy Parser
 * Coverage: extractCodigoImovel, mapPipefyStatus, calculateSLAColor, parseCard, FK validation
 */

import {
  extractCodigoImovel,
  mapPipefyStatus,
  calculateSLAColor,
  parseCard,
  parseCards,
  PipefyCard,
  NormalizedStage,
} from "../pipefy-parser";

describe("Pipefy Parser", () => {
  // Mock data
  const mockCard: PipefyCard = {
    id: "card-001",
    title: "Imóvel 12345 - Documentação",
    current_phase: { name: "Em análise" },
    custom_fields: [
      { name: "Código Imóvel", value: "12345" },
      { name: "Responsável", value: "João Silva" },
    ],
    due_date: "2026-05-01",
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-02T15:30:00Z",
    comments_count: 3,
    attachments_count: 2,
  };

  const cardMissingFK: PipefyCard = {
    id: "card-002",
    title: "Card sem codigo_imovel",
    current_phase: { name: "Pendente" },
    custom_fields: [{ name: "Responsável", value: "Maria" }], // Sem Código Imóvel
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-02T15:30:00Z",
  };

  describe("extractCodigoImovel", () => {
    it("deve extrair codigo_imovel válido", () => {
      const codigo = extractCodigoImovel(mockCard);
      expect(codigo).toBe("12345");
    });

    it("deve retornar null se codigo_imovel não existe", () => {
      const codigo = extractCodigoImovel(cardMissingFK);
      expect(codigo).toBeNull();
    });

    it("deve ser case-insensitive na busca", () => {
      const cardCaseInsensitive: PipefyCard = {
        ...mockCard,
        custom_fields: [{ name: "CÓDIGO IMÓVEL", value: "67890" }],
      };
      const codigo = extractCodigoImovel(cardCaseInsensitive);
      expect(codigo).toBe("67890");
    });
  });

  describe("mapPipefyStatus", () => {
    it("deve mapear 'Done' para 'completed'", () => {
      expect(mapPipefyStatus("Done")).toBe("completed");
    });

    it("deve mapear 'Completo' para 'completed'", () => {
      expect(mapPipefyStatus("Completo")).toBe("completed");
    });

    it("deve mapear 'Blocked' para 'blocked'", () => {
      expect(mapPipefyStatus("Blocked")).toBe("blocked");
    });

    it("deve mapear 'In Progress' para 'in_progress'", () => {
      expect(mapPipefyStatus("In Progress")).toBe("in_progress");
    });

    it("deve mapear 'Em Andamento' para 'in_progress'", () => {
      expect(mapPipefyStatus("Em Andamento")).toBe("in_progress");
    });

    it("deve mapear outras fases para 'pending'", () => {
      expect(mapPipefyStatus("Pendente")).toBe("pending");
    });
  });

  describe("calculateSLAColor", () => {
    it("deve retornar 'green' se status é completed", () => {
      const color = calculateSLAColor("2026-04-01T10:00:00Z", "completed");
      expect(color).toBe("green");
    });

    it("deve retornar 'green' se menos de 2 dias passaram", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const color = calculateSLAColor(oneHourAgo.toISOString(), "pending");
      expect(color).toBe("green");
    });

    it("deve retornar 'yellow' se 2-5 dias passaram", () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const color = calculateSLAColor(threeDaysAgo.toISOString(), "pending");
      expect(color).toBe("yellow");
    });

    it("deve retornar 'red' se mais de 5 dias passaram", () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const color = calculateSLAColor(tenDaysAgo.toISOString(), "pending");
      expect(color).toBe("red");
    });
  });

  describe("parseCard", () => {
    it("deve parsear card válido corretamente", () => {
      const parsed = parseCard(mockCard, "Documentação");

      expect(parsed).not.toBeNull();
      expect(parsed!.codigo_imovel).toBe("12345");
      expect(parsed!.stage_name).toContain("Documentação");
      expect(parsed!.status).toBe("pending");
      expect(parsed!.metadata.pipefy_card_id).toBe("card-001");
      expect(parsed!.metadata.comments).toBe(3);
      expect(parsed!.metadata.attachments).toBe(2);
    });

    it("deve retornar null se card sem codigo_imovel (FK validation)", () => {
      const parsed = parseCard(cardMissingFK, "Documentação");
      expect(parsed).toBeNull();
    });

    it("deve retornar null se pipeline desconhecido", () => {
      const parsed = parseCard(mockCard, "Pipeline Inexistente");
      expect(parsed).toBeNull();
    });

    it("deve mapear started_at corretamente", () => {
      const parsed = parseCard(mockCard, "Documentação");
      expect(parsed!.started_at).toBe(mockCard.created_at);
    });

    it("deve mapear completed_at se status é completed", () => {
      const completedCard: PipefyCard = {
        ...mockCard,
        current_phase: { name: "Done" },
      };
      const parsed = parseCard(completedCard, "Documentação");
      expect(parsed!.completed_at).toBe(completedCard.updated_at);
    });

    it("deve não setar completed_at se status não é completed", () => {
      const parsed = parseCard(mockCard, "Documentação");
      expect(parsed!.completed_at).toBeUndefined();
    });
  });

  describe("parseCards (batch)", () => {
    it("deve processar múltiplos cards válidos", () => {
      const cards = [mockCard, mockCard]; // 2 cards válidos
      const parsed = parseCards(cards, "Documentação");

      expect(parsed).toHaveLength(2);
      expect(parsed.every((s) => s.codigo_imovel === "12345")).toBe(true);
    });

    it("deve filtrar cards sem codigo_imovel (FK validation)", () => {
      const cards = [mockCard, cardMissingFK, mockCard]; // 2 válidos, 1 inválido
      const parsed = parseCards(cards, "Documentação");

      expect(parsed).toHaveLength(2);
      expect(parsed.every((s) => s.codigo_imovel)).toBe(true);
    });

    it("deve retornar array vazio se nenhum card é válido", () => {
      const invalidCards = [cardMissingFK, cardMissingFK];
      const parsed = parseCards(invalidCards, "Documentação");

      expect(parsed).toHaveLength(0);
    });
  });

  describe("FK Validation — codigo_imovel", () => {
    it("deve validar que codigo_imovel é obrigatório", () => {
      // Card válido deve ter codigo_imovel
      const validCard = parseCard(mockCard, "Documentação");
      expect(validCard).not.toBeNull();
      expect(validCard!.codigo_imovel).toBeTruthy();
    });

    it("deve rejeitar card sem codigo_imovel", () => {
      // Card sem codigo_imovel deve retornar null
      const invalidCard = parseCard(cardMissingFK, "Documentação");
      expect(invalidCard).toBeNull();
    });

    it("deve rejeitar card com codigo_imovel vazio", () => {
      const emptyCodigoCard: PipefyCard = {
        ...mockCard,
        custom_fields: [{ name: "Código Imóvel", value: null }],
      };
      const parsed = parseCard(emptyCodigoCard, "Documentação");
      expect(parsed).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com custom_fields vazio", () => {
      const cardEmptyFields: PipefyCard = {
        ...mockCard,
        custom_fields: [],
      };
      const parsed = parseCard(cardEmptyFields, "Documentação");
      expect(parsed).toBeNull();
    });

    it("deve lidar com comments_count undefined", () => {
      const cardNoComments: PipefyCard = {
        ...mockCard,
        comments_count: undefined,
      };
      const parsed = parseCard(cardNoComments, "Documentação");
      expect(parsed!.metadata.comments).toBe(0);
    });

    it("deve lidar com attachments_count undefined", () => {
      const cardNoAttachments: PipefyCard = {
        ...mockCard,
        attachments_count: undefined,
      };
      const parsed = parseCard(cardNoAttachments, "Documentação");
      expect(parsed!.metadata.attachments).toBe(0);
    });
  });
});
