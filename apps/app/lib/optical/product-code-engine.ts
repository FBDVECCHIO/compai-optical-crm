/**
 * MOTOR DE CÓDIGO ÚNICO MANDATÓRIO DE PRODUTOS ("CPF DO PRODUTO")
 * 
 * Garante que todo e qualquer item (armações, óculos de sol, lentes,
 * tratamentos e serviços) possua um código único, imutável e sem duplicidade,
 * utilizado para lançamentos, busca rápida, leitor de código de barras,
 * controle de estoque, comprovante e emissão fiscal (cProd SEFAZ).
 */

export type ProductCategoryPrefix =
	| "ARM"  // Armações de Receituário
	| "SOL"  // Óculos de Sol (Solares)
	| "LEN"  // Lentes Oftálmicas
	| "TRAT" // Tratamentos (Antirreflexo, Blue, Fotossensível, etc.)
	| "SRV"  // Serviços (Montagem, Surfaçagem, Adaptação, etc.)
	| "GEN"; // Itens Gerais / Acessórios

export interface ProductCodeValidationResult {
	isValid: boolean;
	error?: string;
	normalizedCode: string;
}

/**
 * Normaliza o código do produto: remove espaços, converte para maiúsculo e remove caracteres inválidos.
 */
export function normalizeProductCode(raw: string): string {
	if (!raw) return "";
	return raw
		.trim()
		.toUpperCase()
		.replace(/[\t\r\n]/g, "")
		.replace(/\s+/g, "-");
}

/**
 * Mapeia categorias do sistema para o prefixo padrão de código.
 */
export function resolveCategoryPrefix(categoryOrType?: string): ProductCategoryPrefix {
	if (!categoryOrType) return "ARM";
	const upper = categoryOrType.toUpperCase();
	if (upper.includes("SOLAR") || upper === "SOL") return "SOL";
	if (upper.includes("LENT") || upper === "LEN" || upper.includes("MONO") || upper.includes("MULTI") || upper.includes("BIFOCAL") || upper.includes("OCUPACIONAL")) return "LEN";
	if (upper.includes("RECEIT") || upper.includes("ARMAC") || upper.includes("ARMAÇ") || upper === "ARM" || upper.includes("CLIP")) return "ARM";
	if (upper.includes("TRATAMENTO") || upper.startsWith("TRAT") || upper.includes("ANTIRREFLEXO") || upper.includes("CRIZAL") || upper.includes("FOTO")) return "TRAT";
	if (upper.includes("SERV") || upper.includes("MONT") || upper.includes("SURF") || upper === "SRV") return "SRV";
	return "GEN";
}

/**
 * Valida a unicidade e integridade do código de produto.
 * Funciona como a validação de um CPF: nunca pode haver dois produtos com o mesmo código ativo.
 */
export function validateProductCodeUniqueness(
	rawCode: string,
	existingCodes: Iterable<string> | Set<string> | string[],
	currentItemCode?: string
): ProductCodeValidationResult {
	const normalizedCode = normalizeProductCode(rawCode);

	if (!normalizedCode) {
		return {
			isValid: false,
			error: "O código do produto é mandatório (não pode ser vazio).",
			normalizedCode: "",
		};
	}

	if (normalizedCode.length < 3) {
		return {
			isValid: false,
			error: "O código do produto deve conter no mínimo 3 caracteres.",
			normalizedCode,
		};
	}

	const normalizedCurrent = currentItemCode ? normalizeProductCode(currentItemCode) : undefined;
	const existingSet = new Set(
		Array.from(existingCodes).map((c) => normalizeProductCode(c))
	);

	if (existingSet.has(normalizedCode) && normalizedCode !== normalizedCurrent) {
		return {
			isValid: false,
			error: `Código "${normalizedCode}" já cadastrado no sistema para outro produto. Códigos não podem se repetir.`,
			normalizedCode,
		};
	}

	return {
		isValid: true,
		normalizedCode,
	};
}

/**
 * Gera um código único garantido e sequencial para a categoria indicada,
 * sem conflito com os códigos existentes.
 */
export function generateUniqueProductCode(
	prefix: ProductCategoryPrefix,
	existingCodes: Iterable<string> | Set<string> | string[] = []
): string {
	const existingSet = new Set(
		Array.from(existingCodes).map((c) => normalizeProductCode(c))
	);

	// Encontra o maior número sequencial existente com este prefixo
	const prefixPattern = new RegExp(`^${prefix}-(\\d{5,})$`);
	let maxNum = 10000;

	for (const code of existingSet) {
		const match = code.match(prefixPattern);
		if (match && match[1]) {
			const parsed = parseInt(match[1], 10);
			if (!isNaN(parsed) && parsed > maxNum) {
				maxNum = parsed;
			}
		}
	}

	let nextNum = maxNum + 1;
	let candidate = `${prefix}-${nextNum.toString().padStart(5, "0")}`;

	// Proteção contra colisão caso haja padrões fora do sequencial
	while (existingSet.has(candidate)) {
		nextNum++;
		candidate = `${prefix}-${nextNum.toString().padStart(5, "0")}`;
	}

	return candidate;
}

/**
 * Garante que um item possua código único válido. Se não tiver, gera automaticamente.
 */
export function ensureProductCode<T extends { codigo?: string; id?: string; tipo?: string }>(
	item: T,
	prefix: ProductCategoryPrefix,
	existingCodes: Set<string>
): T & { codigo: string } {
	let code = item.codigo ? normalizeProductCode(item.codigo) : "";

	if (!code || existingCodes.has(code)) {
		code = generateUniqueProductCode(prefix, existingCodes);
	}

	existingCodes.add(code);
	return {
		...item,
		codigo: code,
	};
}

/**
 * Processador em lote (Batch Import):
 * Garante código único para cada linha importada da planilha (CSV/Excel).
 * Se a linha trouxe código e é único, preserva; se veio vazia ou duplicada, gera código exclusivo.
 */
export function batchProcessProductCodes<T extends { codigo?: string; id?: string; tipo?: string }>(
	items: T[],
	defaultPrefix: ProductCategoryPrefix,
	existingGlobalCodes: Iterable<string> = []
): Array<T & { codigo: string }> {
	const allocatedCodes = new Set<string>(
		Array.from(existingGlobalCodes).map((c) => normalizeProductCode(c))
	);

	return items.map((item) => {
		const itemPrefix = item.tipo ? resolveCategoryPrefix(item.tipo) : defaultPrefix;
		let code = item.codigo ? normalizeProductCode(item.codigo) : "";

		if (!code || allocatedCodes.has(code)) {
			code = generateUniqueProductCode(itemPrefix, allocatedCodes);
		}

		allocatedCodes.add(code);

		return {
			...item,
			codigo: code,
		};
	});
}
