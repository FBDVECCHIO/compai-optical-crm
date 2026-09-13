import { db, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import {
	calculateDecentration,
	calculateMinimumBlankDiameter,
	calculateSphericalEquivalent,
	type FrameType,
	OPTICAL_CATALOG_BENCHMARKS,
	recommendRefractiveIndex,
} from "../lib/optical";

export default defineTool({
	description:
		"Cross-reference prescription diopters against optical lens catalogs (Hoya, Zeiss, Essilor, Personality). " +
		"Calculates decentration, minimum required lens blank diameter (Ø) for the chosen frame to prevent edging cutoff, " +
		"evaluates frame mechanical compatibility (e.g. blocking 1.50 CR-39 on rimless/nylon frames), and recommends " +
		"the ideal refractive index (1.50, 1.53, 1.59, 1.60, 1.67, 1.74) to avoid thick, heavy, unsightly lenses.",
	inputSchema: z.object({
		odSphere: z.number().describe("Right Eye (OD) Spherical power in diopters."),
		odCyl: z.number().default(0.0).describe("Right Eye (OD) Cylindrical power in diopters."),
		oeSphere: z.number().describe("Left Eye (OE) Spherical power in diopters."),
		oeCyl: z.number().default(0.0).describe("Left Eye (OE) Cylindrical power in diopters."),
		addition: z
			.number()
			.nullable()
			.optional()
			.describe("Near addition in diopters (if present, defaults lens search to PROGRESSIVE)."),
		lensType: z
			.enum(["PROGRESSIVE", "SINGLE_VISION", "OCCUPATIONAL", "BIFOCAL"])
			.nullable()
			.optional()
			.describe("Lens optical design type. If omitted, automatically determined by presence of addition."),
		frameWidth: z
			.number()
			.min(35)
			.max(70)
			.default(53)
			.describe("Horizontal lens boxing dimension (A) in mm (e.g. 52, 54)."),
		frameBridge: z
			.number()
			.min(10)
			.max(28)
			.default(18)
			.describe("Bridge width (DBL) in mm (e.g. 16, 18, 20)."),
		frameHeight: z
			.number()
			.min(20)
			.max(65)
			.default(40)
			.describe("Vertical lens boxing dimension (B) in mm (e.g. 38, 42)."),
		frameEffectiveDiameter: z
			.number()
			.nullable()
			.optional()
			.describe("Effective diagonal frame diameter (ED) in mm. If omitted, calculated from A and B."),
		frameType: z
			.enum(["CLOSED_METAL_ACETATE", "SEMI_RIMLESS_NYLON", "RIMLESS_THREE_PIECE"])
			.default("CLOSED_METAL_ACETATE")
			.describe("Frame construction type (crucial for lens material mechanical resistance)."),
		dnpOd: z
			.number()
			.min(24)
			.max(42)
			.default(31.5)
			.describe("Right Eye monocular DNP in mm."),
		dnpOe: z
			.number()
			.min(24)
			.max(42)
			.default(31.5)
			.describe("Left Eye monocular DNP in mm."),
		preferredBrand: z
			.string()
			.nullable()
			.optional()
			.describe("Filter by lens manufacturer brand ('Hoya', 'Zeiss', 'Essilor', 'Personality')."),
		preferredTier: z
			.enum(["BASIC", "ADVANCED", "PREMIUM", "SUPER_PREMIUM", "EXCLUSIVO"])
			.nullable()
			.optional()
			.describe("Filter by lens technology tier."),
		maxBudget: z
			.number()
			.nullable()
			.optional()
			.describe("Maximum retail price ceiling in BRL (R$)."),
	}),
	async execute(input) {
		const targetLensType =
			input.lensType ??
			(input.addition !== null && input.addition !== undefined && input.addition > 0
				? "PROGRESSIVE"
				: "SINGLE_VISION");

		// 1. Calculate Effective Diameter (ED) if not provided
		const ed =
			input.frameEffectiveDiameter ??
			Math.round(
				Math.sqrt(
					input.frameWidth * input.frameWidth +
						input.frameHeight * input.frameHeight,
				) * 10,
			) / 10;

		// 2. Decentration and Minimum Blank Diameter Calculation
		const decentrationOD = calculateDecentration(
			input.frameWidth,
			input.frameBridge,
			input.dnpOd,
		);
		const decentrationOE = calculateDecentration(
			input.frameWidth,
			input.frameBridge,
			input.dnpOe,
		);
		const maxDecentration = Math.max(decentrationOD, decentrationOE);
		const minBlankDiameter = calculateMinimumBlankDiameter(ed, maxDecentration);

		// 3. Spherical Equivalents and Dioptric Power Demands
		const eeOD = calculateSphericalEquivalent(input.odSphere, input.odCyl);
		const eeOE = calculateSphericalEquivalent(input.oeSphere, input.oeCyl);
		const maxAbsoluteEE = Math.max(Math.abs(eeOD), Math.abs(eeOE));
		const maxCylinderAbs = Math.max(Math.abs(input.odCyl), Math.abs(input.oeCyl));

		// 4. Refractive Index and Material Recommendation
		const recommendation = recommendRefractiveIndex({
			maxAbsoluteSphericalEquivalent: maxAbsoluteEE,
			frameType: input.frameType as FrameType,
			highestCylinderAbs: maxCylinderAbs,
		});

		// 5. Evaluate Blank Feasibility
		let diameterStatus = "FEASIBLE";
		let diameterWarning: string | null = null;
		if (minBlankDiameter <= 70) {
			diameterStatus = "PADRAO_DISPONIVEL";
		} else if (minBlankDiameter <= 75) {
			diameterStatus = "BLOCO_75MM_OU_SURFACAGEM";
			diameterWarning =
				`Diâmetro mínimo de ${minBlankDiameter}mm exige bloco de 75mm ou produção digital customizada.`;
		} else {
			diameterStatus = "ALTA_DESCENTRACAO_RISCO_CORTE";
			diameterWarning =
				`ALERTA CRÍTICO: Diâmetro mínimo calculado (${minBlankDiameter}mm) ultrapassa o limite padrão de 75mm. ` +
				"Há risco iminente de 'falta de lente' (corte branco na borda da armação). Recomenda-se armação com ponte/aro menor ou lente Freeform com diâmetro especial e pré-calibração digital.";
		}

		// 6. Query DB Catalog + Benchmark Fallback
		type AvailableLens = {
			id?: string;
			brand: string;
			family: string;
			name: string;
			tier: string;
			design: string;
			refractiveIndex: number;
			material: string;
			suggestedRetailPrice: number;
			labBaseCost: number;
			isRecommendedIndex: boolean;
			isMechanicallySafe: boolean;
			mechanicalNote?: string;
		};

		let compatibleLenses: AvailableLens[] = [];

		try {
			const dbLenses = await db.opticalLensCatalog.findMany({
				where: {
					isActive: true,
					lensType: targetLensType as any,
					minSphere: { lte: Math.min(input.odSphere, input.oeSphere) },
					maxSphere: { gte: Math.max(input.odSphere, input.oeSphere) },
					maxCylinder: { gte: maxCylinderAbs },
					...(input.preferredBrand
						? { brand: { contains: input.preferredBrand, mode: "insensitive" } }
						: {}),
					...(input.preferredTier ? { tier: input.preferredTier as any } : {}),
					...(input.maxBudget ? { suggestedRetailPrice: { lte: input.maxBudget } } : {}),
				},
				orderBy: [{ tier: "desc" }, { suggestedRetailPrice: "asc" }],
				take: 10,
			});

			compatibleLenses = dbLenses.map((lens) => {
				const isRecommended =
					lens.refractiveIndex.toFixed(2) === recommendation.recommendedIndex;
				const isFragileCR39 =
					(input.frameType === "RIMLESS_THREE_PIECE" ||
						input.frameType === "SEMI_RIMLESS_NYLON") &&
					lens.material === "CR39_150";

				return {
					id: lens.id,
					brand: lens.brand,
					family: lens.family,
					name: lens.name,
					tier: lens.tier,
					design: lens.design,
					refractiveIndex: Number(lens.refractiveIndex),
					material: lens.material,
					suggestedRetailPrice: Number(lens.suggestedRetailPrice),
					labBaseCost: Number(lens.labBaseCost),
					isRecommendedIndex: isRecommended,
					isMechanicallySafe: !isFragileCR39,
					mechanicalNote: isFragileCR39
						? "INCOMPATÍVEL: Risco de quebra/trinca na furação ou canaleta."
						: undefined,
				};
			});
		} catch (error) {
			console.warn("[check_lens_availability] DB query fallback to benchmarks:", error);
		}

		// Supplement from curated benchmarks if DB returned few results
		if (compatibleLenses.length < 3) {
			const minTargetSph = Math.min(input.odSphere, input.oeSphere);
			const maxTargetSph = Math.max(input.odSphere, input.oeSphere);

			const benchmarkMatches = OPTICAL_CATALOG_BENCHMARKS.filter((b) => {
				if (b.lensType !== targetLensType) return false;
				if (b.minSphere !== null && minTargetSph < b.minSphere) return false;
				if (b.maxSphere !== null && maxTargetSph > b.maxSphere) return false;
				if (b.maxCylinder !== null && maxCylinderAbs > b.maxCylinder) return false;
				if (
					input.preferredBrand &&
					!b.brand.toLowerCase().includes(input.preferredBrand.toLowerCase())
				)
					return false;
				if (input.preferredTier && b.tier !== input.preferredTier) return false;
				if (input.maxBudget && b.suggestedRetailPrice > input.maxBudget) return false;
				return true;
			}).map((b) => {
				const isRecommended =
					b.refractiveIndex.toFixed(2) === recommendation.recommendedIndex;
				const isFragileCR39 =
					(input.frameType === "RIMLESS_THREE_PIECE" ||
						input.frameType === "SEMI_RIMLESS_NYLON") &&
					b.material === "CR39_150";

				return {
					brand: b.brand,
					family: b.family,
					name: b.name,
					tier: b.tier,
					design: b.design,
					refractiveIndex: b.refractiveIndex,
					material: b.material,
					suggestedRetailPrice: b.suggestedRetailPrice,
					labBaseCost: b.labBaseCost,
					isRecommendedIndex: isRecommended,
					isMechanicallySafe: !isFragileCR39,
					mechanicalNote: isFragileCR39
						? "INCOMPATÍVEL: Risco de quebra/trinca na furação ou canaleta."
						: undefined,
				};
			});

			compatibleLenses = [...compatibleLenses, ...benchmarkMatches];
		}

		// Sort: mechanically safe first, then recommended index first, then price
		compatibleLenses.sort((a, b) => {
			if (a.isMechanicallySafe !== b.isMechanicallySafe) {
				return a.isMechanicallySafe ? -1 : 1;
			}
			if (a.isRecommendedIndex !== b.isRecommendedIndex) {
				return a.isRecommendedIndex ? -1 : 1;
			}
			return a.suggestedRetailPrice - b.suggestedRetailPrice;
		});

		return {
			available: compatibleLenses.length > 0,
			targetLensType,
			sphericalEquivalentOD: eeOD,
			sphericalEquivalentOE: eeOE,
			maxDioptricDemand: maxAbsoluteEE,
			frameDimensions: {
				A: input.frameWidth,
				DBL: input.frameBridge,
				B: input.frameHeight,
				ED: ed,
				frameType: input.frameType,
			},
			diameterAnalysis: {
				decentrationOD: `${decentrationOD}mm`,
				decentrationOE: `${decentrationOE}mm`,
				requiredMinimumBlankDiameter: `${minBlankDiameter}mm`,
				status: diameterStatus,
				warning: diameterWarning,
			},
			recommendedIndexProfile: {
				refractiveIndex: recommendation.recommendedIndex,
				material: recommendation.material,
				materialName: recommendation.materialName,
				abbeValue: recommendation.abbeValue,
				density: `${recommendation.density} g/cm³`,
				thicknessBenefit: recommendation.thicknessBenefit,
				frameConstraintWarning: recommendation.frameConstraintWarning,
			},
			totalCatalogOptions: compatibleLenses.length,
			lenses: compatibleLenses.slice(0, 8),
		};
	},
});
