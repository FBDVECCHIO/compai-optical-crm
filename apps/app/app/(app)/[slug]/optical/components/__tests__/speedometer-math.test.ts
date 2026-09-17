import { describe, expect, it } from "bun:test";
import {
	calculatePaceStatus,
	describeArc,
	generateTicks,
	polarToCartesian,
	valueToAngle,
} from "../speedometer-math";

describe("speedometer-math", () => {
	describe("polarToCartesian", () => {
		it("converts -180 degrees (far left) correctly", () => {
			const pt = polarToCartesian(100, 100, 50, -180);
			expect(Math.round(pt.x)).toBe(50);
			expect(Math.round(pt.y)).toBe(100);
		});

		it("converts -90 degrees (top apex) correctly", () => {
			const pt = polarToCartesian(100, 100, 50, -90);
			expect(Math.round(pt.x)).toBe(100);
			expect(Math.round(pt.y)).toBe(50);
		});

		it("converts 0 degrees (far right) correctly", () => {
			const pt = polarToCartesian(100, 100, 50, 0);
			expect(Math.round(pt.x)).toBe(150);
			expect(Math.round(pt.y)).toBe(100);
		});
	});

	describe("describeArc", () => {
		it("generates an SVG arc string starting with M and containing A", () => {
			const arc = describeArc(100, 100, 50, -180, 0);
			expect(arc.startsWith("M")).toBe(true);
			expect(arc.includes("A 50 50 0")).toBe(true);
		});
	});

	describe("valueToAngle", () => {
		it("maps 0% to start angle (-180)", () => {
			const angle = valueToAngle(0, 0, 100);
			expect(angle).toBe(-180);
		});

		it("maps 50% to apex angle (-90)", () => {
			const angle = valueToAngle(50, 0, 100);
			expect(angle).toBe(-90);
		});

		it("maps 100% to end angle (0)", () => {
			const angle = valueToAngle(100, 0, 100);
			expect(angle).toBe(0);
		});

		it("handles zero max safely without NaN", () => {
			const angle = valueToAngle(50, 0, 0);
			expect(angle).toBe(-180);
		});

		it("clamps values gracefully when over 100%", () => {
			const angle = valueToAngle(150, 0, 100, -180, 0, 15);
			expect(angle).toBeLessThanOrEqual(15);
		});
	});

	describe("calculatePaceStatus", () => {
		it("classifies >= 105% as AHEAD", () => {
			expect(calculatePaceStatus(105, 100)).toBe("AHEAD");
			expect(calculatePaceStatus(150, 100)).toBe("AHEAD");
		});

		it("classifies between 95% and 104.9% as ON_TRACK", () => {
			expect(calculatePaceStatus(95, 100)).toBe("ON_TRACK");
			expect(calculatePaceStatus(100, 100)).toBe("ON_TRACK");
			expect(calculatePaceStatus(104, 100)).toBe("ON_TRACK");
		});

		it("classifies < 95% as BEHIND", () => {
			expect(calculatePaceStatus(94.9, 100)).toBe("BEHIND");
			expect(calculatePaceStatus(50, 100)).toBe("BEHIND");
			expect(calculatePaceStatus(0, 100)).toBe("BEHIND");
		});

		it("handles zero expected gracefully", () => {
			expect(calculatePaceStatus(100, 0)).toBe("AHEAD");
			expect(calculatePaceStatus(0, 0)).toBe("ON_TRACK");
		});
	});

	describe("generateTicks", () => {
		it("generates expected graduation ticks", () => {
			const ticks = generateTicks(0, 100000);
			expect(ticks.length).toBeGreaterThanOrEqual(5);
			expect(ticks[0]?.label).toBe("0%");
			expect(ticks.some((t) => t.label === "100%")).toBe(true);
		});
	});
});