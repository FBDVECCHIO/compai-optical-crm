import { db, FactBand, FactStatus, type Prisma } from "@crm/db";

// Optical Constants & Standards (ABNT NBR ISO 21987 / ANSI Z80.1)
export const MIN_AXIS = 1;
export const MAX_AXIS = 180;
export const MIN_DNP_MONOCULAR = 25.0;
export const MAX_DNP_MONOCULAR = 40.0;
export const MAX_DNP_ASYMMETRY = 4.0;
export const MIN_SPHERE = -25.0;
export const MAX_SPHERE = 25.0;
export const MAX_CYLINDER_ABS = 12.0;
export const MIN_ADDITION = 0.75;
export const MAX_ADDITION = 4.0;

export type FrameType =
	| "CLOSED_METAL_ACETATE"
	| "SEMI_RIMLESS_NYLON"
	| "RIMLESS_THREE_PIECE";

export type PrescriptionInput = {
	patientId: string;
	odSphere: number;
	odCyl?: number;
	odAxis?: number | null;
	odAddition?: number | null;
	odDnp?: number | null;
	odHeight?: number | null;
	oeSphere: number;
	oeCyl?: number;
	oeAxis?: number | null;
	oeAddition?: number | null;
	oeDnp?: number | null;
	oeHeight?: number | null;
	patientAge?: number | null;
	issuedAt?: string | null;
	ocrConfidenceScore?: number | null;
	ocrRawText?: string | null;
	prescriptionImageUrl?: string | null;
	doctorId?: string | null;
	storeId?: string | null;
};

export type TransposedDiopters = {
	sphere: number;
	cyl: number;
	axis: number | null;
};

export type PrescriptionAuditResult = {
	valid: boolean;
	score: number;
	band: FactBand;
	transposedOD: TransposedDiopters;
	transposedOE: TransposedDiopters;
	sphericalEquivalentOD: number;
	sphericalEquivalentOE: number;
	inconsistencies: string[];
	warnings: string[];
	evidenceLedger: {
		kind: string;
		detail: string;
		weight: number;
	}[];
	formattedSummary: string;
	recommendation: string;
};

/**
 * Performs optical cylinder transposition:
 * New Sphere = Sphere + Cyl
 * New Cyl = -Cyl
 * New Axis: Axis <= 90 ? Axis + 90 : Axis - 90
 */
export function transposeCylinder(
	sphere: number,
	cyl = 0,
	axis: number | null = null,
): TransposedDiopters {
	const round2 = (val: number) => Math.round(val * 100) / 100;

	if (cyl === 0 || isNaN(cyl)) {
		return {
			sphere: round2(sphere),
			cyl: 0,
			axis: null,
		};
	}

	const newSphere = round2(sphere + cyl);
	const newCyl = round2(-cyl);

	let newAxis: number | null = null;
	if (axis !== null && !isNaN(axis)) {
		let rawAxis = Math.round(axis);
		if (rawAxis <= 0) rawAxis = 180;
		if (rawAxis > 180) rawAxis = ((rawAxis - 1) % 180) + 1;

		newAxis = rawAxis <= 90 ? rawAxis + 90 : rawAxis - 90;
		if (newAxis === 0) newAxis = 180;
	}

	return {
		sphere: newSphere,
		cyl: newCyl,
		axis: newAxis,
	};
}

/**
 * Calculates Spherical Equivalent (Equivalente Esférico):
 * EE = Sphere + (Cyl / 2)
 */
export function calculateSphericalEquivalent(sphere: number, cyl = 0): number {
	return Math.round((sphere + cyl / 2) * 100) / 100;
}

/**
 * Calculates decentration per eye in mm:
 * Decentration = |((Frame Width + Frame Bridge) / 2) - Monocular DNP|
 */
export function calculateDecentration(
	frameWidth: number,
	frameBridge: number,
	dnp: number,
): number {
	const framePd = frameWidth + frameBridge;
	const halfFramePd = framePd / 2;
	return Math.round(Math.abs(halfFramePd - dnp) * 10) / 10;
}

/**
 * Calculates minimum lens blank diameter (Diâmetro Mínimo de Bloco):
 * Ø_min = Effective Diameter (ED) + 2 * Decentration + Bevel Safety Margin (2.0mm)
 */
export function calculateMinimumBlankDiameter(
	frameEffectiveDiameter: number,
	decentration: number,
	edgingSafetyMargin = 2.0,
): number {
	return (
		Math.round(
			(frameEffectiveDiameter + 2 * decentration + edgingSafetyMargin) * 10,
		) / 10
	);
}

/**
 * Audits an optical prescription against clinical, mathematical, and optical standards.
 */
export function auditPrescriptionData(
	rx: PrescriptionInput,
): PrescriptionAuditResult {
	const inconsistencies: string[] = [];
	const warnings: string[] = [];
	const evidenceLedger: { kind: string; detail: string; weight: number }[] = [];

	const odCyl = rx.odCyl ?? 0;
	const oeCyl = rx.oeCyl ?? 0;

	// 1. Cylinder & Axis Mathematical Validation
	if (odCyl !== 0) {
		if (rx.odAxis === null || rx.odAxis === undefined) {
			inconsistencies.push(
				"OD possui cilindro (" +
					odCyl.toFixed(2) +
					") porém o eixo não foi informado.",
			);
		} else if (rx.odAxis < MIN_AXIS || rx.odAxis > MAX_AXIS) {
			inconsistencies.push(
				"OD eixo fora do intervalo padrão (1° a 180°): " + rx.odAxis + "°.",
			);
		}
	} else if (rx.odAxis !== null && rx.odAxis !== undefined && rx.odAxis !== 0) {
		warnings.push(
			"OD possui eixo informado (" +
				rx.odAxis +
				"°) com cilindro zerado. O eixo será desconsiderado.",
		);
	}

	if (oeCyl !== 0) {
		if (rx.oeAxis === null || rx.oeAxis === undefined) {
			inconsistencies.push(
				"OE possui cilindro (" +
					oeCyl.toFixed(2) +
					") porém o eixo não foi informado.",
			);
		} else if (rx.oeAxis < MIN_AXIS || rx.oeAxis > MAX_AXIS) {
			inconsistencies.push(
				"OE eixo fora do intervalo padrão (1° a 180°): " + rx.oeAxis + "°.",
			);
		}
	} else if (rx.oeAxis !== null && rx.oeAxis !== undefined && rx.oeAxis !== 0) {
		warnings.push(
			"OE possui eixo informado (" +
				rx.oeAxis +
				"°) com cilindro zerado. O eixo será desconsiderado.",
		);
	}

	// 2. Diopter Step Validation (0.25D standard)
	const checkQuarterDiopter = (val: number, label: string) => {
		const remainder = Math.abs(Math.round(val * 100)) % 25;
		if (remainder !== 0) {
			warnings.push(
				`${label} (${val.toFixed(2)}) não é múltiplo padrão de 0,25D. Verifique se houve erro de digitação.`,
			);
		}
	};

	checkQuarterDiopter(rx.odSphere, "OD Esférico");
	checkQuarterDiopter(rx.oeSphere, "OE Esférico");
	if (odCyl !== 0) checkQuarterDiopter(odCyl, "OD Cilíndrico");
	if (oeCyl !== 0) checkQuarterDiopter(oeCyl, "OE Cilíndrico");

	// 3. Absolute Diopter Bounds
	if (rx.odSphere < MIN_SPHERE || rx.odSphere > MAX_SPHERE) {
		inconsistencies.push(
			`OD Esférico fora dos limites fisiológicos usuais (${rx.odSphere.toFixed(2)}D).`,
		);
	}
	if (rx.oeSphere < MIN_SPHERE || rx.oeSphere > MAX_SPHERE) {
		inconsistencies.push(
			`OE Esférico fora dos limites fisiológicos usuais (${rx.oeSphere.toFixed(2)}D).`,
		);
	}
	if (Math.abs(odCyl) > MAX_CYLINDER_ABS) {
		warnings.push(
			`OD Cilíndrico muito elevado (${odCyl.toFixed(2)}D). Exige conferência especial de refração.`,
		);
	}
	if (Math.abs(oeCyl) > MAX_CYLINDER_ABS) {
		warnings.push(
			`OE Cilíndrico muito elevado (${oeCyl.toFixed(2)}D). Exige conferência especial de refração.`,
		);
	}

	// 4. Addition & Presbyopia
	const hasOdAdd = rx.odAddition !== null && rx.odAddition !== undefined;
	const hasOeAdd = rx.oeAddition !== null && rx.oeAddition !== undefined;

	if (hasOdAdd || hasOeAdd) {
		const odAdd = rx.odAddition ?? 0;
		const oeAdd = rx.oeAddition ?? 0;

		if (hasOdAdd && hasOeAdd && Math.abs(odAdd - oeAdd) > 0.01) {
			inconsistencies.push(
				`Anisoadição detectada: OD Adição (${odAdd.toFixed(2)}) difere de OE Adição (${oeAdd.toFixed(2)}). Em 99.9% dos casos fisiológicos a adição é idêntica para ambos os olhos.`,
			);
		}

		const addVal = hasOdAdd ? odAdd : oeAdd;
		if (addVal < MIN_ADDITION || addVal > MAX_ADDITION) {
			inconsistencies.push(
				`Adição fora da faixa habitual de presbiopia (+0.75D a +4.00D): +${addVal.toFixed(2)}D.`,
			);
		}

		if (rx.patientAge !== null && rx.patientAge !== undefined) {
			if (rx.patientAge < 35 && addVal > 0) {
				warnings.push(
					`Paciente jovem (${rx.patientAge} anos) com adição de presbiopia prescrita (+${addVal.toFixed(2)}D). Confirme se trata-se de fadiga acomodativa patológica ou erro cadastral.`,
				);
			}
		}
	}

	// 5. DNP & Pupillary Symmetry
	if (rx.odDnp !== null && rx.odDnp !== undefined) {
		if (rx.odDnp < MIN_DNP_MONOCULAR || rx.odDnp > MAX_DNP_MONOCULAR) {
			inconsistencies.push(
				`OD DNP (${rx.odDnp.toFixed(1)}mm) fora do padrão anatômico humano (25mm a 40mm).`,
			);
		}
	}
	if (rx.oeDnp !== null && rx.oeDnp !== undefined) {
		if (rx.oeDnp < MIN_DNP_MONOCULAR || rx.oeDnp > MAX_DNP_MONOCULAR) {
			inconsistencies.push(
				`OE DNP (${rx.oeDnp.toFixed(1)}mm) fora do padrão anatômico humano (25mm a 40mm).`,
			);
		}
	}
	if (
		rx.odDnp !== null &&
		rx.odDnp !== undefined &&
		rx.oeDnp !== null &&
		rx.oeDnp !== undefined
	) {
		const diffDnp = Math.abs(rx.odDnp - rx.oeDnp);
		if (diffDnp > MAX_DNP_ASYMMETRY) {
			warnings.push(
				`Assimetria pupilar acentuada: diferença de ${diffDnp.toFixed(1)}mm entre OD (${rx.odDnp}mm) e OE (${rx.oeDnp}mm). Recomenda-se aferição em pupilômetro digital.`,
			);
		}
	}

	// 6. Prescription Expiry Check (12 months in Brazil)
	if (rx.issuedAt) {
		const issued = new Date(rx.issuedAt);
		if (!isNaN(issued.getTime())) {
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			if (issued < oneYearAgo) {
				warnings.push(
					`Receita emitida em ${issued.toLocaleDateString("pt-BR")} (mais de 1 ano). Recomendada reavaliação oftalmológica antes da confecção.`,
				);
			}
		}
	}

	// 7. Calculate Transpositions & Spherical Equivalents
	const transposedOD = transposeCylinder(
		rx.odSphere,
		odCyl,
		rx.odAxis ?? null,
	);
	const transposedOE = transposeCylinder(
		rx.oeSphere,
		oeCyl,
		rx.oeAxis ?? null,
	);

	if (odCyl > 0 || oeCyl > 0) {
		warnings.push(
			"Prescrição em cilindro positivo detectada. Transposição para cilindro negativo calculada automaticamente para compatibilidade com o padrão de laboratório.",
		);
	}

	const eeOD = calculateSphericalEquivalent(rx.odSphere, odCyl);
	const eeOE = calculateSphericalEquivalent(rx.oeSphere, oeCyl);

	// 8. Evidence Ledger & Confidence Scoring
	const ocrScore = rx.ocrConfidenceScore ?? (rx.doctorId ? 0.9 : 0.75);

	if (inconsistencies.length > 0) {
		evidenceLedger.push({
			kind: "contradiction",
			detail: `Inconsistências matemáticas detectadas: ${inconsistencies.join("; ")}`,
			weight: 0,
		});
	}

	if (ocrScore >= 0.85) {
		evidenceLedger.push({
			kind: "optical.ocr-high-confidence",
			detail: `OCR de alta nitidez com score ${(ocrScore * 100).toFixed(0)}% e dados legíveis.`,
			weight: 0.85,
		});
	} else if (ocrScore >= 0.7) {
		evidenceLedger.push({
			kind: "optical.ocr-moderate-confidence",
			detail: `OCR com nitidez intermediária (${(ocrScore * 100).toFixed(0)}%). Necessita validação por óptico.`,
			weight: 0.6,
		});
	} else {
		evidenceLedger.push({
			kind: "optical.ocr-low-confidence",
			detail: `OCR com baixa confiabilidade (${(ocrScore * 100).toFixed(0)}%). Imagem borrada ou manuscrito ilegível.`,
			weight: 0.3,
		});
	}

	if (rx.doctorId) {
		evidenceLedger.push({
			kind: "optical.doctor-crm-linked",
			detail: "Receita vinculada a profissional oftalmologista/optometrista credenciado.",
			weight: 0.8,
		});
	}

	if (rx.odDnp && rx.oeDnp) {
		evidenceLedger.push({
			kind: "optical.dnp-measured",
			detail: `Medidas de DNP presentes (OD: ${rx.odDnp}mm, OE: ${rx.oeDnp}mm).`,
			weight: 0.7,
		});
	}

	// Determine Band and Score
	let finalScore = ocrScore;
	if (inconsistencies.length > 0) {
		finalScore = Math.min(finalScore, 0.45);
	} else if (warnings.length > 0) {
		finalScore = Math.min(finalScore, 0.78);
	}

	let band: FactBand;
	if (inconsistencies.length === 0 && finalScore >= 0.85) {
		band = FactBand.VERIFIED;
	} else if (inconsistencies.length === 0 && finalScore >= 0.55) {
		band = FactBand.PROBABLE;
	} else {
		band = FactBand.POSSIBLE;
	}

	// Format Optical Summary String
	const formatEye = (
		name: string,
		sph: number,
		cyl: number,
		axis: number | null,
		dnp?: number | null,
	) => {
		const s = (sph >= 0 ? "+" : "") + sph.toFixed(2);
		const c = cyl !== 0 ? ` Cil ${(cyl >= 0 ? "+" : "") + cyl.toFixed(2)}` : "";
		const a = cyl !== 0 && axis ? ` Eixo ${axis}°` : "";
		const d = dnp ? ` DNP ${dnp.toFixed(1)}mm` : "";
		return `${name}: Esf ${s}${c}${a}${d}`;
	};

	const odSummary = formatEye(
		"OD",
		rx.odSphere,
		odCyl,
		rx.odAxis ?? null,
		rx.odDnp,
	);
	const oeSummary = formatEye(
		"OE",
		rx.oeSphere,
		oeCyl,
		rx.oeAxis ?? null,
		rx.oeDnp,
	);
	const addSummary =
		hasOdAdd || hasOeAdd
			? ` | Adição: +${(rx.odAddition ?? rx.oeAddition ?? 0).toFixed(2)}D`
			: "";

	const formattedSummary = `${odSummary} | ${oeSummary}${addSummary}`;

	let recommendation = "Receita matematicamente consistente e pronta para produção.";
	if (band === FactBand.POSSIBLE) {
		recommendation =
			"ATENÇÃO: A receita possui incoerências ou legibilidade duvidosa. NUNCA envie ao laboratório antes de revisão pelo óptico responsável.";
	} else if (band === FactBand.PROBABLE) {
		recommendation =
			"Receita aprovada com ressalvas. Recomenda-se conferência rápida dos avisos antes de gerar a Ordem de Serviço.";
	}

	return {
		valid: inconsistencies.length === 0,
		score: Math.round(finalScore * 100) / 100,
		band,
		transposedOD,
		transposedOE,
		sphericalEquivalentOD: eeOD,
		sphericalEquivalentOE: eeOE,
		inconsistencies,
		warnings,
		evidenceLedger,
		formattedSummary,
		recommendation,
	};
}

/**
 * Recommends ideal refractive index and lens material based on diopters and frame type.
 */
export function recommendRefractiveIndex(input: {
	maxAbsoluteSphericalEquivalent: number;
	frameType: FrameType;
	highestCylinderAbs: number;
}) {
	const { maxAbsoluteSphericalEquivalent, frameType, highestCylinderAbs } =
		input;

	// Mechanical constraints by frame type
	if (frameType === "RIMLESS_THREE_PIECE") {
		if (maxAbsoluteSphericalEquivalent > 5.5) {
			return {
				recommendedIndex: "1.67",
				material: "HIGH_INDEX_167",
				materialName: "Resina de Alto Índice 1.67 (MR-7 / MR-8)",
				abbeValue: 32,
				density: 1.35,
				thicknessBenefit: "Até 35% mais fina e resistente a furos de fixação.",
				frameConstraintWarning:
					"Armação de 3 peças (balgriff/parafusada). Lentes 1.50 CR-39 são terminantemente PROIBIDAS por risco iminente de trinca nos furos.",
			};
		}
		return {
			recommendedIndex: "1.59",
			material: "POLY_159",
			materialName: "Policarbonato 1.59 (ou Trivex 1.53)",
			abbeValue: 30,
			density: 1.2,
			thicknessBenefit: "Alta resistência mecânica a impactos e furação.",
			frameConstraintWarning:
				"Armação parafusada: policarbonato ou Trivex obrigatórios para suportar o torque dos parafusos.",
		};
	}

	if (frameType === "SEMI_RIMLESS_NYLON") {
		if (maxAbsoluteSphericalEquivalent > 4.0) {
			return {
				recommendedIndex: "1.67",
				material: "HIGH_INDEX_167",
				materialName: "Resina 1.67 (MR-7)",
				abbeValue: 32,
				density: 1.35,
				thicknessBenefit: "Borda delgada com alta tenacidade no fio de nylon.",
				frameConstraintWarning:
					"Armação de fio de nylon: requer material resistente a lascamento na canaleta.",
			};
		}
		return {
			recommendedIndex: "1.59",
			material: "POLY_159",
			materialName: "Policarbonato 1.59 (ou Resina 1.60 MR-8)",
			abbeValue: 30,
			density: 1.2,
			thicknessBenefit: "Excelente resistência contra lascamento na ranhura.",
			frameConstraintWarning:
				"Fio de nylon: resina 1.50 comum sofre fácil desbotamento e quebra de borda.",
		};
	}

	// Closed Frame (Aro Fechado Acetato/Metal)
	if (maxAbsoluteSphericalEquivalent <= 2.0 && highestCylinderAbs <= 1.5) {
		return {
			recommendedIndex: "1.50",
			material: "CR39_150",
			materialName: "Orgânica CR-39 (1.50)",
			abbeValue: 58,
			density: 1.32,
			thicknessBenefit:
				"Excelente custo-benefício e máxima pureza cromática (Abbe 58).",
			frameConstraintWarning: undefined,
		};
	}

	if (maxAbsoluteSphericalEquivalent <= 4.0) {
		return {
			recommendedIndex: "1.59",
			material: "POLY_159",
			materialName: "Policarbonato 1.59 (ou Resina 1.60)",
			abbeValue: 30,
			density: 1.2,
			thicknessBenefit:
				"20% mais fina e 30% mais leve que a lente convencional 1.50.",
			frameConstraintWarning: undefined,
		};
	}

	if (maxAbsoluteSphericalEquivalent <= 6.0) {
		return {
			recommendedIndex: "1.67",
			material: "HIGH_INDEX_167",
			materialName: "Alto Índice 1.67",
			abbeValue: 32,
			density: 1.35,
			thicknessBenefit:
				"Até 35% mais fina que CR-39. Reduz drasticamente a borda em míopes e o efeito olho de boi.",
			frameConstraintWarning: undefined,
		};
	}

	return {
		recommendedIndex: "1.74",
		material: "ULTRA_HIGH_INDEX_174",
		materialName: "Ultra Alto Índice 1.74",
		abbeValue: 33,
		density: 1.47,
		thicknessBenefit:
			"Até 50% mais fina que 1.50. Perfeita para dioptrias altas, garantindo leveza e estética plana.",
		frameConstraintWarning: undefined,
	};
}

/**
 * Standard Industry Catalog Presets for Hoya, Zeiss, Essilor, Personality
 */
export const OPTICAL_CATALOG_BENCHMARKS = [
	// Hoya
	{
		brand: "Hoya",
		family: "Hilux",
		name: "Hoya Hilux 1.50 LongLife",
		tier: "BASIC",
		design: "Monofocal Esférica",
		lensType: "SINGLE_VISION",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -6.0,
		maxSphere: 4.0,
		maxCylinder: 2.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 380.0,
		labBaseCost: 75.0,
	},
	{
		brand: "Hoya",
		family: "Nulux",
		name: "Hoya Nulux 1.60 BlueControl",
		tier: "ADVANCED",
		design: "Monofocal Asférica",
		lensType: "SINGLE_VISION",
		material: "MID_INDEX_160",
		refractiveIndex: 1.6,
		minSphere: -8.0,
		maxSphere: 6.0,
		maxCylinder: 3.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 790.0,
		labBaseCost: 140.0,
	},
	{
		brand: "Hoya",
		family: "Nulux",
		name: "Hoya Nulux Identity 1.67 Meiryo",
		tier: "PREMIUM",
		design: "Monofocal Asférica Freeform",
		lensType: "SINGLE_VISION",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -12.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 1450.0,
		labBaseCost: 260.0,
	},
	{
		brand: "Hoya",
		family: "Hoyalux",
		name: "Hoya Hoyalux Daynamic 1.50 LongLife",
		tier: "ADVANCED",
		design: "Multifocal Digital",
		lensType: "PROGRESSIVE",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -5.0,
		maxSphere: 5.0,
		maxCylinder: 3.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 1250.0,
		labBaseCost: 240.0,
	},
	{
		brand: "Hoya",
		family: "Hoyalux",
		name: "Hoya Hoyalux iD LifeStyle 3 1.67 Meiryo",
		tier: "SUPER_PREMIUM",
		design: "Multifocal Freeform Dupla Face",
		lensType: "PROGRESSIVE",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -10.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 2890.0,
		labBaseCost: 490.0,
	},

	// Zeiss
	{
		brand: "Zeiss",
		family: "ClearView",
		name: "Zeiss ClearView 1.50 DuraVision Platinum",
		tier: "ADVANCED",
		design: "Monofocal FreeForm de Bloco",
		lensType: "SINGLE_VISION",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -5.0,
		maxSphere: 4.0,
		maxCylinder: 2.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 590.0,
		labBaseCost: 110.0,
	},
	{
		brand: "Zeiss",
		family: "ClearView",
		name: "Zeiss ClearView 1.67 BlueGuard",
		tier: "PREMIUM",
		design: "Monofocal FreeForm Super Fina",
		lensType: "SINGLE_VISION",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -10.0,
		maxSphere: 6.0,
		maxCylinder: 3.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 1390.0,
		labBaseCost: 250.0,
	},
	{
		brand: "Zeiss",
		family: "ClearView",
		name: "Zeiss ClearView 1.74 DuraVision Platinum",
		tier: "EXCLUSIVO",
		design: "Monofocal Ultra Alto Índice",
		lensType: "SINGLE_VISION",
		material: "ULTRA_HIGH_INDEX_174",
		refractiveIndex: 1.74,
		minSphere: -16.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 2490.0,
		labBaseCost: 480.0,
	},
	{
		brand: "Zeiss",
		family: "Light",
		name: "Zeiss Light 3D 1.50 DuraVision Chrome",
		tier: "ADVANCED",
		design: "Multifocal Digital Personalizado",
		lensType: "PROGRESSIVE",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -6.0,
		maxSphere: 5.0,
		maxCylinder: 3.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 1450.0,
		labBaseCost: 280.0,
	},
	{
		brand: "Zeiss",
		family: "SmartLife",
		name: "Zeiss Progressive SmartLife Plus 1.67",
		tier: "SUPER_PREMIUM",
		design: "Multifocal Dinâmico Conectado",
		lensType: "PROGRESSIVE",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -12.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 3200.0,
		labBaseCost: 550.0,
	},

	// Essilor
	{
		brand: "Essilor",
		family: "Eyezen",
		name: "Essilor Eyezen Start 1.59 Airwear Crizal Rock",
		tier: "ADVANCED",
		design: "Monofocal Antifadiga Digital",
		lensType: "SINGLE_VISION",
		material: "POLY_159",
		refractiveIndex: 1.59,
		minSphere: -6.0,
		maxSphere: 5.0,
		maxCylinder: 3.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 850.0,
		labBaseCost: 155.0,
	},
	{
		brand: "Essilor",
		family: "Eyezen",
		name: "Essilor Eyezen Boost 1.67 Crizal Sapphire HR",
		tier: "PREMIUM",
		design: "Monofocal Otimizada Alto Índice",
		lensType: "SINGLE_VISION",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -12.0,
		maxSphere: 7.0,
		maxCylinder: 4.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 1620.0,
		labBaseCost: 290.0,
	},
	{
		brand: "Essilor",
		family: "Varilux",
		name: "Essilor Varilux Comfort Max 1.50 Crizal Easy Pro",
		tier: "PREMIUM",
		design: "Multifocal Ergonômico Postural",
		lensType: "PROGRESSIVE",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -7.0,
		maxSphere: 5.0,
		maxCylinder: 3.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 1890.0,
		labBaseCost: 350.0,
	},
	{
		brand: "Essilor",
		family: "Varilux",
		name: "Essilor Varilux Physio 3.0 1.67 Crizal Rock",
		tier: "SUPER_PREMIUM",
		design: "Multifocal Wavefront Avançado",
		lensType: "PROGRESSIVE",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -12.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 2980.0,
		labBaseCost: 510.0,
	},

	// Personality (Private Label / High Value Optical Lab)
	{
		brand: "Personality",
		family: "HD Vision",
		name: "Personality Freeform HD 1.50 Anti-Reflexo Trio",
		tier: "BASIC",
		design: "Monofocal Digital Padrão",
		lensType: "SINGLE_VISION",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -5.0,
		maxSphere: 4.0,
		maxCylinder: 2.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 290.0,
		labBaseCost: 45.0,
	},
	{
		brand: "Personality",
		family: "HD Vision",
		name: "Personality Polytech 1.59 Antirrisco e AR",
		tier: "BASIC",
		design: "Monofocal Resistente Policarbonato",
		lensType: "SINGLE_VISION",
		material: "POLY_159",
		refractiveIndex: 1.59,
		minSphere: -6.0,
		maxSphere: 4.0,
		maxCylinder: 2.5,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 420.0,
		labBaseCost: 65.0,
	},
	{
		brand: "Personality",
		family: "Advance Pro",
		name: "Personality Advance Pro 1.67 Freeform AR Green",
		tier: "ADVANCED",
		design: "Monofocal Asférica Alto Índice",
		lensType: "SINGLE_VISION",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -10.0,
		maxSphere: 6.0,
		maxCylinder: 3.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 890.0,
		labBaseCost: 160.0,
	},
	{
		brand: "Personality",
		family: "Ultra Thin",
		name: "Personality Ultra Thin 1.74 Super Hydrophobic",
		tier: "PREMIUM",
		design: "Monofocal Ultra Fina 1.74",
		lensType: "SINGLE_VISION",
		material: "ULTRA_HIGH_INDEX_174",
		refractiveIndex: 1.74,
		minSphere: -16.0,
		maxSphere: 8.0,
		maxCylinder: 4.0,
		minAddition: null,
		maxAddition: null,
		suggestedRetailPrice: 1590.0,
		labBaseCost: 295.0,
	},
	{
		brand: "Personality",
		family: "Master Progressive",
		name: "Personality Master Digital Freeform 1.50",
		tier: "BASIC",
		design: "Multifocal Campo Amplo Digital",
		lensType: "PROGRESSIVE",
		material: "CR39_150",
		refractiveIndex: 1.5,
		minSphere: -6.0,
		maxSphere: 5.0,
		maxCylinder: 3.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 790.0,
		labBaseCost: 130.0,
	},
	{
		brand: "Personality",
		family: "Master Progressive",
		name: "Personality Master 1.67 Freeform Alta Definição",
		tier: "PREMIUM",
		design: "Multifocal Corredor Suave Alto Índice",
		lensType: "PROGRESSIVE",
		material: "HIGH_INDEX_167",
		refractiveIndex: 1.67,
		minSphere: -10.0,
		maxSphere: 6.0,
		maxCylinder: 4.0,
		minAddition: 0.75,
		maxAddition: 3.5,
		suggestedRetailPrice: 1780.0,
		labBaseCost: 280.0,
	},
];
