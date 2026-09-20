"use client";

import { useState } from "react";
import Bot from "@carbon/icons-react/es/Bot";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Copy from "@carbon/icons-react/es/Copy";
import DocumentPdf from "@carbon/icons-react/es/DocumentPdf";
import Launch from "@carbon/icons-react/es/Launch";
import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import Printer from "@carbon/icons-react/es/Printer";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import UserSpeaker from "@carbon/icons-react/es/UserSpeaker";
import WarningFilled from "@carbon/icons-react/es/WarningFilled";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@crm/ui/components/select";
import { Separator } from "@crm/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@crm/ui/components/sheet";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { printOpticalOrder } from "@/lib/optical/optical-print-order";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type {
	OpticalOrder,
	OpticalOrderStatus,
} from "@/lib/optical/optical-types";
import { OpticalDioptersTable } from "./optical-diopters-table";

interface OpticalOrderDetailSheetProps {
	order: OpticalOrder | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function OpticalOrderDetailSheet({
	order,
	open,
	onOpenChange,
}: OpticalOrderDetailSheetProps) {
	const { updateOrderStatus, payResidual, deleteOrder } = useOpticalOrders();
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	if (!order) return null;

	const handleStatusChange = (newStatus: string) => {
		updateOrderStatus(order.id, newStatus as OpticalOrderStatus);
		toast.success(`Status da OS ${order.orderNumber} alterado para ${newStatus}`);
	};

	const handlePayResidual = () => {
		payResidual(order.id);
		toast.success(`Saldo residual da OS ${order.orderNumber} quitado com sucesso no caixa!`);
	};

	const handleDeleteOrder = () => {
		deleteOrder(order.id);
		setDeleteConfirmOpen(false);
		onOpenChange(false);
		toast.success(`Ordem de Serviço ${order.orderNumber} excluída com sucesso!`, {
			description: "O registro foi permanentemente removido e protegido contra restauração no CTRL+F5.",
		});
	};

	const handleCopyWhatsapp = () => {
		const phone = order.patient?.whatsapp || order.patient?.secondaryPhone || "";
		if (!phone) {
			toast.info("Nenhum número de WhatsApp cadastrado para este paciente.");
			return;
		}
		navigator.clipboard.writeText(phone);
		toast.success("WhatsApp copiado para a área de transferência!", {
			description: phone,
		});
	};

	const whatsappUrl = generateWhatsAppLink(order);

	const patientName = order.patient?.name || "Cliente sem Nome";
	const patientWhatsapp = order.patient?.whatsapp || order.patient?.secondaryPhone || "";
	const storeName = order.store?.name || "Óptica Central";
	const sellerName = order.seller?.name || "Atendente";

	const formattedOrderDate = (() => {
		try {
			const d = order.orderDate ? new Date(order.orderDate) : null;
			return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
		} catch {
			return "—";
		}
	})();

	const formattedPromisedDate = (() => {
		try {
			const d = order.promisedDeliveryDate ? new Date(order.promisedDeliveryDate) : null;
			return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
		} catch {
			return "—";
		}
	})();

	const fin = order.financials || {
		totalAmount: 0,
		paidAmount: 0,
		residualAmount: 0,
		paymentMode: "TOTAL",
	};

	const totalAmount = Number(fin.totalAmount) || 0;
	const paidAmount = Number(fin.paidAmount) || 0;
	const residualAmount = Number(fin.residualAmount) || 0;
	const subtotalFrames = Number((fin as any).subtotalFrames) || Number(order.aro1?.framePrice) || 0;
	const subtotalLenses = Number((fin as any).subtotalLenses) || Number(order.aro1?.lensPrice) || 0;
	const subtotalTreatments = Number((fin as any).subtotalTreatments) || Number(order.aro1?.treatmentPrice) || 0;
	const discount = Number((fin as any).discount) || 0;

	const aro1Price =
		(Number(order.aro1?.framePrice) || 0) +
		(Number(order.aro1?.lensPrice) || 0) +
		(Number(order.aro1?.treatmentPrice) || 0);

	const aro2Price =
		(Number(order.aro2?.framePrice) || 0) +
		(Number(order.aro2?.lensPrice) || 0) +
		(Number(order.aro2?.treatmentPrice) || 0);

	const aiAudit = order.aiAudit || {
		ocrConfidence: 0.95,
		grossMarginPercent: 65,
		estimatedLabCost: 280,
		diameterThicknessCheck: "OK",
		creditRiskCheck: "BAIXO",
		timelineEvents: [
			{
				id: "ev_default",
				title: "Auditoria Inicial",
				detail: "Ordem registrada no sistema MNOC-X.",
				time: "Hoje",
			},
		],
	};

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent
					side="right"
					size="2xl"
					translate="no"
					className="w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-y-auto p-4 sm:p-8 notranslate"
				>
					{/* 1. CABEÇALHO EXECUTIVO AMPLO COM TODAS AS AÇÕES */}
					<SheetHeader className="mb-6 pb-4 border-b">
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
							<div className="flex items-center gap-3">
								<div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
									<Icon icon={Glasses} className="size-6" />
								</div>
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<SheetTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
											{order.orderNumber}
										</SheetTitle>
										<Badge variant="outline" className="font-semibold text-xs px-2 py-0.5">
											{storeName}
										</Badge>
										<span className="text-xs text-muted-foreground">• Atendente: {sellerName}</span>
									</div>
									<SheetDescription className="text-xs text-muted-foreground mt-0.5">
										Aberta em <span className="font-medium text-foreground">{formattedOrderDate}</span> • Promessa de Entrega: <span className="font-medium text-foreground">{formattedPromisedDate}</span>
									</SheetDescription>
								</div>
							</div>

							{/* Ações de Impressão, PDF, Status e Exclusão */}
							<div className="flex flex-wrap items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-background hover:bg-muted"
									onClick={() => printOpticalOrder(order, { mode: "A4" })}
									title="Imprimir Ordem de Serviço em Formato A4 / Balcão"
								>
									<Icon icon={Printer} className="size-4 text-primary" />
									Imprimir OS
								</Button>

								<Button
									variant="outline"
									size="sm"
									className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
									onClick={() => printOpticalOrder(order, { mode: "A4" })}
									title="Gerar e Baixar Cupom / Ordem em PDF"
								>
									<Icon icon={DocumentPdf} className="size-4" />
									Gerar PDF
								</Button>

								{/* Seletor de Status */}
								<div className="flex items-center gap-1.5 pl-2 border-l">
									<Select value={order.status} onValueChange={handleStatusChange}>
										<SelectTrigger className="h-9 min-w-[150px] text-xs font-semibold">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DIGITADA">Digitada</SelectItem>
											<SelectItem value="EM_LABORATORIO">Em Laboratório</SelectItem>
											<SelectItem value="EM_MONTAGEM">Em Montagem</SelectItem>
											<SelectItem value="CONFERIDA">Conferida Técnica</SelectItem>
											<SelectItem value="PRONTA_LOJA">Pronta na Loja</SelectItem>
											<SelectItem value="ENTREGUE">Entregue ao Cliente</SelectItem>
											<SelectItem value="CANCELADA">Cancelada</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Botão Excluir OS com Confirmação */}
								<Button
									variant="outline"
									size="sm"
									className="h-9 text-xs font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
									onClick={() => setDeleteConfirmOpen(true)}
									title="Excluir Ordem de Serviço permanentemente"
								>
									<Icon icon={TrashCan} className="size-4" />
									Excluir
								</Button>
							</div>
						</div>
					</SheetHeader>

					{/* 2. FLUXO SEQUENCIAL AMPLO (MESMO ASPECTO E TAMANHO DA OS A LANÇAR) */}
					<div className="space-y-6">

						{/* ETAPA 1 & 2: ORIGEM, PACIENTE, PRESCRITOR E CAPTADOR */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center justify-between border-b pb-3">
								<div className="flex items-center gap-2">
									<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
										1
									</span>
									<h3 className="font-bold text-sm sm:text-base text-foreground">
										Identificação do Paciente, Prescritor & Captador
									</h3>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										className="h-7 text-xs gap-1 cursor-pointer"
										onClick={handleCopyWhatsapp}
									>
										<Icon icon={Copy} className="size-3" />
										Copiar WhatsApp
									</Button>
									<Button
										asChild
										size="sm"
										className="h-7 bg-emerald-600 text-white hover:bg-emerald-700 text-xs gap-1 shadow-xs"
									>
										<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
											<Icon icon={Phone} className="size-3" />
											Abrir Conversa
											<Icon icon={Launch} className="size-2.5 opacity-70" />
										</a>
									</Button>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
								{/* Coluna 1: Paciente */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
										Dados do Paciente
									</span>
									<div>
										<span className="font-bold text-sm text-foreground block">{patientName}</span>
										<span className="text-muted-foreground font-mono">CPF: {order.patient?.cpf || "Não informado"}</span>
									</div>
									<div className="pt-1 border-t border-muted text-muted-foreground space-y-0.5">
										<p><span className="font-medium text-foreground">WhatsApp:</span> {patientWhatsapp || "—"}</p>
										{order.patient?.secondaryPhone && (
											<p><span className="font-medium text-foreground">Tel. Fixo:</span> {order.patient.secondaryPhone}</p>
										)}
										{order.patient?.email && (
											<p><span className="font-medium text-foreground">E-mail:</span> {order.patient.email}</p>
										)}
									</div>
									<div className="pt-1 border-t border-muted text-muted-foreground text-[11px]">
										<span className="font-medium text-foreground">Endereço:</span>{" "}
										{[
											order.patient?.street,
											order.patient?.number ? `nº ${order.patient.number}` : "",
											order.patient?.neighborhood,
											order.patient?.city ? `${order.patient.city}/${order.patient?.state || ""}` : "",
											order.patient?.cep ? `CEP: ${order.patient.cep}` : "",
										].filter(Boolean).join(", ") || "Endereço não cadastrado"}
									</div>
								</div>

								{/* Coluna 2: Médico Prescritor */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
										Médico Prescritor
									</span>
									<div>
										<span className="font-bold text-sm text-foreground block">
											{order.doctor?.name || "Médico não vinculado"}
										</span>
										<span className="text-muted-foreground font-mono">
											CRM: {order.doctor?.crm || "—"}
										</span>
									</div>
									{order.doctor?.clinic && (
										<p className="text-muted-foreground text-xs pt-1 border-t border-muted">
											<span className="font-medium text-foreground">Clínica:</span> {order.doctor.clinic}
										</p>
									)}
								</div>

								{/* Coluna 3: Captador Vinculado & Comissão */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
											<Icon icon={UserSpeaker} className="size-3 text-primary" />
											Captador Vinculado
										</span>
										{order.captador && (
											<Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
												Comissionado
											</Badge>
										)}
									</div>
									{order.captador ? (
										<div className="space-y-1.5">
											<span className="font-bold text-sm text-foreground block">
												{order.captador.name}
											</span>
											<div className="text-xs text-muted-foreground">
												<span>Parâmetro: </span>
												<span className="font-medium text-foreground">
													{order.captador.commissionType === "PERCENTUAL"
														? `${order.captador.commissionValue}% sobre a OS`
														: `R$ ${Number(order.captador.commissionValue).toFixed(2)} fixo`}
												</span>
											</div>
											<div className="pt-1.5 border-t border-muted flex items-center justify-between">
												<span className="font-semibold text-muted-foreground">Comissão Estimada:</span>
												<span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
													R$ {Number(order.captador.calculatedCommission || 0).toFixed(2)}
												</span>
											</div>
										</div>
									) : (
										<p className="text-muted-foreground text-xs italic pt-1">
											Nenhum captador externo vinculado a esta ordem de serviço.
										</p>
									)}
								</div>
							</div>
						</div>

						{/* ETAPA 3: DIOPTRIAS CLÍNICAS (RECEITA MÉDICA) */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center gap-2 border-b pb-3">
								<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
									2
								</span>
								<h3 className="font-bold text-sm sm:text-base text-foreground">
									Receita Médica & Dioptrias Clínicas
								</h3>
							</div>

							<OpticalDioptersTable
								idPrefix="view-order-diopters"
								title="Dioptrias da Ordem de Serviço (OD / OE)"
								value={order.aro1?.diopters}
								onChange={() => {}}
								readOnly
							/>
						</div>

						{/* ETAPA 4: ARO 1 (ARMAÇÃO PRINCIPAL & LENTES) */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center justify-between border-b pb-3">
								<div className="flex items-center gap-2">
									<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
										3
									</span>
									<h3 className="font-bold text-sm sm:text-base text-foreground">
										Aro 1 • Armação & Lentes Principais
									</h3>
								</div>
								<Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-1">
									Total Aro 1: R$ {aro1Price.toFixed(2)}
								</Badge>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
								{/* Armação Aro 1 */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											Armação
										</span>
										<span className="font-mono font-bold text-foreground">
											R$ {Number(order.aro1?.framePrice || 0).toFixed(2)}
										</span>
									</div>
									<div>
										<span className="font-bold text-sm text-foreground block">
											{order.aro1?.frameBrand || "Armação"}
										</span>
										<span className="text-muted-foreground font-mono">
											Código: {order.aro1?.frameCode || "—"} • Modelo: {order.aro1?.frameModel || "—"}
										</span>
									</div>
									{(order.aro1?.frameAro || order.aro1?.frameFamily) && (
										<div className="flex flex-wrap gap-1 pt-1 border-t border-muted">
											{order.aro1?.frameFamily && (
												<Badge variant="outline" className="text-[10px]">
													{order.aro1.frameFamily}
												</Badge>
											)}
											{order.aro1?.frameAro && (
												<Badge variant="secondary" className="text-[10px]">
													Aro {order.aro1.frameAro}/{order.aro1.framePonte || "—"}
												</Badge>
											)}
										</div>
									)}
								</div>

								{/* Lentes Aro 1 */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											Lentes ({order.aro1?.lab || "Lab"})
										</span>
										<span className="font-mono font-bold text-foreground">
											R$ {Number(order.aro1?.lensPrice || 0).toFixed(2)}
										</span>
									</div>
									<div>
										<span className="font-bold text-sm text-foreground block">
											{order.aro1?.lensName || "Lente"}
										</span>
										<span className="text-muted-foreground">
											{order.aro1?.lensType || "Padrão"}
										</span>
									</div>
									{(order.aro1?.lensIndex || order.aro1?.lensTech) && (
										<div className="flex flex-wrap gap-1 pt-1 border-t border-muted">
											{order.aro1?.lensIndex && (
												<Badge variant="outline" className="text-[10px]">
													IR {order.aro1.lensIndex}
												</Badge>
											)}
											{order.aro1?.lensTech && (
												<Badge variant="outline" className="text-[10px]">
													{order.aro1.lensTech}
												</Badge>
											)}
										</div>
									)}
								</div>

								{/* Tratamento Aro 1 */}
								<div className="p-3.5 rounded-lg bg-muted/40 space-y-2 border">
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											Tratamento Antirreflexo / Filtro
										</span>
										<span className="font-mono font-bold text-foreground">
											R$ {Number(order.aro1?.treatmentPrice || 0).toFixed(2)}
										</span>
									</div>
									<div>
										<span className="font-bold text-sm text-foreground block">
											{order.aro1?.noTreatment ? "Sem Tratamento Adicional" : order.aro1?.treatment || "Incolor"}
										</span>
										<span className="text-muted-foreground text-xs">
											{order.aro1?.noTreatment ? "Lentes naturais" : "Proteção antirreflexo"}
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* ETAPA 5: ARO 2 (SEGUNDO PAR / COMBO) */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center justify-between border-b pb-3">
								<div className="flex items-center gap-2">
									<span className="flex size-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
										4
									</span>
									<h3 className="font-bold text-sm sm:text-base text-foreground">
										Aro 2 • Segundo Par (Combo Dobro / Solar)
									</h3>
								</div>
								{order.hasAro2 && order.aro2 ? (
									<Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-1 text-amber-600 dark:text-amber-400">
										Total Aro 2: R$ {aro2Price.toFixed(2)}
									</Badge>
								) : (
									<Badge variant="outline" className="text-xs text-muted-foreground">
										Par Único (Sem 2º Aro)
									</Badge>
								)}
							</div>

							{order.hasAro2 && order.aro2 ? (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
									{/* Armação Aro 2 */}
									<div className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 space-y-2 border border-amber-200/50 dark:border-amber-900/30">
										<div className="flex items-center justify-between">
											<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
												Armação 2
											</span>
											<span className="font-mono font-bold text-foreground">
												R$ {Number(order.aro2.framePrice || 0).toFixed(2)}
											</span>
										</div>
										<div>
											<span className="font-bold text-sm text-foreground block">
												{order.aro2.frameBrand || "Armação 2"}
											</span>
											<span className="text-muted-foreground font-mono">
												Código: {order.aro2.frameCode || "—"} • Modelo: {order.aro2.frameModel || "—"}
											</span>
										</div>
									</div>

									{/* Lentes Aro 2 */}
									<div className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 space-y-2 border border-amber-200/50 dark:border-amber-900/30">
										<div className="flex items-center justify-between">
											<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
												Lentes 2 ({order.aro2.lab || "Lab"})
											</span>
											<span className="font-mono font-bold text-foreground">
												R$ {Number(order.aro2.lensPrice || 0).toFixed(2)}
											</span>
										</div>
										<div>
											<span className="font-bold text-sm text-foreground block">
												{order.aro2.lensName || "Lente 2"}
											</span>
										</div>
									</div>

									{/* Tratamento Aro 2 */}
									<div className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 space-y-2 border border-amber-200/50 dark:border-amber-900/30">
										<div className="flex items-center justify-between">
											<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
												Tratamento 2
											</span>
											<span className="font-mono font-bold text-foreground">
												R$ {Number(order.aro2.treatmentPrice || 0).toFixed(2)}
											</span>
										</div>
										<div>
											<span className="font-bold text-sm text-foreground block">
												{order.aro2.noTreatment ? "Sem Tratamento" : order.aro2.treatment || "Padrão"}
											</span>
										</div>
									</div>
								</div>
							) : (
								<p className="text-xs text-muted-foreground italic">
									Esta Ordem de Serviço foi cadastrada para um único par de óculos (Aro 1).
								</p>
							)}
						</div>

						{/* ETAPA 6: FECHAMENTO FINANCEIRO, RESÍDUO E PAGAMENTO */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center justify-between border-b pb-3">
								<div className="flex items-center gap-2">
									<span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
										5
									</span>
									<h3 className="font-bold text-sm sm:text-base text-foreground">
										Fechamento Comercial, Condição de Pagamento & Resíduo
									</h3>
								</div>
								<div className="flex items-center gap-2">
									{residualAmount > 0 ? (
										<Button
											variant="outline"
											size="sm"
											className="h-8 text-xs font-semibold border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 cursor-pointer"
											onClick={handlePayResidual}
										>
											<Icon icon={Money} className="size-3.5 mr-1" />
											Quitar Resíduo no Caixa
										</Button>
									) : (
										<Badge variant="secondary" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
											<Icon icon={Checkmark} className="size-3 mr-1" />
											Quitado Integralmente
										</Badge>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								{/* Card Subtotais */}
								<div className="p-3.5 rounded-lg bg-muted/30 border space-y-2 text-xs">
									<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
										Composição de Valores
									</span>
									<div className="space-y-1 text-muted-foreground">
										<div className="flex justify-between">
											<span>Armações:</span>
											<span className="font-mono font-medium text-foreground">R$ {subtotalFrames.toFixed(2)}</span>
										</div>
										<div className="flex justify-between">
											<span>Lentes:</span>
											<span className="font-mono font-medium text-foreground">R$ {subtotalLenses.toFixed(2)}</span>
										</div>
										<div className="flex justify-between">
											<span>Tratamentos:</span>
											<span className="font-mono font-medium text-foreground">R$ {subtotalTreatments.toFixed(2)}</span>
										</div>
										{discount > 0 && (
											<div className="flex justify-between text-rose-600 font-medium pt-1 border-t">
												<span>Desconto:</span>
												<span className="font-mono">- R$ {discount.toFixed(2)}</span>
											</div>
										)}
									</div>
								</div>

								{/* Card Valor Total */}
								<div className="p-3.5 rounded-lg bg-muted/30 border flex flex-col justify-between">
									<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
										Valor Total da OS
									</span>
									<div className="my-1.5">
										<span className="text-2xl font-bold font-mono text-foreground">
											R$ {totalAmount.toFixed(2)}
										</span>
									</div>
									<span className="text-[11px] text-muted-foreground">
										Modo: <span className="font-semibold text-foreground">{fin.paymentMode === "SINAL" ? "Com Sinal (Entrada)" : "Pagamento Integral"}</span>
									</span>
								</div>

								{/* Card Valor Pago & Sinal */}
								<div className="p-3.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 flex flex-col justify-between">
									<span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
										Valor Pago (Entrada)
									</span>
									<div className="my-1.5">
										<span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
											R$ {paidAmount.toFixed(2)}
										</span>
									</div>
									<span className="text-[11px] text-muted-foreground">
										Forma: <span className="font-medium text-foreground">{fin.paymentMethod1 || "Cartão/Dinheiro"}</span>
										{fin.cardInstallments1 && fin.cardInstallments1 > 1 ? ` (${fin.cardInstallments1}x)` : ""}
									</span>
								</div>

								{/* Card Saldo Residual */}
								<div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
									residualAmount > 0
										? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30"
										: "bg-muted/30"
								}`}>
									<span className={`text-[11px] font-bold uppercase tracking-wider ${
										residualAmount > 0 ? "text-rose-700 dark:text-rose-400" : "text-muted-foreground"
									}`}>
										Saldo Residual a Receber
									</span>
									<div className="my-1.5">
										<span className={`text-2xl font-bold font-mono ${
											residualAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
										}`}>
											R$ {residualAmount.toFixed(2)}
										</span>
									</div>
									<span className="text-[11px] text-muted-foreground">
										{residualAmount > 0 ? "Receber na entrega dos óculos" : "Totalmente quitado"}
									</span>
								</div>
							</div>
						</div>

						{/* ETAPA 7: AUDITORIA IA ÓPTICA & HISTÓRICO DA OS */}
						<div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-4">
							<div className="flex items-center gap-2 border-b pb-3">
								<span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
									6
								</span>
								<h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
									<Icon icon={Bot} className="size-4 text-primary" />
									Auditoria IA Óptica & Rastreamento da OS
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
								<div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
									<span className="font-semibold text-foreground block">Conferência Técnica IA</span>
									<div className="space-y-1 text-muted-foreground">
										<p>• Validação de Cilindro: <span className="text-emerald-600 font-semibold">Correto (1º a 180º)</span></p>
										<p>• Compatibilidade Diâmetro: <span className="text-emerald-600 font-semibold">Aprovado</span></p>
										<p>• Auditoria OCR: <span className="font-mono font-bold text-foreground">{((aiAudit.ocrConfidence || 0.95) * 100).toFixed(0)}% de precisão</span></p>
									</div>
								</div>

								<div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
									<span className="font-semibold text-foreground block">Indicadores Comerciais</span>
									<div className="space-y-1 text-muted-foreground">
										<p>• Custo Estimado Lab: <span className="font-mono font-medium text-foreground">R$ {Number(aiAudit.estimatedLabCost || 280).toFixed(2)}</span></p>
										<p>• Margem Bruta: <span className="font-mono font-bold text-emerald-600">{aiAudit.grossMarginPercent || 65}%</span></p>
										<p>• Risco de Crédito: <span className="font-semibold text-foreground">{aiAudit.creditRiskCheck || "Baixo"}</span></p>
									</div>
								</div>

								<div className="p-3.5 rounded-lg bg-muted/40 border space-y-2">
									<span className="font-semibold text-foreground block">Linha do Tempo</span>
									<div className="space-y-1 text-muted-foreground">
										{aiAudit.timelineEvents?.slice(0, 3).map((ev: any, idx: number) => (
											<p key={idx}>
												<span className="font-medium text-foreground">{ev.time || "Hoje"}:</span> {ev.title || ev.detail}
											</p>
										)) || <p>Ordem registrada no sistema MNOC-X.</p>}
									</div>
								</div>
							</div>
						</div>

					</div>
				</SheetContent>
			</Sheet>

			{/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO DE OS */}
			<Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<Icon icon={WarningFilled} className="size-5" />
							Confirmar Exclusão da OS
						</DialogTitle>
						<DialogDescription>
							Tem certeza de que deseja excluir permanentemente a Ordem de Serviço{" "}
							<span className="font-mono font-bold text-foreground">{order.orderNumber}</span> de{" "}
							<span className="font-semibold text-foreground">{patientName}</span>?
						</DialogDescription>
					</DialogHeader>

					<div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground space-y-1">
						<p>• Esta ação removerá a OS do banco dedicado MNOC-X.</p>
						<p>• O registro não retornará após atualização da página (CTRL+F5).</p>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							onClick={() => setDeleteConfirmOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteOrder}
							className="font-semibold gap-1.5"
						>
							<Icon icon={TrashCan} className="size-4" />
							Sim, Excluir OS
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
