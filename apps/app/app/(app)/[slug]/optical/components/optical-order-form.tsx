"use client";

import Checkmark from "@carbon/icons-react/es/Checkmark";
import Copy from "@carbon/icons-react/es/Copy";
import Money from "@carbon/icons-react/es/Money";
import Search from "@carbon/icons-react/es/Search";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@crm/ui/components/field";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import { Input } from "@crm/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Separator } from "@crm/ui/components/separator";
import { Spinner } from "@crm/ui/components/spinner";
import { Switch } from "@crm/ui/components/switch";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LAB_CATALOG, TREATMENT_OPTIONS } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import {
	fetchLensCatalog,
	fetchFrameCatalog,
} from "@/lib/optical/supabase-optical";
import type {
	AroItem,
	EyePrescription,
	FrameCatalogItem,
	LensCatalogItem,
	OpticalOrder,
	OpticalPatient,
	OpticalPaymentMethod,
	OpticalPaymentMode,
} from "@/lib/optical/optical-types";
import {
	fetchViaCep,
	formatCep,
	formatCpf,
	formatPhone,
} from "@/lib/optical/viacep";
import { OpticalDioptersTable } from "./optical-diopters-table";

interface OpticalOrderFormProps {
	onSuccess?: (createdOrder: OpticalOrder) => void;
	onCancel?: () => void;
}

const DEFAULT_DIOPTERS: EyePrescription = {
	od: { esf: "0.00", cil: "0.00", eixo: "", dnp: "31.0", alt: "19.0" },
	oe: { esf: "0.00", cil: "0.00", eixo: "", dnp: "31.0", alt: "19.0" },
	adicao: "",
};

const DEFAULT_ARO_1: AroItem = {
	frameCode: "RB5228",
	frameBrand: "Ray-Ban",
	frameModel: "Acetato Preto Clássico",
	framePrice: 590,
	frameType: "RECEITUARIO",
	frameFamily: "Wayfarer",
	frameManufacturer: "Luxottica",
	frameAro: "52",
	framePonte: "18",
	lab: "Essilor",
	lensName: "Varilux Comfort Max 1.50",
	quantity: 1,
	lensPrice: 1890,
	lensType: "MULTIFOCAL",
	lensFamily: "Varilux",
	lensIndex: "1.50",
	lensTech: "Freeform",
	treatment: "Crizal Rock",
	noTreatment: false,
	treatmentPrice: 390,
	diopters: DEFAULT_DIOPTERS,
};

export function OpticalOrderForm({
	onSuccess,
	onCancel,
}: OpticalOrderFormProps) {
	const { addOrder } = useOpticalOrders();

	// Meta info
	const [orderNumber] = useState(
		() => `OS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
	);
	const [promisedDate, setPromisedDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 5);
		return d.toISOString().split("T")[0];
	});
	const [storeName, _setStoreName] = useState("Óptica Central - Matriz");
	const [sellerName, _setSellerName] = useState("Rodrigo Almeida");
	const [doctorName, setDoctorName] = useState("Dra. Juliana Mendes");
	const [doctorCrm, setDoctorCrm] = useState("148920/SP");

	// Patient state
	const [patient, setPatient] = useState<OpticalPatient>({
		name: "",
		cpf: "",
		birthDate: "",
		whatsapp: "",
		secondaryPhone: "",
		email: "",
		cep: "",
		street: "",
		number: "",
		complement: "",
		neighborhood: "",
		city: "São Paulo",
		state: "SP",
	});
	const [loadingCep, setLoadingCep] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Aro 1 state
	const [aro1, setAro1] = useState<AroItem>(DEFAULT_ARO_1);

	// Aro 2 state (Dobro)
	const [hasAro2, setHasAro2] = useState(false);
	const [isAro2Copy, setIsAro2Copy] = useState(false);
	const [aro2, setAro2] = useState<AroItem>({
		frameCode: "VO5322",
		frameBrand: "Vogue Eyewear",
		frameModel: "Tartaruga Solar",
		framePrice: 420,
		frameType: "SOLAR",
		frameFamily: "Gigi",
		frameManufacturer: "Luxottica",
		frameAro: "54",
		framePonte: "19",
		lab: "Essilor",
		lensName: "Varilux Comfort Max 1.50",
		quantity: 1,
		lensPrice: 1400,
		lensType: "MULTIFOCAL",
		lensFamily: "Varilux",
		lensIndex: "1.50",
		lensTech: "Freeform",
		treatment: "Crizal Sun UV",
		noTreatment: false,
		treatmentPrice: 280,
		diopters: DEFAULT_DIOPTERS,
	});

	// Financial state
	const [discount, setDiscount] = useState<number>(0);
	const [paymentMode, setPaymentMode] = useState<OpticalPaymentMode>("TOTAL");
	const [paymentMethod1, setPaymentMethod1] =
		useState<OpticalPaymentMethod>("CARTAO_CREDITO");
	const [cardInstallments1, setCardInstallments1] = useState(3);
	const [manualPaidAmount, setManualPaidAmount] = useState<string>("");
	const [notes, setNotes] = useState("");
	const [nfce, _setNfce] = useState("");
	const [invoiceIssued, setInvoiceIssued] = useState(false);
	const [invoiceNumber, setInvoiceNumber] = useState("");
	const [lensCatalog, setLensCatalog] = useState<LensCatalogItem[]>([]);
	const [frameCatalog, setFrameCatalog] = useState<FrameCatalogItem[]>([]);

	useEffect(() => {
		fetchLensCatalog().then((items) => setLensCatalog(items));
		fetchFrameCatalog().then((items) => setFrameCatalog(items));
	}, []);

	// Filtros inteligentes de lentes por laboratório selecionado
	const filteredLensesAro1 = useMemo(() => {
		if (!aro1.lab) return lensCatalog;
		const filtered = lensCatalog.filter(
			(l) => l.laboratorio.toLowerCase() === aro1.lab.toLowerCase(),
		);
		return filtered.length > 0 ? filtered : lensCatalog;
	}, [lensCatalog, aro1.lab]);

	const filteredLensesAro2 = useMemo(() => {
		if (!aro2.lab) return lensCatalog;
		const filtered = lensCatalog.filter(
			(l) => l.laboratorio.toLowerCase() === aro2.lab.toLowerCase(),
		);
		return filtered.length > 0 ? filtered : lensCatalog;
	}, [lensCatalog, aro2.lab]);

	// CEP Handler
	const handleSearchCep = async (cepToQuery?: string) => {
		const target = cepToQuery ?? patient.cep;
		if (target?.replace(/\D/g, "").length !== 8) {
			toast.error("Informe um CEP válido com 8 dígitos.");
			return;
		}
		setLoadingCep(true);
		try {
			const addr = await fetchViaCep(target);
			if (addr) {
				setPatient((prev) => ({
					...prev,
					cep: addr.cep,
					street: addr.street,
					neighborhood: addr.neighborhood,
					city: addr.city,
					state: addr.state,
					complement: addr.complement || prev.complement,
				}));
				toast.success("Endereço localizado via ViaCEP!");
			} else {
				toast.error("CEP não localizado. Preencha manualmente.");
			}
		} finally {
			setLoadingCep(false);
		}
	};

	// Clone WhatsApp to secondary phone
	const handleCloneWhatsApp = () => {
		if (!patient.whatsapp) {
			toast.error("Preencha o WhatsApp do cliente primeiro.");
			return;
		}
		setPatient((prev) => ({ ...prev, secondaryPhone: prev.whatsapp }));
		toast.success("WhatsApp copiado para telefone secundário.");
	};

	// Copiar Aro 1 para Aro 2
	const handleCopyAro1 = () => {
		setAro2((prev) => ({
			...prev,
			diopters: JSON.parse(JSON.stringify(aro1.diopters)),
			lab: aro1.lab,
			lensName: aro1.lensName,
			lensPrice: Math.round(aro1.lensPrice * 0.7), // 30% desc 2º par
			lensType: aro1.lensType,
			lensFamily: aro1.lensFamily,
			lensIndex: aro1.lensIndex,
			lensTech: aro1.lensTech,
			treatment: aro1.treatment,
			treatmentPrice: Math.round(aro1.treatmentPrice * 0.7),
			noTreatment: aro1.noTreatment,
			differentLensesPerEye: aro1.differentLensesPerEye,
			lensOd: aro1.lensOd,
			lensPriceOd: aro1.lensPriceOd ? Math.round(aro1.lensPriceOd * 0.7) : undefined,
			treatmentOd: aro1.treatmentOd,
			labOd: aro1.labOd,
			lensTypeOd: aro1.lensTypeOd,
			lensFamilyOd: aro1.lensFamilyOd,
			lensIndexOd: aro1.lensIndexOd,
			lensTechOd: aro1.lensTechOd,
			lensOe: aro1.lensOe,
			lensPriceOe: aro1.lensPriceOe ? Math.round(aro1.lensPriceOe * 0.7) : undefined,
			treatmentOe: aro1.treatmentOe,
			labOe: aro1.labOe,
			lensTypeOe: aro1.lensTypeOe,
			lensFamilyOe: aro1.lensFamilyOe,
			lensIndexOe: aro1.lensIndexOe,
			lensTechOe: aro1.lensTechOe,
		}));
		setIsAro2Copy(true);
		toast.success("Aro 1 copiado para o Aro 2!", {
			description:
				"Dioptrias OD/OE, lentes, tratamentos e dados técnicos replicados com desconto de 2º par.",
		});
	};

	// Financial Calculations
	const subtotalFrames =
		(Number(aro1.framePrice) || 0) +
		(hasAro2 ? Number(aro2.framePrice) || 0 : 0);
	const subtotalLenses =
		(aro1.differentLensesPerEye
			? (Number(aro1.lensPriceOd) || 0) + (Number(aro1.lensPriceOe) || 0)
			: Number(aro1.lensPrice) || 0) +
		(hasAro2
			? aro2.differentLensesPerEye
				? (Number(aro2.lensPriceOd) || 0) + (Number(aro2.lensPriceOe) || 0)
				: Number(aro2.lensPrice) || 0
			: 0);
	const subtotalTreatments =
		(aro1.noTreatment ? 0 : Number(aro1.treatmentPrice) || 0) +
		(hasAro2 && !aro2.noTreatment ? Number(aro2.treatmentPrice) || 0 : 0);

	const grossTotal = subtotalFrames + subtotalLenses + subtotalTreatments;
	const totalAmount = Math.max(0, grossTotal - (Number(discount) || 0));

	const paidAmount = useMemo(() => {
		if (paymentMode === "TOTAL") {
			return totalAmount;
		}
		const parsed = Number.parseFloat(manualPaidAmount);
		return Number.isFinite(parsed) ? Math.min(parsed, totalAmount) : 0;
	}, [paymentMode, totalAmount, manualPaidAmount]);

	const residualAmount = Math.max(0, totalAmount - paidAmount);

	// Sync default manual paid amount when switching to SINAL
	useEffect(() => {
		if (paymentMode === "SINAL" && !manualPaidAmount) {
			// Sugere 50% de sinal padrão de balcão
			setManualPaidAmount(String(Math.round(totalAmount * 0.5)));
		}
	}, [paymentMode, totalAmount, manualPaidAmount]);

	// Submit Order
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isSubmitting) return;

		if (!patient.name.trim()) {
			toast.error("Por favor, preencha o nome do paciente.");
			return;
		}
		if (!patient.whatsapp.trim()) {
			toast.error("Por favor, informe o WhatsApp para contato e aviso.");
			return;
		}
		if (totalAmount <= 0) {
			toast.error("O valor total da venda deve ser maior que zero.");
			return;
		}

		setIsSubmitting(true);
		try {
			const newOrder: OpticalOrder = {
				id: `ord_${Date.now()}`,
				orderNumber,
				store: { id: "store_matriz", name: storeName },
				seller: { id: "user_rodrigo", name: sellerName },
				doctor: doctorName ? { name: doctorName, crm: doctorCrm } : undefined,
				status: "DIGITADA",
				invoiceIssued,
				invoiceNumber: invoiceIssued ? invoiceNumber || `NF-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
				orderDate: new Date().toISOString(),
				promisedDeliveryDate: new Date(`${promisedDate}T18:00:00Z`).toISOString(),
				patient: {
					...patient,
					name: patient.name.toUpperCase(),
				},
				aro1,
				hasAro2,
				isAro2CopyOfAro1: isAro2Copy,
				aro2: hasAro2 ? aro2 : undefined,
				financials: {
					subtotalFrames,
					subtotalLenses,
					subtotalTreatments,
					discount,
					totalAmount,
					paymentMode,
					paidAmount,
					residualAmount,
					paymentMethod1,
					paymentAmount1: paidAmount,
					cardInstallments1:
						paymentMethod1 === "CARTAO_CREDITO" ? cardInstallments1 : 1,
					nfce: nfce || undefined,
					notes: notes || undefined,
				},
				aiAudit: {
					ocrConfidence: 0.98,
					prescriptionVerified: true,
					labCostCrosscheck: "APPROVED",
					estimatedLabCost: Math.round(subtotalLenses * 0.42),
					grossMarginPercent: Number(
						(
							((totalAmount - Math.round(subtotalLenses * 0.42)) / totalAmount) *
							100
						).toFixed(1),
					),
					cylinderTranspositionValid: true,
					diameterThicknessCheck: "OK",
					creditRiskCheck: residualAmount > 2000 ? "MEDIUM" : "LOW",
					agentNotes: [
						"OS digitada no balcão rápido com validação automática de consistência óptica.",
						`Sinal de entrada: R$ ${paidAmount.toFixed(2)}. Residual pendente: R$ ${residualAmount.toFixed(2)}.`,
						"Checagem de transposição e conformidade com laboratório validada.",
					],
					timelineEvents: [
						{
							id: `ev_${Date.now()}`,
							time: new Date().toLocaleTimeString("pt-BR", {
								hour: "2-digit",
								minute: "2-digit",
							}),
							title: "Ordem de Serviço Emitida no Balcão",
							detail: `OS ${orderNumber} cadastrada por ${sellerName}.`,
							status: "ok",
						},
					],
				},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			addOrder(newOrder);
			toast.success(`Ordem de Serviço ${orderNumber} emitida com sucesso!`, {
				description: `Paciente: ${patient.name.toUpperCase()} | Total: R$ ${totalAmount.toFixed(2)}`,
			});

			if (onSuccess) {
				onSuccess(newOrder);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6 p-1">
			{/* Top Header Information */}
			<div className="rounded-xl border bg-muted/30 p-4 shadow-xs">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Icon icon={Glasses} className="size-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="font-bold text-base tracking-tight text-foreground">
									Venda Rápida de Balcão Óptico
								</h2>
								<Badge
									variant="outline"
									className="font-mono text-xs font-bold text-primary"
								>
									{orderNumber}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Lançamento de armações, lentes, tratamentos, dioptrias e
								faturamento
							</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<div className="flex flex-col">
							<span className="text-[11px] font-medium text-muted-foreground">
								Previsão / Promessa de Entrega
							</span>
							<Input
								type="date"
								value={promisedDate}
								onChange={(e) => setPromisedDate(e.target.value)}
								className="h-8 w-40 text-xs font-medium"
								required
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-6 w-full">
					{/* Card Paciente */}
					<div className="rounded-xl border bg-card p-5 shadow-xs">
						<div className="mb-4 flex items-center justify-between border-b pb-3">
							<div className="flex items-center gap-2 font-semibold text-sm text-foreground">
								<Icon icon={UserAvatar} className="size-4 text-primary" />
								Cadastro do Paciente / Cliente
							</div>
							<Badge variant="secondary" className="text-[10px]">
								ViaCEP Ativo
							</Badge>
						</div>

						<FieldGroup className="gap-3">
							<Field>
								<FieldLabel htmlFor="patient-name">Nome Completo *</FieldLabel>
								<Input
									id="patient-name"
									value={patient.name}
									onChange={(e) =>
										setPatient((p) => ({
											...p,
											name: e.target.value.toUpperCase(),
										}))
									}
									placeholder="DIGITE O NOME DO CLIENTE"
									required
									className="text-xs font-semibold uppercase"
								/>
							</Field>

							<div className="grid grid-cols-2 gap-3">
								<Field>
									<FieldLabel htmlFor="patient-cpf">CPF *</FieldLabel>
									<Input
										id="patient-cpf"
										value={patient.cpf}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												cpf: formatCpf(e.target.value),
											}))
										}
										placeholder="000.000.000-00"
										required
										className="text-xs font-mono"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="patient-birth">
										Data Nascimento
									</FieldLabel>
									<Input
										id="patient-birth"
										type="date"
										value={patient.birthDate}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												birthDate: e.target.value,
											}))
										}
										className="text-xs"
									/>
								</Field>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<Field>
									<FieldLabel htmlFor="patient-whatsapp">WhatsApp *</FieldLabel>
									<Input
										id="patient-whatsapp"
										value={patient.whatsapp}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												whatsapp: formatPhone(e.target.value),
											}))
										}
										placeholder="(11) 90000-0000"
										required
										className="text-xs"
									/>
								</Field>
								<Field>
									<div className="flex items-center justify-between">
										<FieldLabel htmlFor="patient-phone">
											Tel. Secundário
										</FieldLabel>
										<button
											type="button"
											onClick={handleCloneWhatsApp}
											title="Clonar WhatsApp"
											className="flex items-center gap-1 text-[10px] text-primary hover:underline"
										>
											<Icon icon={Copy} className="size-3" />
											Clonar Whats
										</button>
									</div>
									<Input
										id="patient-phone"
										value={patient.secondaryPhone}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												secondaryPhone: formatPhone(e.target.value),
											}))
										}
										placeholder="(11) 0000-0000"
										className="text-xs"
									/>
								</Field>
							</div>

							<Field>
								<FieldLabel htmlFor="patient-email">E-mail</FieldLabel>
								<Input
									id="patient-email"
									type="email"
									value={patient.email}
									onChange={(e) =>
										setPatient((p) => ({ ...p, email: e.target.value }))
									}
									placeholder="cliente@email.com"
									className="text-xs"
								/>
							</Field>

							{/* CEP e Endereço */}
							<Separator className="my-1" />
							<div className="flex items-end gap-2">
								<Field className="flex-1">
									<FieldLabel htmlFor="patient-cep">CEP</FieldLabel>
									<Input
										id="patient-cep"
										value={patient.cep}
										disabled={loadingCep}
										onChange={(e) => {
											const formatted = formatCep(e.target.value);
											setPatient((p) => ({ ...p, cep: formatted }));
											if (formatted.replace(/\D/g, "").length === 8) {
												handleSearchCep(formatted);
											}
										}}
										placeholder="00000-000"
										className="text-xs font-mono"
										aria-label="CEP do paciente"
									/>
								</Field>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="h-9 px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
									disabled={loadingCep}
									onClick={() => handleSearchCep()}
									aria-label={loadingCep ? "Buscando endereço via CEP no ViaCEP..." : "Buscar endereço no ViaCEP"}
									title="Buscar endereço no ViaCEP"
								>
									{loadingCep ? (
										<Spinner className="size-3" />
									) : (
										<>
											<Icon icon={Search} className="mr-1 size-3" />
											Buscar
										</>
									)}
								</Button>
							</div>

							<div className="grid grid-cols-4 gap-2">
								<Field className="col-span-3">
									<FieldLabel htmlFor="patient-street">
										Logradouro / Rua
									</FieldLabel>
									<Input
										id="patient-street"
										value={patient.street}
										onChange={(e) =>
											setPatient((p) => ({ ...p, street: e.target.value }))
										}
										placeholder="Avenida Paulista"
										className="text-xs"
									/>
								</Field>
								<Field className="col-span-1">
									<FieldLabel htmlFor="patient-number">Nº</FieldLabel>
									<Input
										id="patient-number"
										value={patient.number}
										onChange={(e) =>
											setPatient((p) => ({ ...p, number: e.target.value }))
										}
										placeholder="1500"
										className="text-xs"
									/>
								</Field>
							</div>

							<div className="grid grid-cols-3 gap-2">
								<Field>
									<FieldLabel htmlFor="patient-comp">Complemento</FieldLabel>
									<Input
										id="patient-comp"
										value={patient.complement}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												complement: e.target.value,
											}))
										}
										placeholder="Apto 12"
										className="text-xs"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="patient-neighborhood">Bairro</FieldLabel>
									<Input
										id="patient-neighborhood"
										value={patient.neighborhood}
										onChange={(e) =>
											setPatient((p) => ({
												...p,
												neighborhood: e.target.value,
											}))
										}
										placeholder="Centro"
										className="text-xs"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="patient-city">Cidade / UF</FieldLabel>
									<div className="flex gap-1">
										<Input
											id="patient-city"
											value={patient.city}
											onChange={(e) =>
												setPatient((p) => ({ ...p, city: e.target.value }))
											}
											placeholder="Cidade"
											className="text-xs"
										/>
										<Input
											id="patient-state"
											value={patient.state}
											onChange={(e) =>
												setPatient((p) => ({
													...p,
													state: e.target.value.toUpperCase(),
												}))
											}
											maxLength={2}
											placeholder="SP"
											className="w-12 text-center text-xs font-mono uppercase"
										/>
									</div>
								</Field>
							</div>
						</FieldGroup>
					</div>

					{/* Médico Responsável */}
					<div className="rounded-xl border bg-card p-4 shadow-xs">
						<div className="mb-3 flex items-center justify-between">
							<span className="font-semibold text-xs text-foreground">
								Médico Oftalmologista / Optometrista
							</span>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<div className="col-span-2">
								<Input
									value={doctorName}
									onChange={(e) => setDoctorName(e.target.value)}
									placeholder="Dr(a). Nome do Médico"
									className="h-8 text-xs"
								/>
							</div>
							<div className="col-span-1">
								<Input
									value={doctorCrm}
									onChange={(e) => setDoctorCrm(e.target.value)}
									placeholder="CRM/UF"
									className="h-8 text-xs font-mono"
								/>
							</div>
						</div>
					</div>
					{/* Aro 1 Card */}
					<div className="rounded-xl border bg-card p-5 shadow-xs">
						<div className="mb-4 flex items-center justify-between border-b pb-3">
							<div className="flex items-center gap-2 font-bold text-sm text-foreground">
								<Icon icon={Glasses} className="size-4 text-primary" />
								Dados da Compra — Aro 1 (Principal)
							</div>
							<Badge variant="outline" className="text-xs font-semibold">
								1º Par
							</Badge>
						</div>

						{/* Armação Aro 1 */}
						<div className="space-y-3">
							{/* Seletor Dropdown do Catálogo de Armações & Solares */}
							<div className="p-3 rounded-lg bg-muted/30 border">
								<div className="flex items-center justify-between mb-1.5">
									<FieldLabel className="text-xs font-semibold">
										Selecionar Peça do Catálogo (Armações & Solares)
									</FieldLabel>
									<span className="text-[10px] text-muted-foreground">
										{frameCatalog.length} peças disponíveis no estoque
									</span>
								</div>
								<select
									value={
										frameCatalog.find(
											(f) =>
												f.produto === aro1.frameModel ||
												(f.marca === aro1.frameBrand &&
													f.produto.includes(aro1.frameCode)),
										)?.id || ""
									}
									onChange={(e) => {
										const selected = frameCatalog.find(
											(f) => f.id === e.target.value,
										);
										if (selected) {
											setAro1((a) => ({
												...a,
												frameCode:
													selected.produto.split(" ")[1] ||
													selected.produto.slice(0, 8),
												frameBrand: selected.marca,
												frameModel: selected.produto,
												framePrice: selected.preco,
												frameType: selected.tipo,
												frameFamily: selected.familia,
												frameManufacturer: selected.fabricante,
												frameAro: selected.tamanhoAro,
												framePonte: selected.tamanhoPonte,
											}));
										}
									}}
									className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
								>
									<option value="">Selecione uma armação/solar cadastrado...</option>
									{frameCatalog.map((f) => (
										<option key={f.id} value={f.id}>
											[{f.marca}] {f.produto} ({f.tipo}) — Aro {f.tamanhoAro}/{f.tamanhoPonte} — R$ {f.preco} (Estoque: {f.estoque})
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								<Field>
									<FieldLabel>Cód. Armação</FieldLabel>
									<Input
										value={aro1.frameCode}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameCode: e.target.value }))
										}
										placeholder="RB5228"
										className="h-8 text-xs font-mono"
									/>
								</Field>
								<Field>
									<FieldLabel>Marca</FieldLabel>
									<Input
										value={aro1.frameBrand}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameBrand: e.target.value }))
										}
										placeholder="Ray-Ban"
										className="h-8 text-xs"
									/>
								</Field>
								<Field>
									<FieldLabel>Modelo</FieldLabel>
									<Input
										value={aro1.frameModel}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameModel: e.target.value }))
										}
										placeholder="Acetato Preto"
										className="h-8 text-xs"
									/>
								</Field>
								<Field>
									<FieldLabel>R$ Armação</FieldLabel>
									<Input
										type="number"
										step="0.01"
										value={aro1.framePrice}
										onChange={(e) =>
											setAro1((a) => ({
												...a,
												framePrice: Number(e.target.value) || 0,
											}))
										}
										className="h-8 text-xs font-semibold"
									/>
								</Field>
							</div>

							{/* Especificações Técnicas da Armação Espelhadas do Catálogo */}
							<div className="p-2.5 rounded-lg bg-muted/20 border grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
								<div>
									<FieldLabel className="text-[10px] text-muted-foreground">
										Tipo da Peça
									</FieldLabel>
									<select
										value={aro1.frameType || "RECEITUARIO"}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameType: e.target.value as any }))
										}
										className="w-full h-7 px-2 rounded border bg-background text-xs"
									>
										<option value="RECEITUARIO">Receituário</option>
										<option value="SOLAR">Solar</option>
										<option value="CLIP_ON">Clip-on</option>
									</select>
								</div>
								<div>
									<FieldLabel className="text-[10px] text-muted-foreground">
										Família / Coleção
									</FieldLabel>
									<Input
										value={aro1.frameFamily || ""}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameFamily: e.target.value }))
										}
										placeholder="Ex: Wayfarer"
										className="h-7 text-xs"
									/>
								</div>
								<div>
									<FieldLabel className="text-[10px] text-muted-foreground">
										Fabricante
									</FieldLabel>
									<Input
										value={aro1.frameManufacturer || ""}
										onChange={(e) =>
											setAro1((a) => ({
												...a,
												frameManufacturer: e.target.value,
											}))
										}
										placeholder="Ex: Luxottica"
										className="h-7 text-xs"
									/>
								</div>
								<div>
									<FieldLabel className="text-[10px] text-muted-foreground">
										Tamanho Aro (mm)
									</FieldLabel>
									<Input
										value={aro1.frameAro || ""}
										onChange={(e) =>
											setAro1((a) => ({ ...a, frameAro: e.target.value }))
										}
										placeholder="Ex: 52"
										className="h-7 text-xs font-mono"
									/>
								</div>
								<div>
									<FieldLabel className="text-[10px] text-muted-foreground">
										Tamanho Ponte (mm)
									</FieldLabel>
									<Input
										value={aro1.framePonte || ""}
										onChange={(e) =>
											setAro1((a) => ({ ...a, framePonte: e.target.value }))
										}
										placeholder="Ex: 18"
										className="h-7 text-xs font-mono"
									/>
								</div>
							</div>
						</div>

						{/* Toggle Variação de Lente por Olho */}
						<div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
							<div>
								<span className="text-xs font-semibold text-foreground block">
									Variação por Olho (Lentes diferentes em OD e OE)
								</span>
								<span className="text-[10px] text-muted-foreground">
									Permite selecionar designs, laboratórios ou valores diferentes para cada olho
								</span>
							</div>
							<Switch
								checked={Boolean(aro1.differentLensesPerEye)}
								onCheckedChange={(checked) =>
									setAro1((a) => ({
										...a,
										differentLensesPerEye: checked,
										lensOd: checked ? (a.lensOd || a.lensName) : undefined,
										lensOe: checked ? (a.lensOe || a.lensName) : undefined,
										labOd: checked ? (a.labOd || a.lab) : undefined,
										labOe: checked ? (a.labOe || a.lab) : undefined,
										lensPriceOd: checked ? (a.lensPriceOd || Math.round(a.lensPrice / 2)) : undefined,
										lensPriceOe: checked ? (a.lensPriceOe || Math.round(a.lensPrice / 2)) : undefined,
										treatmentOd: checked ? (a.treatmentOd || a.treatment) : undefined,
										treatmentOe: checked ? (a.treatmentOe || a.treatment) : undefined,
									}))
								}
							/>
						</div>

						{/* Lente Aro 1: Modo Variação por Olho */}
						{aro1.differentLensesPerEye ? (
							<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
								{/* Olho Direito (OD) */}
								<div className="p-3 rounded-lg border bg-background space-y-2.5">
									<div className="flex items-center justify-between border-b pb-1.5">
										<span className="text-xs font-bold text-blue-600 dark:text-blue-400">
											Olho Direito (OD) — Peça Avulsa
										</span>
									</div>

									{/* Dropdown Catálogo OD */}
									<div>
										<FieldLabel className="text-[10px] font-semibold text-muted-foreground mb-1 block">
											Lente OD do Catálogo
										</FieldLabel>
										<select
											value={
												lensCatalog.find(
													(l) =>
														l.produto === aro1.lensOd &&
														(!aro1.labOd ||
															l.laboratorio.toLowerCase() === aro1.labOd.toLowerCase()),
												)?.id || ""
											}
											onChange={(e) => {
												const selected = lensCatalog.find((l) => l.id === e.target.value);
												if (selected) {
													setAro1((a) => ({
														...a,
														lensOd: selected.produto,
														labOd: selected.laboratorio,
														lensPriceOd: selected.valorPeca || Math.round(selected.preco / 2),
														lensTypeOd: selected.tipo,
														lensFamilyOd: selected.familia,
														lensIndexOd: selected.indiceRefrativo,
														lensTechOd: selected.tecnologia,
													}));
												}
											}}
											className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
										>
											<option value="">Selecione lente para OD...</option>
											{lensCatalog.map((l) => (
												<option key={l.id} value={l.id}>
													[{l.laboratorio}] {l.produto} — R$ {l.valorPeca || l.preco / 2}
												</option>
											))}
										</select>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<div>
											<FieldLabel className="text-[10px]">Laboratório OD</FieldLabel>
											<select
												value={aro1.labOd || ""}
												onChange={(e) => setAro1((a) => ({ ...a, labOd: e.target.value }))}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="">Selecione...</option>
												{LAB_CATALOG.map((lab) => (
													<option key={lab} value={lab}>
														{lab}
													</option>
												))}
											</select>
										</div>
										<div>
											<FieldLabel className="text-[10px]">R$ Peça OD</FieldLabel>
											<Input
												type="number"
												step="0.01"
												value={aro1.lensPriceOd ?? 0}
												onChange={(e) =>
													setAro1((a) => ({
														...a,
														lensPriceOd: Number(e.target.value) || 0,
													}))
												}
												className="h-7 text-xs font-semibold text-blue-600"
											/>
										</div>
									</div>
									<div>
										<FieldLabel className="text-[10px]">Nome da Lente OD</FieldLabel>
										<Input
											value={aro1.lensOd || ""}
											onChange={(e) => setAro1((a) => ({ ...a, lensOd: e.target.value }))}
											placeholder="Ex: Sync III 1.50"
											className="h-7 text-xs"
										/>
									</div>

									{/* Especificações Técnicas Espelhadas OD */}
									<div className="p-2 rounded bg-muted/30 border grid grid-cols-2 gap-1.5 text-[11px]">
										<div>
											<span className="text-[9px] text-muted-foreground block">Tipo OD</span>
											<span className="font-semibold text-foreground truncate block">
												{aro1.lensTypeOd || "MULTIFOCAL"}
											</span>
										</div>
										<div>
											<span className="text-[9px] text-muted-foreground block">IR / Tech</span>
											<span className="font-semibold text-foreground truncate block">
												{aro1.lensIndexOd || "1.50"} • {aro1.lensTechOd || "Freeform"}
											</span>
										</div>
									</div>

									{/* Tratamento OD */}
									<div>
										<FieldLabel className="text-[10px] mb-1 block">Tratamento OD</FieldLabel>
										<select
											value={
												TREATMENT_OPTIONS.find((t) => t.name === aro1.treatmentOd)?.name ||
												(aro1.treatmentOd ? "CUSTOM" : "")
											}
											onChange={(e) => {
												const val = e.target.value;
												if (val !== "CUSTOM") {
													const selected = TREATMENT_OPTIONS.find((t) => t.name === val);
													if (selected) {
														setAro1((a) => ({ ...a, treatmentOd: selected.name }));
													}
												}
											}}
											className="w-full h-7 px-2 rounded border bg-background text-xs mb-1"
										>
											<option value="">Selecione tratamento OD...</option>
											{TREATMENT_OPTIONS.map((t) => (
												<option key={t.name} value={t.name}>
													{t.name} (R$ {t.price})
												</option>
											))}
											<option value="CUSTOM">Personalizado...</option>
										</select>
										<Input
											value={aro1.treatmentOd || ""}
											onChange={(e) => setAro1((a) => ({ ...a, treatmentOd: e.target.value }))}
											placeholder="Nome do tratamento OD"
											className="h-7 text-xs"
										/>
									</div>
								</div>

								{/* Olho Esquerdo (OE) */}
								<div className="p-3 rounded-lg border bg-background space-y-2.5">
									<div className="flex items-center justify-between border-b pb-1.5">
										<span className="text-xs font-bold text-amber-600 dark:text-amber-400">
											Olho Esquerdo (OE) — Peça Avulsa
										</span>
									</div>

									{/* Dropdown Catálogo OE */}
									<div>
										<FieldLabel className="text-[10px] font-semibold text-muted-foreground mb-1 block">
											Lente OE do Catálogo
										</FieldLabel>
										<select
											value={
												lensCatalog.find(
													(l) =>
														l.produto === aro1.lensOe &&
														(!aro1.labOe ||
															l.laboratorio.toLowerCase() === aro1.labOe.toLowerCase()),
												)?.id || ""
											}
											onChange={(e) => {
												const selected = lensCatalog.find((l) => l.id === e.target.value);
												if (selected) {
													setAro1((a) => ({
														...a,
														lensOe: selected.produto,
														labOe: selected.laboratorio,
														lensPriceOe: selected.valorPeca || Math.round(selected.preco / 2),
														lensTypeOe: selected.tipo,
														lensFamilyOe: selected.familia,
														lensIndexOe: selected.indiceRefrativo,
														lensTechOe: selected.tecnologia,
													}));
												}
											}}
											className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
										>
											<option value="">Selecione lente para OE...</option>
											{lensCatalog.map((l) => (
												<option key={l.id} value={l.id}>
													[{l.laboratorio}] {l.produto} — R$ {l.valorPeca || l.preco / 2}
												</option>
											))}
										</select>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<div>
											<FieldLabel className="text-[10px]">Laboratório OE</FieldLabel>
											<select
												value={aro1.labOe || ""}
												onChange={(e) => setAro1((a) => ({ ...a, labOe: e.target.value }))}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="">Selecione...</option>
												{LAB_CATALOG.map((lab) => (
													<option key={lab} value={lab}>
														{lab}
													</option>
												))}
											</select>
										</div>
										<div>
											<FieldLabel className="text-[10px]">R$ Peça OE</FieldLabel>
											<Input
												type="number"
												step="0.01"
												value={aro1.lensPriceOe ?? 0}
												onChange={(e) =>
													setAro1((a) => ({
														...a,
														lensPriceOe: Number(e.target.value) || 0,
													}))
												}
												className="h-7 text-xs font-semibold text-amber-600"
											/>
										</div>
									</div>
									<div>
										<FieldLabel className="text-[10px]">Nome da Lente OE</FieldLabel>
										<Input
											value={aro1.lensOe || ""}
											onChange={(e) => setAro1((a) => ({ ...a, lensOe: e.target.value }))}
											placeholder="Ex: Sync III 1.50"
											className="h-7 text-xs"
										/>
									</div>

									{/* Especificações Técnicas Espelhadas OE */}
									<div className="p-2 rounded bg-muted/30 border grid grid-cols-2 gap-1.5 text-[11px]">
										<div>
											<span className="text-[9px] text-muted-foreground block">Tipo OE</span>
											<span className="font-semibold text-foreground truncate block">
												{aro1.lensTypeOe || "MULTIFOCAL"}
											</span>
										</div>
										<div>
											<span className="text-[9px] text-muted-foreground block">IR / Tech</span>
											<span className="font-semibold text-foreground truncate block">
												{aro1.lensIndexOe || "1.50"} • {aro1.lensTechOe || "Freeform"}
											</span>
										</div>
									</div>

									{/* Tratamento OE */}
									<div>
										<FieldLabel className="text-[10px] mb-1 block">Tratamento OE</FieldLabel>
										<select
											value={
												TREATMENT_OPTIONS.find((t) => t.name === aro1.treatmentOe)?.name ||
												(aro1.treatmentOe ? "CUSTOM" : "")
											}
											onChange={(e) => {
												const val = e.target.value;
												if (val !== "CUSTOM") {
													const selected = TREATMENT_OPTIONS.find((t) => t.name === val);
													if (selected) {
														setAro1((a) => ({ ...a, treatmentOe: selected.name }));
													}
												}
											}}
											className="w-full h-7 px-2 rounded border bg-background text-xs mb-1"
										>
											<option value="">Selecione tratamento OE...</option>
											{TREATMENT_OPTIONS.map((t) => (
												<option key={t.name} value={t.name}>
													{t.name} (R$ {t.price})
												</option>
											))}
											<option value="CUSTOM">Personalizado...</option>
										</select>
										<Input
											value={aro1.treatmentOe || ""}
											onChange={(e) => setAro1((a) => ({ ...a, treatmentOe: e.target.value }))}
											placeholder="Nome do tratamento OE"
											className="h-7 text-xs"
										/>
									</div>
								</div>
							</div>
						) : (
							/* Lente Aro 1: Modo Par Único Padrão */
							<div className="mt-3 space-y-3">
								{/* Seletor Dropdown do Catálogo de Lentes com Filtro de Lab */}
								<div className="p-3 rounded-lg bg-muted/30 border space-y-2.5">
									<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
										{/* Laboratório Dropdown */}
										<div className="sm:col-span-4">
											<FieldLabel className="mb-1 text-xs font-semibold">
												Laboratório Parceiro
											</FieldLabel>
											<select
												value={aro1.lab}
												onChange={(e) => setAro1((a) => ({ ...a, lab: e.target.value }))}
												className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
											>
												<option value="">Todos os Labs...</option>
												{LAB_CATALOG.map((lab) => (
													<option key={lab} value={lab}>
														{lab}
													</option>
												))}
											</select>
										</div>

										{/* Lente do Catálogo Dropdown */}
										<div className="sm:col-span-8">
											<div className="flex items-center justify-between mb-1">
												<FieldLabel className="text-xs font-semibold">
													Lente do Catálogo (Par)
												</FieldLabel>
												<span className="text-[10px] text-muted-foreground font-normal">
													{filteredLensesAro1.length} opções cadastradas
												</span>
											</div>
											<select
												value={
													lensCatalog.find(
														(l) =>
															l.produto === aro1.lensName &&
															(!aro1.lab ||
																l.laboratorio.toLowerCase() === aro1.lab.toLowerCase()),
													)?.id || ""
												}
												onChange={(e) => {
													const selected = lensCatalog.find((l) => l.id === e.target.value);
													if (selected) {
														setAro1((a) => ({
															...a,
															lensName: selected.produto,
															lab: selected.laboratorio,
															lensPrice: selected.preco,
															lensType: selected.tipo,
															lensFamily: selected.familia,
															lensIndex: selected.indiceRefrativo,
															lensTech: selected.tecnologia,
														}));
													}
												}}
												className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
											>
												<option value="">Selecione uma lente do catálogo...</option>
												{filteredLensesAro1.map((l) => (
													<option key={l.id} value={l.id}>
														[{l.laboratorio}] {l.produto} — {l.tipo} (IR {l.indiceRefrativo}) — R$ {l.preco}
													</option>
												))}
											</select>
										</div>
									</div>

									{/* Campos Diretos da Lente */}
									<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
										<div className="sm:col-span-8">
											<FieldLabel className="mb-1 text-xs">Nome / Design da Lente</FieldLabel>
											<Input
												value={aro1.lensName}
												onChange={(e) =>
													setAro1((a) => ({ ...a, lensName: e.target.value }))
												}
												placeholder="Nome / Design da Lente"
												className="h-8 text-xs"
											/>
										</div>

										<div className="sm:col-span-2">
											<FieldLabel className="mb-1 text-xs">Qtd</FieldLabel>
											<select
												value={String(aro1.quantity)}
												onChange={(e) =>
													setAro1((a) => ({ ...a, quantity: Number(e.target.value) }))
												}
												className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs"
											>
												<option value="1">1 (Par)</option>
												<option value="0.5">0.5 (Meio)</option>
											</select>
										</div>

										<div className="sm:col-span-2">
											<FieldLabel className="mb-1 text-xs">R$ Lente</FieldLabel>
											<Input
												type="number"
												step="0.01"
												value={aro1.lensPrice}
												onChange={(e) =>
													setAro1((a) => ({
														...a,
														lensPrice: Number(e.target.value) || 0,
													}))
												}
												className="h-8 text-xs font-semibold text-primary"
											/>
										</div>
									</div>

									{/* Especificações Técnicas da Lente Espelhadas do Catálogo */}
									<div className="p-2.5 rounded-lg bg-muted/20 border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Tipo Lente
											</FieldLabel>
											<select
												value={aro1.lensType || "MULTIFOCAL"}
												onChange={(e) =>
													setAro1((a) => ({ ...a, lensType: e.target.value as any }))
												}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="MONOFOCAL">Monofocal</option>
												<option value="MULTIFOCAL">Multifocal</option>
												<option value="BIFOCAL">Bifocal</option>
												<option value="OCUPACIONAL">Ocupacional</option>
											</select>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Família
											</FieldLabel>
											<Input
												value={aro1.lensFamily || ""}
												onChange={(e) =>
													setAro1((a) => ({ ...a, lensFamily: e.target.value }))
												}
												placeholder="Ex: Varilux"
												className="h-7 text-xs"
											/>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Índice Refrativo (IR)
											</FieldLabel>
											<select
												value={aro1.lensIndex || "1.50"}
												onChange={(e) =>
													setAro1((a) => ({ ...a, lensIndex: e.target.value }))
												}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="1.50">1.50 (Resina CR-39)</option>
												<option value="1.56">1.56 (Intermediário)</option>
												<option value="1.59">1.59 (Policarbonato)</option>
												<option value="1.60">1.60 (Alto Índice)</option>
												<option value="1.67">1.67 (Ultra Fino)</option>
												<option value="1.74">1.74 (Hi-Index)</option>
											</select>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Tecnologia
											</FieldLabel>
											<select
												value={aro1.lensTech || "Freeform"}
												onChange={(e) =>
													setAro1((a) => ({ ...a, lensTech: e.target.value }))
												}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="Freeform">Freeform</option>
												<option value="Digital">Digital</option>
												<option value="Surfaçada">Surfaçada</option>
												<option value="Convencional">Convencional</option>
												<option value="HD">HD</option>
											</select>
										</div>
									</div>
								</div>

								{/* Tratamento Aro 1 */}
								<div className="p-3 rounded-lg bg-muted/30 border space-y-2">
									<div className="flex items-center justify-between">
										<FieldLabel className="text-xs font-semibold">
											Tratamento Antirreflexo / Proteção
										</FieldLabel>
										<div className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
											<Checkbox
												id="aro1-no-treatment"
												checked={aro1.noTreatment}
												onCheckedChange={(c) =>
													setAro1((a) => ({
														...a,
														noTreatment: Boolean(c),
														treatmentPrice: c ? 0 : a.treatmentPrice,
													}))
												}
											/>
											<label htmlFor="aro1-no-treatment" className="cursor-pointer">
												Sem Tratamento
											</label>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
										<div className="sm:col-span-8 space-y-1.5">
											{/* Dropdown de Tratamento */}
											<select
												disabled={aro1.noTreatment}
												value={
													TREATMENT_OPTIONS.find((t) => t.name === aro1.treatment)?.name ||
													(aro1.treatment ? "CUSTOM" : "")
												}
												onChange={(e) => {
													const val = e.target.value;
													if (val !== "CUSTOM") {
														const selected = TREATMENT_OPTIONS.find((t) => t.name === val);
														if (selected) {
															setAro1((a) => ({
																...a,
																treatment: selected.name,
																treatmentPrice: selected.price,
															}));
														}
													}
												}}
												className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-50"
											>
												<option value="">Selecione o Tratamento...</option>
												{TREATMENT_OPTIONS.map((t) => (
													<option key={t.name} value={t.name}>
														[{t.lab}] {t.name} — R$ {t.price}
													</option>
												))}
												<option value="CUSTOM">Outro (Digitar nome abaixo)...</option>
											</select>
											<Input
												value={aro1.treatment}
												disabled={aro1.noTreatment}
												onChange={(e) =>
													setAro1((a) => ({ ...a, treatment: e.target.value }))
												}
												placeholder="Ex: Crizal Rock / Antirreflexo"
												className="h-8 text-xs"
											/>
										</div>
										<div className="sm:col-span-4">
											<FieldLabel className="mb-1 text-xs">R$ Tratamento</FieldLabel>
											<Input
												type="number"
												step="0.01"
												disabled={aro1.noTreatment}
												value={aro1.treatmentPrice}
												onChange={(e) =>
													setAro1((a) => ({
														...a,
														treatmentPrice: Number(e.target.value) || 0,
													}))
												}
												className="h-8 text-xs font-semibold text-primary"
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Dioptrias Aro 1 */}
						<div className="mt-4">
							<OpticalDioptersTable
								idPrefix="aro1"
								title="Dioptrias e Medidas — Aro 1"
								value={aro1.diopters}
								onChange={(diopters) => setAro1((a) => ({ ...a, diopters }))}
								onOcrCompleted={(doc, pat) => {
									if (doc) setDoctorName(doc);
									if (pat && !patient.name)
										setPatient((p) => ({ ...p, name: pat.toUpperCase() }));
								}}
							/>
						</div>
					</div>

					{/* Aro 2 Activator & Card */}
					<div className="rounded-xl border bg-card p-4 shadow-xs">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Switch
									id="aro2-toggle"
									checked={hasAro2}
									onCheckedChange={(checked) => setHasAro2(checked)}
								/>
								<label
									htmlFor="aro2-toggle"
									className="cursor-pointer font-semibold text-sm text-foreground"
								>
									Ativar Aro 2 (Opção Dobro / 2º Par com Desconto)
								</label>
							</div>

							{hasAro2 && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleCopyAro1}
									className="h-8 gap-1.5 text-xs font-medium text-primary hover:bg-primary/10"
								>
									<Icon icon={Copy} className="size-3.5" />
									Copiar Aro 1
								</Button>
							)}
						</div>

						{hasAro2 && (
							<div className="mt-4 border-t pt-4 space-y-4">
								{/* Armação Aro 2 */}
								<div className="space-y-3">
									{/* Seletor Dropdown do Catálogo de Peças - Aro 2 */}
									<div className="p-3 rounded-lg bg-muted/30 border">
										<div className="flex items-center justify-between mb-1.5">
											<FieldLabel className="text-xs font-semibold">
												Selecionar Peça do Catálogo — Aro 2 (2º Par)
											</FieldLabel>
											<span className="text-[10px] text-muted-foreground">
												{frameCatalog.length} peças disponíveis no estoque
											</span>
										</div>
										<select
											value={
												frameCatalog.find(
													(f) =>
														f.produto === aro2.frameModel ||
														(f.marca === aro2.frameBrand &&
															f.produto.includes(aro2.frameCode)),
												)?.id || ""
											}
											onChange={(e) => {
												const selected = frameCatalog.find(
													(f) => f.id === e.target.value,
												);
												if (selected) {
													setAro2((a) => ({
														...a,
														frameCode:
															selected.produto.split(" ")[1] ||
															selected.produto.slice(0, 8),
														frameBrand: selected.marca,
														frameModel: selected.produto,
														framePrice: selected.preco,
														frameType: selected.tipo,
														frameFamily: selected.familia,
														frameManufacturer: selected.fabricante,
														frameAro: selected.tamanhoAro,
														framePonte: selected.tamanhoPonte,
													}));
												}
											}}
											className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
										>
											<option value="">Selecione uma armação/solar para o 2º par...</option>
											{frameCatalog.map((f) => (
												<option key={f.id} value={f.id}>
													[{f.marca}] {f.produto} ({f.tipo}) — Aro {f.tamanhoAro}/{f.tamanhoPonte} — R$ {f.preco} (Estoque: {f.estoque})
												</option>
											))}
										</select>
									</div>

									<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
										<Field>
											<FieldLabel>Cód. Armação</FieldLabel>
											<Input
												value={aro2.frameCode}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameCode: e.target.value }))
												}
												placeholder="VO5322"
												className="h-8 text-xs font-mono"
											/>
										</Field>
										<Field>
											<FieldLabel>Marca</FieldLabel>
											<Input
												value={aro2.frameBrand}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameBrand: e.target.value }))
												}
												placeholder="Vogue"
												className="h-8 text-xs"
											/>
										</Field>
										<Field>
											<FieldLabel>Modelo</FieldLabel>
											<Input
												value={aro2.frameModel}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameModel: e.target.value }))
												}
												placeholder="Solar Tartaruga"
												className="h-8 text-xs"
											/>
										</Field>
										<Field>
											<FieldLabel>R$ Armação</FieldLabel>
											<Input
												type="number"
												step="0.01"
												value={aro2.framePrice}
												onChange={(e) =>
													setAro2((a) => ({
														...a,
														framePrice: Number(e.target.value) || 0,
													}))
												}
												className="h-8 text-xs font-semibold"
											/>
										</Field>
									</div>

									{/* Especificações Técnicas da Armação Aro 2 */}
									<div className="p-2.5 rounded-lg bg-muted/20 border grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Tipo Peça
											</FieldLabel>
											<select
												value={aro2.frameType || "SOLAR"}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameType: e.target.value as any }))
												}
												className="w-full h-7 px-2 rounded border bg-background text-xs"
											>
												<option value="RECEITUARIO">Receituário</option>
												<option value="SOLAR">Solar</option>
												<option value="CLIP_ON">Clip-on</option>
											</select>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Família / Coleção
											</FieldLabel>
											<Input
												value={aro2.frameFamily || ""}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameFamily: e.target.value }))
												}
												placeholder="Ex: Gigi"
												className="h-7 text-xs"
											/>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Fabricante
											</FieldLabel>
											<Input
												value={aro2.frameManufacturer || ""}
												onChange={(e) =>
													setAro2((a) => ({
														...a,
														frameManufacturer: e.target.value,
													}))
												}
												placeholder="Ex: Luxottica"
												className="h-7 text-xs"
											/>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Tamanho Aro (mm)
											</FieldLabel>
											<Input
												value={aro2.frameAro || ""}
												onChange={(e) =>
													setAro2((a) => ({ ...a, frameAro: e.target.value }))
												}
												placeholder="Ex: 54"
												className="h-7 text-xs font-mono"
											/>
										</div>
										<div>
											<FieldLabel className="text-[10px] text-muted-foreground">
												Tamanho Ponte (mm)
											</FieldLabel>
											<Input
												value={aro2.framePonte || ""}
												onChange={(e) =>
													setAro2((a) => ({ ...a, framePonte: e.target.value }))
												}
												placeholder="Ex: 19"
												className="h-7 text-xs font-mono"
											/>
										</div>
									</div>
								</div>

								{/* Lente & Laboratório Aro 2 */}
								<div className="space-y-3">
									<div className="p-3 rounded-lg bg-muted/30 border space-y-2.5">
										<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
											{/* Laboratório Dropdown */}
											<div className="sm:col-span-4">
												<FieldLabel className="mb-1 text-xs font-semibold">
													Laboratório (2º Par)
												</FieldLabel>
												<select
													value={aro2.lab}
													onChange={(e) =>
														setAro2((a) => ({ ...a, lab: e.target.value }))
													}
													className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
												>
													<option value="">Todos os Labs...</option>
													{LAB_CATALOG.map((lab) => (
														<option key={lab} value={lab}>
															{lab}
														</option>
													))}
												</select>
											</div>

											{/* Lente do Catálogo Dropdown */}
											<div className="sm:col-span-8">
												<div className="flex items-center justify-between mb-1">
													<FieldLabel className="text-xs font-semibold">
														Lente do Catálogo (2º Par)
													</FieldLabel>
													<span className="text-[10px] text-muted-foreground font-normal">
														{filteredLensesAro2.length} opções cadastradas
													</span>
												</div>
												<select
													value={
														lensCatalog.find(
															(l) =>
																l.produto === aro2.lensName &&
																(!aro2.lab ||
																	l.laboratorio.toLowerCase() ===
																		aro2.lab.toLowerCase()),
														)?.id || ""
													}
													onChange={(e) => {
														const selected = lensCatalog.find(
															(l) => l.id === e.target.value,
														);
														if (selected) {
															setAro2((a) => ({
																...a,
																lensName: selected.produto,
																lab: selected.laboratorio,
																lensPrice: Math.round(selected.preco * 0.7), // 30% desc
																lensType: selected.tipo,
																lensFamily: selected.familia,
																lensIndex: selected.indiceRefrativo,
																lensTech: selected.tecnologia,
															}));
														}
													}}
													className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
												>
													<option value="">Selecione uma lente para o 2º par...</option>
													{filteredLensesAro2.map((l) => (
														<option key={l.id} value={l.id}>
															[{l.laboratorio}] {l.produto} — {l.tipo} (IR {l.indiceRefrativo}) — R$ {l.preco}
														</option>
													))}
												</select>
											</div>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
											<div className="sm:col-span-8">
												<FieldLabel className="mb-1 text-xs">
													Nome / Design da Lente
												</FieldLabel>
												<Input
													value={aro2.lensName}
													onChange={(e) =>
														setAro2((a) => ({ ...a, lensName: e.target.value }))
													}
													placeholder="Nome da Lente"
													className="h-8 text-xs"
												/>
											</div>

											<div className="sm:col-span-2">
												<FieldLabel className="mb-1 text-xs">Qtd</FieldLabel>
												<select
													value={String(aro2.quantity)}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															quantity: Number(e.target.value),
														}))
													}
													className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs"
												>
													<option value="1">1 (Par)</option>
													<option value="0.5">0.5 (Meio)</option>
												</select>
											</div>

											<div className="sm:col-span-2">
												<FieldLabel className="mb-1 text-xs">R$ Lente</FieldLabel>
												<Input
													type="number"
													step="0.01"
													value={aro2.lensPrice}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															lensPrice: Number(e.target.value) || 0,
														}))
													}
													className="h-8 text-xs font-semibold text-primary"
												/>
											</div>
										</div>

										{/* Especificações Técnicas da Lente Aro 2 */}
										<div className="p-2.5 rounded-lg bg-muted/20 border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
											<div>
												<FieldLabel className="text-[10px] text-muted-foreground">
													Tipo Lente
												</FieldLabel>
												<select
													value={aro2.lensType || "MULTIFOCAL"}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															lensType: e.target.value as any,
														}))
													}
													className="w-full h-7 px-2 rounded border bg-background text-xs"
												>
													<option value="MONOFOCAL">Monofocal</option>
													<option value="MULTIFOCAL">Multifocal</option>
													<option value="BIFOCAL">Bifocal</option>
													<option value="OCUPACIONAL">Ocupacional</option>
												</select>
											</div>
											<div>
												<FieldLabel className="text-[10px] text-muted-foreground">
													Família
												</FieldLabel>
												<Input
													value={aro2.lensFamily || ""}
													onChange={(e) =>
														setAro2((a) => ({ ...a, lensFamily: e.target.value }))
													}
													placeholder="Ex: Varilux"
													className="h-7 text-xs"
												/>
											</div>
											<div>
												<FieldLabel className="text-[10px] text-muted-foreground">
													Índice Refrativo (IR)
												</FieldLabel>
												<select
													value={aro2.lensIndex || "1.50"}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															lensIndex: e.target.value,
														}))
													}
													className="w-full h-7 px-2 rounded border bg-background text-xs"
												>
													<option value="1.50">1.50 (Resina CR-39)</option>
													<option value="1.56">1.56 (Intermediário)</option>
													<option value="1.59">1.59 (Policarbonato)</option>
													<option value="1.60">1.60 (Alto Índice)</option>
													<option value="1.67">1.67 (Ultra Fino)</option>
													<option value="1.74">1.74 (Hi-Index)</option>
												</select>
											</div>
											<div>
												<FieldLabel className="text-[10px] text-muted-foreground">
													Tecnologia
												</FieldLabel>
												<select
													value={aro2.lensTech || "Freeform"}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															lensTech: e.target.value,
														}))
													}
													className="w-full h-7 px-2 rounded border bg-background text-xs"
												>
													<option value="Freeform">Freeform</option>
													<option value="Digital">Digital</option>
													<option value="Surfaçada">Surfaçada</option>
													<option value="Convencional">Convencional</option>
													<option value="HD">HD</option>
												</select>
											</div>
										</div>
									</div>

									{/* Tratamento Aro 2 */}
									<div className="p-3 rounded-lg bg-muted/30 border space-y-2">
										<div className="flex items-center justify-between">
											<FieldLabel className="text-xs font-semibold">
												Tratamento Antirreflexo / Proteção (2º Par)
											</FieldLabel>
											<div className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
												<Checkbox
													id="aro2-no-treatment"
													checked={aro2.noTreatment}
													onCheckedChange={(c) =>
														setAro2((a) => ({
															...a,
															noTreatment: Boolean(c),
															treatmentPrice: c ? 0 : a.treatmentPrice,
														}))
													}
												/>
												<label
													htmlFor="aro2-no-treatment"
													className="cursor-pointer"
												>
													Sem Tratamento
												</label>
											</div>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
											<div className="sm:col-span-8 space-y-1.5">
												<select
													disabled={aro2.noTreatment}
													value={
														TREATMENT_OPTIONS.find((t) => t.name === aro2.treatment)?.name ||
														(aro2.treatment ? "CUSTOM" : "")
													}
													onChange={(e) => {
														const val = e.target.value;
														if (val !== "CUSTOM") {
															const selected = TREATMENT_OPTIONS.find((t) => t.name === val);
															if (selected) {
																setAro2((a) => ({
																	...a,
																	treatment: selected.name,
																	treatmentPrice: Math.round(selected.price * 0.7),
																}));
															}
														}
													}}
													className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs disabled:opacity-50"
												>
													<option value="">Selecione o Tratamento...</option>
													{TREATMENT_OPTIONS.map((t) => (
														<option key={t.name} value={t.name}>
															[{t.lab}] {t.name} — R$ {Math.round(t.price * 0.7)} (Desc. 2º par)
														</option>
													))}
													<option value="CUSTOM">Outro (Digitar nome abaixo)...</option>
												</select>
												<Input
													value={aro2.treatment}
													disabled={aro2.noTreatment}
													onChange={(e) =>
														setAro2((a) => ({ ...a, treatment: e.target.value }))
													}
													placeholder="Ex: Crizal Sun UV"
													className="h-8 text-xs"
												/>
											</div>
											<div className="sm:col-span-4">
												<FieldLabel className="mb-1 text-xs">
													R$ Tratamento
												</FieldLabel>
												<Input
													type="number"
													step="0.01"
													disabled={aro2.noTreatment}
													value={aro2.treatmentPrice}
													onChange={(e) =>
														setAro2((a) => ({
															...a,
															treatmentPrice: Number(e.target.value) || 0,
														}))
													}
													className="h-8 text-xs font-semibold text-primary"
												/>
											</div>
										</div>
									</div>
								</div>

								{/* Dioptrias Aro 2 */}
								<div className="mt-4">
									<OpticalDioptersTable
										idPrefix="aro2"
										title="Dioptrias e Medidas — Aro 2 (2º Par)"
										value={aro2.diopters}
										onChange={(diopters) =>
											setAro2((a) => ({ ...a, diopters }))
										}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Painel Financeiro e Faturamento em Tempo Real */}
					<div className="rounded-xl border bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-xs">
						<div className="mb-4 flex items-center justify-between border-b pb-3">
							<div className="flex items-center gap-2 font-bold text-sm text-foreground">
								<Icon icon={Money} className="size-4 text-emerald-500" />
								Painel Financeiro & Faturamento em Tempo Real
							</div>
							<Badge
								variant={paymentMode === "TOTAL" ? "default" : "secondary"}
								className="text-xs font-medium"
							>
								Modo:{" "}
								{paymentMode === "TOTAL" ? "Quitação Total" : "Apenas Sinal"}
							</Badge>
						</div>

						{/* Seletor de Modo e Forma de Pagamento */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<FieldLabel className="mb-1 text-xs font-semibold">
									Modo de Recebimento
								</FieldLabel>
								<div className="grid grid-cols-2 gap-2">
									<Button
										type="button"
										variant={paymentMode === "TOTAL" ? "default" : "outline"}
										size="sm"
										className="h-9 text-xs font-semibold"
										onClick={() => setPaymentMode("TOTAL")}
									>
										Quitação Total (100%)
									</Button>
									<Button
										type="button"
										variant={paymentMode === "SINAL" ? "default" : "outline"}
										size="sm"
										className="h-9 text-xs font-semibold"
										onClick={() => setPaymentMode("SINAL")}
									>
										Apenas Sinal (Entrada)
									</Button>
								</div>
							</div>

							<div>
								<FieldLabel className="mb-1 text-xs font-semibold">
									Forma de Pagamento
								</FieldLabel>
								<Select
									value={paymentMethod1}
									onValueChange={(val) =>
										setPaymentMethod1(val as OpticalPaymentMethod)
									}
								>
									<SelectTrigger className="h-9 text-xs font-medium">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="DINHEIRO">Dinheiro (Espécie)</SelectItem>
										<SelectItem value="PIX">Pix Instantâneo</SelectItem>
										<SelectItem value="CARTAO_CREDITO">
											Cartão de Crédito
										</SelectItem>
										<SelectItem value="CARTAO_DEBITO">
											Cartão de Débito
										</SelectItem>
										<SelectItem value="CREDIARIO">Crediário da Loja</SelectItem>
										<SelectItem value="BOLETO">Boleto Bancário</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Parcelamento e Entrada */}
						<div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
							{paymentMethod1 === "CARTAO_CREDITO" && (
								<div>
									<FieldLabel className="mb-1 text-xs">
										Parcelas no Cartão
									</FieldLabel>
									<Select
										value={String(cardInstallments1)}
										onValueChange={(val) => setCardInstallments1(Number(val))}
									>
										<SelectTrigger className="h-8 text-xs font-medium">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
												<SelectItem key={num} value={String(num)}>
													{num}x{" "}
													{num === 1
														? "(À vista)"
														: `de R$ ${(paidAmount / num).toFixed(2)}`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}

							<div>
								<FieldLabel className="mb-1 text-xs">
									Desconto Especial (R$)
								</FieldLabel>
								<Input
									type="number"
									step="10"
									value={discount || ""}
									onChange={(e) => setDiscount(Number(e.target.value) || 0)}
									placeholder="0,00"
									className="h-8 text-xs font-semibold"
								/>
							</div>

							{paymentMode === "SINAL" && (
								<div>
									<FieldLabel className="mb-1 text-xs font-semibold text-primary">
										Valor Pago na Entrada (Sinal)
									</FieldLabel>
									<Input
										type="number"
										step="10"
										value={manualPaidAmount}
										onChange={(e) => setManualPaidAmount(e.target.value)}
										placeholder="R$ Entrada"
										className="h-8 text-xs font-bold text-primary"
									/>
								</div>
							)}
						</div>

						{/* Totalizer Box */}
						<div className="mt-5 rounded-lg border bg-muted/40 p-4">
							<div className="flex flex-col gap-1.5 text-xs">
								<div className="flex justify-between text-muted-foreground">
									<span>Armações (Aro 1 + Aro 2):</span>
									<span className="font-mono">
										R$ {subtotalFrames.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>Lentes:</span>
									<span className="font-mono">
										R$ {subtotalLenses.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-muted-foreground">
									<span>Tratamentos:</span>
									<span className="font-mono">
										R$ {subtotalTreatments.toFixed(2)}
									</span>
								</div>
								{discount > 0 && (
									<div className="flex justify-between text-emerald-600 dark:text-emerald-400">
										<span>Desconto Concedido:</span>
										<span className="font-mono font-semibold">
											- R$ {discount.toFixed(2)}
										</span>
									</div>
								)}
								<Separator className="my-1.5" />
								<div className="flex justify-between text-sm font-bold text-foreground">
									<span>Total da Venda:</span>
									<span className="font-mono text-base text-primary">
										R$ {totalAmount.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
									<span>Valor Pago no Caixa (Entrada/Total):</span>
									<span className="font-mono font-bold">
										R$ {paidAmount.toFixed(2)}
									</span>
								</div>
								<div
									className={`flex justify-between text-sm font-bold p-2 rounded-md mt-1 ${
										residualAmount > 0
											? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
											: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
									}`}
								>
									<span className="flex items-center gap-1.5">
										Saldo Residual a Receber:
										{residualAmount > 0 && (
											<span className="text-[10px] font-normal text-muted-foreground">
												(Cobrar na retirada)
											</span>
										)}
									</span>
									<span className="font-mono text-base font-extrabold">
										R$ {residualAmount.toFixed(2)}
									</span>
								</div>
							</div>
						</div>

						{/* Nota Fiscal (NF feita ou não) */}
						<div className="mt-4 flex items-center justify-between p-3 rounded-lg border bg-background">
							<div>
								<span className="text-xs font-semibold text-foreground block">
									Nota Fiscal (NF) Emitida?
								</span>
								<span className="text-[10px] text-muted-foreground">
									Assinalar se a nota fiscal da venda já foi emitida
								</span>
							</div>
							<div className="flex items-center gap-2.5">
								{invoiceIssued && (
									<Input
										placeholder="Nº da NF"
										value={invoiceNumber}
										onChange={(e) => setInvoiceNumber(e.target.value)}
										className="h-7 text-xs font-mono w-32"
									/>
								)}
								<Switch
									checked={invoiceIssued}
									onCheckedChange={(checked) => {
										setInvoiceIssued(checked);
										if (checked && !invoiceNumber) {
											setInvoiceNumber(`NF-${Math.floor(100000 + Math.random() * 900000)}`);
										}
									}}
								/>
							</div>
						</div>

						{/* Observações & Botões de Ação */}
						<div className="mt-3">
							<Input
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Observações adicionais do pedido ou instruções ao laboratório..."
								className="h-8 text-xs"
							/>
						</div>

						<div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
							{onCancel && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									disabled={isSubmitting}
									onClick={onCancel}
									aria-label="Cancelar emissão de Ordem de Serviço"
								>
									Cancelar
								</Button>
							)}
							<Button
								type="submit"
								size="default"
								disabled={isSubmitting}
								className="h-10 px-6 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
								aria-label={isSubmitting ? "Emitindo Ordem de Serviço..." : "Gravar e emitir Ordem de Serviço"}
							>
								{isSubmitting ? (
									<>
										<Spinner className="mr-2 size-4" />
										Emitindo OS...
									</>
								) : (
									<>
										<Icon icon={Checkmark} className="mr-2 size-4" />
										Gravar e Emitir Ordem de Serviço
									</>
								)}
							</Button>
						</div>
				</div>
			</div>
		</form>
	);
}
