import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import {
	CURRENT_STORAGE_KEY,
	getOpticalOrders,
	resetToDefaults,
	updateOrderStatus,
} from "../optical-store";
import * as supabaseModule from "../supabase-optical";
import type { OpticalOrderStatus } from "../optical-types";

class MockLocalStorage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}

	get length(): number {
		return Object.keys(this.store).length;
	}

	key(index: number): string | null {
		return Object.keys(this.store)[index] ?? null;
	}
}

describe("kanban-persistence: Optical Store Status Transitions & Persistence", () => {
	let mockStorage: MockLocalStorage;
	let saveOrderSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockStorage = new MockLocalStorage();
		(globalThis as any).localStorage = mockStorage;
		resetToDefaults();
		saveOrderSpy = spyOn(supabaseModule, "saveOrderToSupabase").mockResolvedValue({
			success: true,
			id: 1,
		});
	});

	afterEach(() => {
		saveOrderSpy.mockRestore();
		mockStorage.clear();
	});

	it("atualiza o status para etapas intermediarias e persiste os dados", () => {
		const initialOrder = getOpticalOrders()[0]!;
		expect(initialOrder).toBeDefined();

		const updated = updateOrderStatus(initialOrder.id, "EM_LABORATORIO");
		expect(updated).toBeDefined();
		expect(updated?.status).toBe("EM_LABORATORIO");

		// Verifica na memoria global
		const currentInMemory = getOpticalOrders().find((o) => o.id === initialOrder.id);
		expect(currentInMemory?.status).toBe("EM_LABORATORIO");

		// Verifica persistencia imediata no Supabase
		expect(saveOrderSpy).toHaveBeenCalledTimes(1);
		const supabaseCallArg = saveOrderSpy.mock.calls[0]?.[0];
		expect(supabaseCallArg.id).toBe(initialOrder.id);
		expect(supabaseCallArg.status).toBe("EM_LABORATORIO");

		// Verifica persistencia imediata no localStorage
		const rawStored = mockStorage.getItem(CURRENT_STORAGE_KEY);
		expect(rawStored).toBeTruthy();
		const parsedStored = JSON.parse(rawStored!);
		const storedOrder = parsedStored.find((o: any) => o.id === initialOrder.id);
		expect(storedOrder.status).toBe("EM_LABORATORIO");
	});

	it("define readyAt quando o status for PRONTA_LOJA e persiste imediatamente", () => {
		const initialOrder = getOpticalOrders()[0]!;
		expect(initialOrder).toBeDefined();

		const beforeTimestamp = new Date().getTime();
		const updated = updateOrderStatus(initialOrder.id, "PRONTA_LOJA");
		const afterTimestamp = new Date().getTime();

		expect(updated).toBeDefined();
		expect(updated?.status).toBe("PRONTA_LOJA");
		expect(updated?.readyAt).toBeDefined();

		const readyTime = new Date(updated!.readyAt!).getTime();
		expect(readyTime).toBeGreaterThanOrEqual(beforeTimestamp - 1000);
		expect(readyTime).toBeLessThanOrEqual(afterTimestamp + 1000);

		// Verifica chamada ao Supabase com readyAt
		expect(saveOrderSpy).toHaveBeenCalledTimes(1);
		const lastCall = saveOrderSpy.mock.calls[0]?.[0];
		expect(lastCall.status).toBe("PRONTA_LOJA");
		expect(lastCall.readyAt).toBe(updated!.readyAt);

		// Verifica se localStorage foi atualizado com readyAt
		const rawStored = mockStorage.getItem(CURRENT_STORAGE_KEY);
		const parsedStored = JSON.parse(rawStored!);
		const storedOrder = parsedStored.find((o: any) => o.id === initialOrder.id);
		expect(storedOrder.status).toBe("PRONTA_LOJA");
		expect(storedOrder.readyAt).toBe(updated!.readyAt);
	});

	it("define deliveredAt quando o status for ENTREGUE e persiste imediatamente", () => {
		const initialOrder = getOpticalOrders()[0]!;
		expect(initialOrder).toBeDefined();

		const beforeTimestamp = new Date().getTime();
		const updated = updateOrderStatus(initialOrder.id, "ENTREGUE");
		const afterTimestamp = new Date().getTime();

		expect(updated).toBeDefined();
		expect(updated?.status).toBe("ENTREGUE");
		expect(updated?.deliveredAt).toBeDefined();

		const deliveredTime = new Date(updated!.deliveredAt!).getTime();
		expect(deliveredTime).toBeGreaterThanOrEqual(beforeTimestamp - 1000);
		expect(deliveredTime).toBeLessThanOrEqual(afterTimestamp + 1000);

		// Verifica chamada ao Supabase com deliveredAt
		expect(saveOrderSpy).toHaveBeenCalledTimes(1);
		const lastCall = saveOrderSpy.mock.calls[0]?.[0];
		expect(lastCall.status).toBe("ENTREGUE");
		expect(lastCall.deliveredAt).toBe(updated!.deliveredAt);

		// Verifica localStorage
		const rawStored = mockStorage.getItem(CURRENT_STORAGE_KEY);
		const parsedStored = JSON.parse(rawStored!);
		const storedOrder = parsedStored.find((o: any) => o.id === initialOrder.id);
		expect(storedOrder.status).toBe("ENTREGUE");
		expect(storedOrder.deliveredAt).toBe(updated!.deliveredAt);
	});

	it("preserva dados da OS e propriedades financeiras durante as transicoes", () => {
		const initialOrder = getOpticalOrders()[0]!;
		const originalTotal = initialOrder.financials.totalAmount;
		const originalPatientName = initialOrder.patient.name;

		const updated = updateOrderStatus(initialOrder.id, "CONFERIDA");
		expect(updated?.financials.totalAmount).toBe(originalTotal);
		expect(updated?.patient.name).toBe(originalPatientName);
		expect(updated?.status).toBe("CONFERIDA");

		// Supabase recebeu objeto intacto
		const callArg = saveOrderSpy.mock.calls[0]?.[0];
		expect(callArg.patient.name).toBe(originalPatientName);
		expect(callArg.financials.totalAmount).toBe(originalTotal);
	});

	it("avanca a OS pelo pipeline completo mantendo consistencia e persistencia a cada passo", () => {
		const stages: OpticalOrderStatus[] = [
			"DIGITADA",
			"EM_LABORATORIO",
			"EM_MONTAGEM",
			"CONFERIDA",
			"PRONTA_LOJA",
			"ENTREGUE",
		];

		const targetOrder = getOpticalOrders()[0]!;
		let readyAtObserved: string | undefined;

		for (let i = 0; i < stages.length; i++) {
			const stage = stages[i]!;
			const res = updateOrderStatus(targetOrder.id, stage);

			expect(res?.status).toBe(stage);
			expect(saveOrderSpy).toHaveBeenCalledTimes(i + 1);

			if (stage === "PRONTA_LOJA") {
				expect(res?.readyAt).toBeDefined();
				readyAtObserved = res?.readyAt;
			}

			if (stage === "ENTREGUE") {
				expect(res?.deliveredAt).toBeDefined();
				// Garante que readyAt anterior foi mantido
				expect(res?.readyAt).toBe(readyAtObserved);
			}

			// Valida persistencia no storage no passo i
			const raw = mockStorage.getItem(CURRENT_STORAGE_KEY);
			const parsed = JSON.parse(raw!);
			const item = parsed.find((o: any) => o.id === targetOrder.id);
			expect(item.status).toBe(stage);
		}
	});

	it("retorna undefined e nao dispara saveOrderToSupabase para ID inexistente", () => {
		const res = updateOrderStatus("id_totalmente_invalido", "PRONTA_LOJA");
		expect(res).toBeUndefined();
		expect(saveOrderSpy).not.toHaveBeenCalled();
	});
});
