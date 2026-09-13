"use client";

import { useEffect, useState } from "react";
import { INITIAL_OPTICAL_ORDERS } from "./optical-mock-data";
import type { OpticalOrder, OpticalOrderStatus } from "./optical-types";

const STORAGE_KEY = "compai_optical_orders_v1";

let globalOrders: OpticalOrder[] = INITIAL_OPTICAL_ORDERS;
const listeners = new Set<(orders: OpticalOrder[]) => void>();

function notify() {
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(globalOrders));
		} catch (e) {
			console.warn("Could not persist optical orders to localStorage", e);
		}
	}
	for (const listener of listeners) {
		listener(globalOrders);
	}
}

export function useOpticalOrders() {
	const [orders, setOrders] = useState<OpticalOrder[]>(globalOrders);

	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						globalOrders = parsed;
						setOrders(parsed);
					}
				}
			} catch (e) {
				console.warn("Could not load optical orders from localStorage", e);
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
		globalOrders = [order, ...globalOrders];
		notify();
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
			return updated;
		});
		notify();
	};

	const payResidual = (id: string) => {
		globalOrders = globalOrders.map((ord) => {
			if (ord.id !== id) return ord;
			const total = ord.financials.totalAmount;
			return {
				...ord,
				financials: {
					...ord.financials,
					paidAmount: total,
					residualAmount: 0,
					paymentMode: "TOTAL",
				},
				updatedAt: new Date().toISOString(),
			};
		});
		notify();
	};

	const resetToDefaults = () => {
		globalOrders = INITIAL_OPTICAL_ORDERS;
		notify();
	};

	return {
		orders,
		addOrder,
		updateOrderStatus,
		payResidual,
		resetToDefaults,
	};
}
