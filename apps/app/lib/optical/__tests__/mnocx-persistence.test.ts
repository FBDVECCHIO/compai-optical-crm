import { describe, expect, it, beforeEach } from "bun:test";
import { mnocxDatabaseClient, MNOCX_VAULT_KEYS } from "../mnocx-database-client";
import {
	getOpticalOrders,
	addOrder,
	deleteOrder,
	loadSavedOrders,
	isDatabaseZeroed,
	setDatabaseZeroed,
} from "../optical-store";
import type { OpticalOrder } from "../optical-types";

describe("Blindagem de Persistência MNOC-X (Anti-CTRL+F5)", () => {
	beforeEach(() => {
		// Limpa flags e memória de teste
		mnocxDatabaseClient.clearOrders("ORDERS_ONLY");
	});

	it("mantém exclusão de ordem de serviço sem restaurar mock após recarga", async () => {
		const orderA = {
			id: "OS-TEST-DEL-01",
			orderNumber: "OS-TEST-DEL-01",
			patient: { name: "Cliente A" },
			aro1: { frameBrand: "Ray-Ban", framePrice: 500 },
			financials: { totalAmount: 500, paidAmount: 500, residualAmount: 0 },
			status: "DIGITADA",
		} as unknown as OpticalOrder;

		const orderB = {
			id: "OS-TEST-DEL-02",
			orderNumber: "OS-TEST-DEL-02",
			patient: { name: "Cliente B" },
			aro1: { frameBrand: "Oakley", framePrice: 700 },
			financials: { totalAmount: 700, paidAmount: 700, residualAmount: 0 },
			status: "DIGITADA",
		} as unknown as OpticalOrder;

		await mnocxDatabaseClient.saveOrder(orderA);
		await mnocxDatabaseClient.saveOrder(orderB);

		let orders = await mnocxDatabaseClient.getOrders();
		expect(orders.length).toBe(2);

		// Exclui a ordem A
		await mnocxDatabaseClient.deleteOrder("OS-TEST-DEL-01");

		orders = await mnocxDatabaseClient.getOrders();
		expect(orders.length).toBe(1);
		expect(orders[0]?.orderNumber).toBe("OS-TEST-DEL-02");

		// Simula refresh (recarregando do cofre)
		const reloaded = await mnocxDatabaseClient.getOrders();
		expect(reloaded.length).toBe(1);
		expect(reloaded[0]?.orderNumber).toBe("OS-TEST-DEL-02");
	});

	it("mantém exclusão e edição de filiais/lojas no cofre dedicado", async () => {
		const initialStores = await mnocxDatabaseClient.getStores();
		expect(initialStores.length).toBeGreaterThan(0);

		// Adiciona nova filial
		const novaLoja = await mnocxDatabaseClient.saveStore("Loja Nova Teste");
		let stores = await mnocxDatabaseClient.getStores();
		expect(stores.some((s) => s.nome === "Loja Nova Teste")).toBe(true);

		// Remove a loja adicionada
		await mnocxDatabaseClient.deleteStore(novaLoja.id);
		stores = await mnocxDatabaseClient.getStores();
		expect(stores.some((s) => s.nome === "Loja Nova Teste")).toBe(false);

		// Simula refresh
		const reloadedStores = await mnocxDatabaseClient.getStores();
		expect(reloadedStores.some((s) => s.nome === "Loja Nova Teste")).toBe(false);
	});

	it("mantém exclusão e edição de laboratórios parceiros", async () => {
		const lab = await mnocxDatabaseClient.saveLab({ nome: "Laboratório Especial", slaDias: 7 });
		let labs = await mnocxDatabaseClient.getLabs();
		expect(labs.some((l) => l.nome === "Laboratório Especial")).toBe(true);

		await mnocxDatabaseClient.deleteLab(lab.id);
		labs = await mnocxDatabaseClient.getLabs();
		expect(labs.some((l) => l.nome === "Laboratório Especial")).toBe(false);

		const reloadedLabs = await mnocxDatabaseClient.getLabs();
		expect(reloadedLabs.some((l) => l.nome === "Laboratório Especial")).toBe(false);
	});

	it("mantém exclusão e edição de vendedores", async () => {
		const seller = await mnocxDatabaseClient.saveSeller({ nome: "Vendedor Teste", loja: "Matriz" });
		let sellers = await mnocxDatabaseClient.getSellers();
		expect(sellers.some((s) => s.nome === "Vendedor Teste")).toBe(true);

		await mnocxDatabaseClient.deleteSeller(seller.id);
		sellers = await mnocxDatabaseClient.getSellers();
		expect(sellers.some((s) => s.nome === "Vendedor Teste")).toBe(false);
	});

	it("mantém exclusão e edição de médicos prescritores", async () => {
		await mnocxDatabaseClient.saveDoctor({
			nome: "Dr. Médico Teste Persistência",
			crm: "999888/SP",
			clinica: "Clínica Teste",
		});

		let docs = await mnocxDatabaseClient.getDoctors();
		expect(docs.some((d) => d.crm === "999888/SP")).toBe(true);

		await mnocxDatabaseClient.deleteDoctor("999888/SP");
		docs = await mnocxDatabaseClient.getDoctors();
		expect(docs.some((d) => d.crm === "999888/SP")).toBe(false);
	});
});
