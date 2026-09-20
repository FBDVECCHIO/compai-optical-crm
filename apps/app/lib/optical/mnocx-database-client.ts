/**
 * MNOC-X Dedicated Database Client
 *
 * Cliente de banco de dados exclusivo e autônomo para o CRM Óptico MNOC-X.
 * Desvincula completamente as operações de leitura e gravação do banco legado
 * do App Lentes (mngwfearwjkpisararbe.supabase.co), garantindo total isolamento,
 * segurança, estabilidade contra CTRL+F5 e alta performance na Vercel.
 */

import type { OpticalOrder } from "./optical-types";
import type { StoreItem, SellerItem, LabItem, RepItem, DoctorItem, ClinicItem, TechnicianItem } from "./supabase-optical";
import { appLentesShield, isLegacyAppLentesUrl } from "./app-lentes-shield";

export const MNOCX_VAULT_KEYS = {
	orders: "mnocx_vault_v2_orders",
	stores: "mnocx_vault_v2_stores",
	sellers: "mnocx_vault_v2_sellers",
	labs: "mnocx_vault_v2_labs",
	reps: "mnocx_vault_v2_reps",
	doctors: "mnocx_vault_v2_doctors",
	clinics: "mnocx_vault_v2_clinics",
	technicians: "mnocx_vault_v2_technicians",
	captadores: "mnocx_vault_v2_captadores",
	frameShapes: "mnocx_vault_v2_frame_shapes",
	users: "mnocx_vault_v2_users",
	conferencias: "mnocx_vault_v2_conferencias",
	warranties: "mnocx_vault_v2_warranties",
	config: "mnocx_vault_v2_config",
	zeroedFlag: "mnocx_vault_v2_zeroed",
	initializedFlag: "mnocx_vault_v2_initialized",
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

// Laboratórios padrão do MNOC-X
export const DEFAULT_MNOCX_LABS: LabItem[] = [
	{ id: 13, nome: "Sorolab", slaDias: 4 },
	{ id: 14, nome: "Alex LP", slaDias: 3 },
	{ id: 15, nome: "Visionex", slaDias: 5 },
	{ id: 16, nome: "Zeiss", slaDias: 6 },
	{ id: 17, nome: "Hoya", slaDias: 5 },
	{ id: 18, nome: "Essilor", slaDias: 5 },
];

// Representantes padrão do MNOC-X
export const DEFAULT_MNOCX_REPS: RepItem[] = [
	{ id: 1, nome: "Juliana Representante" },
	{ id: 2, nome: "Marcos Consultor" },
];

// Médicos padrão
export const DEFAULT_MNOCX_DOCTORS: DoctorItem[] = [
	{ id: 1, nome: "Dr. Thiago de Souza Queiroz", crm: "151798/SP", representante: "Juliana Representante" },
	{ id: 2, nome: "Dra. Camila Ribeiro", crm: "162400/SP", representante: "Marcos Consultor" },
	{ id: 3, nome: "Dr. Roberto Mendonça", crm: "144920/SP", representante: "Juliana Representante" },
];

// Clínicas padrão
export const DEFAULT_MNOCX_CLINICS: ClinicItem[] = [
	{ id: 1, nome: "Clínica Olhar Certo", cidade: "Campinas", representante: "Juliana Representante" },
	{ id: 2, nome: "Hospital de Olhos Campinas", cidade: "Campinas", representante: "Marcos Consultor" },
	{ id: 3, nome: "Instituto da Visão", cidade: "Valinhos", representante: "Juliana Representante" },
];

// Técnicos padrão
export const DEFAULT_MNOCX_TECHNICIANS: TechnicianItem[] = [
	{
		nome: "Fabio Del Vecchio",
		whatsapp: "19971113013",
		calendlyUrl: "https://calendly.com/fbdv1202",
	},
];

function getSafeStorage(): Storage | null {
	if (typeof window !== "undefined" && window.localStorage) {
		return window.localStorage;
	}
	return null;
}

// In-memory fallback para ambiente de testes e SSR
const memoryVault = new Map<string, string>();

function vaultGet(key: string): string | null {
	const storage = getSafeStorage();
	if (storage) {
		const val = storage.getItem(key);
		if (val !== null) return val;
	}
	return memoryVault.get(key) ?? null;
}

function vaultSet(key: string, value: string): void {
	const storage = getSafeStorage();
	if (storage) {
		try {
			storage.setItem(key, value);
		} catch {}
	}
	memoryVault.set(key, value);
}

function vaultRemove(key: string): void {
	const storage = getSafeStorage();
	if (storage) {
		try {
			storage.removeItem(key);
		} catch {}
	}
	memoryVault.delete(key);
}

export class MnocxDatabaseClient {
	private dedicatedUrl: string;
	private dedicatedAnonKey: string;

	constructor() {
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

	// ─────────────────────────────────────────────────────────────────────────
	// 1. ORDENS DE SERVIÇO / VENDAS
	// ─────────────────────────────────────────────────────────────────────────

	async getOrders(): Promise<OpticalOrder[]> {
		if (this.isZeroed()) {
			return [];
		}
		const raw = vaultGet(MNOCX_VAULT_KEYS.orders);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				return [];
			}
		}
		return [];
	}

	async saveOrder(order: OpticalOrder): Promise<{ success: boolean; id?: string | number }> {
		const currentOrders = await this.getOrders();
		const existingIndex = currentOrders.findIndex(
			(o) => o.id === order.id || o.orderNumber === order.orderNumber,
		);

		let updated: OpticalOrder[];
		if (existingIndex >= 0) {
			updated = [...currentOrders];
			updated[existingIndex] = { ...order, updatedAt: new Date().toISOString() };
		} else {
			updated = [{ ...order, createdAt: order.createdAt || new Date().toISOString() }, ...currentOrders];
		}

		vaultSet(MNOCX_VAULT_KEYS.orders, JSON.stringify(updated));
		if (updated.length > 0) {
			vaultRemove(MNOCX_VAULT_KEYS.zeroedFlag);
		}

		this.syncRemote("orders", order, "POST").catch(() => {});
		return { success: true, id: order.id || order.orderNumber };
	}

	async deleteOrder(idOrNumber: string): Promise<boolean> {
		const currentOrders = await this.getOrders();
		const filtered = currentOrders.filter(
			(o) => o.id !== idOrNumber && o.orderNumber !== idOrNumber,
		);
		vaultSet(MNOCX_VAULT_KEYS.orders, JSON.stringify(filtered));
		this.syncRemote("orders", { id: idOrNumber }, "DELETE").catch(() => {});
		return true;
	}

	async clearOrders(mode: "ORDERS_ONLY" | "FULL" | "DEMO" = "ORDERS_ONLY"): Promise<void> {
		if (mode === "DEMO") {
			vaultRemove(MNOCX_VAULT_KEYS.zeroedFlag);
			return;
		}

		vaultSet(MNOCX_VAULT_KEYS.zeroedFlag, "true");
		vaultSet(MNOCX_VAULT_KEYS.orders, JSON.stringify([]));
		vaultSet(MNOCX_VAULT_KEYS.conferencias, JSON.stringify([]));
		vaultSet(MNOCX_VAULT_KEYS.warranties, JSON.stringify([]));

		if (mode === "FULL") {
			vaultRemove(MNOCX_VAULT_KEYS.stores);
			vaultRemove(MNOCX_VAULT_KEYS.sellers);
			vaultRemove(MNOCX_VAULT_KEYS.labs);
			vaultRemove(MNOCX_VAULT_KEYS.reps);
			vaultRemove(MNOCX_VAULT_KEYS.doctors);
			vaultRemove(MNOCX_VAULT_KEYS.clinics);
			vaultRemove(MNOCX_VAULT_KEYS.technicians);
			vaultRemove(MNOCX_VAULT_KEYS.captadores);
			vaultRemove(MNOCX_VAULT_KEYS.frameShapes);
			vaultRemove(MNOCX_VAULT_KEYS.config);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 2. LOJAS / FILIAIS
	// ─────────────────────────────────────────────────────────────────────────

	async getStores(): Promise<StoreItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.stores);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		// Primeira inicialização
		vaultSet(MNOCX_VAULT_KEYS.stores, JSON.stringify(DEFAULT_MNOCX_STORES));
		return DEFAULT_MNOCX_STORES;
	}

	async saveStore(storeOrName: string | { id?: number; nome: string }): Promise<StoreItem> {
		const stores = await this.getStores();
		const name = typeof storeOrName === "string" ? storeOrName.trim() : storeOrName.nome.trim();
		const id = typeof storeOrName === "object" && storeOrName.id ? storeOrName.id : Date.now();

		const existingIdx = stores.findIndex((s) => s.id === id);
		let updated: StoreItem[];
		const storeItem: StoreItem = { id, nome: name };

		if (existingIdx >= 0) {
			updated = [...stores];
			updated[existingIdx] = storeItem;
		} else {
			updated = [...stores, storeItem];
		}

		vaultSet(MNOCX_VAULT_KEYS.stores, JSON.stringify(updated));
		this.syncRemote("stores", storeItem, "POST").catch(() => {});
		return storeItem;
	}

	async deleteStore(id: number): Promise<boolean> {
		const stores = await this.getStores();
		const filtered = stores.filter((s) => s.id !== id);
		vaultSet(MNOCX_VAULT_KEYS.stores, JSON.stringify(filtered));
		this.syncRemote("stores", { id }, "DELETE").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3. LABORATÓRIOS
	// ─────────────────────────────────────────────────────────────────────────

	async getLabs(): Promise<LabItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.labs);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.labs, JSON.stringify(DEFAULT_MNOCX_LABS));
		return DEFAULT_MNOCX_LABS;
	}

	async saveLab(lab: { id?: number; nome: string; slaDias?: number }): Promise<LabItem> {
		const labs = await this.getLabs();
		const id = lab.id || Date.now();
		const labItem: LabItem = { id, nome: lab.nome.trim(), slaDias: lab.slaDias || 5 };

		const existingIdx = labs.findIndex((l) => l.id === id);
		let updated: LabItem[];
		if (existingIdx >= 0) {
			updated = [...labs];
			updated[existingIdx] = labItem;
		} else {
			updated = [...labs, labItem];
		}

		vaultSet(MNOCX_VAULT_KEYS.labs, JSON.stringify(updated));
		this.syncRemote("labs", labItem, "POST").catch(() => {});
		return labItem;
	}

	async deleteLab(id: number): Promise<boolean> {
		const labs = await this.getLabs();
		const filtered = labs.filter((l) => l.id !== id);
		vaultSet(MNOCX_VAULT_KEYS.labs, JSON.stringify(filtered));
		this.syncRemote("labs", { id }, "DELETE").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 4. VENDEDORES
	// ─────────────────────────────────────────────────────────────────────────

	async getSellers(): Promise<SellerItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.sellers);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.sellers, JSON.stringify(DEFAULT_MNOCX_SELLERS));
		return DEFAULT_MNOCX_SELLERS;
	}

	async saveSeller(seller: { id?: number; nome: string; loja?: string }): Promise<SellerItem> {
		const sellers = await this.getSellers();
		const id = seller.id || Date.now();
		const sellerItem: SellerItem = { id, nome: seller.nome.trim(), loja: seller.loja };

		const existingIdx = sellers.findIndex((s) => s.id === id);
		let updated: SellerItem[];
		if (existingIdx >= 0) {
			updated = [...sellers];
			updated[existingIdx] = sellerItem;
		} else {
			updated = [...sellers, sellerItem];
		}

		vaultSet(MNOCX_VAULT_KEYS.sellers, JSON.stringify(updated));
		this.syncRemote("sellers", sellerItem, "POST").catch(() => {});
		return sellerItem;
	}

	async deleteSeller(id: number): Promise<boolean> {
		const sellers = await this.getSellers();
		const filtered = sellers.filter((s) => s.id !== id);
		vaultSet(MNOCX_VAULT_KEYS.sellers, JSON.stringify(filtered));
		this.syncRemote("sellers", { id }, "DELETE").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 5. REPRESENTANTES
	// ─────────────────────────────────────────────────────────────────────────

	async getReps(): Promise<RepItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.reps);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.reps, JSON.stringify(DEFAULT_MNOCX_REPS));
		return DEFAULT_MNOCX_REPS;
	}

	async saveRep(rep: { id?: number; nome: string }): Promise<RepItem> {
		const reps = await this.getReps();
		const id = rep.id || Date.now();
		const repItem: RepItem = { id, nome: rep.nome.trim() };

		const existingIdx = reps.findIndex((r) => r.id === id);
		let updated: RepItem[];
		if (existingIdx >= 0) {
			updated = [...reps];
			updated[existingIdx] = repItem;
		} else {
			updated = [...reps, repItem];
		}

		vaultSet(MNOCX_VAULT_KEYS.reps, JSON.stringify(updated));
		this.syncRemote("reps", repItem, "POST").catch(() => {});
		return repItem;
	}

	async deleteRep(id: number): Promise<boolean> {
		const reps = await this.getReps();
		const filtered = reps.filter((r) => r.id !== id);
		vaultSet(MNOCX_VAULT_KEYS.reps, JSON.stringify(filtered));
		this.syncRemote("reps", { id }, "DELETE").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 6. MÉDICOS PRESCRITORES
	// ─────────────────────────────────────────────────────────────────────────

	async getDoctors(): Promise<DoctorItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.doctors);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.doctors, JSON.stringify(DEFAULT_MNOCX_DOCTORS));
		return DEFAULT_MNOCX_DOCTORS;
	}

	async saveDoctor(doctor: DoctorItem): Promise<boolean> {
		const doctors = await this.getDoctors();
		const updated = [doctor, ...doctors.filter((d) => d.crm !== doctor.crm && d.id !== doctor.id)];
		vaultSet(MNOCX_VAULT_KEYS.doctors, JSON.stringify(updated));
		this.syncRemote("doctors", doctor, "POST").catch(() => {});
		return true;
	}

	async deleteDoctor(idOrCrm: string | number): Promise<boolean> {
		const doctors = await this.getDoctors();
		const filtered = doctors.filter((d) => d.crm !== idOrCrm && d.id !== idOrCrm);
		vaultSet(MNOCX_VAULT_KEYS.doctors, JSON.stringify(filtered));
		this.syncRemote("doctors", { id: idOrCrm }, "DELETE").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 7. CLÍNICAS & TÉCNICOS
	// ─────────────────────────────────────────────────────────────────────────

	async getClinics(): Promise<ClinicItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.clinics);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.clinics, JSON.stringify(DEFAULT_MNOCX_CLINICS));
		return DEFAULT_MNOCX_CLINICS;
	}

	async saveClinic(clinic: ClinicItem): Promise<boolean> {
		const clinics = await this.getClinics();
		const updated = [clinic, ...clinics.filter((c) => c.nome !== clinic.nome && c.id !== clinic.id)];
		vaultSet(MNOCX_VAULT_KEYS.clinics, JSON.stringify(updated));
		this.syncRemote("clinics", clinic, "POST").catch(() => {});
		return true;
	}

	async deleteClinic(idOrNome: string | number): Promise<boolean> {
		const clinics = await this.getClinics();
		const filtered = clinics.filter((c) => c.nome !== idOrNome && c.id !== idOrNome);
		vaultSet(MNOCX_VAULT_KEYS.clinics, JSON.stringify(filtered));
		this.syncRemote("clinics", { id: idOrNome }, "DELETE").catch(() => {});
		return true;
	}

	async getTechnicians(): Promise<TechnicianItem[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.technicians);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		vaultSet(MNOCX_VAULT_KEYS.technicians, JSON.stringify(DEFAULT_MNOCX_TECHNICIANS));
		return DEFAULT_MNOCX_TECHNICIANS;
	}

	async saveTechnicians(techs: TechnicianItem[]): Promise<boolean> {
		vaultSet(MNOCX_VAULT_KEYS.technicians, JSON.stringify(techs));
		this.syncRemote("technicians", { items: techs }, "POST").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 8. CONFIGURAÇÕES CHAVE-VALOR (PARAMETRIZAÇÃO GERAL)
	// ─────────────────────────────────────────────────────────────────────────

	async getConfig<T = any>(key: string, defaultValue: T): Promise<T> {
		const rawMap = vaultGet(MNOCX_VAULT_KEYS.config);
		if (rawMap !== null) {
			try {
				const map = JSON.parse(rawMap);
				if (map && key in map) {
					return map[key] as T;
				}
			} catch {}
		}
		return defaultValue;
	}

	async saveConfig(key: string, value: any): Promise<boolean> {
		let map: Record<string, any> = {};
		const rawMap = vaultGet(MNOCX_VAULT_KEYS.config);
		if (rawMap !== null) {
			try {
				map = JSON.parse(rawMap) || {};
			} catch {}
		}
		map[key] = value;
		vaultSet(MNOCX_VAULT_KEYS.config, JSON.stringify(map));
		this.syncRemote("config", { key, value }, "POST").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 9. CONFERÊNCIAS & GARANTIAS
	// ─────────────────────────────────────────────────────────────────────────

	async getConferencias(): Promise<any[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.conferencias);
		if (raw !== null) {
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
		this.syncRemote("conferencias", conf, "POST").catch(() => {});
		return true;
	}

	async getWarranties(): Promise<any[]> {
		const raw = vaultGet(MNOCX_VAULT_KEYS.warranties);
		if (raw !== null) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) return parsed;
			} catch {}
		}
		return [];
	}

	async saveWarranty(warranty: any): Promise<boolean> {
		const warranties = await this.getWarranties();
		const updated = [warranty, ...warranties];
		vaultSet(MNOCX_VAULT_KEYS.warranties, JSON.stringify(updated));
		this.syncRemote("warranties", warranty, "POST").catch(() => {});
		return true;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 10. STATUS DO BANCO DEDICADO
	// ─────────────────────────────────────────────────────────────────────────

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

	private async syncRemote(collection: string, payload: any, method: "POST" | "DELETE"): Promise<void> {
		if (isLegacyAppLentesUrl(this.dedicatedUrl)) {
			return;
		}

		if (typeof window !== "undefined" && this.dedicatedUrl.startsWith("/api/")) {
			try {
				if (method === "DELETE") {
					const idVal = payload?.id || payload?.orderNumber || "";
					await fetch(`${this.dedicatedUrl}?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(idVal)}`, {
						method: "DELETE",
					});
				} else {
					await fetch(this.dedicatedUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ collection, payload }),
					});
				}
			} catch {}
		}
	}
}

export const mnocxDatabaseClient = new MnocxDatabaseClient();
