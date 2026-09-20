/**
 * MNOC-X Dedicated Database Client
 *
 * Cliente de banco de dados exclusivo e autônomo para o CRM Óptico MNOC-X.
 * Desvincula completamente as operações de leitura e gravação do banco legado
 * do App Lentes (mngwfearwjkpisararbe.supabase.co), garantindo total isolamento,
 * segurança e alta performance na Vercel.
 */

import type { OpticalOrder } from "./optical-types";
import type { StoreItem, SellerItem, DoctorItem, ClinicItem } from "./supabase-optical";
import { appLentesShield, isLegacyAppLentesUrl } from "./app-lentes-shield";

export const MNOCX_VAULT_KEYS = {
	orders: "mnocx_vault_v2_orders",
	stores: "mnocx_vault_v2_stores",
	sellers: "mnocx_vault_v2_sellers",
	doctors: "mnocx_vault_v2_doctors",
	clinics: "mnocx_vault_v2_clinics",
	conferencias: "mnocx_vault_v2_conferencias",
	warranties: "mnocx_vault_v2_warranties",
	zeroedFlag: "mnocx_vault_v2_zeroed",
	config: "mnocx_vault_v2_config",
};

export interface MnocxDatabaseStatus {
	provider: "MNOC-X DEDICATED VAULT" | "MNOC-X DEDICATED SUPABASE";
	endpoint: string;
	isIsolated: boolean;
	appLentesProtected: boolean;
	activeOrdersCount: number;
	lastSyncAt: string;
}

// Lojas padrão do MNOC-X
export const DEFAULT_MNOCX_STORES: StoreItem[] = [
	{ id: 1, nome: "Conceição (Matriz)" },
	{ id: 2, nome: "MN Nova Campinas" },
	{ id: 3, nome: "MN Dpedro" },
	{ id: 4, nome: "Qualy Vsion" },
	{ id: 5, nome: "Di Capri" },
];

// Vendedores padrão do MNOC-X
export const DEFAULT_MNOCX_SELLERS: SellerItem[] = [
	{ id: 1, nome: "Fabio Del Vecchio", loja: "MN Nova Campinas" },
	{ id: 2, nome: "Demetrius", loja: "Conceição (Matriz)" },
	{ id: 3, nome: "Flavia", loja: "Conceição (Matriz)" },
	{ id: 4, nome: "Fabiano", loja: "MN (Barão)" },
	{ id: 5, nome: "Atendente Geral", loja: "Qualy Vsion" },
];

function getSafeStorage(): Storage | null {
	if (typeof window !== "undefined" && window.localStorage) {
		return window.localStorage;
	}
	return null;
}

// In-memory fallback
const memoryVault = new Map<string, string>();

function vaultGet(key: string): string | null {
	const storage = getSafeStorage();
	if (storage) {
		return storage.getItem(key);
	}
	return memoryVault.get(key) ?? null;
}

function vaultSet(key: string, value: string): void {
	const storage = getSafeStorage();
	if (storage) {
		storage.setItem(key, value);
	}
	memoryVault.set(key, value);
}

function vaultRemove(key: string): void {
	const storage = getSafeStorage();
	if (storage) {
		storage.removeItem(key);
	}
	memoryVault.delete(key);
}

export class MnocxDatabaseClient {
	private dedicatedUrl: string;
	private dedicatedAnonKey: string;

	constructor() {
		// Se houver um Supabase dedicado específico para o CRM, utiliza-o.
		// NUNCA aponta por padrão para a URL legada do App Lentes.
		const customUrl = process.env.NEXT_PUBLIC_MNOCX_DATABASE_URL || process.env.NEXT_PUBLIC_MNOCX_SUPABASE_URL;
		const customKey = process.env.NEXT_PUBLIC_MNOCX_DATABASE_KEY || process.env.NEXT_PUBLIC_MNOCX_SUPABASE_ANON_KEY;

		if (customUrl && !isLegacyAppLentesUrl(customUrl)) {
			this.dedicatedUrl = customUrl;
			this.dedicatedAnonKey = customKey || "";
		} else {
			this.dedicatedUrl = "/api/mnocx/database";
			this.dedicatedAnonKey = "mnocx-internal-vault";
		}
	}

	isZeroed(): boolean {
		return vaultGet(MNOCX_VAULT_KEYS.zeroedFlag) === "true";
	}

	async getOrders(): Promise<OpticalOrder[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.orders);
		if (raw) {
			try {
				return JSON.parse(raw);
			} catch {
				return [];
			}
		}
		return [];
	}

	async saveOrder(order: OpticalOrder): Promise<{ success: boolean; id?: string | number }> {
		const currentOrders = await this.getOrders();
		const existingIndex = currentOrders.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);

		let updated: OpticalOrder[];
		if (existingIndex >= 0) {
			updated = [...currentOrders];
			updated[existingIndex] = { ...order, updatedAt: new Date().toISOString() };
		} else {
			updated = [{ ...order, createdAt: order.createdAt || new Date().toISOString() }, ...currentOrders];
		}

		vaultSet(MNOCX_VAULT_KEYS.orders, JSON.stringify(updated));
		// Se estiver salvando ordens, não está mais zerado
		if (updated.length > 0) {
			vaultRemove(MNOCX_VAULT_KEYS.zeroedFlag);
		}

		// Se configurada API serverless ou Supabase próprio, sincroniza em background
		this.syncOrderToDedicatedRemote(order).catch((err) => {
			console.warn("[MNOCX-DB] Aviso de sincronização remota:", err);
		});

		return { success: true, id: order.id || order.orderNumber };
	}

	async clearOrders(mode: "ORDERS_ONLY" | "FULL" | "DEMO" = "ORDERS_ONLY"): Promise<void> {
		if (mode === "DEMO") {
			vaultRemove(MNOCX_VAULT_KEYS.zeroedFlag);
			// Não zera, pode manter vazio ou demonstrativo
			return;
		}

		vaultSet(MNOCX_VAULT_KEYS.zeroedFlag, "true");
		vaultSet(MNOCX_VAULT_KEYS.orders, JSON.stringify([]));
		vaultSet(MNOCX_VAULT_KEYS.conferencias, JSON.stringify([]));
		vaultSet(MNOCX_VAULT_KEYS.warranties, JSON.stringify([]));

		if (mode === "FULL") {
			vaultRemove(MNOCX_VAULT_KEYS.stores);
			vaultRemove(MNOCX_VAULT_KEYS.sellers);
			vaultRemove(MNOCX_VAULT_KEYS.doctors);
			vaultRemove(MNOCX_VAULT_KEYS.clinics);
		}
	}

	async getStores(): Promise<StoreItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.stores);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			} catch {}
		}
		return DEFAULT_MNOCX_STORES;
	}

	async saveStore(nome: string): Promise<StoreItem> {
		const stores = await this.getStores();
		const newStore: StoreItem = { id: Date.now(), nome };
		const updated = [...stores, newStore];
		vaultSet(MNOCX_VAULT_KEYS.stores, JSON.stringify(updated));
		return newStore;
	}

	async getSellers(): Promise<SellerItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.sellers);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			} catch {}
		}
		return DEFAULT_MNOCX_SELLERS;
	}

	async getDoctors(): Promise<DoctorItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.doctors);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		return [];
	}

	async saveDoctor(doctor: DoctorItem): Promise<boolean> {
		const doctors = await this.getDoctors();
		const updated = [doctor, ...doctors.filter((d) => d.crm !== doctor.crm)];
		vaultSet(MNOCX_VAULT_KEYS.doctors, JSON.stringify(updated));
		return true;
	}

	async getClinics(): Promise<ClinicItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.clinics);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		return [];
	}

	async getConferencias(): Promise<any[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.conferencias);
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		return [];
	}

	async saveConferencia(conf: any): Promise<boolean> {
		const confs = await this.getConferencias();
		const updated = [conf, ...confs];
		vaultSet(MNOCX_VAULT_KEYS.conferencias, JSON.stringify(updated));
		return true;
	}

	getStatus(): MnocxDatabaseStatus {
		const audit = appLentesShield.getAuditReport();
		const ordersRaw = vaultGet(MNOCX_VAULT_KEYS.orders);
		let ordersCount = 0;
		if (ordersRaw) {
			try {
				ordersCount = JSON.parse(ordersRaw).length;
			} catch {}
		}

		return {
			provider: this.dedicatedUrl.includes("supabase.co")
				? "MNOC-X DEDICATED SUPABASE"
				: "MNOC-X DEDICATED VAULT",
			endpoint: this.dedicatedUrl,
			isIsolated: !isLegacyAppLentesUrl(this.dedicatedUrl),
			appLentesProtected: audit.legacyDatabaseProtected,
			activeOrdersCount: ordersCount,
			lastSyncAt: new Date().toISOString(),
		};
	}

	private async syncOrderToDedicatedRemote(order: OpticalOrder): Promise<void> {
		// Se a URL configurada for o App Lentes legado, bloqueia imediatamente
		if (isLegacyAppLentesUrl(this.dedicatedUrl)) {
			console.warn("[MNOCX-DB] Sincronização cancelada: URL legada do App Lentes protegida.");
			return;
		}

		// Se houver um endpoint remoto próprio configurado no Next.js
		if (typeof window !== "undefined" && this.dedicatedUrl.startsWith("/api/")) {
			await fetch(this.dedicatedUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ collection: "orders", payload: order }),
			}).catch(() => {});
		}
	}
}

export const mnocxDatabaseClient = new MnocxDatabaseClient();
