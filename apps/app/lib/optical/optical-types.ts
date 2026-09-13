export type OpticalOrderStatus =
	| "DIGITADA"
	| "EM_LABORATORIO"
	| "EM_MONTAGEM"
	| "CONFERIDA"
	| "PRONTA_LOJA"
	| "ENTREGUE"
	| "CANCELADA";

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
	aro1: AroItem;
	hasAro2: boolean;
	isAro2CopyOfAro1: boolean;
	aro2?: AroItem;
	financials: OpticalOrderFinancials;
	aiAudit: OpticalAIAudit;
	createdAt: string;
	updatedAt: string;
}
