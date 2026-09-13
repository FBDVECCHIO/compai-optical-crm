import type { EyePrescription } from "./optical-types";

export interface OCRScanResult {
	confidence: number;
	prescription: EyePrescription;
	rawText: string;
	doctorDetected?: string;
	patientDetected?: string;
	dateDetected?: string;
}

const SAMPLE_PRESCRIPTIONS: OCRScanResult[] = [
	{
		confidence: 0.98,
		doctorDetected: "Dra. Juliana Mendes - CRM/SP 148920",
		patientDetected: "MARIA EDUARDA SILVA",
		dateDetected: "10/09/2026",
		rawText: `CLÍNICA DE OLHOS SANTA LUZIA
Dr(a): Juliana Mendes - Oftalmologia Geral e Refrativa
CRM/SP: 148920
Paciente: Maria Eduarda Silva
Data: 10/09/2026

RECEITA DE ÓCULOS
LONGE:
OD: Esférico: -1.75 | Cilíndrico: -0.75 | Eixo: 175° | DNP: 31.0 | Altura: 19.5
OE: Esférico: -1.50 | Cilíndrico: -0.50 | Eixo: 010° | DNP: 31.5 | Altura: 19.5
PERTO:
Adição: +2.00 D.E.`,
		prescription: {
			od: {
				esf: "-1.75",
				cil: "-0.75",
				eixo: "175",
				dnp: "31.0",
				alt: "19.5",
			},
			oe: {
				esf: "-1.50",
				cil: "-0.50",
				eixo: "10",
				dnp: "31.5",
				alt: "19.5",
			},
			adicao: "+2.00",
		},
	},
	{
		confidence: 0.95,
		doctorDetected: "Dr. Marcelo Carvalho - CRM/RJ 88231",
		patientDetected: "JOÃO RICARDO SANTOS",
		dateDetected: "08/09/2026",
		rawText: `INSTITUTO DA VISÃO
Médico: Dr. Marcelo Carvalho - CRM/RJ 88231
Paciente: João Ricardo Santos
Data: 08/09/2026

PRESCRIÇÃO ÓPTICA
OD: Esf +1.25 | Cil -1.25 | Eixo 90° | DNP 32.0 | Alt 21.0
OE: Esf +1.50 | Cil -1.00 | Eixo 85° | DNP 32.5 | Alt 21.0
Adição: +2.25`,
		prescription: {
			od: {
				esf: "+1.25",
				cil: "-1.25",
				eixo: "90",
				dnp: "32.0",
				alt: "21.0",
			},
			oe: {
				esf: "+1.50",
				cil: "-1.00",
				eixo: "85",
				dnp: "32.5",
				alt: "21.0",
			},
			adicao: "+2.25",
		},
	},
	{
		confidence: 0.99,
		doctorDetected: "Dr. Roberto Antunes - CRM/MG 74512",
		patientDetected: "ANA CLARA LIMA",
		dateDetected: "05/09/2026",
		rawText: `CENTRO OFTALMOLÓGICO ESPECIALIZADO
Dr. Roberto Antunes - CRM/MG 74512
Paciente: Ana Clara Lima

Refratometria Subjetiva:
OD: Esférico: +0.75 | Cilíndrico: -0.50 | Eixo: 180° | DNP: 30.0 | Altura: 18.0
OE: Esférico: +0.50 | Cilíndrico: -0.25 | Eixo: 170° | DNP: 30.0 | Altura: 18.0
Visão Simples / Leitura Digital`,
		prescription: {
			od: {
				esf: "+0.75",
				cil: "-0.50",
				eixo: "180",
				dnp: "30.0",
				alt: "18.0",
			},
			oe: {
				esf: "+0.50",
				cil: "-0.25",
				eixo: "170",
				dnp: "30.0",
				alt: "18.0",
			},
			adicao: "",
		},
	},
];

export async function processPrescriptionOCR(
	_file?: File | Blob,
): Promise<OCRScanResult> {
	// Simula delay natural de processamento por rede neural (600ms)
	await new Promise((resolve) => setTimeout(resolve, 650));
	const selected =
		SAMPLE_PRESCRIPTIONS[
			Math.floor(Math.random() * SAMPLE_PRESCRIPTIONS.length)
		];
	return selected ?? SAMPLE_PRESCRIPTIONS[0]!;
}
