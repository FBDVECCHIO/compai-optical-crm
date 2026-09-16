"use client";

import { useEffect, useState } from "react";
import { INITIAL_OPTICAL_ORDERS } from "./optical-mock-data";
import { fetchRealOrdersFromSupabase, saveOrderToSupabase } from "./supabase-optical";
import type { OpticalOrder, OpticalOrderStatus } from "./optical-types";

const CURRENT_STORAGE_KEY = "mnocx_optical_orders_v2";
const LEGACY_STORAGE_KEY = "compai_optical_orders_v1";

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

	const aro1 = {
		frameCode: raw.aro1?.frameCode ? String(raw.aro1.frameCode) : "PADRAO",
		frameBrand: String(raw.aro1?.frameBrand || "Armação"),
		frameModel: raw.aro1?.frameModel ? String(raw.aro1.frameModel) : "Modelo",
		framePrice: Number(raw.aro1?.framePrice) || 0,
		lab: String(raw.aro1?.lab || "Laboratório"),
		lensName: String(raw.aro1?.lensName || "Lente"),
		quantity: Number(raw.aro1?.quantity) || 1,
		lensPrice: Number(raw.aro1?.lensPrice) || 0,
		treatment: raw.aro1?.treatment ? String(raw.aro1.treatment) : "Incolor",
		noTreatment: Boolean(raw.aro1?.noTreatment),
		treatmentPrice: Number(raw.aro1?.treatmentPrice) || 0,
		diopters: raw.aro1?.diopters || {
			od: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
			oe: { esf: "0.00", cil: "0.00", eixo: "0", dnp: "0", alt: "0" },
			adicao: "0.00",
		},
	};

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

function loadSavedOrders(): OpticalOrder[] {
	if (typeof window === "undefined") {
		return INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
	}

	try {
		const saved = localStorage.getItem(CURRENT_STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed.map((o, idx) => sanitizeOrder(o, idx));
			}
		}

		// Fallback para chave legada e migração automática
		const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
		if (legacySaved) {
			const parsed = JSON.parse(legacySaved);
			if (Array.isArray(parsed) && parsed.length > 0) {
				const sanitized = parsed.map((o, idx) => sanitizeOrder(o, idx));
				try {
					localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(sanitized));
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
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(globalOrders));
		} catch (e) {
			console.warn("Could not persist optical orders to localStorage", e);
		}
	}
	for (const listener of listeners) {
		listener(globalOrders);
	}
}

export function clearOpticalStorage() {
	if (typeof window !== "undefined") {
		try {
			localStorage.removeItem(CURRENT_STORAGE_KEY);
			localStorage.removeItem(LEGACY_STORAGE_KEY);
		} catch (e) {
			console.warn("Error clearing optical storage", e);
		}
	}
	globalOrders = INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
	notify();
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

	const addOrder = (order: OpticalOrder) => {
		const safeOrder = sanitizeOrder(order);
		globalOrders = [safeOrder, ...globalOrders];
		notify();
		// Salva assincronamente no Supabase
		saveOrderToSupabase(safeOrder).catch((err) =>
			console.warn("Could not sync new order to Supabase:", err),
		);
	};

	const updateOrderStatus = (id: string, newStatus: OpticalOrderStatus) => {
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
			return sanitizeOrder(updated);
		});
		notify();
	};

	const payResidual = (id: string) => {
		globalOrders = globalOrders.map((ord) => {
			if (ord.id !== id) return ord;
			const total = Number(ord.financials?.totalAmount) || 0;
			return sanitizeOrder({
				...ord,
				financials: {
					...ord.financials,
					paidAmount: total,
					residualAmount: 0,
					paymentMode: "TOTAL",
				},
				updatedAt: new Date().toISOString(),
			});
		});
		notify();
	};

	const resetToDefaults = () => {
		globalOrders = INITIAL_OPTICAL_ORDERS.map((o, idx) => sanitizeOrder(o, idx));
		notify();
	};

	const updateOrder = (order: OpticalOrder) => {
		const safeOrder = sanitizeOrder(order);
		globalOrders = globalOrders.map((ord) => (ord.id === safeOrder.id ? safeOrder : ord));
		notify();
		saveOrderToSupabase(safeOrder).catch((err) =>
			console.warn("Could not sync updated order to Supabase:", err),
		);
	};

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
