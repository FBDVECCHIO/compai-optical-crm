import { describe, expect, it } from "bun:test";
import { sanitizeOrder } from "../optical-store";

describe("catalog-mirroring: Schema and Store Parity for Lenses and Frames", () => {
	it("preserves mirrored technical lens and frame fields on aro1", () => {
		const rawOrder = {
			id: "ord_test_mirror_1",
			orderNumber: "OS-TEST-001",
			status: "DIGITADA",
			aro1: {
				frameCode: "RB5228",
				frameBrand: "Ray-Ban",
				frameModel: "Wayfarer Classic",
				framePrice: 590,
				frameType: "RECEITUARIO",
				frameFamily: "Wayfarer",
				frameManufacturer: "Luxottica",
				frameAro: "52",
				framePonte: "18",
				lab: "Essilor",
				lensName: "Varilux Comfort Max 1.50",
				lensPrice: 1890,
				lensType: "MULTIFOCAL",
				lensFamily: "Varilux",
				lensIndex: "1.50",
				lensTech: "Freeform",
				treatment: "Crizal Rock",
				treatmentPrice: 390,
				noTreatment: false,
			},
		};

		const sanitized = sanitizeOrder(rawOrder);
		expect(sanitized.aro1?.frameType).toBe("RECEITUARIO");
		expect(sanitized.aro1?.frameFamily).toBe("Wayfarer");
		expect(sanitized.aro1?.frameManufacturer).toBe("Luxottica");
		expect(sanitized.aro1?.frameAro).toBe("52");
		expect(sanitized.aro1?.framePonte).toBe("18");

		expect(sanitized.aro1?.lensType).toBe("MULTIFOCAL");
		expect(sanitized.aro1?.lensFamily).toBe("Varilux");
		expect(sanitized.aro1?.lensIndex).toBe("1.50");
		expect(sanitized.aro1?.lensTech).toBe("Freeform");
	});

	it("preserves mirrored technical fields on aro2 when second pair is enabled", () => {
		const rawOrder = {
			id: "ord_test_mirror_2",
			orderNumber: "OS-TEST-002",
			status: "DIGITADA",
			hasAro2: true,
			aro1: {
				frameBrand: "Ray-Ban",
				lensName: "Varilux",
			},
			aro2: {
				frameCode: "VO5322",
				frameBrand: "Vogue Eyewear",
				frameModel: "Solar Chic",
				framePrice: 420,
				frameType: "SOLAR",
				frameFamily: "Gigi Hadid",
				frameManufacturer: "Luxottica",
				frameAro: "54",
				framePonte: "19",
				lab: "Essilor",
				lensName: "Varilux Physio 3.0",
				lensPrice: 1400,
				lensType: "MULTIFOCAL",
				lensFamily: "Varilux",
				lensIndex: "1.59",
				lensTech: "Digital",
				treatment: "Crizal Sun UV",
				treatmentPrice: 280,
				noTreatment: false,
			},
		};

		const sanitized = sanitizeOrder(rawOrder);
		expect(sanitized.hasAro2).toBe(true);
		expect(sanitized.aro2).toBeDefined();
		expect(sanitized.aro2?.frameType).toBe("SOLAR");
		expect(sanitized.aro2?.frameFamily).toBe("Gigi Hadid");
		expect(sanitized.aro2?.frameAro).toBe("54");
		expect(sanitized.aro2?.framePonte).toBe("19");

		expect(sanitized.aro2?.lensType).toBe("MULTIFOCAL");
		expect(sanitized.aro2?.lensIndex).toBe("1.59");
		expect(sanitized.aro2?.lensTech).toBe("Digital");
	});

	it("preserves split-eye technical specifications (OD/OE) when enabled", () => {
		const rawOrder = {
			id: "ord_test_mirror_3",
			orderNumber: "OS-TEST-003",
			aro1: {
				differentLensesPerEye: true,
				lensOd: "Sync III 1.50",
				labOd: "Hoya",
				lensPriceOd: 450,
				lensTypeOd: "MONOFOCAL",
				lensIndexOd: "1.50",
				lensTechOd: "Digital",
				lensOe: "Hoyalux Balansis 1.60",
				labOe: "Hoya",
				lensPriceOe: 825,
				lensTypeOe: "MULTIFOCAL",
				lensIndexOe: "1.60",
				lensTechOe: "Freeform",
			},
		};

		const sanitized = sanitizeOrder(rawOrder);
		expect(sanitized.aro1?.differentLensesPerEye).toBe(true);
		expect(sanitized.aro1?.lensTypeOd).toBe("MONOFOCAL");
		expect(sanitized.aro1?.lensIndexOd).toBe("1.50");
		expect(sanitized.aro1?.lensTechOd).toBe("Digital");

		expect(sanitized.aro1?.lensTypeOe).toBe("MULTIFOCAL");
		expect(sanitized.aro1?.lensIndexOe).toBe("1.60");
		expect(sanitized.aro1?.lensTechOe).toBe("Freeform");
	});
});
