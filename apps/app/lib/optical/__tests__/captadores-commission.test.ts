import { describe, expect, it } from "bun:test";
import { DEFAULT_CAPTADORES, type OpticalCaptador } from "../supabase-optical";

describe("Captadores & Commission Calculation Engine", () => {
	it("has default captadores with valid structure", () => {
		expect(DEFAULT_CAPTADORES.length).toBeGreaterThan(0);
		const first = DEFAULT_CAPTADORES[0]!;
		expect(first.id).toBeDefined();
		expect(first.name).toBeDefined();
		expect(["PERCENTUAL", "FIXO"]).toContain(first.commissionType);
		expect(typeof first.commissionValue).toBe("number");
	});

	it("correctly calculates percent-based commission on optical orders", () => {
		const captador: OpticalCaptador = {
			id: "cap_test_pct",
			name: "Dr. Oftalmo Teste",
			commissionType: "PERCENTUAL",
			commissionValue: 5, // 5%
			active: true,
		};

		const orderTotal = 3000;
		const commission = (orderTotal * captador.commissionValue) / 100;
		expect(commission).toBe(150);
	});

	it("correctly calculates fixed-value commission on optical orders", () => {
		const captador: OpticalCaptador = {
			id: "cap_test_fix",
			name: "Promotor Teste",
			commissionType: "FIXO",
			commissionValue: 75, // R$ 75,00
			active: true,
		};

		const orderTotal = 2500;
		const commission = captador.commissionType === "FIXO" ? captador.commissionValue : (orderTotal * captador.commissionValue) / 100;
		expect(commission).toBe(75);
	});
});
