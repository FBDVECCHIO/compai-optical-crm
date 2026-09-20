import { describe, expect, it, beforeEach } from "bun:test";
import {
	mnocxDatabaseClient,
	MNOCX_VAULT_KEYS,
} from "../mnocx-database-client";
import type { OpticalOrder } from "../optical-types";

describe("MnocxDatabaseClient (Banco Dedicado)", () => {
	beforeEach(() => {
		mnocxDatabaseClient.clearOrders("ORDERS_ONLY");
	});

	it("inicia em estado limpo sem ordens legadas quando zerado", async () => {
		const orders = await mnocxDatabaseClient.getOrders();
		expect(orders.length).toBe(0);
		expect(mnocxDatabaseClient.isZeroed()).toBe(true);
	});

	it("salva e recupera uma nova ordem no cofre dedicado do MNOC-X", async () => {
		const sampleOrder = {
			id: "OS-MNOCX-TEST-001",
			orderNumber: "OS-MNOCX-TEST-001",
			store: { id: "1", name: "MN Nova Campinas" },
			seller: { id: "1", name: "Vendedor MNOC-X" },
			patient: { name: "CLIENTE TESTE BANCO DEDICADO", cpf: "111.222.333-44" },
			doctor: { name: "Dr. Oftalmo", crm: "12345/SP" },
			aro1: {
				frameBrand: "Ray-Ban",
				frameModel: "RX5228",
				framePrice: 500,
				lensName: "Monofocal 1.56",
				lensPrice: 800,
				diopters: { od: {}, oe: {} },
			},
			financials: { totalAmount: 1300, paidAmount: 500, residualAmount: 800, paymentMode: "SINAL" },
			status: "DIGITADA",
		} as unknown as OpticalOrder;

		const result = await mnocxDatabaseClient.saveOrder(sampleOrder);
		expect(result.success).toBe(true);

		const orders = await mnocxDatabaseClient.getOrders();
		expect(orders.length).toBe(1);
		expect(orders[0].orderNumber).toBe("OS-MNOCX-TEST-001");
		expect(orders[0].patient.name).toBe("CLIENTE TESTE BANCO DEDICADO");
	});

	it("fornece lojas e vendedores exclusivos da rede MNOC-X", async () => {
		const stores = await mnocxDatabaseClient.getStores();
		expect(stores.length).toBeGreaterThanOrEqual(4);
		expect(stores.some((s) => s.nome.includes("Nova Campinas"))).toBe(true);

		const sellers = await mnocxDatabaseClient.getSellers();
		expect(sellers.length).toBeGreaterThan(0);
	});

	it("impede vazamento de dados: não usa chaves legadas do App Lentes", () => {
		expect(MNOCX_VAULT_KEYS.orders).toBe("mnocx_vault_v2_orders");
		expect(MNOCX_VAULT_KEYS.stores).toBe("mnocx_vault_v2_stores");
		expect(MNOCX_VAULT_KEYS.zeroedFlag).toBe("mnocx_vault_v2_zeroed");
	});
});
