import { describe, expect, it } from "bun:test";
import {
	calculateFiscalTaxes,
	calculateSefazCheckDigit,
	emitNfceForOrder,
	emitNfeForOrder,
	exportMonthlyAccountingBatch,
	exportMonthlyAccountingCsv,
	exportMonthlyAccountingXml,
	generateSefazAccessKey,
	validateSefazAccessKey,
} from "../fiscal-service";
import type { OpticalOrder } from "../optical-types";

// Fábrica de ordens ópticas para testes
function createMockOrder(overrides: Partial<OpticalOrder> = {}): OpticalOrder {
	return {
		id: "ord_test_1045",
		orderNumber: "OS-2026-1045A",
		orderDate: "2026-09-06T14:30:00Z",
		promisedDeliveryDate: "2026-09-12T18:00:00Z",
		status: "PRONTA_LOJA",
		store: { id: "store_matriz", name: "Óptica Central - Matriz" },
		seller: { id: "user_rodrigo", name: "Rodrigo Almeida" },
		patient: {
			name: "MARIA SOUZA DE OLIVEIRA",
			cpf: "345.892.108-44",
			whatsapp: "(11) 98765-4321",
			cep: "01310-100",
			street: "Avenida Paulista",
			number: "1578",
			neighborhood: "Bela Vista",
			city: "São Paulo",
			state: "SP",
		},
		aro1: {
			frameCode: "RB5228",
			frameBrand: "Ray-Ban",
			frameModel: "RB5228 Acetato Preto",
			framePrice: 650,
			lab: "Essilor",
			lensName: "Varilux Comfort Max 1.50",
			quantity: 1,
			lensPrice: 1890,
			treatment: "Crizal Rock",
			noTreatment: false,
			treatmentPrice: 390,
			diopters: {
				od: { esf: "-1.50", cil: "-0.50", eixo: "180" },
				oe: { esf: "-1.75", cil: "-0.75", eixo: "175" },
				adicao: "+2.00",
			},
		},
		hasAro2: false,
		isAro2CopyOfAro1: false,
		financials: {
			subtotalFrames: 650,
			subtotalLenses: 1890,
			subtotalTreatments: 390,
			discount: 0,
			totalAmount: 2930,
			paymentMode: "TOTAL",
			paidAmount: 2930,
			residualAmount: 0,
			paymentMethod1: "CARTAO_CREDITO",
			paymentAmount1: 2930,
		},
		aiAudit: {
			ocrConfidence: 0.98,
			prescriptionVerified: true,
			labCostCrosscheck: "APPROVED",
			estimatedLabCost: 280,
			grossMarginPercent: 65,
			cylinderTranspositionValid: true,
			diameterThicknessCheck: "OK",
			creditRiskCheck: "LOW",
			agentNotes: [],
			timelineEvents: [],
		},
		createdAt: "2026-09-06T14:30:00Z",
		updatedAt: "2026-09-06T14:30:00Z",
		...overrides,
	};
}

describe("Serviço Fiscal MNOC-X - fiscal-service", () => {
	// =========================================================================
	// 1. CÁLCULO DE TRIBUTOS (LEI 12.741/2012 - DE OLHO NO IMPOSTO)
	// =========================================================================
	describe("calculateFiscalTaxes", () => {
		it("calcula impostos para CFOP 5.102 (Tributação normal com 18% ICMS)", () => {
			const total = 1000;
			const taxes = calculateFiscalTaxes(total, "5.102");

			expect(taxes.icmsBase).toBe(1000);
			expect(taxes.icmsValue).toBe(180); // 18% de 1000
			expect(taxes.pisValue).toBe(16.5); // 1.65% de 1000
			expect(taxes.cofinsValue).toBe(76); // 7.60% de 1000
			expect(taxes.totalTax).toBe(272.5); // 180 + 16.5 + 76
			expect(taxes.approximateTaxRatePercent).toBe(27.25);
		});

		it("calcula impostos para CFOP 5.405 (Substituição Tributária - ST: ICMS 0%)", () => {
			const total = 1000;
			const taxes = calculateFiscalTaxes(total, "5.405");

			expect(taxes.icmsBase).toBe(0);
			expect(taxes.icmsValue).toBe(0); // 0% para ST na saída
			expect(taxes.pisValue).toBe(16.5); // 1.65%
			expect(taxes.cofinsValue).toBe(76); // 7.60%
			expect(taxes.totalTax).toBe(92.5); // 0 + 16.5 + 76
			expect(taxes.approximateTaxRatePercent).toBe(9.25);
		});

		it("calcula impostos para CFOP 5.933 (Prestação de serviços / laboratório: ICMS 0%)", () => {
			const total = 500;
			const taxes = calculateFiscalTaxes(total, "5.933");

			expect(taxes.icmsBase).toBe(0);
			expect(taxes.icmsValue).toBe(0);
			expect(taxes.pisValue).toBe(8.25); // 1.65% de 500
			expect(taxes.cofinsValue).toBe(38); // 7.60% de 500
			expect(taxes.totalTax).toBe(46.25);
			expect(taxes.approximateTaxRatePercent).toBe(9.25);
		});

		it("arredonda corretamente valores decimais complexos de centavos", () => {
			const total = 2930.45;
			const taxes = calculateFiscalTaxes(total, "5.102");

			// ICMS 18%: 2930.45 * 0.18 = 527.481 -> 527.48
			expect(taxes.icmsValue).toBe(527.48);
			// PIS 1.65%: 2930.45 * 0.0165 = 48.352425 -> 48.35
			expect(taxes.pisValue).toBe(48.35);
			// COFINS 7.60%: 2930.45 * 0.076 = 222.7142 -> 222.71
			expect(taxes.cofinsValue).toBe(222.71);
			expect(taxes.totalTax).toBe(798.54);
		});

		it("trata valores zerados ou inválidos com segurança sem gerar NaN", () => {
			const taxesZero = calculateFiscalTaxes(0, "5.102");
			expect(taxesZero.totalTax).toBe(0);
			expect(taxesZero.approximateTaxRatePercent).toBe(0);

			const taxesNegative = calculateFiscalTaxes(-100, "5.102");
			expect(taxesNegative.totalTax).toBe(0);
			expect(taxesNegative.icmsBase).toBe(0);
		});
	});

	// =========================================================================
	// 2. GERAÇÃO DE CHAVE DE ACESSO SEFAZ (44 DÍGITOS COM MÓDULO 11)
	// =========================================================================
	describe("generateSefazAccessKey e Módulo 11", () => {
		const testDate = new Date("2026-09-17T15:00:00Z");
		const testCnpj = "12.345.678/0001-99";

		it("gera chave de acesso de exatamente 44 dígitos numéricos", () => {
			const key = generateSefazAccessKey("SP", testDate, testCnpj, "65", 1, 1045);

			expect(key).toHaveLength(44);
			expect(/^\d{44}$/.test(key)).toBe(true);
		});

		it("contém os segmentos corretos da especificação SEFAZ", () => {
			const key = generateSefazAccessKey("SP", testDate, testCnpj, "65", 1, 1045);

			// cUF: SP = 35 (pos 0-2)
			expect(key.slice(0, 2)).toBe("35");
			// AAMM: 2026-09 = 2609 (pos 2-6)
			expect(key.slice(2, 6)).toBe("2609");
			// CNPJ: 12345678000199 (pos 6-20)
			expect(key.slice(6, 20)).toBe("12345678000199");
			// mod: 65 para NFC-e (pos 20-22)
			expect(key.slice(20, 22)).toBe("65");
			// serie: 001 (pos 22-25)
			expect(key.slice(22, 25)).toBe("001");
			// nNF: 000001045 (pos 25-34)
			expect(key.slice(25, 34)).toBe("000001045");
			// tpEmis: 1 (pos 34-35)
			expect(key.slice(34, 35)).toBe("1");
		});

		it("gera modelo 55 para NF-e corretamente", () => {
			const key = generateSefazAccessKey("RJ", testDate, testCnpj, "55", 1, 2040);

			// RJ = 33
			expect(key.slice(0, 2)).toBe("33");
			// mod: 55
			expect(key.slice(20, 22)).toBe("55");
			expect(key).toHaveLength(44);
			expect(validateSefazAccessKey(key)).toBe(true);
		});

		it("valida o dígito verificador módulo 11 conforme manual SEFAZ", () => {
			const key = generateSefazAccessKey("SP", testDate, testCnpj, "65", 1, 1045);
			const base43 = key.slice(0, 43);
			const dv = calculateSefazCheckDigit(base43);

			expect(Number.parseInt(key.charAt(43), 10)).toBe(dv);
			expect(validateSefazAccessKey(key)).toBe(true);
		});

		it("rejeita chaves corrompidas ou com dígito verificador alterado", () => {
			const validKey = generateSefazAccessKey("SP", testDate, testCnpj, "65", 1, 1045);
			const lastDigit = Number.parseInt(validKey.charAt(43), 10);
			const corruptedDv = (lastDigit + 1) % 10;
			const corruptedKey = validKey.slice(0, 43) + corruptedDv.toString();

			expect(validateSefazAccessKey(validKey)).toBe(true);
			expect(validateSefazAccessKey(corruptedKey)).toBe(false);
		});

		it("mapeia siglas de estados brasileiros para o código IBGE", () => {
			const keyMG = generateSefazAccessKey("MG", testDate, testCnpj, "65", 1, 100);
			expect(keyMG.slice(0, 2)).toBe("31"); // MG = 31

			const keyRS = generateSefazAccessKey("RS", testDate, testCnpj, "65", 1, 100);
			expect(keyRS.slice(0, 2)).toBe("43"); // RS = 43

			const keyPR = generateSefazAccessKey("PR", testDate, testCnpj, "65", 1, 100);
			expect(keyPR.slice(0, 2)).toBe("41"); // PR = 41
		});
	});

	// =========================================================================
	// 3. EMISSÃO DE NFC-e (MODELO 65 - CONSUMIDOR FINAL)
	// =========================================================================
	describe("emitNfceForOrder", () => {
		it("emite NFC-e com modelo 65, série 1 e status EMITIDA_NFCE", () => {
			const order = createMockOrder();
			const result = emitNfceForOrder(order);

			expect(result.status).toBe("EMITIDA_NFCE");
			expect(result.series).toBe("1");
			expect(result.model).toBe("65");
			expect(result.cfop).toBe("5.102");
			expect(result.accessKey).toHaveLength(44);
			expect(validateSefazAccessKey(result.accessKey)).toBe(true);
			expect(result.invoiceNumber).toBe("000001045");
			expect(result.icmsBase).toBe(2930);
			expect(result.icmsValue).toBe(527.4); // 18% de 2930
			expect(result.pisValue).toBe(48.35); // 1.65%
			expect(result.cofinsValue).toBe(222.68); // 7.60%
			expect(result.totalTax).toBe(798.43);

			// Verifica se a ordem foi enriquecida e atualizada
			expect(order.invoiceIssued).toBe(true);
			expect(order.invoiceNumber).toBe("000001045");
			expect(order.fiscalInfo).toBeDefined();
			expect(order.fiscalInfo?.status).toBe("EMITIDA_NFCE");
		});

		it("permite emissão com CFOP 5.405 para produtos com Substituição Tributária", () => {
			const order = createMockOrder();
			const result = emitNfceForOrder(order, { cfop: "5.405" });

			expect(result.cfop).toBe("5.405");
			expect(result.icmsBase).toBe(0);
			expect(result.icmsValue).toBe(0);
			expect(result.pisValue).toBe(48.35);
			expect(result.cofinsValue).toBe(222.68);
			expect(result.totalTax).toBe(271.03);
		});
	});

	// =========================================================================
	// 4. EMISSÃO DE NF-e (MODELO 55 - CONVÊNIO / REEMBOLSO)
	// =========================================================================
	describe("emitNfeForOrder", () => {
		it("emite NF-e com modelo 55, status EMITIDA_NFE e notas de convênio", () => {
			const order = createMockOrder();
			const result = emitNfeForOrder(order, {
				convenioName: "Bradesco Saúde Premium",
			});

			expect(result.status).toBe("EMITIDA_NFE");
			expect(result.series).toBe("1");
			expect(result.model).toBe("55");
			expect(result.accessKey).toHaveLength(44);
			expect(result.accessKey.slice(20, 22)).toBe("55");
			expect(validateSefazAccessKey(result.accessKey)).toBe(true);
			expect(result.notes).toContain("Bradesco Saúde Premium");

			// Atualização da ordem
			expect(order.invoiceIssued).toBe(true);
			expect(order.fiscalInfo?.model).toBe("55");
		});
	});

	// =========================================================================
	// 5. EXPORTAÇÃO CONTÁBIL MENSAL (CSV / XML)
	// =========================================================================
	describe("exportMonthlyAccountingBatch", () => {
		it("gera string CSV contábil com todos os 13 campos requeridos no cabeçalho e dados", () => {
			const order1 = createMockOrder({ id: "ord_1", orderNumber: "OS-2026-1045A" });
			const order2 = createMockOrder({
				id: "ord_2",
				orderNumber: "OS-2026-1046B",
				financials: {
					subtotalFrames: 500,
					subtotalLenses: 1000,
					subtotalTreatments: 0,
					discount: 0,
					totalAmount: 1500,
					paymentMode: "TOTAL",
					paidAmount: 1500,
					residualAmount: 0,
					paymentMethod1: "PIX",
					paymentAmount1: 1500,
				},
			});

			// Emite notas fiscais
			emitNfceForOrder(order1);
			emitNfeForOrder(order2);

			const csv = exportMonthlyAccountingBatch([order1, order2]);

			// 1. Cabeçalho com todos os campos especificados
			const expectedHeaders = [
				"Data",
				"OS",
				"Número NF",
				"Série",
				"Modelo",
				"Chave de Acesso",
				"Valor Total",
				"Base ICMS",
				"ICMS",
				"PIS",
				"COFINS",
				"CFOP",
				"Status",
			];
			expect(csv).toContain(expectedHeaders.join(","));

			// 2. Linhas de dados
			expect(csv).toContain("OS-2026-1045A");
			expect(csv).toContain("000001045");
			expect(csv).toContain("65");
			expect(csv).toContain("2930.00");
			expect(csv).toContain("EMITIDA_NFCE");

			expect(csv).toContain("OS-2026-1046B");
			expect(csv).toContain("000001046");
			expect(csv).toContain("55");
			expect(csv).toContain("1500.00");
			expect(csv).toContain("EMITIDA_NFE");
		});

		it("gera exportação XML com tags contábeis estruturadas", () => {
			const order = createMockOrder();
			emitNfceForOrder(order);

			const xml = exportMonthlyAccountingBatch([order], { format: "xml" });

			expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
			expect(xml).toContain("<loteContabil");
			expect(xml).toContain("<notaFiscal>");
			expect(xml).toContain("<os>OS-2026-1045A</os>");
			expect(xml).toContain("<numeroNF>000001045</numeroNF>");
			expect(xml).toContain("<serie>1</serie>");
			expect(xml).toContain("<modelo>65</modelo>");
			expect(xml).toContain("<chaveAcesso>");
			expect(xml).toContain("<valorTotal>2930.00</valorTotal>");
			expect(xml).toContain("<baseICMS>2930.00</baseICMS>");
			expect(xml).toContain("<icms>527.40</icms>");
			expect(xml).toContain("<pis>48.35</pis>");
			expect(xml).toContain("<cofins>222.68</cofins>");
			expect(xml).toContain("<cfop>5.102</cfop>");
			expect(xml).toContain("<status>EMITIDA_NFCE</status>");
		});

		it("filtra por mês específico quando informado", () => {
			const orderSetembro = createMockOrder({
				id: "ord_set",
				orderNumber: "OS-SET-2026",
				orderDate: "2026-09-10T10:00:00Z",
			});
			const orderOutubro = createMockOrder({
				id: "ord_out",
				orderNumber: "OS-OUT-2026",
				orderDate: "2026-10-05T10:00:00Z",
			});

			emitNfceForOrder(orderSetembro);
			emitNfceForOrder(orderOutubro);

			// Força a data de emissão de outubro para o teste de filtro
			orderOutubro.fiscalInfo!.issuedAt = "2026-10-05T10:00:00Z";

			const csvSetembro = exportMonthlyAccountingBatch([orderSetembro, orderOutubro], {
				month: 9,
				year: 2026,
			});

			expect(csvSetembro).toContain("OS-SET-2026");
			expect(csvSetembro).not.toContain("OS-OUT-2026");
		});

		it("suporta delimitador customizado como ponto-e-vírgula para ERPs contábeis", () => {
			const order = createMockOrder();
			emitNfceForOrder(order);

			const csv = exportMonthlyAccountingCsv([order], { delimiter: ";" });
			expect(csv).toContain("Data;OS;Número NF;Série;Modelo;Chave de Acesso;Valor Total;Base ICMS;ICMS;PIS;COFINS;CFOP;Status");
			expect(csv).toContain(";OS-2026-1045A;");
		});
	});
});
