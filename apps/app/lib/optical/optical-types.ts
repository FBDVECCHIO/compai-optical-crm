import type { FiscalInfo } from "./fiscal-service";

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

// Categorias de catálogo
export type LensCategory = "MONOFOCAL" | "MULTIFOCAL" | "BIFOCAL" | "OCUPACIONAL";
export type FrameCategory = "RECEITUARIO" | "SOLAR" | "CLIP_ON";

export type CaptadorCommissionType = "PERCENTUAL" | "FIXO";

export interface OpticalCaptador {
	id: string;
	name: string;
	phone?: string;
	pixKey?: string;
	notes?: string;
	commissionType: CaptadorCommissionType;
	commissionValue: number;
	active: boolean;
	createdAt?: string;
}

export interface OpticalFrameShape {
	id: string;
	name: string;
	slug: string;
	category: string;
	description?: string;
	active: boolean;
}

export interface FrameCustomerData {
	bridge?: string;
	aro?: string;
	verticalB?: string;
	diagonalEd?: string;
	brand?: string;
	type?: string;
	shapeId?: string;
	shapeName?: string;
	photoUrl?: string;
}

export interface AroItem {
	frameCode: string;
	frameBrand: string;
	frameModel: string;
	framePrice: number;
	frameType?: FrameCategory | string;
	frameFamily?: string;
	frameManufacturer?: string;
	frameAro?: string;
	framePonte?: string;
	frameCustomerData?: FrameCustomerData;

	lab: string;
	lensName: string;
	quantity: number; // 1 (par) ou 0.5 (meio)
	lensPrice: number;
	lensType?: LensCategory | string;
	lensFamily?: string;
	lensIndex?: string;
	lensTech?: string;

	treatment: string;
	noTreatment: boolean;
	treatmentPrice: number;
	diopters: EyePrescription;

	// Códigos Mandatórios de Rastreabilidade ("CPF do Produto")
	lensCode?: string;
	treatmentCode?: string;
	serviceCode?: string;

	// Suporte a variação por olho (OD e OE) a partir do catálogo
	differentLensesPerEye?: boolean;
	lensOd?: string;
	lensPriceOd?: number;
	treatmentOd?: string;
	treatmentPriceOd?: number;
	labOd?: string;
	lensTypeOd?: string;
	lensFamilyOd?: string;
	lensIndexOd?: string;
	lensTechOd?: string;

	lensOe?: string;
	lensPriceOe?: number;
	treatmentOe?: string;
	treatmentPriceOe?: number;
	labOe?: string;
	lensTypeOe?: string;
	lensFamilyOe?: string;
	lensIndexOe?: string;
	lensTechOe?: string;
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
		clinic?: string;
	};
	captador?: {
		id: string;
		name: string;
		commissionType: CaptadorCommissionType;
		commissionValue: number;
		calculatedCommission: number;
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
	fiscalInfo?: FiscalInfo;

	parentOrderId?: string;

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

export interface LensCatalogItem {
	id: string;
	codigo: string; // Código Mandatório Único do Produto ("CPF do Produto", ex: LEN-10001)
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
	origem?: "PLANILHA" | "SISTEMA";
}

// -------------------------------------------------------------
// CATÁLOGO DE PEÇAS (ARMAÇÕES & SOLARES)
// -------------------------------------------------------------

export interface FrameCatalogItem {
	id: string;
	codigo: string; // Código Mandatório Único do Produto ("CPF do Produto", ex: ARM-10001 ou SOL-10001)
	tipo: FrameCategory;
	tipoArmacao?: string; // Vinculado aos Tipos de Armação em Configurações (ex: Nylon, Metal, Acetato, Parafusado, Fio de Aço)
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
	origem?: "PLANILHA" | "SISTEMA";
}

// -------------------------------------------------------------
// CATÁLOGO DE TRATAMENTOS (CRIZAL, DURAVISION, BLUECONTROL, ETC.)
// -------------------------------------------------------------

export interface TreatmentCatalogItem {
	id: string;
	codigo: string; // Código Mandatório Único (ex: TRAT-10001)
	nome: string;
	marcaOuLab?: string;
	preco: number;
	custo?: number;
	descricao?: string;
	ativo: boolean;
	origem?: "PLANILHA" | "SISTEMA";
}

// -------------------------------------------------------------
// CATÁLOGO DE SERVIÇOS ÓPTICOS (MONTAGEM, SURFAÇAGEM, ADAPTAÇÃO)
// -------------------------------------------------------------

export interface OpticalServiceItem {
	id: string;
	codigo: string; // Código Mandatório Único (ex: SRV-10001)
	nome: string;
	categoria: "MONTAGEM" | "SURFACAGEM" | "ADAPTACAO" | "COLORACAO" | "OUTRO";
	preco: number;
	custo?: number;
	descricao?: string;
	ativo: boolean;
	origem?: "PLANILHA" | "SISTEMA";
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

// -------------------------------------------------------------
// POLÍTICAS DE DESCONTO E ALÇADAS GERENCIAIS
// -------------------------------------------------------------
export type DiscountRole = "VENDEDOR" | "GERENTE" | "ADMIN" | string;

export interface DiscountPolicy {
	id: string;
	role: DiscountRole;
	maxDiscountPct: number; // ex: 10, 20, 100
	category?: "ARMAÇÃO" | "LENTE" | "GLOBAL";
	brandOrLab?: string; // ex: "TODOS", "Hoya", "Zeiss", "Ray-Ban"
	description?: string;
}

// -------------------------------------------------------------
// NÍVEIS DE DESCONTO POR PERFIL / CARGO
// -------------------------------------------------------------
export interface RoleDiscountTier {
	id: string;
	cargo: string; // ex: "Vendedor Júnior", "Vendedor Pleno", "Vendedor Sênior", "Gerente de Loja", "Diretoria / Admin"
	maxDiscountPct: number; // ex: 5, 10, 15, 20, 100
	descricao?: string;
	ativo: boolean;
}

// -------------------------------------------------------------
// TIPOS DE ARMAÇÃO (PARAMETRIZÁVEIS)
// -------------------------------------------------------------
export interface FrameTypeItem {
	id: string;
	nome: string; // "Nylon", "Metal", "Acetato", "Parafusado", "Fio de Aço"
	descricao?: string;
	ativo: boolean;
	ordem?: number;
}

