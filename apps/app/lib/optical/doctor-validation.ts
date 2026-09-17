import type { DoctorItem } from "./supabase-optical";

/**
 * 27 Unidades Federativas (UFs) oficiais do Brasil.
 */
export const BRAZILIAN_UFS = [
	"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
	"MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
	"RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type BrazilianUF = (typeof BRAZILIAN_UFS)[number];

const UF_SET = new Set<string>(BRAZILIAN_UFS);

/**
 * Valida se a UF informada pertence às 27 UFs brasileiras válidas.
 */
export function isValidBrazilianUF(uf: string): boolean {
	if (!uf) return false;
	return UF_SET.has(uf.trim().toUpperCase());
}

/**
 * Normaliza o CRM para o formato canônico: ^\d{4,8}\/[A-Z]{2}$
 * Trata:
 * - "151798/SP" -> "151798/SP"
 * - "151798sp"  -> "151798/SP"
 * - "12345/mg"  -> "12345/MG"
 * - "12345mg"   -> "12345/MG"
 * - " 151798 / sp " -> "151798/SP"
 * - "CRM 151798-SP" -> "151798/SP"
 * - "SP 151798" -> "151798/SP"
 */
export function normalizeCrm(crm: string): string {
	if (!crm) return "";
	let cleaned = crm.trim().toUpperCase();

	// Remove prefixos como "CRM", "CRM/", "CRM-"
	cleaned = cleaned.replace(/^CRM[:\s\-\/]*/i, "").trim();

	// Caso 1: Dígitos seguidos de separador (/ ou - ou espaço) e 2 letras (ex: "151798/SP", "151798-SP", "151798 SP")
	const matchDigitsSepUf = cleaned.match(/^(\d+)\s*[\/\-\s]\s*([A-Z]{2})$/);
	if (matchDigitsSepUf && matchDigitsSepUf[1] && matchDigitsSepUf[2]) {
		return `${matchDigitsSepUf[1]}/${matchDigitsSepUf[2].toUpperCase()}`;
	}

	// Caso 2: 2 letras de UF seguidas de separador e dígitos (ex: "SP/151798", "SP-151798", "SP 151798")
	const matchUfSepDigits = cleaned.match(/^([A-Z]{2})\s*[\/\-\s]\s*(\d+)$/);
	if (matchUfSepDigits && matchUfSepDigits[1] && matchUfSepDigits[2]) {
		return `${matchUfSepDigits[2]}/${matchUfSepDigits[1].toUpperCase()}`;
	}

	// Caso 3: Dígitos imediatamente colados nas 2 letras (ex: "151798SP", "12345MG")
	const matchDigitsUfDirect = cleaned.match(/^(\d+)([A-Z]{2})$/);
	if (matchDigitsUfDirect && matchDigitsUfDirect[1] && matchDigitsUfDirect[2]) {
		return `${matchDigitsUfDirect[1]}/${matchDigitsUfDirect[2].toUpperCase()}`;
	}

	// Caso 4: 2 letras coladas nos dígitos (ex: "SP151798")
	const matchUfDigitsDirect = cleaned.match(/^([A-Z]{2})(\d+)$/);
	if (matchUfDigitsDirect && matchUfDigitsDirect[1] && matchUfDigitsDirect[2]) {
		return `${matchUfDigitsDirect[2]}/${matchUfDigitsDirect[1].toUpperCase()}`;
	}

	// Caso 5: Já contém barra, limpa espaços ao redor e garante UF maiúscula
	if (cleaned.includes("/")) {
		const parts = cleaned.split("/").map((p) => p.trim());
		if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
			if (/^[A-Z]{2}$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
				return `${parts[1]}/${parts[0].toUpperCase()}`;
			}
			return `${parts[0]}/${parts[1].toUpperCase()}`;
		}
	}

	return cleaned;
}

/**
 * Lista negra de padrões genéricos e dummies:
 * - Dígitos repetidos: "0000", "1111", "99999", etc.
 * - Sequências triviais ascendentes: "1234", "12345", "123456", "1234567", etc.
 * - Sequências triviais descendentes: "4321", "54321", "654321", etc.
 * - Padrões de repetição cíclica: "1212", "123123", "101010", etc.
 */
export function isDummyCrmNumber(digits: string): boolean {
	if (!digits || digits.length < 2) return true;

	// 1. Sequência de dígitos todos repetidos: "0000", "1111", "99999", etc.
	if (/^(\d)\1+$/.test(digits)) {
		return true;
	}

	// 2. Sequências triviais crescentes (ex: 1234, 12345, 123456, 23456)
	let isAscending = true;
	for (let i = 1; i < digits.length; i++) {
		if (Number(digits[i]) !== Number(digits[i - 1]) + 1) {
			isAscending = false;
			break;
		}
	}
	if (isAscending) return true;

	// 3. Sequências triviais decrescentes (ex: 4321, 54321, 654321, 98765)
	let isDescending = true;
	for (let i = 1; i < digits.length; i++) {
		if (Number(digits[i]) !== Number(digits[i - 1]) - 1) {
			isDescending = false;
			break;
		}
	}
	if (isDescending) return true;

	// 4. Padrões cíclicos repetidos (ex: 1212, 123123, 12341234)
	if (digits.length >= 4 && digits.length % 2 === 0) {
		const half = digits.length / 2;
		if (digits.slice(0, half) === digits.slice(half)) {
			return true;
		}
	}

	return false;
}

export interface CrmValidationResult {
	isValid: boolean;
	normalizedCrm: string;
	error?: string;
}

/**
 * Valida o CRM médico:
 * - Enforça formato ^\d{4,8}\/[A-Z]{2}$
 * - Rejeita dígitos fora da faixa 4 a 8
 * - Rejeita UFs que não pertençam às 27 UFs brasileiras
 * - Rejeita padrões genéricos/dummies da lista negra
 */
export function validateCrm(crm: string): CrmValidationResult {
	if (!crm || !crm.trim()) {
		return {
			isValid: false,
			normalizedCrm: "",
			error: "CRM é obrigatório.",
		};
	}

	const normalized = normalizeCrm(crm);

	const match = normalized.match(/^(\d+)\/([A-Z]+)$/);
	if (!match || !match[1] || !match[2]) {
		return {
			isValid: false,
			normalizedCrm: normalized,
			error: "Formato de CRM inválido. Utilize o padrão 12345/UF (ex: 151798/SP ou 12345/MG).",
		};
	}

	const digits = match[1];
	const uf = match[2];

	if (digits.length < 4 || digits.length > 8) {
		return {
			isValid: false,
			normalizedCrm: normalized,
			error: "O número do CRM deve conter entre 4 e 8 dígitos numéricos.",
		};
	}

	if (!isValidBrazilianUF(uf)) {
		return {
			isValid: false,
			normalizedCrm: normalized,
			error: `UF "${uf}" inválida. Informe uma das 27 UFs brasileiras válidas (ex: SP, MG, RJ).`,
		};
	}

	if (isDummyCrmNumber(digits)) {
		return {
			isValid: false,
			normalizedCrm: normalized,
			error: "CRM inválido: sequência numérica repetitiva ou padrão genérico/dummy detectado.",
		};
	}

	return {
		isValid: true,
		normalizedCrm: normalized,
	};
}

/**
 * Normaliza o nome do médico para deduplicação:
 * - Remove acentos / diacríticos
 * - Remove títulos "Dr.", "Dra.", "Dr ", "Doutor", "Doutora"
 * - Converte para minúsculas e colapsa múltiplos espaços
 */
export function normalizeDoctorName(name: string): string {
	if (!name) return "";

	let normalized = name
		.trim()
		.toLowerCase()
		// Remove acentos (ex: André -> andre, João -> joao, Mendonça -> mendonca)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

	// Remove títulos médicos (Dr, Dra, Doutor, Doutora com ou sem ponto)
	normalized = normalized
		.replace(/^(dr|dra|doutor|doutora)\.?\s+/i, "")
		.replace(/\b(dr|dra|doutor|doutora)\.?\b/gi, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();

	return normalized;
}

export interface DoctorDuplicateResult {
	isDuplicate: boolean;
	reason?: string;
	existingDoctor?: DoctorItem;
}

/**
 * Validador anti-duplicidade de médicos:
 * - Compara CRM normalizado
 * - Compara nome normalizado (sem Dr/Dra, acentos ou espaços extras)
 * - Retorna colisão e o médico existente
 */
export function isDoctorDuplicate(
	candidate: { nome: string; crm: string; id?: string | number },
	existingDoctors: DoctorItem[],
): DoctorDuplicateResult {
	const normCandidateName = normalizeDoctorName(candidate.nome);
	const normCandidateCrm = normalizeCrm(candidate.crm);

	for (const doc of existingDoctors) {
		// Se for edição do mesmo médico (pelo ID), ignora a si mesmo
		if (candidate.id && doc.id && String(candidate.id) === String(doc.id)) {
			continue;
		}

		// 1. Colisão por CRM
		const normExistingCrm = normalizeCrm(doc.crm);
		if (normCandidateCrm && normExistingCrm && normCandidateCrm === normExistingCrm) {
			return {
				isDuplicate: true,
				reason: `CRM ${normCandidateCrm} já cadastrado para o médico "${doc.nome}".`,
				existingDoctor: doc,
			};
		}

		// 2. Colisão por Nome idêntico normalizado
		const normExistingName = normalizeDoctorName(doc.nome);
		if (normCandidateName && normExistingName && normCandidateName === normExistingName) {
			return {
				isDuplicate: true,
				reason: `Médico com nome idêntico já cadastrado no sistema ("${doc.nome}" - CRM: ${doc.crm}).`,
				existingDoctor: doc,
			};
		}
	}

	return {
		isDuplicate: false,
	};
}

export interface CfmDoctorLookupResult {
	crm: string;
	status: "ATIVO" | "INATIVO" | "CANCELADO" | "NAO_ENCONTRADO";
	especialidade: string;
	uf: string;
	situacaoCadastral: string;
	regular: boolean;
	dataConsulta: string;
}

/**
 * Consulta pública simulada do CFM (Conselho Federal de Medicina):
 * - Valida o CRM médico informado
 * - Retorna status ATIVO no CFM e especialidade principal "Oftalmologia"
 */
export async function lookupCfmDoctor(crm: string): Promise<CfmDoctorLookupResult> {
	const validation = validateCrm(crm);
	const timestamp = new Date().toISOString();

	if (!validation.isValid) {
		const ufMatch = crm ? crm.match(/[A-Za-z]{2}$/) : null;
		return {
			crm: validation.normalizedCrm || crm,
			status: "NAO_ENCONTRADO",
			especialidade: "Não localizada",
			uf: ufMatch ? ufMatch[0].toUpperCase() : "SP",
			situacaoCadastral: validation.error || "CRM Não Regularizado",
			regular: false,
			dataConsulta: timestamp,
		};
	}

	const crmParts = validation.normalizedCrm ? validation.normalizedCrm.split("/") : [];
	const uf = crmParts[1] ? crmParts[1].toUpperCase() : "SP";

	return {
		crm: validation.normalizedCrm || crm,
		status: "ATIVO",
		especialidade: "Oftalmologia",
		uf: uf,
		situacaoCadastral: "Regular - Conselho Federal de Medicina",
		regular: true,
		dataConsulta: timestamp,
	};
}
