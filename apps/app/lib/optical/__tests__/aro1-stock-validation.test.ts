import { describe, expect, it } from "bun:test";
import type { AroItem, FrameCatalogItem, FrameCustomerData } from "../optical-types";

// Validation helper for Aro 1
export function validateAro1Submission(
	aro1: AroItem,
	mode: "STOCK" | "CUSTOMER",
	frameCatalog: FrameCatalogItem[]
): { valid: boolean; error?: string } {
	if (mode === "STOCK") {
		if (!aro1.frameCode || aro1.frameCode.trim() === "") {
			return { valid: false, error: "O código do produto da armação é obrigatório." };
		}
		const matched = frameCatalog.find(
			(f) =>
				f.produto.toLowerCase().includes(aro1.frameCode.toLowerCase()) ||
				(aro1.frameModel && f.produto.toLowerCase() === aro1.frameModel.toLowerCase())
		);
		if (!matched) {
			return { valid: false, error: "Armação não encontrada no catálogo de estoque." };
		}
		if (matched.estoque <= 0) {
			return {
				valid: false,
				error: "A armação selecionada está sem estoque no momento. Escolha outro produto com estoque disponível.",
			};
		}
		return { valid: true };
	}

	// Mode === "CUSTOMER"
	const cust = aro1.frameCustomerData;
	if (!cust) {
		return { valid: false, error: "Dados técnicos da armação trazida pelo cliente não preenchidos." };
	}
	if (!cust.bridge || !cust.aro || !cust.verticalB || !cust.diagonalEd || !cust.brand || !cust.type) {
		return {
			valid: false,
			error: "Preencha todos os parâmetros técnicos da armação trazida: Ponte, Aro, Vertical B, Diagonal Maior (ED), Marca e Tipo.",
		};
	}
	return { valid: true };
}

describe("Aro 1 Product Code & Stock Validation Shield", () => {
	const mockCatalog: FrameCatalogItem[] = [
		{
			id: "frm_1",
			codigo: "ARM-10001",
			produto: "Ray-Ban RB5228 Acetato Clássico",
			marca: "Ray-Ban",
			fabricante: "Luxottica",
			tipo: "RECEITUARIO",
			familia: "Wayfarer",
			tamanhoAro: "52",
			tamanhoPonte: "18",
			estoque: 5,
			preco: 590,
			ativo: true,
		},
		{
			id: "frm_2",
			codigo: "ARM-10002",
			produto: "Oakley OX8156 Holbrook RX",
			marca: "Oakley",
			fabricante: "Luxottica",
			tipo: "RECEITUARIO",
			familia: "Holbrook",
			tamanhoAro: "56",
			tamanhoPonte: "18",
			estoque: 0, // ESGOTADO
			preco: 620,
			ativo: true,
		},
	];

	const baseAro: AroItem = {
		frameCode: "RB5228",
		frameBrand: "Ray-Ban",
		frameModel: "Ray-Ban RB5228",
		framePrice: 590,
		lab: "Essilor",
		lensName: "Varilux",
		quantity: 1,
		lensPrice: 1000,
		treatment: "Nenhum",
		noTreatment: true,
		treatmentPrice: 0,
		diopters: {
			od: { esf: "0.00", cil: "0.00", eixo: "" },
			oe: { esf: "0.00", cil: "0.00", eixo: "" },
		},
	};

	it("blocks submission if frame code is missing in stock mode", () => {
		const aro1: AroItem = {
			...baseAro,
			frameCode: "",
		};
		const result = validateAro1Submission(aro1, "STOCK", mockCatalog);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("código do produto da armação é obrigatório");
	});

	it("blocks submission if selected frame has zero or negative stock", () => {
		const aro1: AroItem = {
			...baseAro,
			frameCode: "OX8156",
			frameBrand: "Oakley",
			frameModel: "Oakley OX8156 Holbrook RX",
			framePrice: 620,
		};
		const result = validateAro1Submission(aro1, "STOCK", mockCatalog);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("sem estoque no momento");
	});

	it("allows submission when frame is available in stock", () => {
		const aro1: AroItem = {
			...baseAro,
			frameCode: "RB5228",
			frameBrand: "Ray-Ban",
			frameModel: "Ray-Ban RB5228 Acetato Clássico",
			framePrice: 590,
		};
		const result = validateAro1Submission(aro1, "STOCK", mockCatalog);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("validates customer brought frame (Armação Trazida) technical parameters", () => {
		const incompleteAro: AroItem = {
			...baseAro,
			frameCode: "CLIENTE",
			frameBrand: "Própria",
			frameModel: "Armação Trazida",
			framePrice: 0,
			frameCustomerData: {
				bridge: "18",
				aro: "50",
				// missing verticalB, diagonalEd, brand, type
			},
		};
		const result = validateAro1Submission(incompleteAro, "CUSTOMER", mockCatalog);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("Preencha todos os parâmetros técnicos");

		const completeAro: AroItem = {
			...incompleteAro,
			frameCustomerData: {
				bridge: "18",
				aro: "50",
				verticalB: "38",
				diagonalEd: "54",
				brand: "Prada Vintage",
				type: "Receituário Acetato",
				shapeId: "shape_1",
				shapeName: "Redondo",
				photoUrl: "https://example.com/frame-photo.jpg",
			},
		};
		const validResult = validateAro1Submission(completeAro, "CUSTOMER", mockCatalog);
		expect(validResult.valid).toBe(true);
	});
});
