import { describe, expect, it } from "bun:test";
import { generateOrderPrintHtml } from "../optical-print-order";
import type { OpticalOrder } from "../optical-types";

describe("Optical Order Print & PDF Voucher Generator", () => {
	const mockOrder: OpticalOrder = {
		id: "ord_print_test",
		orderNumber: "OS-2026-9999",
		orderDate: "2026-09-20T12:00:00.000Z",
		promisedDeliveryDate: "2026-09-25T18:00:00Z",
		status: "DIGITADA",
		patient: {
			name: "ALEXANDRE SILVA",
			cpf: "123.456.789-00",
			whatsapp: "(11) 98765-4321",
			street: "Av. Paulista",
			number: "1000",
			neighborhood: "Bela Vista",
			city: "São Paulo",
			state: "SP",
			cep: "01310-100",
		},
		doctor: {
			name: "Dra. Juliana Prado",
			crm: "189445/SP",
		},
		captador: {
			id: "cap_1",
			name: "Clínica Oftalmo Sul",
			commissionType: "PERCENTUAL",
			commissionValue: 5,
			calculatedCommission: 120,
		},
		store: {
			id: "store_1",
			name: "MN Nova Campinas",
		},
		seller: {
			id: "seller_1",
			name: "Fabio Del Vecchio",
		},
		aro1: {
			frameCode: "RB5228",
			frameBrand: "Ray-Ban",
			frameModel: "RX5228 Acetato",
			framePrice: 600,
			frameAro: "52",
			framePonte: "18",
			lab: "Essilor",
			lensName: "Varilux Comfort Max",
			lensPrice: 1800,
			treatment: "Crizal Rock",
			treatmentPrice: 400,
			noTreatment: false,
			quantity: 1,
			diopters: {
				od: { esf: "-2.00", cil: "-0.50", eixo: "180", dnp: "32.0", alt: "20.0" },
				oe: { esf: "-2.25", cil: "-0.75", eixo: "175", dnp: "31.5", alt: "20.0" },
				adicao: "2.00",
			},
		},
		hasAro2: false,
		isAro2CopyOfAro1: false,
		financials: {
			subtotalFrames: 600,
			subtotalLenses: 1800,
			subtotalTreatments: 400,
			discount: 0,
			totalAmount: 2800,
			paidAmount: 1000,
			residualAmount: 1800,
			paymentMode: "SINAL",
			paymentMethod1: "CARTAO_CREDITO",
			paymentAmount1: 1000,
		},
		aiAudit: {
			ocrConfidence: 100,
			prescriptionVerified: true,
			labCostCrosscheck: "APPROVED",
			estimatedLabCost: 500,
			grossMarginPercent: 65,
			cylinderTranspositionValid: true,
			diameterThicknessCheck: "OK",
			creditRiskCheck: "LOW",
			agentNotes: [],
			timelineEvents: [],
		},
		createdAt: "2026-09-20T12:00:00.000Z",
		updatedAt: "2026-09-20T12:00:00.000Z",
	};

	it("generates valid printable HTML with order details, patient and diopters", () => {
		const html = generateOrderPrintHtml(mockOrder, { mode: "A4" });

		expect(html).toContain("OS-2026-9999");
		expect(html).toContain("ALEXANDRE SILVA");
		expect(html).toContain("123.456.789-00");
		expect(html).toContain("Dra. Juliana Prado");
		expect(html).toContain("Clínica Oftalmo Sul (5%)");
		expect(html).toContain("Ray-Ban");
		expect(html).toContain("Varilux Comfort Max");
		expect(html).toContain("-2.00");
		expect(html).toContain("R$ 2800.00");
		expect(html).toContain("R$ 1000.00");
		expect(html).toContain("R$ 1800.00");
		expect(html).toContain("window.print()");
	});

	it("includes Aro 2 details when order.hasAro2 is true", () => {
		const orderWithAro2: OpticalOrder = {
			...mockOrder,
			hasAro2: true,
			aro2: {
				frameCode: "VO5200",
				frameBrand: "Vogue",
				frameModel: "Solar",
				framePrice: 300,
				lab: "Essilor",
				lensName: "Varilux Sol",
				lensPrice: 900,
				treatment: "Nenhum",
				noTreatment: true,
				treatmentPrice: 0,
				quantity: 1,
				diopters: mockOrder.aro1.diopters,
			},
		};

		const html = generateOrderPrintHtml(orderWithAro2);
		expect(html).toContain("Segundo Par / Aro 2");
		expect(html).toContain("Vogue");
		expect(html).toContain("Varilux Sol");
	});
});
