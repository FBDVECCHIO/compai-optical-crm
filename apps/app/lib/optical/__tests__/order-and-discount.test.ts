import { describe, expect, it } from "bun:test";
import { checkDiscountLimit } from "../optical-store";
import { decrementFrameStock, fetchFrameCatalog, saveFrameCatalogItem } from "../supabase-optical";

describe("Discount Policies & Limit Enforcement", () => {
	it("allows vendedor to grant up to 10% discount", () => {
		const result = checkDiscountLimit("VENDEDOR", 10);
		expect(result.allowed).toBe(true);
		expect(result.maxAllowed).toBe(10);
		expect(result.requiresManager).toBe(false);
	});

	it("blocks vendedor granting 15% discount and requires manager delegation", () => {
		const result = checkDiscountLimit("VENDEDOR", 15);
		expect(result.allowed).toBe(false);
		expect(result.maxAllowed).toBe(10);
		expect(result.requiresManager).toBe(true);
	});

	it("allows gerente to grant up to 20% discount without manager delegation", () => {
		const result = checkDiscountLimit("GERENTE", 18);
		expect(result.allowed).toBe(true);
		expect(result.maxAllowed).toBe(20);
		expect(result.requiresManager).toBe(false);
	});

	it("allows admin to grant up to 100% discount", () => {
		const result = checkDiscountLimit("ADMIN", 50);
		expect(result.allowed).toBe(true);
		expect(result.maxAllowed).toBe(100);
		expect(result.requiresManager).toBe(false);
	});
});

describe("Frame Stock Decrement on Order Submission", () => {
	it("correctly decrements stock of a frame", async () => {
		const catalog = await fetchFrameCatalog();
		if (catalog.length > 0) {
			const target = catalog[0]!;
			const initialStock = target.estoque;

			// Decrement 1
			const updatedCatalog = await decrementFrameStock(target.id, 1);
			const updated = updatedCatalog?.find((f) => f.id === target.id);
			expect(updated?.estoque).toBe(Math.max(0, initialStock - 1));

			// Restore stock for idempotency
			await saveFrameCatalogItem(target);
		}
	});
});
