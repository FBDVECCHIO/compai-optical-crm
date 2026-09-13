import { z } from "zod";

export const diopterValueSchema = z.object({
	esf: z.string().default("0.00"),
	cil: z.string().default("0.00"),
	eixo: z.string().default(""),
	dnp: z.string().optional().default(""),
	alt: z.string().optional().default(""),
});

export const eyePrescriptionSchema = z.object({
	od: diopterValueSchema,
	oe: diopterValueSchema,
	adicao: z.string().optional().default(""),
});

export const aroItemSchema = z.object({
	frameCode: z.string().min(1, "Código da armação é obrigatório"),
	frameBrand: z.string().min(1, "Marca é obrigatória"),
	frameModel: z.string().min(1, "Modelo é obrigatório"),
	framePrice: z.number().min(0),
	lab: z.string().min(1, "Laboratório é obrigatório"),
	lensName: z.string().min(1, "Nome da lente é obrigatório"),
	quantity: z.number().default(1),
	lensPrice: z.number().min(0),
	treatment: z.string().default(""),
	noTreatment: z.boolean().default(false),
	treatmentPrice: z.number().min(0).default(0),
	diopters: eyePrescriptionSchema,
});

export const opticalPatientSchema = z.object({
	name: z.string().min(2, "Nome do paciente é obrigatório"),
	cpf: z.string().min(11, "CPF deve ser informado com 11 dígitos"),
	birthDate: z.string().optional(),
	whatsapp: z.string().min(10, "WhatsApp é obrigatório"),
	secondaryPhone: z.string().optional(),
	email: z.string().email("E-mail inválido").optional().or(z.literal("")),
	cep: z.string().min(8, "CEP deve ter 8 dígitos"),
	street: z.string().min(1, "Logradouro é obrigatório"),
	number: z.string().min(1, "Número é obrigatório"),
	complement: z.string().optional(),
	neighborhood: z.string().min(1, "Bairro é obrigatório"),
	city: z.string().min(1, "Cidade é obrigatória"),
	state: z.string().length(2, "UF deve ter 2 caracteres"),
});

export const opticalOrderFormSchema = z.object({
	orderNumber: z.string().min(1, "Número da OS é obrigatório"),
	promisedDeliveryDate: z
		.string()
		.min(1, "Data de entrega prometida é obrigatória"),
	store: z.string().min(1, "Loja é obrigatória"),
	seller: z.string().min(1, "Vendedor é obrigatório"),
	doctorName: z.string().optional(),
	doctorCrm: z.string().optional(),
	patient: opticalPatientSchema,
	aro1: aroItemSchema,
	hasAro2: z.boolean().default(false),
	isAro2CopyOfAro1: z.boolean().default(false),
	aro2: aroItemSchema.optional(),
	financials: z.object({
		subtotalFrames: z.number(),
		subtotalLenses: z.number(),
		subtotalTreatments: z.number(),
		discount: z.number().default(0),
		totalAmount: z.number(),
		paymentMode: z.enum(["TOTAL", "SINAL"]),
		paidAmount: z.number(),
		residualAmount: z.number(),
		paymentMethod1: z.enum([
			"DINHEIRO",
			"PIX",
			"CARTAO_CREDITO",
			"CARTAO_DEBITO",
			"CREDIARIO",
			"BOLETO",
			"TRANSFERENCIA",
		]),
		paymentAmount1: z.number(),
		cardInstallments1: z.number().optional(),
		cardAuth1: z.string().optional(),
		paymentMethod2: z.string().optional(),
		paymentAmount2: z.number().optional(),
		nfce: z.string().optional(),
		notes: z.string().optional(),
	}),
});

export type OpticalOrderFormValues = z.infer<typeof opticalOrderFormSchema>;
