import { describe, expect, it } from "bun:test";
import {
	generateUniqueProductCode,
	validateProductCodeUniqueness,
	normalizeProductCode,
	resolveCategoryPrefix,
	ensureProductCode,
	batchProcessProductCodes,
} from "../product-code-engine";

describe("Motor de Código Único Mandatório de Produtos ('CPF do Produto')", () => {
	describe("1. Normalização e Prefixos", () => {
		it("normaliza strings com espaços e converte para maiúsculo", () => {
			expect(normalizeProductCode("  arm-1234  ")).toBe("ARM-1234");
			expect(normalizeProductCode("rb 5154 c01")).toBe("RB-5154-C01");
			expect(normalizeProductCode("")).toBe("");
		});

		it("resolve corretamente os prefixos das categorias ópticas", () => {
			expect(resolveCategoryPrefix("RECEITUARIO")).toBe("ARM");
			expect(resolveCategoryPrefix("SOLAR")).toBe("SOL");
			expect(resolveCategoryPrefix("MULTIFOCAL")).toBe("LEN");
			expect(resolveCategoryPrefix("MONOFOCAL")).toBe("LEN");
			expect(resolveCategoryPrefix("Tratamento Antirreflexo")).toBe("TRAT");
			expect(resolveCategoryPrefix("Montagem Especial")).toBe("SRV");
			expect(resolveCategoryPrefix("Outros")).toBe("GEN");
		});
	});

	describe("2. Geração Sequencial de Códigos Sem Repetição", () => {
		it("gera código inicial com prefixo e 5 dígitos", () => {
			const code = generateUniqueProductCode("ARM", []);
			expect(code).toBe("ARM-10001");
		});

		it("incrementa sequencialmente respeitando códigos existentes", () => {
			const existing = ["ARM-10001", "ARM-10002", "ARM-10003"];
			const code = generateUniqueProductCode("ARM", existing);
			expect(code).toBe("ARM-10004");
		});

		it("evita colisões mesmo com códigos não sequenciais", () => {
			const existing = ["SOL-10001", "SOL-10002", "SOL-10050"];
			const code = generateUniqueProductCode("SOL", existing);
			expect(code).toBe("SOL-10051");
		});
	});

	describe("3. Validação de Unicidade e Regra 'CPF'", () => {
		const baseCodes = ["ARM-10001", "SOL-10002", "LEN-10003", "TRAT-10001", "SRV-10001"];

		it("rejeita código vazio ou muito curto", () => {
			const emptyRes = validateProductCodeUniqueness("", baseCodes);
			expect(emptyRes.isValid).toBe(false);
			expect(emptyRes.error).toContain("mandatório");

			const shortRes = validateProductCodeUniqueness("AB", baseCodes);
			expect(shortRes.isValid).toBe(false);
			expect(shortRes.error).toContain("no mínimo 3 caracteres");
		});

		it("bloqueia código duplicado existente no sistema", () => {
			const res = validateProductCodeUniqueness("ARM-10001", baseCodes);
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("já cadastrado no sistema");
		});

		it("permite o mesmo código se estiver editando o próprio item", () => {
			const res = validateProductCodeUniqueness("ARM-10001", baseCodes, "ARM-10001");
			expect(res.isValid).toBe(true);
		});

		it("aprova código inédito", () => {
			const res = validateProductCodeUniqueness("ARM-99999", baseCodes);
			expect(res.isValid).toBe(true);
		});
	});

	describe("4. Processamento e Importação em Lote (Batch Import)", () => {
		it("garante código único para itens sem código na planilha", () => {
			const rawItems = [
				{ id: "1", produto: "Ray-Ban Aviator", tipo: "SOLAR" },
				{ id: "2", produto: "Oakley Holbrook", tipo: "SOLAR" },
				{ id: "3", produto: "Armação Acetato", tipo: "RECEITUARIO" },
			];

			const processed = batchProcessProductCodes(rawItems, "ARM", []);
			expect(processed.length).toBe(3);
			expect(processed[0]?.codigo).toBe("SOL-10001");
			expect(processed[1]?.codigo).toBe("SOL-10002");
			expect(processed[2]?.codigo).toBe("ARM-10001");

			// Todos os códigos gerados são únicos
			const codes = new Set(processed.map((p) => p.codigo));
			expect(codes.size).toBe(3);
		});

		it("mantém códigos válidos da planilha e resolve duplicatas no lote", () => {
			const rawItems = [
				{ id: "1", produto: "P1", codigo: "SKU-ABC" },
				{ id: "2", produto: "P2", codigo: "SKU-ABC" }, // duplicado intencional na planilha
				{ id: "3", produto: "P3", codigo: "SKU-XYZ" },
			];

			const processed = batchProcessProductCodes(rawItems, "ARM", []);
			expect(processed[0]?.codigo).toBe("SKU-ABC");
			// O segundo item duplicado recebeu novo código único automático
			expect(processed[1]?.codigo).not.toBe("SKU-ABC");
			expect(processed[1]?.codigo.startsWith("ARM-")).toBe(true);
			expect(processed[2]?.codigo).toBe("SKU-XYZ");

			const codes = new Set(processed.map((p) => p.codigo));
			expect(codes.size).toBe(3);
		});
	});
});
