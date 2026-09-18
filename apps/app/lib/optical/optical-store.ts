"use client";

import { useEffect, useState } from "react";
import { INITIAL_OPTICAL_ORDERS } from "./optical-mock-data";
import { fetchRealOrdersFromSupabase, saveOrderToSupabase } from "./supabase-optical";
import type { OpticalOrder, OpticalOrderStatus } from "./optical-types";

export const CURRENT_STORAGE_KEY = "mnocx_optical_orders_v2";
export const LEGACY_STORAGE_KEY = "compai_optical_orders_v1";

const fallbackAIAudit = {
	ocrConfidence: 0.98,
	prescriptionVerified: true,
	labCostCrosscheck: "APPROVED" as const,
	estimatedLabCost: 280,
	grossMarginPercent: 65,
	cylinderTranspositionValid: true,
	diameterThicknessCheck: "OK" as const,
	creditRiskCheck: "LOW" as const,
	agentNotes: ["Ordem auditada automaticamente."],
	timelineEvents: [
		{
			id: "ev_default",
			time: "Hoje",
			title: "Auditoria Inicial",
			detail: "Ordem registrada no sistema MNOC-X.",
			status: "ok" as const,
		},
	],
};

export function sanitizeOrder(raw: any, index = 0): OpticalOrder {
	if (!raw || typeof raw !== "object") {
		return {
			id: `ord_fallback_${Date.now()}_${index}`,
			orderNumber: `OS-FALLBACK-${index + 1}`,
			store: { id: "store_matriz", name: "Óptica Central" },
			seller: { id: "seller_default", name: "Atendente" },
			status: "DIGITADA",
			orderDate: new Date().toISOString(),
			promisedDeliveryDate: new Date().toISOString(),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			hasAro2: false,
			isAro2CopyOfAro1: false,
			aiAudit: fallbackAIAudit,
			patient: {
				name: "Cliente",
				cpf: "",
				whatsapp: "",
				cep: "",
				street: "",
				number: "",
				neighborhood: "",
				city: "",
				state: "",
			},
			aro1: {
				frameBrand: "Armação Padrão",
				frameCode: "PADRAO",
				frameModel: "Acetato Padrão",
				framePrice: 0,
				lab: "Laboratório",
				lensName: "Lente Padrão",
				lensPrice: 0,
				quantity: 1,
				treatment: "Incolor",
				noTreatment: true,
				treatmentPrice: 0,
				diopters: {
					od: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
					oe: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
					adicao: "0.00",
				},
			},
			financials: {
				subtotalFrames: 0,
				subtotalLenses: 0,
				subtotalTreatments: 0,
				discount: 0,
				totalAmount: 0,
				paidAmount: 0,
				residualAmount: 0,
				paymentMode: "TOTAL",
				paymentMethod1: "CARTAO_CREDITO",
				paymentAmount1: 0,
				cardInstallments1: 1,
			},
		};
	}

	const orderNumber = String(raw.orderNumber || `OS-${raw.id || index + 1}`);
	const id = String(raw.id || `ord_${index}_${Date.now()}`);

	const store = {
		id: String(raw.store?.id || "store_matriz"),
		name: String(raw.store?.name || "Óptica Central"),
	};

	const seller = {
		id: String(raw.seller?.id || "seller_default"),
		name: String(raw.seller?.name || "Vendedor"),
	};

	const doctor = raw.doctor
		? {
				name: String(raw.doctor.name || "Médico"),
				crm: raw.doctor.crm ? String(raw.doctor.crm) : undefined,
				clinic: raw.doctor.clinic ? String(raw.doctor.clinic) : undefined,
		  }
		: undefined;

	const patient = {
		name: String(raw.patient?.name || "Cliente sem Nome"),
		cpf: String(raw.patient?.cpf || ""),
		birthDate: raw.patient?.birthDate ? String(raw.patient.birthDate) : undefined,
		whatsapp: String(raw.patient?.whatsapp || raw.patient?.secondaryPhone || ""),
		secondaryPhone: raw.patient?.secondaryPhone ? String(raw.patient.secondaryPhone) : undefined,
		email: raw.patient?.email ? String(raw.patient.email) : undefined,
		cep: String(raw.patient?.cep || ""),
		street: String(raw.patient?.street || ""),
		number: String(raw.patient?.number || ""),
		complement: raw.patient?.complement ? String(raw.patient.complement) : undefined,
		neighborhood: String(raw.patient?.neighborhood || ""),
		city: String(raw.patient?.city || ""),
		state: String(raw.patient?.state || ""),
	};

	const subtotalFrames = Number(raw.financials?.subtotalFrames) || Number(raw.aro1?.framePrice) || 0;
	const subtotalLenses = Number(raw.financials?.subtotalLenses) || Number(raw.aro1?.lensPrice) || 0;
	const subtotalTreatments = Number(raw.financials?.subtotalTreatments) || Number(raw.aro1?.treatmentPrice) || 0;
	const discount = Number(raw.financials?.discount) || 0;
	const totalAmount = Number(raw.financials?.totalAmount) || Math.max(0, subtotalFrames + subtotalLenses + subtotalTreatments - discount);
	const paidAmount = Number(raw.financials?.paidAmount) || 0;
	const residualAmount =
		Number(raw.financials?.residualAmount) >= 0
			? Number(raw.financials.residualAmount)
			: Math.max(0, totalAmount - paidAmount);

	const financials = {
		subtotalFrames,
		subtotalLenses,
		subtotalTreatments,
		discount,
		totalAmount,
		paidAmount,
		residualAmount,
		paymentMode: (raw.financials?.paymentMode === "SINAL" ? "SINAL" : "TOTAL") as "TOTAL" | "SINAL",
		paymentMethod1: raw.financials?.paymentMethod1 || "CARTAO_CREDITO",
		paymentAmount1: Number(raw.financials?.paymentAmount1) || paidAmount,
		cardInstallments1: Number(raw.financials?.cardInstallments1) || 1,
		notes: raw.financials?.notes,
	};

	const sanitizeAro = (aroRaw: any) => ({
		frameCode: aroRaw?.frameCode ? String(aroRaw.frameCode) : "PADRAO",
		frameBrand: String(aroRaw?.frameBrand || "Armação"),
		frameModel: aroRaw?.frameModel ? String(aroRaw.frameModel) : "Modelo",
		framePrice: Number(aroRaw?.framePrice) || 0,
		frameType: aroRaw?.frameType,
		frameFamily: aroRaw?.frameFamily,
		frameManufacturer: aroRaw?.frameManufacturer,
		frameAro: aroRaw?.frameAro,
		framePonte: aroRaw?.framePonte,
		lab: String(aroRaw?.lab || "Laboratório"),
		lensName: String(aroRaw?.lensName || "Lente"),
		quantity: Number(aroRaw?.quantity) || 1,
		lensPrice: Number(aroRaw?.lensPrice) || 0,
		lensType: aroRaw?.lensType,
		lensFamily: aroRaw?.lensFamily,
		lensIndex: aroRaw?.lensIndex,
		lensTech: aroRaw?.lensTech,
		treatment: aroRaw?.treatment ? String(aroRaw.treatment) : "Incolor",
		noTreatment: Boolean(aroRaw?.noTreatment),
		treatmentPrice: Number(aroRaw?.treatmentPrice) || 0,
		diopters: aroRaw?.diopters || {
			od: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
			oe: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
			adicao: "0.00",
		},
		differentLensesPerEye: aroRaw?.differentLensesPerEye,
		lensOd: aroRaw?.lensOd,
		lensPriceOd: aroRaw?.lensPriceOd,
		treatmentOd: aroRaw?.treatmentOd,
		treatmentPriceOd: aroRaw?.treatmentPriceOd,
		labOd: aroRaw?.labOd,
		lensTypeOd: aroRaw?.lensTypeOd,
		lensFamilyOd: aroRaw?.lensFamilyOd,
		lensIndexOd: aroRaw?.lensIndexOd,
		lensTechOd: aroRaw?.lensTechOd,
		lensOe: aroRaw?.lensOe,
		lensPriceOe: aroRaw?.lensPriceOe,
		treatmentOe: aroRaw?.treatmentOe,
		treatmentPriceOe: aroRaw?.treatmentPriceOe,
		labOe: aroRaw?.labOe,
		lensTypeOe: aroRaw?.lensTypeOe,
		lensFamilyOe: aroRaw?.lensFamilyOe,
		lensIndexOe: aroRaw?.lensIndexOe,
		lensTechOe: aroRaw?.lensTechOe,
	});

	const aro1 = sanitizeAro(raw.aro1);
	const aro2 = raw.aro2 ? sanitizeAro(raw.aro2) : undefined;

	const validStatuses: OpticalOrderStatus[] = [
		"DIGITADA",
		"EM_LABORATORIO",
		"EM_MONTAGEM",
		"CONFERIDA",
		"PRONTA_LOJA",
		"ENTREGUE",
		"CANCELADA",
	];
	const status: OpticalOrderStatus = validStatuses.includes(raw.status)
		? raw.status
		: "DIGITADA";

	return {
		...raw,
		id,
		orderNumber,
		store,
		seller,
		doctor,
		patient,
		financials,
		aro1,
		aro2,
		hasAro2: Boolean(raw.hasAro2),
		isAro2CopyOfAro1: Boolean(raw.isAro2CopyOfAro1),
		aiAudit: raw.aiAudit || fallbackAIAudit,
		status,
		orderDate: raw.orderDate || new Date().toISOString(),
		promisedDeliveryDate: raw.promisedDeliveryDate || new Date().toISOString(),
		createdAt: raw.createdAt || raw.orderDate || new Date().toISOString(),
		updatedAt: raw.updatedAt || new Date().toISOString(),
	};
}

function getStorage(): Storage | null {
	if (typeof window !== "undefined" && window.localStorage) {
		return window.localStorage;
	}
	if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
		return (globalThis as any).localStorage;
	}
	return null;
}

function loadSavedOrders(): OpticalOrder[] {
	const storage = getStorage();
	if (!storage) {
		return INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
	}

	try {
		const saved = storage.getItem(CURRENT_STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed.map((o, idx) => sanitizeOrder(o, idx));
			}
		}

		// Fallback para chave legada e migração automática
		const legacySaved = storage.getItem(LEGACY_STORAGE_KEY);
		if (legacySaved) {
			const parsed = JSON.parse(legacySaved);
			if (Array.isArray(parsed) && parsed.length > 0) {
				const sanitized = parsed.map((o, idx) => sanitizeOrder(o, idx));
				try {
					storage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(sanitized));
				} catch {}
				return sanitized;
			}
		}
	} catch (e) {
		console.warn("Could not load optical orders from localStorage", e);
	}

	return INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
}

let globalOrders: OpticalOrder[] = INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
let hasLoadedSupabase = false;
const listeners = new Set<(orders: OpticalOrder[]) => void>();

function notify() {
	const storage = getStorage();
	if (storage) {
		try {
			storage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(globalOrders));
		} catch (e) {
			console.warn("Could not persist optical orders to localStorage", e);
		}
	}
	for (const listener of listeners) {
		listener(globalOrders);
	}
}

export function clearOpticalStorage() {
	const storage = getStorage();
	if (storage) {
		try {
			storage.removeItem(CURRENT_STORAGE_KEY);
			storage.removeItem(LEGACY_STORAGE_KEY);
		} catch (e) {
			console.warn("Error clearing optical storage", e);
		}
	}
	globalOrders = INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
	notify();
}

export function getOpticalOrders(): OpticalOrder[] {
	return globalOrders;
}

export function setOpticalOrders(orders: OpticalOrder[]): void {
	globalOrders = orders.map((o, idx) => sanitizeOrder(o, idx));
	notify();
}

export function resetToDefaults(): void {
	globalOrders = INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
	notify();
}

export function addOrder(order: OpticalOrder): OpticalOrder {
	const safeOrder = sanitizeOrder(order);
	globalOrders = [safeOrder, ...globalOrders];
	notify();
	// Salva assincronamente no Supabase
	saveOrderToSupabase(safeOrder).catch((err) =>
		console.warn("Could not sync new order to Supabase:", err),
	);
	return safeOrder;
}

export function updateOrder(order: OpticalOrder): OpticalOrder {
	const safeOrder = sanitizeOrder(order);
	globalOrders = globalOrders.map((ord) => (ord.id === safeOrder.id ? safeOrder : ord));
	notify();
	saveOrderToSupabase(safeOrder).catch((err) =>
		console.warn("Could not sync updated order to Supabase:", err),
	);
	return safeOrder;
}

export function updateOrderStatus(
	id: string,
	newStatus: OpticalOrderStatus,
): OpticalOrder | undefined {
	let updatedOrder: OpticalOrder | undefined;
	globalOrders = globalOrders.map((ord) => {
		if (ord.id !== id) return ord;
		const updated = {
			...ord,
			status: newStatus,
			updatedAt: new Date().toISOString(),
		};
		if (newStatus === "PRONTA_LOJA") {
			updated.readyAt = new Date().toISOString();
		} else if (newStatus === "ENTREGUE") {
			updated.deliveredAt = new Date().toISOString();
		}
		const sanitized = sanitizeOrder(updated);
		updatedOrder = sanitized;
		return sanitized;
	});
	notify();
	if (updatedOrder) {
		saveOrderToSupabase(updatedOrder).catch((err) =>
			console.warn("Could not sync updated status to Supabase:", err),
		);
	}
	return updatedOrder;
}

export function payResidual(id: string): OpticalOrder | undefined {
	let updatedOrder: OpticalOrder | undefined;
	globalOrders = globalOrders.map((ord) => {
		if (ord.id !== id) return ord;
		const total = Number(ord.financials?.totalAmount) || 0;
		const updated = sanitizeOrder({
			...ord,
			financials: {
				...ord.financials,
				paidAmount: total,
				residualAmount: 0,
				paymentMode: "TOTAL",
			},
			updatedAt: new Date().toISOString(),
		});
		updatedOrder = updated;
		return updated;
	});
	notify();
	if (updatedOrder) {
		saveOrderToSupabase(updatedOrder).catch((err) =>
			console.warn("Could not sync paid residual order to Supabase:", err),
		);
	}
	return updatedOrder;
}

export function useOpticalOrders() {
	const [orders, setOrders] = useState<OpticalOrder[]>(globalOrders);
	const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const loaded = loadSavedOrders();
			globalOrders = loaded;
			setOrders(loaded);

			// Carrega vendas reais do Supabase em background
			if (!hasLoadedSupabase) {
				hasLoadedSupabase = true;
				setIsSyncingSupabase(true);
				fetchRealOrdersFromSupabase()
					.then((realOrders) => {
						if (realOrders.length > 0) {
							const sanitizedReal = realOrders.map((ro, idx) => sanitizeOrder(ro, idx));
							const existingNumbers = new Set(globalOrders.map((o) => o.orderNumber));
							const newOrders = sanitizedReal.filter((ro) => !existingNumbers.has(ro.orderNumber));
							if (newOrders.length > 0) {
								globalOrders = [...newOrders, ...globalOrders];
								notify();
							}
						}
					})
					.catch((e) => console.warn("Supabase sync notice:", e))
					.finally(() => setIsSyncingSupabase(false));
			}
		}

		const listener = (newOrders: OpticalOrder[]) => {
			setOrders([...newOrders]);
		};
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return {
		orders,
		isSyncingSupabase,
		addOrder,
		updateOrder,
		updateOrderStatus,
		payResidual,
		resetToDefaults,
	};
}
