/**
 * MNOC-X Fiscal & Accounting Service
 * 
 * Responsável pela emissão, cálculo de tributos e escrituração contábil
 * de documentos fiscais eletrônicos (NFC-e mod. 65 e NF-e mod. 55) no
 * varejo óptico em conformidade com as regras da SEFAZ e a Lei 12.741/2012
 * (De Olho no Imposto).
 */

import type { OpticalOrder } from "./optical-types";

// ----------------------------------------------------------------------
// TIPOS E INTERFACES FISCAIS
// ----------------------------------------------------------------------

export type FiscalStatus =
	| "PENDENTE"
	| "EMITIDA_NFCE"
	| "EMITIDA_NFE"
	| "CANCELADA"
	| "CONTINGENCIA";

export type FiscalCFOP = "5.102" | "5.405" | "5.933";

export type FiscalModel = "65" | "55";

export interface FiscalInfo {
	status: FiscalStatus;
	cfop: FiscalCFOP;
	accessKey: string; // 44 dígitos numéricos no padrão SEFAZ
	invoiceNumber: string;
	series: string; // "1" para NFC-e, "1" para NF-e
	model?: FiscalModel;
	issuedAt: string; // ISO 8601
	icmsBase: number;
	icmsValue: number; // alíquota média 18% ou 0% para ST
	pisValue: number; // 1.65%
	cofinsValue: number; // 7.60%
	totalTax: number;
	recipientCpfCnpj?: string;
	notes?: string;
}

export interface FiscalTaxes {
	icmsBase: number;
	icmsValue: number;
	pisValue: number;
	cofinsValue: number;
	totalTax: number;
	approximateTaxRatePercent: number; // Lei 12.741/2012
}

export interface EmittedFiscalResult extends FiscalInfo {
	order: OpticalOrder;
	orderId: string;
	orderNumber: string;
	invoiceIssued: boolean;
	fiscalInfo: FiscalInfo;
}

export interface ExportBatchOptions {
	format?: "csv" | "xml";
	delimiter?: string; // padrão "," ou ";"
	month?: number; // 1 a 12
	year?: number; // ex: 2026
	includePending?: boolean;
}

export interface FiscalProductItem {
	itemIndex: number;
	cProd: string; // Código Mandatório do Produto ("CPF do Produto")
	cEAN: string; // Código de barras EAN ou "SEM GTIN"
	xProd: string; // Descrição dos produtos / serviços
	ncm: string; // NCM Fiscal
	cfop: FiscalCFOP;
	uCom: string; // UN, PAR
	qCom: number; // Quantidade
	vUnCom: number; // Valor Unitário
	vProd: number; // Valor Total do Item
	category: "ARMACAO" | "LENTE" | "TRATAMENTO" | "SERVICO";
}

// ----------------------------------------------------------------------
// TABELA IBGE DE CÓDIGOS DE UF (SEFAZ)
// ----------------------------------------------------------------------
export const IBGE_UF_CODES: Record<string, string> = {
	RO: "11",
	AC: "12",
	AM: "13",
	RR: "14",
	PA: "15",
	AP: "16",
	TO: "17",
	MA: "21",
	PI: "22",
	CE: "23",
	RN: "24",
	PB: "25",
	PE: "26",
	AL: "27",
	SE: "28",
	BA: "29",
	MG: "31",
	ES: "32",
	RJ: "33",
	SP: "35",
	PR: "41",
	SC: "42",
	RS: "43",
	MS: "50",
	MT: "51",
	GO: "52",
	DF: "53",
};

export const DEFAULT_OPTICAL_CNPJ = "12.345.678/0001-99";
export const DEFAULT_OPTICAL_UF = "SP";

// Utilitário de arredondamento financeiro / fiscal
export function roundCurrency(val: number): number {
	return Math.round((val + Number.EPSILON) * 100) / 100;
}

// ----------------------------------------------------------------------
// 1. CÁLCULO DE TRIBUTOS (LEI 12.741/2012 - DE OLHO NO IMPOSTO)
// ----------------------------------------------------------------------
/**
 * Calcula impostos discriminados no padrão De Olho no Imposto (Lei 12.741/2012).
 * 
 * - CFOP 5.102: Venda de mercadoria adquirida/recebida de terceiros.
 *   ICMS normal (18% alíquota média padrão varejo), PIS (1.65%), COFINS (7.60%).
 * - CFOP 5.405: Venda de mercadoria com Substituição Tributária (ST).
 *   ICMS ST retido na origem -> Alíquota 0% e Base 0 na saída, PIS (1.65%), COFINS (7.60%).
 * - CFOP 5.933: Prestação de serviço sujeita ao ISSQN (montagem/laboratório óptico).
 *   Não incide ICMS (Alíquota 0% e Base 0), PIS (1.65%), COFINS (7.60%).
 */
export function calculateFiscalTaxes(
	totalAmount: number,
	cfop: "5.102" | "5.405" | "5.933",
): FiscalTaxes {
	const amount = Math.max(0, Number(totalAmount) || 0);

	// Impostos Federais
	const pisValue = roundCurrency(amount * 0.0165);
	const cofinsValue = roundCurrency(amount * 0.076);

	// Imposto Estadual (ICMS)
	let icmsBase = 0;
	let icmsValue = 0;

	if (cfop === "5.102") {
		icmsBase = roundCurrency(amount);
		icmsValue = roundCurrency(amount * 0.18);
	} else if (cfop === "5.405" || cfop === "5.933") {
		icmsBase = 0;
		icmsValue = 0;
	}

	const totalTax = roundCurrency(icmsValue + pisValue + cofinsValue);
	const approximateTaxRatePercent =
		amount > 0 ? roundCurrency((totalTax / amount) * 100) : 0;

	return {
		icmsBase,
		icmsValue,
		pisValue,
		cofinsValue,
		totalTax,
		approximateTaxRatePercent,
	};
}

// ----------------------------------------------------------------------
// 2. GERAÇÃO DE CHAVE DE ACESSO SEFAZ (44 DÍGITOS COM MÓDULO 11)
// ----------------------------------------------------------------------
/**
 * Calcula o dígito verificador módulo 11 segundo o Manual de Orientação do Contribuinte (SEFAZ).
 * Pesos de 2 a 9 da direita para a esquerda.
 * Se resto 0 ou 1 -> DV = 0; caso contrário DV = 11 - resto.
 */
export function calculateSefazCheckDigit(base43: string): number {
	if (base43.length !== 43) {
		throw new Error(
			`Chave base da SEFAZ deve conter exatamente 43 dígitos. Recebido: ${base43.length}`,
		);
	}

	const weights = [2, 3, 4, 5, 6, 7, 8, 9];
	let sum = 0;
	let weightIdx = 0;

	for (let i = base43.length - 1; i >= 0; i--) {
		const digit = Number.parseInt(base43.charAt(i), 10);
		if (Number.isNaN(digit)) {
			throw new Error(`Caractere inválido na chave base: ${base43.charAt(i)}`);
		}
		const weight = weights[weightIdx % weights.length] ?? 2;
		sum += digit * weight;
		weightIdx++;
	}

	const remainder = sum % 11;
	return remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
}

/**
 * Valida se uma chave de acesso de 44 dígitos possui formato numérico e DV válido segundo Módulo 11.
 */
export function validateSefazAccessKey(accessKey: string): boolean {
	if (!/^\d{44}$/.test(accessKey)) return false;
	const base43 = accessKey.slice(0, 43);
	const expectedDv = calculateSefazCheckDigit(base43);
	return Number.parseInt(accessKey.charAt(43), 10) === expectedDv;
}

/**
 * Gera a chave de acesso de 44 dígitos com dígito verificador módulo 11 no padrão SEFAZ.
 * 
 * Estrutura:
 * - cUF (2 dígitos): Código da UF
 * - AAMM (4 dígitos): Ano e Mês de emissão
 * - CNPJ (14 dígitos): CNPJ do emitente
 * - mod (2 dígitos): "65" (NFC-e) ou "55" (NF-e)
 * - serie (3 dígitos): Série do documento
 * - nNF (9 dígitos): Número da nota fiscal
 * - tpEmis (1 dígito): "1" (Emissão Normal)
 * - cNF (8 dígitos): Código numérico de segurança
 * - cDV (1 dígito): Dígito Verificador Módulo 11
 */
export function generateSefazAccessKey(
	uf: string,
	date: Date,
	cnpj: string,
	mod: "65" | "55",
	series: number,
	nNF: number,
	cNF?: number | string,
): string {
	// 1. cUF (2 dígitos)
	const rawUf = (uf || DEFAULT_OPTICAL_UF).trim().toUpperCase();
	const cUF = IBGE_UF_CODES[rawUf] || (/^\d{2}$/.test(rawUf) ? rawUf : "35");

	// 2. AAMM (4 dígitos)
	const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
	const year = validDate.getFullYear().toString().slice(-2);
	const month = (validDate.getMonth() + 1).toString().padStart(2, "0");
	const aamm = `${year}${month}`;

	// 3. CNPJ (14 dígitos limpos)
	const digitsOnlyCnpj = cnpj.replace(/\D/g, "");
	const cleanCnpj = digitsOnlyCnpj.padStart(14, "0").slice(-14);

	// 4. mod (2 dígitos)
	const cleanMod = mod === "55" ? "55" : "65";

	// 5. serie (3 dígitos)
	const cleanSeries = Math.abs(Math.floor(series || 1))
		.toString()
		.padStart(3, "0")
		.slice(-3);

	// 6. nNF (9 dígitos)
	const cleanNNF = Math.abs(Math.floor(nNF || 1))
		.toString()
		.padStart(9, "0")
		.slice(-9);

	// 7. tpEmis (1 dígito: 1 = Normal)
	const tpEmis = "1";

	// 8. cNF (8 dígitos)
	let cleanCNF: string;
	if (cNF !== undefined) {
		cleanCNF = String(cNF).replace(/\D/g, "").padStart(8, "0").slice(-8);
	} else {
		// Código numérico determinístico baseado no número da nota e timestamp para reprodutibilidade
		const seed = Math.abs((Number(cleanNNF) * 41 + 1234567) % 100000000);
		cleanCNF = seed.toString().padStart(8, "0");
	}

	const base43 = `${cUF}${aamm}${cleanCnpj}${cleanMod}${cleanSeries}${cleanNNF}${tpEmis}${cleanCNF}`;
	const cDV = calculateSefazCheckDigit(base43);

	return `${base43}${cDV}`;
}

// ----------------------------------------------------------------------
// HELPER PARA RESOLVER NÚMERO DA NOTA FISCAL A PARTIR DA OS
// ----------------------------------------------------------------------
export function extractInvoiceNumberFromOrder(order: OpticalOrder): number {
	if (order.invoiceNumber) {
		const parsed = Number.parseInt(order.invoiceNumber.replace(/\D/g, ""), 10);
		if (!Number.isNaN(parsed) && parsed > 0) return parsed;
	}

	const matches = order.orderNumber?.match(/\d+/g);
	if (matches && matches.length > 0) {
		const lastMatch = matches[matches.length - 1];
		if (lastMatch) {
			const candidate = Number.parseInt(lastMatch, 10);
			if (!Number.isNaN(candidate) && candidate > 0) return candidate;
		}
	}

	const idMatches = order.id?.match(/\d+/g);
	if (idMatches && idMatches.length > 0) {
		const lastIdMatch = idMatches[idMatches.length - 1];
		if (lastIdMatch) {
			const candidate = Number.parseInt(lastIdMatch, 10);
			if (!Number.isNaN(candidate) && candidate > 0) return candidate;
		}
	}

	return 1001;
}

// ----------------------------------------------------------------------
// 3. EMISSÃO DE NFC-e (MODELO 65 - CONSUMIDOR FINAL)
// ----------------------------------------------------------------------
/**
 * Emite NFC-e (modelo 65) para consumidor final no balcão da ótica.
 */
export function emitNfceForOrder(
	order: OpticalOrder,
	options?: {
		cfop?: FiscalCFOP;
		series?: number;
		cnpj?: string;
		uf?: string;
	},
): EmittedFiscalResult {
	const totalAmount = order.financials?.totalAmount ?? 0;
	const cfop = options?.cfop || "5.102";
	const taxes = calculateFiscalTaxes(totalAmount, cfop);

	const nNF = extractInvoiceNumberFromOrder(order);
	const invoiceNumberStr = nNF.toString().padStart(9, "0");
	const seriesNum = options?.series ?? 1;
	const seriesStr = seriesNum.toString();

	const uf = options?.uf || order.patient?.state || DEFAULT_OPTICAL_UF;
	const cnpj = options?.cnpj || DEFAULT_OPTICAL_CNPJ;
	const date = order.orderDate ? new Date(order.orderDate) : new Date();

	const accessKey = generateSefazAccessKey(uf, date, cnpj, "65", seriesNum, nNF);

	const fiscalInfo: FiscalInfo = {
		status: "EMITIDA_NFCE",
		cfop,
		accessKey,
		invoiceNumber: invoiceNumberStr,
		series: seriesStr,
		model: "65",
		issuedAt: new Date().toISOString(),
		icmsBase: taxes.icmsBase,
		icmsValue: taxes.icmsValue,
		pisValue: taxes.pisValue,
		cofinsValue: taxes.cofinsValue,
		totalTax: taxes.totalTax,
		recipientCpfCnpj: order.patient?.cpf,
		notes: "NFC-e emitida para consumidor final - Varejo Óptico MNOC-X",
	};

	// Atualiza os campos fiscais na própria ordem
	order.invoiceIssued = true;
	order.invoiceNumber = invoiceNumberStr;
	(order as any).fiscalInfo = fiscalInfo;

	return {
		...fiscalInfo,
		order,
		orderId: order.id,
		orderNumber: order.orderNumber,
		invoiceIssued: true,
		fiscalInfo,
	};
}

// ----------------------------------------------------------------------
// 4. EMISSÃO DE NF-e (MODELO 55 - CONVÊNIO / REEMBOLSO)
// ----------------------------------------------------------------------
/**
 * Emite NF-e (modelo 55) para convênio / reembolso de despesas médicas e ópticas.
 */
export function emitNfeForOrder(
	order: OpticalOrder,
	options?: {
		cfop?: FiscalCFOP;
		series?: number;
		cnpj?: string;
		uf?: string;
		convenioName?: string;
	},
): EmittedFiscalResult {
	const totalAmount = order.financials?.totalAmount ?? 0;
	const cfop = options?.cfop || "5.102";
	const taxes = calculateFiscalTaxes(totalAmount, cfop);

	const nNF = extractInvoiceNumberFromOrder(order);
	const invoiceNumberStr = nNF.toString().padStart(9, "0");
	const seriesNum = options?.series ?? 1;
	const seriesStr = seriesNum.toString();

	const uf = options?.uf || order.patient?.state || DEFAULT_OPTICAL_UF;
	const cnpj = options?.cnpj || DEFAULT_OPTICAL_CNPJ;
	const date = order.orderDate ? new Date(order.orderDate) : new Date();

	const accessKey = generateSefazAccessKey(uf, date, cnpj, "55", seriesNum, nNF);

	const notes = options?.convenioName
		? `NF-e emitida para fins de convênio/reembolso: ${options.convenioName}`
		: "NF-e emitida para fins de convênio / reembolso de despesas ópticas";

	const fiscalInfo: FiscalInfo = {
		status: "EMITIDA_NFE",
		cfop,
		accessKey,
		invoiceNumber: invoiceNumberStr,
		series: seriesStr,
		model: "55",
		issuedAt: new Date().toISOString(),
		icmsBase: taxes.icmsBase,
		icmsValue: taxes.icmsValue,
		pisValue: taxes.pisValue,
		cofinsValue: taxes.cofinsValue,
		totalTax: taxes.totalTax,
		recipientCpfCnpj: order.patient?.cpf,
		notes,
	};

	// Atualiza a ordem
	order.invoiceIssued = true;
	order.invoiceNumber = invoiceNumberStr;
	(order as any).fiscalInfo = fiscalInfo;

	return {
		...fiscalInfo,
		order,
		orderId: order.id,
		orderNumber: order.orderNumber,
		invoiceIssued: true,
		fiscalInfo,
	};
}

// ----------------------------------------------------------------------
// 5. EXPORTAÇÃO CONTÁBIL MENSAL (CSV / XML)
// ----------------------------------------------------------------------
export interface AccountingBatchRecord {
	data: string;
	os: string;
	numeroNF: string;
	serie: string;
	modelo: string;
	chaveAcesso: string;
	valorTotal: string;
	baseIcms: string;
	icms: string;
	pis: string;
	cofins: string;
	cfop: string;
	status: string;
}

/**
 * Converte uma OpticalOrder emitida em registro fiscal contábil padronizado.
 */
function toAccountingRecord(order: OpticalOrder): AccountingBatchRecord {
	const anyOrder = order as any;
	const fiscal: FiscalInfo | undefined = anyOrder.fiscalInfo;

	const nNF = fiscal?.invoiceNumber || order.invoiceNumber || extractInvoiceNumberFromOrder(order).toString().padStart(9, "0");
	const serie = fiscal?.series || "1";
	const modelo = fiscal?.model || (fiscal?.status === "EMITIDA_NFE" ? "55" : "65");
	const status = fiscal?.status || (order.invoiceIssued ? "EMITIDA_NFCE" : "PENDENTE");
	const cfop = fiscal?.cfop || "5.102";

	const totalAmount = Number(order.financials?.totalAmount ?? 0);
	const taxes = fiscal
		? {
				icmsBase: fiscal.icmsBase,
				icmsValue: fiscal.icmsValue,
				pisValue: fiscal.pisValue,
				cofinsValue: fiscal.cofinsValue,
		  }
		: calculateFiscalTaxes(totalAmount, cfop as FiscalCFOP);

	const uf = order.patient?.state || DEFAULT_OPTICAL_UF;
	const date = order.orderDate ? new Date(order.orderDate) : new Date();
	const chaveAcesso =
		fiscal?.accessKey ||
		generateSefazAccessKey(uf, date, DEFAULT_OPTICAL_CNPJ, modelo as "65" | "55", Number(serie) || 1, Number(nNF) || 1);

	const dataRaw = fiscal?.issuedAt || order.orderDate || new Date().toISOString();
	const dataStr = dataRaw.slice(0, 10);

	return {
		data: dataStr,
		os: order.orderNumber || order.id,
		numeroNF: nNF,
		serie,
		modelo,
		chaveAcesso,
		valorTotal: totalAmount.toFixed(2),
		baseIcms: taxes.icmsBase.toFixed(2),
		icms: taxes.icmsValue.toFixed(2),
		pis: taxes.pisValue.toFixed(2),
		cofins: taxes.cofinsValue.toFixed(2),
		cfop,
		status,
	};
}

/**
 * Filtra ordens pelo mês/ano solicitado e status de emissão.
 */
function filterOrdersForBatch(
	orders: OpticalOrder[],
	options?: ExportBatchOptions,
): OpticalOrder[] {
	let list = orders;

	// Se houver ordens emitidas na lista, exportamos as emitidas (ou com fiscalInfo / invoiceIssued)
	const hasEmitted = orders.some((o) => (o as any).fiscalInfo || o.invoiceIssued);
	if (hasEmitted && !options?.includePending) {
		list = orders.filter((o) => {
			const status = (o as any).fiscalInfo?.status;
			return (
				status === "EMITIDA_NFCE" ||
				status === "EMITIDA_NFE" ||
				status === "CANCELADA" ||
				status === "CONTINGENCIA" ||
				o.invoiceIssued === true
			);
		});
	}

	if (options?.month !== undefined) {
		list = list.filter((o) => {
			const d = new Date((o as any).fiscalInfo?.issuedAt || o.orderDate || Date.now());
			const matchMonth = d.getMonth() + 1 === options.month;
			const matchYear = options.year ? d.getFullYear() === options.year : true;
			return matchMonth && matchYear;
		});
	}

	return list;
}

/**
 * Exporta lote mensal no formato CSV com colunas:
 * Data, OS, Número NF, Série, Modelo, Chave de Acesso, Valor Total, Base ICMS, ICMS, PIS, COFINS, CFOP, Status
 */
export function exportMonthlyAccountingCsv(
	orders: OpticalOrder[],
	options?: ExportBatchOptions,
): string {
	const delimiter = options?.delimiter || ",";
	const filtered = filterOrdersForBatch(orders, options);

	const headers = [
		"Data",
		"OS",
		"Número NF",
		"Série",
		"Modelo",
		"Chave de Acesso",
		"Valor Total",
		"Base ICMS",
		"ICMS",
		"PIS",
		"COFINS",
		"CFOP",
		"Status",
	];

	const rows = filtered.map((order) => {
		const rec = toAccountingRecord(order);
		return [
			rec.data,
			rec.os,
			rec.numeroNF,
			rec.serie,
			rec.modelo,
			rec.chaveAcesso,
			rec.valorTotal,
			rec.baseIcms,
			rec.icms,
			rec.pis,
			rec.cofins,
			rec.cfop,
			rec.status,
		].join(delimiter);
	});

	return [headers.join(delimiter), ...rows].join("\n");
}

/**
 * Extrai todos os itens de produtos e serviços de uma OS para escrituração e emissão fiscal SEFAZ.
 * Mapeia o código mandatório ("CPF do Produto") de armações, solares, lentes e tratamentos
 * diretamente para a tag obrigatória <cProd> da NF-e / NFC-e.
 */
export function extractFiscalProductItems(
	order: OpticalOrder,
	cfop: FiscalCFOP = "5.102",
): FiscalProductItem[] {
	const items: FiscalProductItem[] = [];
	let index = 1;

	// Aro 1 - Armação
	if (order.aro1 && (Number(order.aro1.framePrice) > 0 || order.aro1.frameCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro1.frameCode || "ARM-10001",
			cEAN: "SEM GTIN",
			xProd: `ARMACAO ${order.aro1.frameBrand || ""} ${order.aro1.frameModel || ""}`.trim(),
			ncm: "9003.11.00",
			cfop,
			uCom: "UN",
			qCom: 1,
			vUnCom: Number(order.aro1.framePrice) || 0,
			vProd: Number(order.aro1.framePrice) || 0,
			category: "ARMACAO",
		});
	}

	// Aro 1 - Lente
	if (order.aro1 && (Number(order.aro1.lensPrice) > 0 || order.aro1.lensCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro1.lensCode || "LEN-10001",
			cEAN: "SEM GTIN",
			xProd: `LENTE ${order.aro1.lensName || "OFTALMICA"} ${order.aro1.lab ? `(${order.aro1.lab})` : ""}`.trim(),
			ncm: "9001.50.00",
			cfop,
			uCom: "PAR",
			qCom: order.aro1.quantity || 1,
			vUnCom: Number(order.aro1.lensPrice) || 0,
			vProd: Number(order.aro1.lensPrice) || 0,
			category: "LENTE",
		});
	}

	// Aro 1 - Tratamento
	if (order.aro1 && !order.aro1.noTreatment && (Number(order.aro1.treatmentPrice) > 0 || order.aro1.treatmentCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro1.treatmentCode || "TRAT-10001",
			cEAN: "SEM GTIN",
			xProd: `TRATAMENTO ${order.aro1.treatment || "ANTIRREFLEXO"}`.trim(),
			ncm: "9001.50.00",
			cfop,
			uCom: "UN",
			qCom: 1,
			vUnCom: Number(order.aro1.treatmentPrice) || 0,
			vProd: Number(order.aro1.treatmentPrice) || 0,
			category: "TRATAMENTO",
		});
	}

	// Aro 2 - Armação
	if (order.hasAro2 && order.aro2 && (Number(order.aro2.framePrice) > 0 || order.aro2.frameCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro2.frameCode || "ARM-10002",
			cEAN: "SEM GTIN",
			xProd: `ARMACAO 2 ${order.aro2.frameBrand || ""} ${order.aro2.frameModel || ""}`.trim(),
			ncm: "9003.11.00",
			cfop,
			uCom: "UN",
			qCom: 1,
			vUnCom: Number(order.aro2.framePrice) || 0,
			vProd: Number(order.aro2.framePrice) || 0,
			category: "ARMACAO",
		});
	}

	// Aro 2 - Lente
	if (order.hasAro2 && order.aro2 && (Number(order.aro2.lensPrice) > 0 || order.aro2.lensCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro2.lensCode || "LEN-10002",
			cEAN: "SEM GTIN",
			xProd: `LENTE 2 ${order.aro2.lensName || "OFTALMICA"} ${order.aro2.lab ? `(${order.aro2.lab})` : ""}`.trim(),
			ncm: "9001.50.00",
			cfop,
			uCom: "PAR",
			qCom: order.aro2.quantity || 1,
			vUnCom: Number(order.aro2.lensPrice) || 0,
			vProd: Number(order.aro2.lensPrice) || 0,
			category: "LENTE",
		});
	}

	// Aro 2 - Tratamento
	if (order.hasAro2 && order.aro2 && !order.aro2.noTreatment && (Number(order.aro2.treatmentPrice) > 0 || order.aro2.treatmentCode)) {
		items.push({
			itemIndex: index++,
			cProd: order.aro2.treatmentCode || "TRAT-10002",
			cEAN: "SEM GTIN",
			xProd: `TRATAMENTO 2 ${order.aro2.treatment || "ANTIRREFLEXO"}`.trim(),
			ncm: "9001.50.00",
			cfop,
			uCom: "UN",
			qCom: 1,
			vUnCom: Number(order.aro2.treatmentPrice) || 0,
			vProd: Number(order.aro2.treatmentPrice) || 0,
			category: "TRATAMENTO",
		});
	}

	// Fallback genérico se nada estiver preenchido
	if (items.length === 0) {
		const total = Number(order.financials?.totalAmount || 0);
		items.push({
			itemIndex: 1,
			cProd: "SRV-10001",
			cEAN: "SEM GTIN",
			xProd: `PRODUTOS E SERVICOS OPTICOS - OS ${order.orderNumber || order.id}`,
			ncm: "9001.50.00",
			cfop,
			uCom: "UN",
			qCom: 1,
			vUnCom: total,
			vProd: total,
			category: "SERVICO",
		});
	}

	return items;
}

/**
 * Gera os blocos <det> XML da NF-e / NFC-e no layout oficial SEFAZ,
 * mapeando o código mandatório do produto para a tag <cProd>.
 */
export function generateSefazDetXml(
	order: OpticalOrder,
	cfop: FiscalCFOP = "5.102",
): string {
	const items = extractFiscalProductItems(order, cfop);
	return items
		.map((it) => {
			return `      <det nItem="${it.itemIndex}">
        <prod>
          <cProd>${it.cProd}</cProd>
          <cEAN>${it.cEAN}</cEAN>
          <xProd>${it.xProd}</xProd>
          <NCM>${it.ncm}</NCM>
          <CFOP>${it.cfop}</CFOP>
          <uCom>${it.uCom}</uCom>
          <qCom>${it.qCom.toFixed(4)}</qCom>
          <vUnCom>${it.vUnCom.toFixed(2)}</vUnCom>
          <vProd>${it.vProd.toFixed(2)}</vProd>
          <cEANTrib>${it.cEAN}</cEANTrib>
          <uTrib>${it.uCom}</uTrib>
          <qTrib>${it.qCom.toFixed(4)}</qTrib>
          <vUnTrib>${it.vUnCom.toFixed(2)}</vUnTrib>
          <indTot>1</indTot>
        </prod>
      </det>`;
		})
		.join("\n");
}

/**
 * Exporta lote mensal no formato XML contábil padrão com blocos de itens SEFAZ.
 */
export function exportMonthlyAccountingXml(
	orders: OpticalOrder[],
	options?: ExportBatchOptions,
): string {
	const filtered = filterOrdersForBatch(orders, options);
	const monthAttr = options?.month ? String(options.month).padStart(2, "0") : "ALL";
	const yearAttr = options?.year ? String(options.year) : "ALL";

	const itemsXml = filtered
		.map((order) => {
			const rec = toAccountingRecord(order);
			const detXml = generateSefazDetXml(order, rec.cfop as FiscalCFOP);
			return `  <notaFiscal>
    <data>${rec.data}</data>
    <os>${rec.os}</os>
    <numeroNF>${rec.numeroNF}</numeroNF>
    <serie>${rec.serie}</serie>
    <modelo>${rec.modelo}</modelo>
    <chaveAcesso>${rec.chaveAcesso}</chaveAcesso>
    <valorTotal>${rec.valorTotal}</valorTotal>
    <baseICMS>${rec.baseIcms}</baseICMS>
    <icms>${rec.icms}</icms>
    <pis>${rec.pis}</pis>
    <cofins>${rec.cofins}</cofins>
    <cfop>${rec.cfop}</cfop>
    <status>${rec.status}</status>
    <itens>
${detXml}
    </itens>
  </notaFiscal>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<loteContabil mes="${monthAttr}" ano="${yearAttr}" totalNotas="${filtered.length}">
${itemsXml}
</loteContabil>`;
}

/**
 * Gera string CSV/XML contábil com todas as notas fiscais emitidas no mês com campos:
 * Data, OS, Número NF, Série, Modelo, Chave de Acesso, Valor Total, Base ICMS, ICMS, PIS, COFINS, CFOP, Status.
 */
export function exportMonthlyAccountingBatch(
	orders: OpticalOrder[],
	options?: ExportBatchOptions,
): string {
	if (options?.format === "xml") {
		return exportMonthlyAccountingXml(orders, options);
	}
	return exportMonthlyAccountingCsv(orders, options);
}
