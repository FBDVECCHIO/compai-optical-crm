"use client";

import Bot from "@carbon/icons-react/es/Bot";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import Launch from "@carbon/icons-react/es/Launch";
import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import Time from "@carbon/icons-react/es/Time";
import WarningFilled from "@carbon/icons-react/es/WarningFilled";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@crm/ui/components/tabs";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
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
	const { updateOrderStatus, payResidual } = useOpticalOrders();

	if (!order) return null;

	const handleStatusChange = (newStatus: string) => {
		updateOrderStatus(order.id, newStatus as OpticalOrderStatus);
		toast.success(
			`Status da OS ${order.orderNumber} alterado para ${newStatus}`,
		);
	};

	const handlePayResidual = () => {
		payResidual(order.id);
		toast.success(
			`Saldo residual da OS ${order.orderNumber} quitado com sucesso no caixa!`,
		);
	};

	const whatsappUrl = generateWhatsAppLink(order);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-3xl overflow-y-auto p-6"
			>
				<SheetHeader className="mb-4 pb-3 border-b">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<Icon icon={Glasses} className="size-5" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<SheetTitle className="text-lg font-bold">
										{order.orderNumber}
									</SheetTitle>
									<Badge variant="outline" className="font-medium text-xs">
										{order.store.name}
									</Badge>
								</div>
								<SheetDescription className="text-xs">
									Aberta em{" "}
									{new Date(order.orderDate).toLocaleDateString("pt-BR")} por{" "}
									{order.seller.name}
								</SheetDescription>
							</div>
						</div>

						{/* Quick Status Updater */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground font-medium">
								Status:
							</span>
							<Select value={order.status} onValueChange={handleStatusChange}>
								<SelectTrigger className="h-8 w-44 text-xs font-semibold">
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
					</div>
				</SheetHeader>

				{/* Header Actions: WhatsApp & Residual Alert */}
				<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3.5 border">
					<div className="flex items-center gap-3">
						<div className="flex flex-col">
							<span className="text-[11px] text-muted-foreground">
								Paciente
							</span>
							<span className="font-bold text-sm text-foreground">
								{order.patient.name}
							</span>
							<span className="text-xs text-muted-foreground">
								WhatsApp: {order.patient.whatsapp}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{order.financials.residualAmount > 0 ? (
							<div className="flex items-center gap-2">
								<Badge
									variant="destructive"
									className="font-mono text-xs px-2.5 py-1"
								>
									Residual: R$ {order.financials.residualAmount.toFixed(2)}
								</Badge>
								<Button
									variant="outline"
									size="sm"
									className="h-8 text-xs font-medium border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400"
									onClick={handlePayResidual}
								>
									<Icon icon={Money} className="mr-1.5 size-3.5" />
									Quitar Residual
								</Button>
							</div>
						) : (
							<Badge
								variant="secondary"
								className="text-xs text-emerald-600 dark:text-emerald-400 font-medium"
							>
								<Icon icon={Checkmark} className="mr-1 size-3" />
								100% Quitado
							</Badge>
						)}

						<Button
							asChild
							size="sm"
							className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs gap-1.5 shadow-xs"
						>
							<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
								<Icon icon={Phone} className="size-3.5" />
								Avisar WhatsApp
								<Icon icon={Launch} className="size-3 opacity-70" />
							</a>
						</Button>
					</div>
				</div>

				{/* Tabs: Detalhes da OS | Financeiro | Agente IA */}
				<Tabs defaultValue="diopters" className="w-full">
					<TabsList className="grid w-full grid-cols-3 mb-4">
						<TabsTrigger value="diopters" className="text-xs font-semibold">
							Visão Geral & Dioptrias
						</TabsTrigger>
						<TabsTrigger value="financials" className="text-xs font-semibold">
							Financeiro & Pagamentos
						</TabsTrigger>
						<TabsTrigger value="ai" className="text-xs font-semibold gap-1.5">
							<Icon icon={Bot} className="size-3.5 text-primary" />
							Agente IA (Auditoria)
						</TabsTrigger>
					</TabsList>

					{/* TAB 1: VISÃO GERAL & DIOPTRIAS */}
					<TabsContent value="diopters" className="space-y-4">
						{/* Aro 1 Details */}
						<div className="rounded-lg border bg-card p-4 space-y-3">
							<div className="flex items-center justify-between border-b pb-2">
								<div className="font-bold text-sm text-foreground flex items-center gap-2">
									<Icon icon={Glasses} className="size-4 text-primary" />
									Aro 1 — {order.aro1.frameBrand} {order.aro1.frameModel}
								</div>
								<Badge variant="secondary" className="text-xs font-mono">
									R${" "}
									{(
										order.aro1.framePrice +
										order.aro1.lensPrice +
										order.aro1.treatmentPrice
									).toFixed(2)}
								</Badge>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
								<div>
									<span className="font-medium text-foreground block">
										Laboratório:
									</span>
									{order.aro1.lab}
								</div>
								<div>
									<span className="font-medium text-foreground block">
										Lente:
									</span>
									{order.aro1.lensName}
								</div>
								<div>
									<span className="font-medium text-foreground block">
										Tratamento:
									</span>
									{order.aro1.noTreatment
										? "Sem Tratamento"
										: order.aro1.treatment}
								</div>
								<div>
									<span className="font-medium text-foreground block">
										Armação:
									</span>
									{order.aro1.frameCode}
								</div>
							</div>

							<OpticalDioptersTable
								idPrefix="detail-aro1"
								title="Dioptrias Cadastradas — Aro 1"
								value={order.aro1.diopters}
								onChange={() => {}}
								readOnly
							/>
						</div>

						{/* Aro 2 Details (se houver) */}
						{order.hasAro2 && order.aro2 && (
							<div className="rounded-lg border bg-card p-4 space-y-3">
								<div className="flex items-center justify-between border-b pb-2">
									<div className="font-bold text-sm text-foreground flex items-center gap-2">
										<Icon icon={Glasses} className="size-4 text-amber-500" />
										Aro 2 (2º Par / Dobro) — {order.aro2.frameBrand}{" "}
										{order.aro2.frameModel}
									</div>
									<Badge variant="secondary" className="text-xs font-mono">
										R${" "}
										{(
											order.aro2.framePrice +
											order.aro2.lensPrice +
											order.aro2.treatmentPrice
										).toFixed(2)}
									</Badge>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
									<div>
										<span className="font-medium text-foreground block">
											Laboratório:
										</span>
										{order.aro2.lab}
									</div>
									<div>
										<span className="font-medium text-foreground block">
											Lente:
										</span>
										{order.aro2.lensName}
									</div>
									<div>
										<span className="font-medium text-foreground block">
											Tratamento:
										</span>
										{order.aro2.noTreatment
											? "Sem Tratamento"
											: order.aro2.treatment}
									</div>
									<div>
										<span className="font-medium text-foreground block">
											Armação:
										</span>
										{order.aro2.frameCode}
									</div>
								</div>

								<OpticalDioptersTable
									idPrefix="detail-aro2"
									title="Dioptrias Cadastradas — Aro 2"
									value={order.aro2.diopters}
									onChange={() => {}}
									readOnly
								/>
							</div>
						)}

						{/* Endereço e Dados Cadastrais */}
						<div className="rounded-lg border bg-muted/30 p-4 text-xs space-y-2">
							<div className="font-bold text-foreground">
								Endereço de Entrega & Contato (ViaCEP)
							</div>
							<div className="text-muted-foreground">
								{order.patient.street}, {order.patient.number}{" "}
								{order.patient.complement && `(${order.patient.complement})`} —{" "}
								{order.patient.neighborhood}, {order.patient.city}/
								{order.patient.state} — CEP: {order.patient.cep}
							</div>
							<div className="text-muted-foreground">
								CPF:{" "}
								<span className="font-mono text-foreground">
									{order.patient.cpf}
								</span>{" "}
								| E-mail: {order.patient.email || "Não informado"}
							</div>
							{order.doctor && (
								<div className="text-muted-foreground pt-1 border-t">
									Prescrição Médica:{" "}
									<span className="font-medium text-foreground">
										{order.doctor.name}
									</span>{" "}
									({order.doctor.crm || "CRM não inf."})
								</div>
							)}
						</div>
					</TabsContent>

					{/* TAB 2: FINANCEIRO & PAGAMENTOS */}
					<TabsContent value="financials" className="space-y-4">
						<div className="rounded-lg border bg-card p-5 space-y-3">
							<div className="flex justify-between items-center border-b pb-3">
								<span className="font-bold text-base text-foreground">
									Resumo Financeiro da Venda
								</span>
								<Badge
									variant={
										order.financials.paymentMode === "TOTAL"
											? "default"
											: "secondary"
									}
								>
									{order.financials.paymentMode === "TOTAL"
										? "Quitação Total"
										: "Apenas Sinal"}
								</Badge>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
								<div className="p-3 rounded-lg bg-muted/40 border">
									<span className="text-[11px] text-muted-foreground block">
										Subtotal Armações
									</span>
									<span className="text-base font-bold font-mono">
										R$ {order.financials.subtotalFrames.toFixed(2)}
									</span>
								</div>
								<div className="p-3 rounded-lg bg-muted/40 border">
									<span className="text-[11px] text-muted-foreground block">
										Subtotal Lentes
									</span>
									<span className="text-base font-bold font-mono">
										R$ {order.financials.subtotalLenses.toFixed(2)}
									</span>
								</div>
								<div className="p-3 rounded-lg bg-muted/40 border">
									<span className="text-[11px] text-muted-foreground block">
										Subtotal Tratamentos
									</span>
									<span className="text-base font-bold font-mono">
										R$ {order.financials.subtotalTreatments.toFixed(2)}
									</span>
								</div>
								<div className="p-3 rounded-lg bg-muted/40 border">
									<span className="text-[11px] text-muted-foreground block">
										Desconto Concedido
									</span>
									<span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
										- R$ {order.financials.discount.toFixed(2)}
									</span>
								</div>
							</div>

							<Separator />

							<div className="flex flex-col gap-2 pt-2">
								<div className="flex justify-between text-sm">
									<span className="font-medium text-foreground">
										Total da Venda:
									</span>
									<span className="font-bold font-mono text-base text-foreground">
										R$ {order.financials.totalAmount.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
									<span className="font-medium">Valor Pago no Caixa:</span>
									<span className="font-bold font-mono text-base">
										R$ {order.financials.paidAmount.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-sm p-2 rounded-md bg-muted/60 font-bold">
									<span
										className={
											order.financials.residualAmount > 0
												? "text-rose-600 dark:text-rose-400"
												: "text-foreground"
										}
									>
										Saldo Residual a Receber:
									</span>
									<span
										className={`font-mono text-base font-extrabold ${order.financials.residualAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}
									>
										R$ {order.financials.residualAmount.toFixed(2)}
									</span>
								</div>
							</div>

							<div className="mt-4 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
								<span className="font-medium text-foreground">
									Forma de Pagamento:{" "}
								</span>
								{order.financials.paymentMethod1}
								{order.financials.cardInstallments1 &&
									order.financials.cardInstallments1 > 1 && (
										<span> em {order.financials.cardInstallments1}x</span>
									)}
								{order.financials.notes && (
									<div className="mt-1 pt-1 border-t text-muted-foreground italic">
										"{order.financials.notes}"
									</div>
								)}
							</div>
						</div>
					</TabsContent>

					{/* TAB 3: AGENTE IA (AUDITORIA & EVIDÊNCIA) */}
					<TabsContent value="ai" className="space-y-4">
						{/* Score e Resumo do Agente */}
						<div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2.5">
									<div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
										<Icon icon={Bot} className="size-5" />
									</div>
									<div>
										<h4 className="font-bold text-sm text-foreground">
											Comp AI Optical Inspector
										</h4>
										<p className="text-xs text-muted-foreground">
											Auditoria automática de laboratório, dioptrias e margem
											comercial
										</p>
									</div>
								</div>
								<Badge variant="default" className="text-xs font-mono">
									OCR Confiança:{" "}
									{(order.aiAudit.ocrConfidence * 100).toFixed(0)}%
								</Badge>
							</div>
						</div>

						{/* Grid de Checks Técnicos */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
							{/* Check 1: Transposição Cilíndrica */}
							<div className="rounded-lg border p-3 bg-card space-y-1">
								<div className="flex items-center justify-between font-semibold text-foreground">
									<span>Transposição Cilíndrica</span>
									<Icon
										icon={CheckmarkFilled}
										className="size-4 text-emerald-500"
									/>
								</div>
								<p className="text-muted-foreground text-[11px]">
									Sinais algébricos conferidos. O laboratório parceiro aceita
									formato negativo.
								</p>
							</div>

							{/* Check 2: Margem de Custo Lab */}
							<div className="rounded-lg border p-3 bg-card space-y-1">
								<div className="flex items-center justify-between font-semibold text-foreground">
									<span>Auditoria de Margem Bruta</span>
									<Badge
										variant="secondary"
										className="text-[10px] text-emerald-600 dark:text-emerald-400"
									>
										{order.aiAudit.grossMarginPercent}% Margem
									</Badge>
								</div>
								<p className="text-muted-foreground text-[11px]">
									Custo estimado tabela lab: R${" "}
									{order.aiAudit.estimatedLabCost.toFixed(2)}. Margem aprovada.
								</p>
							</div>

							{/* Check 3: Diâmetro & Altura */}
							<div className="rounded-lg border p-3 bg-card space-y-1">
								<div className="flex items-center justify-between font-semibold text-foreground">
									<span>Compatibilidade de Montagem</span>
									{order.aiAudit.diameterThicknessCheck === "OK" ? (
										<Icon
											icon={CheckmarkFilled}
											className="size-4 text-emerald-500"
										/>
									) : (
										<Icon
											icon={WarningFilled}
											className="size-4 text-amber-500"
										/>
									)}
								</div>
								<p className="text-muted-foreground text-[11px]">
									DNP e altura de montagem verificadas para o tamanho da ponte e
									diâmetro do aro.
								</p>
							</div>

							{/* Check 4: Análise de Risco de Crédito */}
							<div className="rounded-lg border p-3 bg-card space-y-1">
								<div className="flex items-center justify-between font-semibold text-foreground">
									<span>Risco de Inadimplência</span>
									<Badge variant="outline" className="text-[10px]">
										Risco: {order.aiAudit.creditRiskCheck}
									</Badge>
								</div>
								<p className="text-muted-foreground text-[11px]">
									{order.financials.residualAmount > 0
										? "Saldo pendente exige bloqueio de entrega até quitação em caixa."
										: "Pedido 100% quitado. Liberação imediata sem pendências."}
								</p>
							</div>
						</div>

						{/* Linha do Tempo e Evidências */}
						<div className="rounded-lg border bg-card p-4 space-y-3">
							<span className="font-bold text-xs text-foreground block">
								Trilha de Evidências & Ações Automatizadas
							</span>
							<div className="space-y-2.5">
								{order.aiAudit.timelineEvents.map((ev) => (
									<div key={ev.id} className="flex items-start gap-2.5 text-xs">
										<div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
											<Icon icon={Time} className="size-3" />
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between">
												<span className="font-semibold text-foreground">
													{ev.title}
												</span>
												<span className="text-[10px] text-muted-foreground font-mono">
													{ev.time}
												</span>
											</div>
											<p className="text-[11px] text-muted-foreground">
												{ev.detail}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}
