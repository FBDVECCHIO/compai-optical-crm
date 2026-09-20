import { describe, expect, it } from "bun:test";
import {
	addOrder,
	clearOpticalStorage,
	getOpticalOrders,
} from "../optical-store";
import {
	decrementFrameStock,
	fetchFrameCatalog,
	fetchLensCatalog,
	fetchSupabaseDoctors,
	fetchSupabaseSellers,
	fetchSupabaseStores,
	saveFrameCatalogItem,
} from "../supabase-optical";
import type { OpticalOrder } from "../optical-types";

describe("Logical Sales Order Flow & Catalog Integration", () => {
	it("fetches registered stores, sellers, doctors and catalog items", async () => {
		const stores = await fetchSupabaseStores();
		expect(stores.length).toBeGreaterThan(0);

		const sellers = await fetchSupabaseSellers();
		expect(sellers.length).toBeGreaterThan(0);

		const doctors = await fetchSupabaseDoctors();
		expect(doctors.length).toBeGreaterThan(0);

		const lenses = await fetchLensCatalog();
		expect(lenses.length).toBeGreaterThan(0);

		const frames = await fetchFrameCatalog();
		expect(frames.length).toBeGreaterThan(0);
	});

	it("creates an order from registered items with correct residual and stock deduction", async () => {
		clearOpticalStorage("ORDERS_ONLY");
		expect(getOpticalOrders().length).toBe(0);

		const stores = await fetchSupabaseStores();
		const sellers = await fetchSupabaseSellers();
		const doctors = await fetchSupabaseDoctors();
		const frames = await fetchFrameCatalog();
		const lenses = await fetchLensCatalog();

		const chosenStore = stores[0]!;
		const chosenSeller = sellers[0]!;
		const chosenDoctor = doctors[0]!;
		const chosenFrame = frames[0]!;
		const chosenLens = lenses[0]!;

		const initialStock = chosenFrame.estoque;

		const framePrice = chosenFrame.preco || 450;
		const lensPrice = chosenLens.preco || 1200;
		const treatmentPrice = 250;
		const totalAmount = framePrice + lensPrice + treatmentPrice;
		const sinalPaid = 500;
		const residual = totalAmount - sinalPaid;

		const newOrder: OpticalOrder = {
			id: "ord_test_flow_1",
			orderNumber: "OS-TEST-999",
			store: { id: String(chosenStore.id), name: chosenStore.nome },
			seller: { id: String(chosenSeller.id), name: chosenSeller.nome },
			doctor: { name: chosenDoctor.nome, crm: chosenDoctor.crm },
			patient: {
				name: "Carlos Eduardo Silva",
				cpf: "123.456.789-00",
				whatsapp: "(11) 99887-6655",
				cep: "13010-000",
				street: "Rua Barão de Jaguara",
				number: "500",
				neighborhood: "Centro",
				city: "Campinas",
				state: "SP",
			},
			status: "DIGITADA",
			orderDate: new Date().toISOString().split("T")[0]!,
			promisedDeliveryDate: new Date().toISOString().split("T")[0]!,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			hasAro2: false,
			isAro2CopyOfAro1: false,
			aro1: {
				frameBrand: chosenFrame.marca,
				frameCode: chosenFrame.id,
				frameModel: chosenFrame.produto,
				framePrice: framePrice,
				frameType: chosenFrame.tipo,
				frameAro: chosenFrame.tamanhoAro,
				framePonte: chosenFrame.tamanhoPonte,
				lab: chosenLens.laboratorio,
				lensName: chosenLens.produto,
				lensPrice: lensPrice,
				quantity: 1,
				treatment: "Antirreflexo Premium",
				treatmentPrice: treatmentPrice,
				noTreatment: false,
				diopters: {
					od: { esf: "-2.50", cil: "-0.75", eixo: "90", dnp: "32.0", alt: "20.0" },
					oe: { esf: "-2.00", cil: "-0.50", eixo: "85", dnp: "32.0", alt: "20.0" },
					adicao: "1.75",
				},
			},
			financials: {
				subtotalFrames: framePrice,
				subtotalLenses: lensPrice,
				subtotalTreatments: treatmentPrice,
				discount: 0,
				totalAmount: totalAmount,
				paidAmount: sinalPaid,
				residualAmount: residual,
				paymentMode: "SINAL",
				paymentMethod1: "PIX",
				paymentAmount1: sinalPaid,
				cardInstallments1: 1,
			},
			aiAudit: {
				ocrConfidence: 0.98,
				prescriptionVerified: true,
				labCostCrosscheck: "APPROVED",
				estimatedLabCost: Math.round(lensPrice * 0.42),
				grossMarginPercent: 55,
				cylinderTranspositionValid: true,
				diameterThicknessCheck: "OK",
				creditRiskCheck: "LOW",
				agentNotes: ["OS teste de validação de fluxo lógico."],
				timelineEvents: [],
			},
		};

		// 1. Decrement stock
		const updatedCatalog = await decrementFrameStock(chosenFrame.id, 1);
		const updatedFrame = updatedCatalog?.find((f) => f.id === chosenFrame.id);
		expect(updatedFrame?.estoque).toBe(Math.max(0, initialStock - 1));

		// 2. Add order to system
		const created = addOrder(newOrder);
		expect(created.orderNumber).toBe("OS-TEST-999");
		expect(created.status).toBe("DIGITADA");
		expect(created.financials.residualAmount).toBe(residual);
		expect(created.doctor?.crm).toBe(chosenDoctor.crm);
		expect(created.store.name).toBe(chosenStore.nome);
		expect(created.seller.name).toBe(chosenSeller.nome);

		// 3. Confirm in optical orders list
		const currentOrders = getOpticalOrders();
		expect(currentOrders.length).toBe(1);
		expect(currentOrders[0]?.id).toBe("ord_test_flow_1");

		// Clean up restored stock
		await saveFrameCatalogItem(chosenFrame);
	});
});
