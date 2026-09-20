"use client";

import Add from "@carbon/icons-react/es/Add";
import Building from "@carbon/icons-react/es/Building";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Copy from "@carbon/icons-react/es/Copy";
import Locked from "@carbon/icons-react/es/Locked";
import Money from "@carbon/icons-react/es/Money";
import Password from "@carbon/icons-react/es/Password";
import Percentage from "@carbon/icons-react/es/Percentage";
import Receipt from "@carbon/icons-react/es/Receipt";
import Search from "@carbon/icons-react/es/Search";
import ShoppingBag from "@carbon/icons-react/es/ShoppingBag";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
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
import { checkDiscountLimit, useOpticalOrders } from "@/lib/optical/optical-store";
import {
	fetchLensCatalog,
	fetchFrameCatalog,
	decrementFrameStock,
	fetchSupabaseStores,
	fetchSupabaseSellers,
	fetchSupabaseDoctors,
	saveSupabaseDoctors,
	type StoreItem,
	type SellerItem,
	type DoctorItem,
} from "@/lib/optical/supabase-optical";
import { validateCrm, isDoctorDuplicate } from "@/lib/optical/doctor-validation";
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

	// Registered Entities State
	const [stores, setStores] = useState<StoreItem[]>([]);
	const [sellers, setSellers] = useState<SellerItem[]>([]);
	const [doctors, setDoctors] = useState<DoctorItem[]>([]);
	const [storeName, setStoreName] = useState("Conceição (Matriz)");
	const [sellerName, setSellerName] = useState("Fabiano");
	const [doctorName, setDoctorName] = useState("");
	const [doctorCrm, setDoctorCrm] = useState("");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

	// Quick New Doctor Modal
	const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
	const [newDocNome, setNewDocNome] = useState("");
	const [newDocCrm, setNewDocCrm] = useState("");
	const [newDocClinica, setNewDocClinica] = useState("");
	const [newDocError, setNewDocError] = useState("");

	// Frame Modes (Estoque da Loja vs Trazida pelo Cliente)
	const [aro1FrameMode, setAro1FrameMode] = useState<"STOCK" | "CUSTOMER">("STOCK");
	const [aro2FrameMode, setAro2FrameMode] = useState<"STOCK" | "CUSTOMER">("STOCK");

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

	// Financial & Discount state (R$ ou % com alçada e delegação ao gerente)
	const [discountMode, setDiscountMode] = useState<"BRL" | "PCT">("BRL");
	const [discountValue, setDiscountValue] = useState<number>(0);
	const [isDiscountManagerApproved, setIsDiscountManagerApproved] = useState(false);
	const [managerPasswordModalOpen, setManagerPasswordModalOpen] = useState(false);
	const [managerPasswordInput, setManagerPasswordInput] = useState("");

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

	// Filtros avançados de Lentes (Tipo, IR, Busca) - Aro 1
	const [lensTypeFilter1, setLensTypeFilter1] = useState<string>("ALL");
	const [lensIndexFilter1, setLensIndexFilter1] = useState<string>("ALL");
	const [lensSearchQuery1, setLensSearchQuery1] = useState<string>("");

	// Filtros avançados de Lentes (Tipo, IR, Busca) - Aro 2
	const [lensTypeFilter2, setLensTypeFilter2] = useState<string>("ALL");
	const [lensIndexFilter2, setLensIndexFilter2] = useState<string>("ALL");
	const [lensSearchQuery2, setLensSearchQuery2] = useState<string>("");

	useEffect(() => {
		Promise.all([
			fetchSupabaseStores(),
			fetchSupabaseSellers(),
			fetchSupabaseDoctors(),
			fetchLensCatalog(),
			fetchFrameCatalog(),
		]).then(([loadedStores, loadedSellers, loadedDoctors, loadedLenses, loadedFrames]) => {
			setStores(loadedStores);
			setSellers(loadedSellers);
			setDoctors(loadedDoctors);
			setLensCatalog(loadedLenses);
			setFrameCatalog(loadedFrames);

			if (loadedStores.length > 0) {
				setStoreName(loadedStores[0]!.nome);
				const sellersForStore = loadedSellers.filter(
					(s) => !s.loja || s.loja === loadedStores[0]!.nome || s.loja.includes(loadedStores[0]!.nome)
				);
				if (sellersForStore.length > 0) {
					setSellerName(sellersForStore[0]!.nome);
				} else if (loadedSellers.length > 0) {
					setSellerName(loadedSellers[0]!.nome);
				}
			} else if (loadedSellers.length > 0) {
				setSellerName(loadedSellers[0]!.nome);
			}

			if (loadedDoctors.length > 0) {
				const firstDoc = loadedDoctors[0]!;
				setSelectedDoctorId(String(firstDoc.id ?? firstDoc.nome));
				setDoctorName(firstDoc.nome);
				setDoctorCrm(firstDoc.crm);
			}

			if (loadedFrames.length > 0) {
				const f = loadedFrames[0]!;
				setAro1((a) => ({
					...a,
					frameCode: f.produto.split(" ")[1] || f.produto.slice(0, 8),
					frameBrand: f.marca,
					frameModel: f.produto,
					framePrice: f.preco,
					frameType: f.tipo,
					frameFamily: f.familia,
					frameManufacturer: f.fabricante,
					frameAro: f.tamanhoAro,
					framePonte: f.tamanhoPonte,
				}));
			}
		});
	}, []);

	const filteredSellers = useMemo(() => {
		if (!storeName) return sellers;
		const matching = sellers.filter(
			(s) => !s.loja || s.loja === storeName || s.loja.toLowerCase().includes(storeName.toLowerCase())
		);
		return matching.length > 0 ? matching : sellers;
	}, [sellers, storeName]);

	// Filtros inteligentes de lentes por laboratório, tipo, IR e busca - Aro 1
	const filteredLensesAro1 = useMemo(() => {
		return lensCatalog.filter((l) => {
			if (aro1.lab && l.laboratorio.toLowerCase() !== aro1.lab.toLowerCase()) return false;
			if (lensTypeFilter1 !== "ALL" && l.tipo.toUpperCase() !== lensTypeFilter1.toUpperCase()) return false;
			if (lensIndexFilter1 !== "ALL" && l.indiceRefrativo !== lensIndexFilter1) return false;
			if (lensSearchQuery1.trim()) {
				const q = lensSearchQuery1.toLowerCase();
				const matchName = l.produto.toLowerCase().includes(q);
				const matchFamily = (l.familia || "").toLowerCase().includes(q);
				const matchTech = (l.tecnologia || "").toLowerCase().includes(q);
				if (!matchName && !matchFamily && !matchTech) return false;
			}
			return true;
		});
	}, [lensCatalog, aro1.lab, lensTypeFilter1, lensIndexFilter1, lensSearchQuery1]);

	// Filtros inteligentes de lentes por laboratório, tipo, IR e busca - Aro 2
	const filteredLensesAro2 = useMemo(() => {
		return lensCatalog.filter((l) => {
			if (aro2.lab && l.laboratorio.toLowerCase() !== aro2.lab.toLowerCase()) return false;
			if (lensTypeFilter2 !== "ALL" && l.tipo.toUpperCase() !== lensTypeFilter2.toUpperCase()) return false;
			if (lensIndexFilter2 !== "ALL" && l.indiceRefrativo !== lensIndexFilter2) return false;
			if (lensSearchQuery2.trim()) {
				const q = lensSearchQuery2.toLowerCase();
				const matchName = l.produto.toLowerCase().includes(q);
				const matchFamily = (l.familia || "").toLowerCase().includes(q);
				const matchTech = (l.tecnologia || "").toLowerCase().includes(q);
				if (!matchName && !matchFamily && !matchTech) return false;
			}
			return true;
		});
	}, [lensCatalog, aro2.lab, lensTypeFilter2, lensIndexFilter2, lensSearchQuery2]);

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
		(aro1FrameMode === "CUSTOMER" ? 0 : Number(aro1.framePrice) || 0) +
		(hasAro2 ? (aro2FrameMode === "CUSTOMER" ? 0 : Number(aro2.framePrice) || 0) : 0);
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

	// Desconto efetivo em R$ e % com modalidade selecionável
	const effectiveDiscountPct = useMemo(() => {
		if (discountMode === "PCT") {
			return Math.min(100, Math.max(0, discountValue));
		}
		return grossTotal > 0 ? (Math.min(grossTotal, discountValue) / grossTotal) * 100 : 0;
	}, [discountMode, discountValue, grossTotal]);

	const effectiveDiscountBrl = useMemo(() => {
		if (discountMode === "BRL") {
			return Math.min(grossTotal, Math.max(0, discountValue));
		}
		return Math.round((grossTotal * (effectiveDiscountPct / 100)) * 100) / 100;
	}, [discountMode, discountValue, grossTotal, effectiveDiscountPct]);

	const totalAmount = Math.max(0, grossTotal - effectiveDiscountBrl);

	// Auditoria de alçada de desconto de vendedor vs gerente
	const discountAudit = useMemo(() => {
		return checkDiscountLimit("VENDEDOR", effectiveDiscountPct, aro1.lab);
	}, [effectiveDiscountPct, aro1.lab]);

	const exceedsSellerLimit = !discountAudit.allowed && !isDiscountManagerApproved;

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

	// Cadastro Rápido de Médico
	const handleCreateQuickDoctor = async () => {
		setNewDocError("");
		if (!newDocNome.trim()) {
			setNewDocError("Por favor, preencha o nome do médico.");
			return;
		}
		const crmValidation = validateCrm(newDocCrm);
		if (!crmValidation.isValid) {
			setNewDocError(crmValidation.error || "CRM inválido.");
			return;
		}
		const dupCheck = isDoctorDuplicate({ nome: newDocNome, crm: newDocCrm }, doctors);
		if (dupCheck.isDuplicate) {
			setNewDocError(dupCheck.reason || "Já existe um médico cadastrado com este CRM.");
			return;
		}
		const newDoc: DoctorItem = {
			id: `doc_${Date.now()}`,
			nome: newDocNome.trim(),
			crm: newDocCrm.trim().toUpperCase(),
			clinica: newDocClinica.trim() || undefined,
		};
		const updated = [newDoc, ...doctors];
		setDoctors(updated);
		await saveSupabaseDoctors(updated);
		setSelectedDoctorId(String(newDoc.id));
		setDoctorName(newDoc.nome);
		setDoctorCrm(newDoc.crm);
		setIsNewDocModalOpen(false);
		setNewDocNome("");
		setNewDocCrm("");
		setNewDocClinica("");
		toast.success(`Médico ${newDoc.nome} cadastrado e vinculado com sucesso!`);
	};

	// Autorização de Desconto pelo Gerente
	const handleAuthorizeDiscount = () => {
		if (managerPasswordInput === "120212") {
			setIsDiscountManagerApproved(true);
			setManagerPasswordModalOpen(false);
			setManagerPasswordInput("");
			toast.success(
				`Desconto de ${effectiveDiscountPct.toFixed(1)}% autorizado pelo Gerente de Loja!`
			);
		} else {
			toast.error("Senha de Gerente incorreta! Tente novamente.");
		}
	};

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

		if (exceedsSellerLimit) {
			toast.error(
				`Desconto de ${effectiveDiscountPct.toFixed(1)}% excede o limite do vendedor (${discountAudit.maxAllowed}%). Solicite a autorização do Gerente de Loja.`
			);
			setManagerPasswordModalOpen(true);
			return;
		}

		setIsSubmitting(true);
		try {
			const currentStore = stores.find((s) => s.nome === storeName);
			const currentSeller = sellers.find((s) => s.nome === sellerName);

			const newOrder: OpticalOrder = {
				id: `ord_${Date.now()}`,
				orderNumber,
				store: { id: currentStore?.id ? String(currentStore.id) : "store_matriz", name: storeName },
				seller: { id: currentSeller?.id ? String(currentSeller.id) : "user_seller", name: sellerName },
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
				aro1: {
					...aro1,
					framePrice: aro1FrameMode === "CUSTOMER" ? 0 : aro1.framePrice,
				},
				hasAro2,
				isAro2CopyOfAro1: isAro2Copy,
				aro2: hasAro2
					? {
							...aro2,
							framePrice: aro2FrameMode === "CUSTOMER" ? 0 : aro2.framePrice,
						}
					: undefined,
				financials: {
					subtotalFrames,
					subtotalLenses,
					subtotalTreatments,
					discount: effectiveDiscountBrl,
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

			// Baixa de estoque automática apenas se for peça do estoque da loja
			if (aro1FrameMode === "STOCK" && aro1.frameCode && aro1.frameCode !== "CLIENTE") {
				await decrementFrameStock(aro1.frameCode, 1);
			}
			if (hasAro2 && aro2FrameMode === "STOCK" && aro2.frameCode && aro2.frameCode !== "CLIENTE") {
				await decrementFrameStock(aro2.frameCode, 1);
			}

			// Salvar OS principal
			addOrder(newOrder);

			// Desdobramento automático de 2º Par (Aro 2) para laboratório
			if (hasAro2) {
				const childOrderNumber = `${orderNumber}-B`;
				const childOrder: OpticalOrder = {
					id: `ord_${Date.now() + 1}_b`,
					orderNumber: childOrderNumber,
					parentOrderId: newOrder.id,
					store: { id: currentStore?.id ? String(currentStore.id) : "store_matriz", name: storeName },
					seller: { id: currentSeller?.id ? String(currentSeller.id) : "user_seller", name: sellerName },
					doctor: doctorName ? { name: doctorName, crm: doctorCrm } : undefined,
					status: "DIGITADA",
					orderDate: new Date().toISOString(),
					promisedDeliveryDate: new Date(`${promisedDate}T18:00:00Z`).toISOString(),
					patient: {
						...patient,
						name: patient.name.toUpperCase(),
					},
					aro1: {
						...aro2,
						framePrice: aro2FrameMode === "CUSTOMER" ? 0 : aro2.framePrice,
					},
					hasAro2: false,
					isAro2CopyOfAro1: false,
					financials: {
						subtotalFrames: aro2FrameMode === "CUSTOMER" ? 0 : Number(aro2.framePrice) || 0,
						subtotalLenses: aro2.differentLensesPerEye
							? (Number(aro2.lensPriceOd) || 0) + (Number(aro2.lensPriceOe) || 0)
							: Number(aro2.lensPrice) || 0,
						subtotalTreatments: aro2.noTreatment ? 0 : Number(aro2.treatmentPrice) || 0,
						discount: 0,
						totalAmount: 0,
						paymentMode: "TOTAL",
						paidAmount: 0,
						residualAmount: 0,
						paymentMethod1,
						paymentAmount1: 0,
						cardInstallments1: 1,
						notes: `OS vinculada de 2º Par (Dobro) desdobrada da OS Principal ${orderNumber}.`,
					},
					aiAudit: {
						ocrConfidence: 0.99,
						prescriptionVerified: true,
						labCostCrosscheck: "APPROVED",
						estimatedLabCost: Math.round((Number(aro2.lensPrice) || 0) * 0.42),
						grossMarginPercent: 55,
						cylinderTranspositionValid: true,
						diameterThicknessCheck: "OK",
						creditRiskCheck: "LOW",
						agentNotes: [
							`OS desdobrada de 2º Par da ${orderNumber} para conferência e montagem independente no laboratório ${aro2.lab}.`,
						],
						timelineEvents: [
							{
								id: `ev_${Date.now() + 2}`,
								time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
								title: "2º Par Desdobrado para Laboratório",
								detail: `OS ${childOrderNumber} vinculada à OS principal ${orderNumber}.`,
								status: "ok",
							},
						],
					},
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				addOrder(childOrder);
			}

			toast.success(
				hasAro2
					? `Ordens de Serviço ${orderNumber} e 2º Par ${orderNumber}-B emitidas com sucesso!`
					: `Ordem de Serviço ${orderNumber} emitida com sucesso!`,
				{
					description: `Paciente: ${patient.name.toUpperCase()} | Total: R$ ${totalAmount.toFixed(2)}`,
				}
			);

			if (onSuccess) {
				onSuccess(newOrder);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6 p-1">
			{/* Top Header Information & Stepper Flow Banner */}
			<div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Icon icon={Glasses} className="size-6" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="font-bold text-base tracking-tight text-foreground">
									Lançar OS — Nova Venda de Balcão Óptico
								</h2>
								<Badge
									variant="outline"
									className="font-mono text-xs font-bold text-primary border-primary/30"
								>
									{orderNumber}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Fluxo sequencial estruturado: Origem ➔ Paciente & Prescritor ➔ Receita ➔ Aro 1 ➔ Aro 2 ➔ Fechamento
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-[11px] font-semibold text-muted-foreground">Status Inicial:</span>
						<Badge variant="secondary" className="text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
							DIGITADA
						</Badge>
					</div>
				</div>

				{/* 6-Step Visual Indicator */}
				<div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs pt-1 border-t">
					<div className="p-2 rounded-lg border bg-primary/10 border-primary/30 text-primary font-bold flex items-center justify-center gap-1">
						<span>1. Origem</span>
					</div>
					<div className="p-2 rounded-lg border bg-primary/10 border-primary/30 text-primary font-bold flex items-center justify-center gap-1">
						<span>2. Paciente</span>
					</div>
					<div className="p-2 rounded-lg border bg-primary/10 border-primary/30 text-primary font-bold flex items-center justify-center gap-1">
						<span>3. Receita</span>
					</div>
					<div className="p-2 rounded-lg border bg-primary/10 border-primary/30 text-primary font-bold flex items-center justify-center gap-1">
						<span>4. Aro 1</span>
					</div>
					<div className="p-2 rounded-lg border bg-muted/40 border-border text-muted-foreground font-medium flex items-center justify-center gap-1">
						<span>5. Aro 2 {hasAro2 ? "✓" : "(Opt)"}</span>
					</div>
					<div className="p-2 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
						<span>6. Fechamento</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-6 w-full">
				{/* ETAPA 1: ORIGEM & ATENDIMENTO */}
				<div className="rounded-xl border bg-card p-5 shadow-xs">
					<div className="mb-4 flex items-center justify-between border-b pb-3">
						<div className="flex items-center gap-2 font-bold text-sm text-foreground">
							<Icon icon={Building} className="size-4 text-primary" />
							Etapa 1 • Origem & Atendimento na Loja
						</div>
						<Badge variant="outline" className="text-[10px] font-bold text-primary">
							Passo 1 de 6
						</Badge>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<Field>
							<FieldLabel htmlFor="order-store">Loja de Atendimento *</FieldLabel>
							<select
								id="order-store"
								value={storeName}
								onChange={(e) => {
									const newStore = e.target.value;
									setStoreName(newStore);
									const matchingSellers = sellers.filter(
										(s) => !s.loja || s.loja === newStore || s.loja.toLowerCase().includes(newStore.toLowerCase())
									);
									if (matchingSellers.length > 0) {
										setSellerName(matchingSellers[0]!.nome);
									}
								}}
								className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
								required
							>
								{stores.length === 0 && <option value="Conceição (Matriz)">Conceição (Matriz)</option>}
								{stores.map((s) => (
									<option key={s.id} value={s.nome}>
										{s.nome}
									</option>
								))}
							</select>
						</Field>

						<Field>
							<FieldLabel htmlFor="order-seller">Vendedor Responsável *</FieldLabel>
							<select
								id="order-seller"
								value={sellerName}
								onChange={(e) => setSellerName(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
								required
							>
								{filteredSellers.length === 0 && <option value="Fabiano">Fabiano</option>}
								{filteredSellers.map((s) => (
									<option key={s.id} value={s.nome}>
										{s.nome} {s.loja ? `— ${s.loja}` : ""}
									</option>
								))}
							</select>
						</Field>

						<Field>
							<FieldLabel htmlFor="order-promised-date">Promessa de Entrega *</FieldLabel>
							<Input
								id="order-promised-date"
								type="date"
								value={promisedDate}
								onChange={(e) => setPromisedDate(e.target.value)}
								className="h-8 text-xs font-medium"
								required
							/>
						</Field>
					</div>
				</div>

				{/* ETAPA 2: PACIENTE & MÉDICO PRESCRITOR */}
				<div className="rounded-xl border bg-card p-5 shadow-xs">
					<div className="mb-4 flex items-center justify-between border-b pb-3">
						<div className="flex items-center gap-2 font-bold text-sm text-foreground">
							<Icon icon={UserAvatar} className="size-4 text-primary" />
							Etapa 2 • Cadastro do Paciente & Médico Prescritor
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="text-[10px]">
								ViaCEP Ativo
							</Badge>
							<Badge variant="outline" className="text-[10px] font-bold text-primary">
								Passo 2 de 6
							</Badge>
						</div>
					</div>

					<FieldGroup className="gap-3">
						<Field>
							<FieldLabel htmlFor="patient-name">Nome Completo do Paciente *</FieldLabel>
							<Input
								id="patient-name"
								value={patient.name}
								onChange={(e) =>
									setPatient((p) => ({
										...p,
										name: e.target.value.toUpperCase(),
									}))
								}
								placeholder="DIGITE O NOME COMPLETO DO CLIENTE"
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
								<FieldLabel htmlFor="patient-birth">Data de Nascimento</FieldLabel>
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
								<FieldLabel htmlFor="patient-whatsapp">WhatsApp (Contato Principal) *</FieldLabel>
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
									className="text-xs font-semibold"
								/>
							</Field>
							<Field>
								<div className="flex items-center justify-between">
									<FieldLabel htmlFor="patient-phone">Tel. Secundário</FieldLabel>
									<button
										type="button"
										onClick={handleCloneWhatsApp}
										title="Clonar WhatsApp"
										className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
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
								onChange={(e) => setPatient((p) => ({ ...p, email: e.target.value }))}
								placeholder="cliente@email.com"
								className="text-xs"
							/>
						</Field>

						{/* Endereço & ViaCEP */}
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
								className="h-9 px-3 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
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
										Buscar CEP
									</>
								)}
							</Button>
						</div>

						<div className="grid grid-cols-4 gap-2">
							<Field className="col-span-3">
								<FieldLabel htmlFor="patient-street">Logradouro / Rua</FieldLabel>
								<Input
									id="patient-street"
									value={patient.street}
									onChange={(e) => setPatient((p) => ({ ...p, street: e.target.value }))}
									placeholder="Avenida / Rua"
									className="text-xs"
								/>
							</Field>
							<Field className="col-span-1">
								<FieldLabel htmlFor="patient-number">Nº</FieldLabel>
								<Input
									id="patient-number"
									value={patient.number}
									onChange={(e) => setPatient((p) => ({ ...p, number: e.target.value }))}
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
									onChange={(e) => setPatient((p) => ({ ...p, complement: e.target.value }))}
									placeholder="Apto / Bloco"
									className="text-xs"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="patient-neighborhood">Bairro</FieldLabel>
								<Input
									id="patient-neighborhood"
									value={patient.neighborhood}
									onChange={(e) => setPatient((p) => ({ ...p, neighborhood: e.target.value }))}
									placeholder="Bairro"
									className="text-xs"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="patient-city">Cidade / UF</FieldLabel>
								<div className="flex gap-1">
									<Input
										id="patient-city"
										value={patient.city}
										onChange={(e) => setPatient((p) => ({ ...p, city: e.target.value }))}
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

						{/* Sub-bloco Médico Oftalmologista Prescritor com Integração ao Cadastro */}
						<Separator className="my-2" />
						<div className="p-3.5 rounded-xl bg-muted/30 border space-y-2.5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
									<Icon icon={Receipt} className="size-3.5 text-primary" />
									Médico Oftalmologista / Optometrista Prescritor
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setNewDocError("");
										setIsNewDocModalOpen(true);
									}}
									className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 cursor-pointer gap-1"
								>
									<Icon icon={Add} className="size-3" />
									+ Cadastrar Novo Médico
								</Button>
							</div>

							<div>
								<FieldLabel className="text-[10px] font-semibold text-muted-foreground mb-1 block">
									Selecionar Médico do Cadastro
								</FieldLabel>
								<select
									value={selectedDoctorId}
									onChange={(e) => {
										const val = e.target.value;
										setSelectedDoctorId(val);
										const doc = doctors.find((d) => String(d.id ?? d.nome) === val);
										if (doc) {
											setDoctorName(doc.nome);
											setDoctorCrm(doc.crm);
										} else {
											setDoctorName("");
											setDoctorCrm("");
										}
									}}
									className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
								>
									<option value="">Selecione um médico cadastrado...</option>
									{doctors.map((d) => (
										<option key={d.id ?? d.nome} value={String(d.id ?? d.nome)}>
											[{d.crm}] {d.nome} {d.clinica ? `— ${d.clinica}` : ""}
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-3 gap-2 pt-1">
								<div className="col-span-2">
									<FieldLabel className="text-[10px]">Nome do Médico</FieldLabel>
									<Input
										value={doctorName}
										onChange={(e) => setDoctorName(e.target.value)}
										placeholder="Dr(a). Nome do Médico"
										className="h-7 text-xs"
									/>
								</div>
								<div className="col-span-1">
									<FieldLabel className="text-[10px]">CRM / UF</FieldLabel>
									<Input
										value={doctorCrm}
										onChange={(e) => setDoctorCrm(e.target.value.toUpperCase())}
										placeholder="CRM/UF"
										className="h-7 text-xs font-mono uppercase"
									/>
								</div>
							</div>
						</div>
					</FieldGroup>
				</div>

				{/* ETAPA 3: RECEITA & DIOPTRIAS CLÍNICAS */}
				<div className="rounded-xl border bg-card p-5 shadow-xs">
					<div className="mb-4 flex items-center justify-between border-b pb-3">
						<div className="flex items-center gap-2 font-bold text-sm text-foreground">
							<Icon icon={Receipt} className="size-4 text-primary" />
							Etapa 3 • Prescrição Médica & Dioptrias Clínicas (OD / OE)
						</div>
						<Badge variant="outline" className="text-[10px] font-bold text-primary">
							Passo 3 de 6
						</Badge>
					</div>

					<p className="text-xs text-muted-foreground mb-4">
						Lance as dioptrias esféricas, cilíndricas, eixos, adições e DNP da receita médica. A IA óptica fará a validação automática de consistência e transposição.
					</p>

					<OpticalDioptersTable
						idPrefix="receita"
						title="Dioptrias e Medidas da Prescrição Médica"
						value={aro1.diopters}
						onChange={(diopters) => setAro1((a) => ({ ...a, diopters }))}
						onOcrCompleted={(doc, pat) => {
							if (doc) setDoctorName(doc);
							if (pat && !patient.name)
								setPatient((p) => ({ ...p, name: pat.toUpperCase() }));
						}}
					/>
				</div>

				{/* ETAPA 4: ARO 1 (PRINCIPAL) */}
				<div className="rounded-xl border bg-card p-5 shadow-xs">
					<div className="mb-4 flex items-center justify-between border-b pb-3">
						<div className="flex items-center gap-2 font-bold text-sm text-foreground">
							<Icon icon={Glasses} className="size-4 text-primary" />
							Etapa 4 • Aro 1 (Armação & Lentes Principais)
						</div>
						<Badge variant="outline" className="text-[10px] font-bold text-primary">
							Passo 4 de 6 • 1º Par
						</Badge>
					</div>

					{/* Armação Aro 1 */}
					<div className="space-y-3">
						{/* Toggle: Peça do Estoque vs Armação Trazida */}
						<div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
							<div>
								<span className="text-xs font-semibold text-foreground block">
									Origem da Armação — Aro 1
								</span>
								<span className="text-[10px] text-muted-foreground">
									Defina se a armação é comprada do estoque da ótica ou trazida pelo próprio cliente
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<Button
									type="button"
									variant={aro1FrameMode === "STOCK" ? "default" : "outline"}
									size="sm"
									className="h-7 text-xs font-bold cursor-pointer"
									onClick={() => {
										setAro1FrameMode("STOCK");
										if (frameCatalog.length > 0) {
											const f = frameCatalog[0]!;
											setAro1((a) => ({
												...a,
												frameCode: f.produto.split(" ")[1] || f.produto.slice(0, 8),
												frameBrand: f.marca,
												frameModel: f.produto,
												framePrice: f.preco,
												frameType: f.tipo,
												frameFamily: f.familia,
												frameManufacturer: f.fabricante,
												frameAro: f.tamanhoAro,
												framePonte: f.tamanhoPonte,
											}));
										}
									}}
								>
									📦 Peça do Estoque
								</Button>
								<Button
									type="button"
									variant={aro1FrameMode === "CUSTOMER" ? "default" : "outline"}
									size="sm"
									className="h-7 text-xs font-bold cursor-pointer"
									onClick={() => {
										setAro1FrameMode("CUSTOMER");
										setAro1((a) => ({
											...a,
											frameCode: "CLIENTE",
											frameBrand: "Armação do Cliente",
											frameModel: "Armação Própria Trazida",
											framePrice: 0,
										}));
									}}
								>
									👓 Armação Trazida (R$ 0,00)
								</Button>
							</div>
						</div>

						{/* Seletor Dropdown do Catálogo de Armações (se estoque) */}
						{aro1FrameMode === "STOCK" ? (
							<div className="p-3.5 rounded-xl bg-muted/30 border space-y-2">
								<div className="flex items-center justify-between">
									<FieldLabel className="text-xs font-semibold">
										Selecionar Armação / Peça do Estoque
									</FieldLabel>
									{(() => {
										const currentFrame = frameCatalog.find(
											(f) =>
												f.produto === aro1.frameModel ||
												(f.marca === aro1.frameBrand && f.produto.includes(aro1.frameCode))
										);
										if (!currentFrame) return null;
										return (
											<Badge
												variant={currentFrame.estoque > 0 ? "secondary" : "destructive"}
												className={`text-[10px] font-bold ${
													currentFrame.estoque > 0
														? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
														: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
												}`}
											>
												{currentFrame.estoque > 0
													? `Estoque: ${currentFrame.estoque} un. disponíveis (baixa aut.)`
													: "⚠️ Sem Estoque no Momento"}
											</Badge>
										);
									})()}
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
									className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
								>
									<option value="">Selecione uma armação do estoque...</option>
									{frameCatalog.map((f) => (
										<option key={f.id} value={f.id}>
											[{f.marca}] {f.produto} ({f.tipo}) — Aro {f.tamanhoAro}/{f.tamanhoPonte} — R$ {f.preco} (Estoque: {f.estoque} un.)
										</option>
									))}
								</select>
							</div>
						) : (
							<div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
								<Icon icon={Glasses} className="size-4 shrink-0" />
								<span>Armação de propriedade do cliente cadastrada com valor R$ 0,00. Não haverá baixa de estoque físico na ótica.</span>
							</div>
						)}

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
									disabled={aro1FrameMode === "CUSTOMER"}
									value={aro1FrameMode === "CUSTOMER" ? 0 : aro1.framePrice}
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
					<div className="mt-4 flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
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
							<div className="p-3.5 rounded-xl bg-muted/30 border space-y-3">
								<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
									<div>
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

									<div>
										<FieldLabel className="mb-1 text-xs font-semibold">
											Tipo de Lente
										</FieldLabel>
										<select
											value={lensTypeFilter1}
											onChange={(e) => setLensTypeFilter1(e.target.value)}
											className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
										>
											<option value="ALL">Todos os Tipos</option>
											<option value="MULTIFOCAL">Multifocal</option>
											<option value="MONOFOCAL">Monofocal</option>
											<option value="BIFOCAL">Bifocal</option>
											<option value="OCUPACIONAL">Ocupacional</option>
										</select>
									</div>

									<div>
										<FieldLabel className="mb-1 text-xs font-semibold">
											Índice Refrativo (IR)
										</FieldLabel>
										<select
											value={lensIndexFilter1}
											onChange={(e) => setLensIndexFilter1(e.target.value)}
											className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
										>
											<option value="ALL">Todos os Índices</option>
											<option value="1.50">1.50 (Resina)</option>
											<option value="1.56">1.56 (Interm.)</option>
											<option value="1.59">1.59 (Poli)</option>
											<option value="1.60">1.60 (Alto)</option>
											<option value="1.67">1.67 (Ultra)</option>
											<option value="1.74">1.74 (Hi-Index)</option>
										</select>
									</div>

									<div>
										<FieldLabel className="mb-1 text-xs font-semibold">
											Buscar Lente
										</FieldLabel>
										<Input
											value={lensSearchQuery1}
											onChange={(e) => setLensSearchQuery1(e.target.value)}
											placeholder="Nome ou família..."
											className="h-8 text-xs bg-background"
										/>
									</div>
								</div>

								{/* Lente do Catálogo Dropdown */}
								<div>
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
										className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
									>
										<option value="">Selecione uma lente do catálogo...</option>
										{filteredLensesAro1.map((l) => (
											<option key={l.id} value={l.id}>
												[{l.laboratorio}] {l.produto} — {l.tipo} (IR {l.indiceRefrativo}) — R$ {l.preco}
											</option>
										))}
									</select>
								</div>

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
				</div>

				{/* ETAPA 5: ARO 2 (DOBRO / 2º PAR - OPCIONAL) */}
				<div className="rounded-xl border bg-card p-4 shadow-xs">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Switch
								id="aro2-toggle"
								checked={hasAro2}
								onCheckedChange={(checked) => setHasAro2(checked)}
							/>
							<div>
								<label
									htmlFor="aro2-toggle"
									className="cursor-pointer font-bold text-sm text-foreground block"
								>
									Etapa 5 • Ativar Aro 2 / Dobro (2º Par com Desconto)
								</label>
								<span className="text-[10px] text-muted-foreground">
									Gera OS filha vinculada no laboratório para montagem independente com 30% desc. no par
								</span>
							</div>
						</div>

						{hasAro2 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleCopyAro1}
								className="h-8 gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer"
							>
								<Icon icon={Copy} className="size-3.5" />
								Copiar Aro 1 (c/ 30% Desc.)
							</Button>
						)}
					</div>

					{hasAro2 && (
						<div className="mt-4 border-t pt-4 space-y-4">
							<div className="flex items-center justify-between pb-2 border-b">
								<div className="flex items-center gap-2 font-bold text-sm text-foreground">
									<Icon icon={Glasses} className="size-4 text-amber-600" />
									Aro 2 / Dobro — Desdobramento Técnico de Laboratório
								</div>
								<Badge variant="outline" className="text-xs font-semibold border-amber-500/30 text-amber-600">
									Gera OS Vinculada {orderNumber}-B
								</Badge>
							</div>

							{/* Armação Aro 2 */}
							<div className="space-y-3">
								<div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
									<div>
										<span className="text-xs font-semibold text-foreground block">
											Origem da Armação — Aro 2
										</span>
										<span className="text-[10px] text-muted-foreground">
											Defina se o 2º par usa armação do estoque ou trazida
										</span>
									</div>
									<div className="flex items-center gap-1.5">
										<Button
											type="button"
											variant={aro2FrameMode === "STOCK" ? "default" : "outline"}
											size="sm"
											className="h-7 text-xs font-bold cursor-pointer"
											onClick={() => {
												setAro2FrameMode("STOCK");
												if (frameCatalog.length > 1) {
													const f = frameCatalog[1]!;
													setAro2((a) => ({
														...a,
														frameCode: f.produto.split(" ")[1] || f.produto.slice(0, 8),
														frameBrand: f.marca,
														frameModel: f.produto,
														framePrice: f.preco,
														frameType: f.tipo,
														frameFamily: f.familia,
														frameManufacturer: f.fabricante,
														frameAro: f.tamanhoAro,
														framePonte: f.tamanhoPonte,
													}));
												}
											}}
										>
											📦 Peça do Estoque
										</Button>
										<Button
											type="button"
											variant={aro2FrameMode === "CUSTOMER" ? "default" : "outline"}
											size="sm"
											className="h-7 text-xs font-bold cursor-pointer"
											onClick={() => {
												setAro2FrameMode("CUSTOMER");
												setAro2((a) => ({
													...a,
													frameCode: "CLIENTE",
													frameBrand: "Armação do Cliente",
													frameModel: "Armação Própria Trazida",
													framePrice: 0,
												}));
											}}
										>
											👓 Armação Trazida (R$ 0,00)
										</Button>
									</div>
								</div>

								{aro2FrameMode === "STOCK" ? (
									<div className="p-3.5 rounded-xl bg-muted/30 border space-y-2">
										<div className="flex items-center justify-between">
											<FieldLabel className="text-xs font-semibold">
												Selecionar Armação / Peça do Estoque — Aro 2 (2º Par)
											</FieldLabel>
											{(() => {
												const currentFrame = frameCatalog.find(
													(f) =>
														f.produto === aro2.frameModel ||
														(f.marca === aro2.frameBrand && f.produto.includes(aro2.frameCode))
												);
												if (!currentFrame) return null;
												return (
													<Badge
														variant={currentFrame.estoque > 0 ? "secondary" : "destructive"}
														className={`text-[10px] font-bold ${
															currentFrame.estoque > 0
																? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
																: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
														}`}
													>
														{currentFrame.estoque > 0
															? `Estoque: ${currentFrame.estoque} un. disponíveis`
															: "⚠️ Sem Estoque no Momento"}
													</Badge>
												);
											})()}
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
											className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
										>
											<option value="">Selecione uma armação do estoque para o 2º par...</option>
											{frameCatalog.map((f) => (
												<option key={f.id} value={f.id}>
													[{f.marca}] {f.produto} ({f.tipo}) — Aro {f.tamanhoAro}/{f.tamanhoPonte} — R$ {f.preco} (Estoque: {f.estoque} un.)
												</option>
											))}
										</select>
									</div>
								) : (
									<div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
										<Icon icon={Glasses} className="size-4 shrink-0" />
										<span>Armação de 2º par de propriedade do cliente — R$ 0,00 sem baixa de estoque.</span>
									</div>
								)}

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
											disabled={aro2FrameMode === "CUSTOMER"}
											value={aro2FrameMode === "CUSTOMER" ? 0 : aro2.framePrice}
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
							</div>

							{/* Lente & Laboratório Aro 2 */}
							<div className="space-y-3">
								<div className="p-3.5 rounded-xl bg-muted/30 border space-y-3">
									<div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
										<div>
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

										<div>
											<FieldLabel className="mb-1 text-xs font-semibold">
												Tipo de Lente (2º Par)
											</FieldLabel>
											<select
												value={lensTypeFilter2}
												onChange={(e) => setLensTypeFilter2(e.target.value)}
												className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
											>
												<option value="ALL">Todos os Tipos</option>
												<option value="MULTIFOCAL">Multifocal</option>
												<option value="MONOFOCAL">Monofocal</option>
												<option value="BIFOCAL">Bifocal</option>
												<option value="OCUPACIONAL">Ocupacional</option>
											</select>
										</div>

										<div>
											<FieldLabel className="mb-1 text-xs font-semibold">
												Índice Refrativo (IR)
											</FieldLabel>
											<select
												value={lensIndexFilter2}
												onChange={(e) => setLensIndexFilter2(e.target.value)}
												className="w-full h-8 px-2 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
											>
												<option value="ALL">Todos os Índices</option>
												<option value="1.50">1.50 (Resina)</option>
												<option value="1.56">1.56 (Interm.)</option>
												<option value="1.59">1.59 (Poli)</option>
												<option value="1.60">1.60 (Alto)</option>
												<option value="1.67">1.67 (Ultra)</option>
												<option value="1.74">1.74 (Hi-Index)</option>
											</select>
										</div>

										<div>
											<FieldLabel className="mb-1 text-xs font-semibold">
												Buscar Lente (2º Par)
											</FieldLabel>
											<Input
												value={lensSearchQuery2}
												onChange={(e) => setLensSearchQuery2(e.target.value)}
												placeholder="Nome ou família..."
												className="h-8 text-xs bg-background"
											/>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<FieldLabel className="text-xs font-semibold">
												Lente do Catálogo (2º Par com Desconto)
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
											className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
										>
											<option value="">Selecione uma lente para o 2º par...</option>
											{filteredLensesAro2.map((l) => (
												<option key={l.id} value={l.id}>
													[{l.laboratorio}] {l.produto} — {l.tipo} (IR {l.indiceRefrativo}) — R$ {l.preco}
												</option>
											))}
										</select>
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

				{/* ETAPA 6: FECHAMENTO COMERCIAL, DESCONTOS & RECEBIMENTO */}
				<div className="rounded-xl border bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-xs">
					<div className="mb-4 flex items-center justify-between border-b pb-3">
						<div className="flex items-center gap-2 font-bold text-sm text-foreground">
							<Icon icon={Money} className="size-4 text-emerald-500" />
							Etapa 6 • Fechamento Comercial, Descontos & Recebimento
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant={paymentMode === "TOTAL" ? "default" : "secondary"}
								className="text-xs font-medium"
							>
								{paymentMode === "TOTAL" ? "Quitação Total (100%)" : "Apenas Sinal (Entrada)"}
							</Badge>
							<Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30">
								Passo 6 de 6
							</Badge>
						</div>
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
									className="h-9 text-xs font-semibold cursor-pointer"
									onClick={() => setPaymentMode("TOTAL")}
								>
									Quitação Total (100%)
								</Button>
								<Button
									type="button"
									variant={paymentMode === "SINAL" ? "default" : "outline"}
									size="sm"
									className="h-9 text-xs font-semibold cursor-pointer"
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

					{/* Parcelamento e Desconto */}
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

						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<FieldLabel className="text-xs font-semibold">
									Desconto Comercial
								</FieldLabel>
								<div className="flex items-center rounded-md border bg-muted/50 p-0.5 text-[11px] font-bold">
									<button
										type="button"
										onClick={() => setDiscountMode("BRL")}
										className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
											discountMode === "BRL"
												? "bg-primary text-primary-foreground shadow-2xs"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										R$ Reais
									</button>
									<button
										type="button"
										onClick={() => setDiscountMode("PCT")}
										className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
											discountMode === "PCT"
												? "bg-primary text-primary-foreground shadow-2xs"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										% Porcento
									</button>
								</div>
							</div>
							<div className="relative">
								<Input
									type="number"
									step={discountMode === "BRL" ? "10" : "1"}
									max={discountMode === "PCT" ? 100 : undefined}
									value={discountValue || ""}
									onChange={(e) => {
										setDiscountValue(Number(e.target.value) || 0);
										setIsDiscountManagerApproved(false);
									}}
									placeholder={discountMode === "BRL" ? "0,00" : "0%"}
									className="h-8 text-xs font-semibold pr-20"
								/>
								<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground">
									{discountMode === "BRL"
										? `${effectiveDiscountPct.toFixed(1)}%`
										: `R$ ${effectiveDiscountBrl.toFixed(2)}`}
								</span>
							</div>

							{/* Indicador de Alçada / Delegação ao Gerente */}
							{exceedsSellerLimit && (
								<div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2 flex items-center justify-between gap-2 mt-1.5">
									<div className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
										<Icon icon={Locked} className="size-3.5 text-amber-600 shrink-0" />
										<span>
											{effectiveDiscountPct.toFixed(1)}% excede o teto ({discountAudit.maxAllowed}%).
										</span>
									</div>
									<Button
										type="button"
										size="sm"
										onClick={() => setManagerPasswordModalOpen(true)}
										className="h-6 px-2 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1 shrink-0"
									>
										<Icon icon={Locked} className="size-3" />
										Delegar ao Gerente
									</Button>
								</div>
							)}

							{isDiscountManagerApproved && (
								<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 px-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
									<Icon icon={Checkmark} className="size-3.5" />
									<span>Desconto autorizado pelo Gerente de Loja ({effectiveDiscountPct.toFixed(1)}%).</span>
								</div>
							)}
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
							{effectiveDiscountBrl > 0 && (
								<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
									<span>Desconto Concedido ({effectiveDiscountPct.toFixed(1)}%):</span>
									<span className="font-mono">
										- R$ {effectiveDiscountBrl.toFixed(2)}
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
								className={`flex justify-between text-sm font-bold p-2.5 rounded-md mt-1 ${
									residualAmount > 0
										? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
										: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
								}`}
							>
								<span className="flex items-center gap-1.5">
									Saldo Residual a Receber:
									{residualAmount > 0 && (
										<span className="text-[10px] font-normal text-muted-foreground">
											(Cobrar na retirada do óculos)
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
								Nota Fiscal (NFC-e / NF-e) Emitida?
							</span>
							<span className="text-[10px] text-muted-foreground">
								Assinalar se a nota fiscal da venda já foi emitida na SEFAZ
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
								className="cursor-pointer"
							>
								Cancelar
							</Button>
						)}
						<Button
							type="submit"
							size="default"
							disabled={isSubmitting}
							className="h-10 px-6 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden cursor-pointer"
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

			{/* MODAL RÁPIDO DE CADASTRO DE NOVO MÉDICO */}
			{isNewDocModalOpen && (
				<Dialog
					open={true}
					onOpenChange={(open) => {
						if (!open) {
							setIsNewDocModalOpen(false);
							setNewDocError("");
						}
					}}
				>
					<DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								<Icon icon={Receipt} className="size-4 text-primary" />
								Cadastro Rápido de Médico Oftalmologista
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Cadastre o médico com validação de CRM pelo CFM para vincular à OS.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-3.5 py-2 text-xs">
							{newDocError && (
								<div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium text-xs">
									⚠️ {newDocError}
								</div>
							)}

							<div className="space-y-1">
								<label className="font-semibold text-foreground">
									Nome Completo do Médico *
								</label>
								<Input
									value={newDocNome}
									onChange={(e) => setNewDocNome(e.target.value)}
									placeholder="Ex: Dr. Roberto Alencar"
									className="h-8 text-xs"
									autoFocus
								/>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="font-semibold text-foreground">
										CRM com UF *
									</label>
									<Input
										value={newDocCrm}
										onChange={(e) => setNewDocCrm(e.target.value.toUpperCase())}
										placeholder="Ex: 123456/SP"
										className="h-8 text-xs font-mono uppercase"
									/>
								</div>
								<div className="space-y-1">
									<label className="font-semibold text-foreground">
										Clínica / Consultório
									</label>
									<Input
										value={newDocClinica}
										onChange={(e) => setNewDocClinica(e.target.value)}
										placeholder="Ex: Clínica Visão"
										className="h-8 text-xs"
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 pt-3 border-t">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setIsNewDocModalOpen(false);
										setNewDocError("");
									}}
									className="h-8 text-xs cursor-pointer"
								>
									Cancelar
								</Button>
								<Button
									type="button"
									size="sm"
									onClick={handleCreateQuickDoctor}
									className="h-8 text-xs font-bold cursor-pointer gap-1.5"
								>
									<Icon icon={Checkmark} className="size-3.5" />
									Salvar e Vincular à OS
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* MODAL DELEGAÇÃO AO GERENTE PARA AUTORIZAÇÃO DE DESCONTO */}
			{managerPasswordModalOpen && (
				<Dialog
					open={true}
					onOpenChange={(open) => {
						if (!open) {
							setManagerPasswordModalOpen(false);
							setManagerPasswordInput("");
						}
					}}
				>
					<DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								<Icon icon={Locked} className="size-4 text-amber-500" />
								Delegue ao Gerente • Autorização de Desconto
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4 py-2 text-xs">
							<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-1.5">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Vendedor Solicitante:</span>
									<span className="font-bold text-foreground">{sellerName}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Desconto Solicitado:</span>
									<span className="font-bold font-mono text-amber-700 dark:text-amber-300">
										{effectiveDiscountPct.toFixed(1)}% (R$ {effectiveDiscountBrl.toFixed(2)})
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Teto do Vendedor:</span>
									<span className="font-bold font-mono text-foreground">
										{discountAudit.maxAllowed}%
									</span>
								</div>
								<p className="text-[11px] text-muted-foreground pt-1 border-t border-amber-200 dark:border-amber-800">
									Para liberar um desconto superior ao teto do vendedor (alçada até 20% do gerente), o gerente responsável deve autorizar com sua credencial de acesso.
								</p>
							</div>

							<div className="space-y-1.5">
								<label className="font-semibold text-foreground">
									Senha do Gerente de Loja
								</label>
								<Input
									type="password"
									value={managerPasswordInput}
									onChange={(e) => setManagerPasswordInput(e.target.value)}
									placeholder="Digite a senha do gerente..."
									className="h-9 text-sm font-mono"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAuthorizeDiscount();
										}
									}}
								/>
								<span className="text-[10px] text-muted-foreground">
									Dica de segurança da rede: credencial restrita do gerente (120212).
								</span>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2 border-t">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setManagerPasswordModalOpen(false);
										setManagerPasswordInput("");
									}}
									className="h-8 text-xs cursor-pointer"
								>
									Cancelar
								</Button>
								<Button
									type="button"
									size="sm"
									onClick={handleAuthorizeDiscount}
									className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5"
								>
									<Icon icon={Checkmark} className="size-3.5" />
									Autorizar Desconto
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</form>
	);
}
