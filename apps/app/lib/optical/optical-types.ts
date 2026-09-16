export type OpticalOrderStatus =
	| "DIGITADA"
	| "PEDIDO"
	| "MONTAGEM"
	| "CONFERIDO"
	| "LOJA"
	| "ENTREGUE"
	| "CANCELADA"
	// Compatibilidade legada
	| "EM_LABORATORIO"
	| "EM_MONTAGEM"
	| "CONFERIDA"
	| "PRONTA_LOJA";

export type OpticalPaymentMode = "TOTAL" | "SINAL";

export type OpticalPaymentMethod =
	| "DINHEIRO"
	| "PIX"
	| "CARTAO_CREDITO"
	| "CARTAO_DEBITO"
	| "CREDIARIO"
	| "BOLETO"
	| "TRANSFERENCIA";

export interface DiopterValue {
	esf: string;
	cil: string;
	eixo: string;
	dnp?: string;
	alt?: string;
}

export interface EyePrescription {
	od: DiopterValue;
	oe: DiopterValue;
	adicao?: string;
}

export interface AroItem {
	frameCode: string;
	frameBrand: string;
	frameModel: string;
	framePrice: number;
	lab: string;
	lensName: string;
	quantity: number; // 1 (par) ou 0.5 (meio)
	lensPrice: number;
	treatment: string;
	noTreatment: boolean;
	treatmentPrice: number;
	diopters: EyePrescription;

	// Suporte a variação por olho (OD e OE) a partir do catálogo
	differentLensesPerEye?: boolean;
	lensOd?: string;
	lensPriceOd?: number;
	treatmentOd?: string;
	treatmentPriceOd?: number;
	labOd?: string;

	lensOe?: string;
	lensPriceOe?: number;
	treatmentOe?: string;
	treatmentPriceOe?: number;
	labOe?: string;
}

export interface OpticalPatient {
	id?: string;
	name: string;
	cpf: string;
	birthDate?: string;
	whatsapp: string;
	secondaryPhone?: string;
	email?: string;
	cep: string;
	street: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
}

export interface OpticalOrderFinancials {
	subtotalFrames: number;
	subtotalLenses: number;
	subtotalTreatments: number;
	discount: number;
	totalAmount: number;
	paymentMode: OpticalPaymentMode;
	paidAmount: number;
	residualAmount: number;
	paymentMethod1: OpticalPaymentMethod;
	paymentAmount1: number;
	cardInstallments1?: number;
	cardAuth1?: string;
	paymentMethod2?: OpticalPaymentMethod;
	paymentAmount2?: number;
	cardInstallments2?: number;
	cardAuth2?: string;
	nfce?: string;
	notes?: string;
}

export interface OpticalAIAudit {
	ocrConfidence: number;
	ocrRawText?: string;
	prescriptionVerified: boolean;
	labCostCrosscheck: "APPROVED" | "WARNING" | "DIVERGENCE";
	estimatedLabCost: number;
	grossMarginPercent: number;
	cylinderTranspositionValid: boolean;
	diameterThicknessCheck: "OK" | "RISK";
	creditRiskCheck: "LOW" | "MEDIUM" | "HIGH";
	agentNotes: string[];
	timelineEvents: Array<{
		id: string;
		time: string;
		title: string;
		detail: string;
		status: "ok" | "warning" | "info";
	}>;
}

export interface OpticalOrder {
	id: string;
	orderNumber: string;
	externalLabOrderNumber?: string;
	patient: OpticalPatient;
	doctor?: {
		name: string;
		crm?: string;
	};
	seller: {
		id: string;
		name: string;
	};
	store: {
		id: string;
		name: string;
	};
	status: OpticalOrderStatus;
	orderDate: string;
	promisedDeliveryDate: string; // ISO string
	labSentAt?: string;
	labExpectedAt?: string;
	readyAt?: string;
	deliveredAt?: string;

	// Gestão de Nota Fiscal (NF feita ou não)
	invoiceIssued?: boolean;
	invoiceNumber?: string;

	aro1: AroItem;
	hasAro2: boolean;
	isAro2CopyOfAro1: boolean;
	aro2?: AroItem;
	financials: OpticalOrderFinancials;
	aiAudit: OpticalAIAudit;
	createdAt: string;
	updatedAt: string;
}

// -------------------------------------------------------------
// PÓS-VENDA (EXPERIÊNCIA DO CONSUMIDOR)
// -------------------------------------------------------------
export type PostSalesStage = "POS_7" | "POS_30" | "POS_90" | "ATIVO_PROMO";

export interface PostSalesRecord {
	id: string;
	orderId: string;
	orderNumber: string;
	patientName: string;
	patientPhone: string;
	sellerName: string;
	storeName: string;
	deliveredAt: string; // ISO date
	currentStage: PostSalesStage;
	lastContactAt?: string;
	nextContactDueAt: string;
	contactCount: number;
	notes?: string;
	feedbackRating?: "EXCELLENT" | "GOOD" | "REGULAR" | "ADJUSTMENT_NEEDED";
	promoSent?: boolean;
	createdAt: string;
	updatedAt: string;
}

// -------------------------------------------------------------
// CATÁLOGO DE LENTES (ABASTECE A OS COM VARIAÇÃO POR OLHO)
// -------------------------------------------------------------
export type LensCategory = "MONOFOCAL" | "MULTIFOCAL" | "BIFOCAL" | "OCUPACIONAL";

export interface LensCatalogItem {
	id: string;
	tipo: LensCategory;
	familia: string;
	produto: string;
	custo: number;
	preco: number;
	indiceRefrativo: string; // "1.50" | "1.56" | "1.59" | "1.67" | "1.74"
	tecnologia: string; // "Freeform" | "HD" | "Convencional" | "Digital"
	laboratorio: string; // "Hoya" | "Zeiss" | "Essilor" | "Sorolab" | "Personality" | etc.
	valorPeca: number; // valor de uma lente (olho)
	tratamentosDisponiveis?: string[];
	ativo: boolean;
}

// -------------------------------------------------------------
// CATÁLOGO DE PEÇAS (ARMAÇÕES & SOLARES)
// -------------------------------------------------------------
export type FrameCategory = "RECEITUARIO" | "SOLAR" | "CLIP_ON";

export interface FrameCatalogItem {
	id: string;
	tipo: FrameCategory;
	familia: string;
	produto: string;
	marca: string;
	fabricante: string;
	tamanhoAro: string; // ex: "52", "54"
	tamanhoPonte: string; // ex: "18", "20"
	fotoUrl?: string;
	estoque: number;
	preco: number;
	ativo: boolean;
}

// -------------------------------------------------------------
// MENSAGENS PADRÃO E DISPARO EM MASSA
// -------------------------------------------------------------
export type MessageTemplateType =
	| "POS_7"
	| "POS_30"
	| "POS_90"
	| "PRONTA_LOJA"
	| "ATIVO_PROMO"
	| "COBRANCA_RESIDUAL"
	| "GERAL";

export interface MessageTemplateItem {
	id: string;
	tipo: MessageTemplateType;
	titulo: string;
	texto: string;
	variaveis: string[]; // ["{{cliente}}", "{{os}}", "{{loja}}", "{{saldo}}", "{{lente}}"]
	ativo: boolean;
}
