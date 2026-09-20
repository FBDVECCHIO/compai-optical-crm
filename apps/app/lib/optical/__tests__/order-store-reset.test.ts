import { describe, expect, it } from "bun:test";
import {
	clearOpticalStorage,
	getOpticalOrders,
	isDatabaseZeroed,
	loadSavedOrders,
} from "../optical-store";
import { INITIAL_OPTICAL_ORDERS } from "../optical-mock-data";

describe("Database Zeroing & Test Initialization Architecture", () => {
	it("zeros all orders when clearOpticalStorage('ORDERS_ONLY') is called", () => {
		clearOpticalStorage("ORDERS_ONLY");
		const orders = getOpticalOrders();
		expect(orders.length).toBe(0);
		expect(isDatabaseZeroed()).toBe(true);
	});

	it("preserves empty order list across reloads when database is zeroed", () => {
		clearOpticalStorage("ORDERS_ONLY");
		const reloaded = loadSavedOrders();
		expect(reloaded.length).toBe(0);
	});

	it("restores demo orders when clearOpticalStorage('DEMO') is called", () => {
		clearOpticalStorage("DEMO");
		const orders = getOpticalOrders();
		expect(orders.length).toBeGreaterThan(0);
		expect(orders.length).toBe(INITIAL_OPTICAL_ORDERS.length);
		expect(isDatabaseZeroed()).toBe(false);
	});
});
