"use client";

import { useState, useMemo } from "react";
import Search from "@carbon/icons-react/es/Search";
import DeliveryTruck from "@carbon/icons-react/es/DeliveryTruck";
import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import ArrowLeft from "@carbon/icons-react/es/ArrowLeft";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import DocumentAttachment from "@carbon/icons-react/es/DocumentAttachment";
import Receipt from "@carbon/icons-react/es/Receipt";
import SendAlt from "@carbon/icons-react/es/SendAlt";
import Filter from "@carbon/icons-react/es/Filter";
import Close from "@carbon/icons-react/es/Close";
import View from "@carbon/icons-react/es/View";
import { Badge } from "@crm/ui/components/badge";
import { Input } from "@crm/ui/components/input";
import { toast } from "sonner";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { createPostSalesFromOrder } from "@/lib/optical/supabase-optical";
import type { OpticalOrder, OpticalOrderStatus } from "@/lib/optical/optical-types";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";
import { printHtmlReport } from "@/lib/optical/optical-print-report";

export const JOURNEY_STAGES: {
	id: OpticalOrderStatus;
	label: string;
	description: string;
	color: string;
}[] = [
	{
		id: "DIGITADA",
		label: "1. Digitada",
		description: "Venda na loja, checklist de cadastro e NF",
		color: "bg-amber-500",
	},
	{
		id: "PEDIDO",
		label: "2. Pedido Lab",
		description: "Lentes aguardando pedido ao laboratório",
		color: "bg-blue-500",
	},
	{
		id: "MONTAGEM",
		label: "3. Montagem",
		description: "Lente chegou, casou com aro em montagem",
		color: "bg-indigo-500",
	},
	{
		id: "CONFERIDO",
		label: "4. Conferido",
		description: "Conferência técnica feita, saindo para loja",
		color: "bg-purple-500",
	},
	{
		id: "LOJA",
		label: "5. Em Loja",
		description: "Pronto na loja para retirada do cliente",
		color: "bg-emerald-500",
	},
	{
		id: "ENTREGUE",
		label: "6. Entregue",
		description: "Retirado pelo cliente, encaminhado ao Pós-Venda",
		color: "bg-zinc-700",
	},
];

export function OpticalOsJourneyView() {
	const { orders, updateOrderStatus, updateOrder } = useOpticalOrders();
	const [activeStage, setActiveStage] = useState<OpticalOrderStatus | "ALL" | "LAB_SUMMARY">("ALL");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStore, setSelectedStore] = useState("TODAS");
	const [selectedLab, setSelectedLab] = useState("TODOS");
	const [selectedOrderDetails, setSelectedOrderDetails] = useState<OpticalOrder | null>(null);

	// Normaliza status legados para os 6 estágios oficiais da jornada
	const normalizeStatus = (status: string): OpticalOrderStatus => {
		if (status === "EM_LABORATORIO") return "PEDIDO";
		if (status === "EM_MONTAGEM") return "MONTAGEM";
		if (status === "CONFERIDA") return "CONFERIDO";
		if (status === "PRONTA_LOJA") return "LOJA";
		return status as OpticalOrderStatus;
	};

	// Lista de ordens filtradas
	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			const normStatus = normalizeStatus(order.status);
			if (activeStage !== "ALL" && activeStage !== "LAB_SUMMARY" && normStatus !== activeStage) {
				return false;
			}
			if (selectedStore !== "TODAS" && order.store?.name !== selectedStore) {
				return false;
			}
			if (selectedLab !== "TODOS") {
				const lab = order.aro1?.lab || order.aro1?.labOd || "Outros";
				if (lab !== selectedLab) return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchNum = order.orderNumber.toLowerCase().includes(q);
				const matchName = order.patient.name.toLowerCase().includes(q);
				const matchCpf = order.patient.cpf.includes(q);
				return matchNum || matchName || matchCpf;
			}
			return true;
		});
	}, [orders, activeStage, selectedStore, selectedLab, searchQuery]);

	// Contadores por estágio da jornada
	const stageCounts = useMemo(() => {
		const counts: Record<string, number> = {
			DIGITADA: 0,
			PEDIDO: 0,
			MONTAGEM: 0,
			CONFERIDO: 0,
			LOJA: 0,
			ENTREGUE: 0,
		};
		for (const ord of orders) {
			const st = normalizeStatus(ord.status);
			if (counts[st] !== undefined) {
				counts[st]++;
			}
		}
		return counts;
	}, [orders]);

	// Agrupamento para a Tela Resumida de Pedidos de Laboratório
	const labSummary = useMemo(() => {
		const pendingLabOrders = orders.filter(
			(o) => normalizeStatus(o.status) === "PEDIDO" || normalizeStatus(o.status) === "DIGITADA"
		);
		const grouped: Record<string, OpticalOrder[]> = {};
		for (const ord of pendingLabOrders) {
			const labName = ord.aro1?.lab || ord.aro1?.labOd || "Laboratório Padrão";
			if (!grouped[labName]) grouped[labName] = [];
			grouped[labName].push(ord);
		}
		return grouped;
	}, [orders]);

	// Lojas únicas
	const stores = useMemo(() => {
		const set = new Set<string>();
		for (const o of orders) if (o.store?.name) set.add(o.store.name);
		return Array.from(set);
	}, [orders]);

	// Labs únicos
	const labs = useMemo(() => {
		const set = new Set<string>();
		for (const o of orders) {
			if (o.aro1?.lab) set.add(o.aro1.lab);
			if (o.aro1?.labOd) set.add(o.aro1.labOd);
		}
		return Array.from(set);
	}, [orders]);

	// Transição de estágio da OS
	const handleAdvanceStage = async (order: OpticalOrder) => {
		const currentNorm = normalizeStatus(order.status);
		const currentIndex = JOURNEY_STAGES.findIndex((s) => s.id === currentNorm);
		if (currentIndex < JOURNEY_STAGES.length - 1) {
			const nextStageObj = JOURNEY_STAGES[currentIndex + 1];
			if (!nextStageObj) return;
			const nextStage = nextStageObj.id;
			updateOrderStatus(order.id, nextStage);
			toast.success(`OS #${order.orderNumber} avançada para ${nextStageObj.label}!`);

			// Se avançou para ENTREGUE, inicia automaticamente o Pós-Venda
			if (nextStage === "ENTREGUE") {
				await createPostSalesFromOrder(order);
				toast.info(`Cliente ${order.patient.name} encaminhado para o ciclo de Pós-Venda (Pós 7)!`);
			}
		}
	};

	const handleRegressStage = (order: OpticalOrder) => {
		const currentNorm = normalizeStatus(order.status);
		const currentIndex = JOURNEY_STAGES.findIndex((s) => s.id === currentNorm);
		if (currentIndex > 0) {
			const prevStageObj = JOURNEY_STAGES[currentIndex - 1];
			if (!prevStageObj) return;
			const prevStage = prevStageObj.id;
			updateOrderStatus(order.id, prevStage);
			toast.info(`OS #${order.orderNumber} retornada para ${prevStageObj.label}`);
		}
	};

	// Toggle de NF
	const handleToggleInvoice = (order: OpticalOrder) => {
		const updated = {
			...order,
			invoiceIssued: !order.invoiceIssued,
			invoiceNumber: !order.invoiceIssued
				? order.invoiceNumber || `NF-${Math.floor(100000 + Math.random() * 900000)}`
				: order.invoiceNumber,
			updatedAt: new Date().toISOString(),
		};
		if (updateOrder) updateOrder(updated);
		toast.success(
			updated.invoiceIssued
				? `Nota Fiscal marcada como EMITIDA para a OS #${order.orderNumber}`
				: `Nota Fiscal desmarcada para a OS #${order.orderNumber}`
		);
	};

	// Exportação para o laboratório
	const handleExportLabOrders = (labName: string, labOrders: OpticalOrder[]) => {
		const rowsHtml = labOrders
			.map(
				(o) => `
			<tr>
				<td><strong>#${o.orderNumber}</strong></td>
				<td>${o.patient.name}</td>
				<td>${o.aro1?.lensOd || o.aro1?.lensName || "Padrão"}</td>
				<td>${o.aro1?.diopters.od.esf || "0.00"} / ${o.aro1?.diopters.od.cil || "0.00"} x ${o.aro1?.diopters.od.eixo || "0"}°</td>
				<td>${o.aro1?.lensOe || o.aro1?.lensName || "Padrão"}</td>
				<td>${o.aro1?.diopters.oe.esf || "0.00"} / ${o.aro1?.diopters.oe.cil || "0.00"} x ${o.aro1?.diopters.oe.eixo || "0"}°</td>
				<td>${o.aro1?.treatment || "Incolor"}</td>
				<td>${new Date(o.promisedDeliveryDate).toLocaleDateString("pt-BR")}</td>
			</tr>
		`
			)
			.join("");

		printHtmlReport({
			title: `Pedidos de Lentes ao Laboratório: ${labName}`,
			subtitle: `Total de ${labOrders.length} ordens de serviço pendentes de confecção`,
			contentHtml: `
				<div style="margin-bottom: 16px;">
					<p><strong>Laboratório:</strong> ${labName} | <strong>Data de Emissão:</strong> ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}</p>
				</div>
				<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
					<thead>
						<tr style="background: #f4f4f5; text-align: left;">
							<th style="padding: 6px; border: 1px solid #e4e4e7;">OS</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Paciente</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Lente OD</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Grau OD</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Lente OE</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Grau OE</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Tratamento</th>
							<th style="padding: 6px; border: 1px solid #e4e4e7;">Promessa</th>
						</tr>
					</thead>
					<tbody>
						${rowsHtml}
					</tbody>
				</table>
			`,
		});
	};

	return (
		<div className="space-y-6">
			{/* Cabeçalho da Jornada */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
						<span>Jornada da OS</span>
						<span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
							MNOC-X Pipeline
						</span>
					</h2>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Acompanhamento de 6 estágios desde o balcão até a entrega e o início do pós-venda.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<MnocxButton
						variant={activeStage === "LAB_SUMMARY" ? "primary" : "secondary"}
						onClick={() => setActiveStage(activeStage === "LAB_SUMMARY" ? "ALL" : "LAB_SUMMARY")}
						icon={DocumentAttachment}
					>
						{activeStage === "LAB_SUMMARY" ? "Ver Todas as OSs" : "Pedidos para Laboratório"}
					</MnocxButton>
				</div>
			</div>

			{/* Pipeline Visual das 6 Etapas */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{JOURNEY_STAGES.map((stage) => {
					const count = stageCounts[stage.id] || 0;
					const isSelected = activeStage === stage.id;
					return (
						<button
							key={stage.id}
							type="button"
							onClick={() => setActiveStage(isSelected ? "ALL" : stage.id)}
							className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
								isSelected
									? "bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-100 dark:text-zinc-900 dark:border-white"
									: "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
							}`}
						>
							<div className="flex items-center justify-between mb-1.5">
								<span
									className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
										isSelected
											? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
											: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
									}`}
								>
									{stage.label}
								</span>
								<span
									className={`text-xs font-bold px-2 py-0.5 rounded-full ${
										count > 0
											? isSelected
												? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
												: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
											: "text-zinc-400"
									}`}
								>
									{count}
								</span>
							</div>
							<p
								className={`text-[11px] leading-tight line-clamp-2 ${
									isSelected ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400"
								}`}
							>
								{stage.description}
							</p>
						</button>
					);
				})}
			</div>

			{/* VISÃO: RESUMO DE PEDIDOS PARA O LABORATÓRIO */}
			{activeStage === "LAB_SUMMARY" ? (
				<div className="space-y-6">
					<MnocxCard
						title="Lentes Pendentes de Pedido ao Laboratório"
						subtitle="Agrupamento inteligente por laboratório para envio imediato de pedidos"
						badge={
							<Badge variant="secondary" className="text-xs">
								{Object.keys(labSummary).length} Laboratórios
							</Badge>
						}
					>
						<div className="space-y-6 pt-2">
							{Object.entries(labSummary).length === 0 ? (
								<p className="text-center py-8 text-xs text-zinc-500">
									Nenhuma lente pendente de pedido no momento. Todas as OSs já foram encaminhadas!
								</p>
							) : (
								Object.entries(labSummary).map(([labName, labOrders]) => (
									<div
										key={labName}
										className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3"
									>
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
											<div>
												<h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
													<span>{labName}</span>
													<span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
														{labOrders.length} {labOrders.length === 1 ? "par" : "pares"} a pedir
													</span>
												</h4>
												<p className="text-[11px] text-zinc-500">
													Ordens que necessitam de pedido formal ao fornecedor
												</p>
											</div>

											<div className="flex items-center gap-2">
												<MnocxButton
													size="sm"
													variant="outline"
													onClick={() => handleExportLabOrders(labName, labOrders)}
													icon={DocumentExport}
												>
													Exportar PDF
												</MnocxButton>
												<MnocxButton
													size="sm"
													onClick={() => {
														const text = labOrders
															.map(
																(o) =>
																	`OS: ${o.orderNumber} | Paciente: ${o.patient.name}\n` +
																	`OD: ${o.aro1?.lensOd || o.aro1?.lensName} (${o.aro1?.diopters.od.esf}/${o.aro1?.diopters.od.cil}x${o.aro1?.diopters.od.eixo}°)\n` +
																	`OE: ${o.aro1?.lensOe || o.aro1?.lensName} (${o.aro1?.diopters.oe.esf}/${o.aro1?.diopters.oe.cil}x${o.aro1?.diopters.oe.eixo}°)\n` +
																	`Tratamento: ${o.aro1?.treatment || "Incolor"}`
															)
															.join("\n---\n");
														navigator.clipboard.writeText(text);
														toast.success(`Pedido copiado para a área de transferência!`);
													}}
													icon={Receipt}
												>
													Copiar Pedido
												</MnocxButton>
											</div>
										</div>

										{/* Tabela resumida das lentes deste laboratório */}
										<div className="overflow-x-auto">
											<table className="w-full text-xs text-left">
												<thead>
													<tr className="text-[11px] font-semibold text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
														<th className="pb-2">OS</th>
														<th className="pb-2">Paciente</th>
														<th className="pb-2">Lente OD</th>
														<th className="pb-2">Grau OD</th>
														<th className="pb-2">Lente OE</th>
														<th className="pb-2">Grau OE</th>
														<th className="pb-2">Tratamento</th>
														<th className="pb-2 text-right">Ação</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
													{labOrders.map((ord) => (
														<tr key={ord.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30">
															<td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">
																#{ord.orderNumber}
															</td>
															<td className="py-2.5 font-medium">{ord.patient.name}</td>
															<td className="py-2.5 text-zinc-600 dark:text-zinc-300">
																{ord.aro1?.lensOd || ord.aro1?.lensName || "Padrão"}
															</td>
															<td className="py-2.5 font-mono text-[11px]">
																{ord.aro1?.diopters.od.esf} / {ord.aro1?.diopters.od.cil} x {ord.aro1?.diopters.od.eixo}°
															</td>
															<td className="py-2.5 text-zinc-600 dark:text-zinc-300">
																{ord.aro1?.lensOe || ord.aro1?.lensName || "Padrão"}
															</td>
															<td className="py-2.5 font-mono text-[11px]">
																{ord.aro1?.diopters.oe.esf} / {ord.aro1?.diopters.oe.cil} x {ord.aro1?.diopters.oe.eixo}°
															</td>
															<td className="py-2.5 text-zinc-600 dark:text-zinc-300">
																{ord.aro1?.treatment || "Incolor"}
															</td>
															<td className="py-2.5 text-right">
																<MnocxButton
																	size="sm"
																	variant="secondary"
																	onClick={() => handleAdvanceStage(ord)}
																>
																	Pedir e Avançar ➔
																</MnocxButton>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								))
							)}
						</div>
					</MnocxCard>
				</div>
			) : (
				/* VISÃO PADRÃO: LISTA DE ORDENS NA JORNADA */
				<div className="space-y-4">
					{/* Barra de Busca e Filtros */}
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1 min-w-[240px]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
							<Input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Buscar por OS, Paciente ou CPF..."
								className="pl-9 h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
							/>
						</div>

						<select
							value={selectedStore}
							onChange={(e) => setSelectedStore(e.target.value)}
							className="h-9 px-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300"
						>
							<option value="TODAS">Todas as Lojas</option>
							{stores.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>

						<select
							value={selectedLab}
							onChange={(e) => setSelectedLab(e.target.value)}
							className="h-9 px-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300"
						>
							<option value="TODOS">Todos os Labs</option>
							{labs.map((l) => (
								<option key={l} value={l}>
									{l}
								</option>
							))}
						</select>

						{activeStage !== "ALL" && (
							<MnocxButton
								size="sm"
								variant="ghost"
								onClick={() => setActiveStage("ALL")}
								icon={Close}
							>
								Limpar Filtro de Estágio
							</MnocxButton>
						)}
					</div>

					{/* Lista de Cards da Jornada */}
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredOrders.length === 0 ? (
							<div className="col-span-full py-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 border border-dashed rounded-2xl">
								Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
							</div>
						) : (
							filteredOrders.map((order) => {
								const normStage = normalizeStatus(order.status);
								const stageInfo =
									JOURNEY_STAGES.find((s) => s.id === normStage) ?? JOURNEY_STAGES[0]!;
								const waLink = generateWhatsAppLink(order);

								return (
									<MnocxCard key={order.id} className="flex flex-col justify-between">
										<div className="space-y-3">
											{/* Topo do Card */}
											<div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
												<div>
													<div className="flex items-center gap-2">
														<span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
															#{order.orderNumber}
														</span>
														<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
															{order.store?.name || "Loja"}
														</span>
													</div>
													<h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
														{order.patient.name}
													</h4>
													<p className="text-[10px] text-zinc-400 font-mono">
														CPF: {order.patient.cpf}
													</p>
												</div>

												<span
													className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white ${stageInfo.color}`}
												>
													{stageInfo.label.split(". ")[1]}
												</span>
											</div>

											{/* Checklist da Jornada */}
											<div className="grid grid-cols-2 gap-1.5 text-[11px] p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
												<div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
													<CheckmarkFilled className="size-3.5 text-emerald-500 shrink-0" />
													<span>Cliente & Médico</span>
												</div>
												<div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
													<CheckmarkFilled className="size-3.5 text-emerald-500 shrink-0" />
													<span>Medidas (DNP/Alt)</span>
												</div>
												<div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
													<CheckmarkFilled className="size-3.5 text-emerald-500 shrink-0" />
													<span>Lentes & Armação</span>
												</div>
												<div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
													<CheckmarkFilled className="size-3.5 text-emerald-500 shrink-0" />
													<span>Forma Pagamento</span>
												</div>
											</div>

											{/* Detalhes de Lentes e Armação */}
											<div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-300">
												<div className="flex justify-between">
													<span className="text-zinc-400">Armação:</span>
													<span className="font-medium text-right truncate max-w-[180px]">
														{order.aro1?.frameBrand} {order.aro1?.frameModel}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-zinc-400">Lente OD:</span>
													<span className="font-medium text-right truncate max-w-[180px]">
														{order.aro1?.lensOd || order.aro1?.lensName}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-zinc-400">Lente OE:</span>
													<span className="font-medium text-right truncate max-w-[180px]">
														{order.aro1?.lensOe || order.aro1?.lensName}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-zinc-400">Laboratório:</span>
													<span className="font-semibold text-zinc-800 dark:text-zinc-200">
														{order.aro1?.lab || order.aro1?.labOd || "Lab Padrão"}
													</span>
												</div>
											</div>

											{/* Toggle de Nota Fiscal (NF feita ou não) */}
											<div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<Receipt className="size-4 text-zinc-400" />
													<span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
														Nota Fiscal:
													</span>
												</div>

												<button
													type="button"
													onClick={() => handleToggleInvoice(order)}
													className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
														order.invoiceIssued
															? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
															: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
													}`}
												>
													{order.invoiceIssued ? "✓ NF Emitida" : "Pendente"}
												</button>
											</div>

											{/* Resumo Financeiro */}
											<div className="flex items-center justify-between text-xs pt-1">
												<span className="text-zinc-500">Total da Venda:</span>
												<span className="font-bold text-zinc-900 dark:text-zinc-100">
													{new Intl.NumberFormat("pt-BR", {
														style: "currency",
														currency: "BRL",
													}).format(order.financials.totalAmount)}
												</span>
											</div>
											{order.financials.residualAmount > 0 && (
												<div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
													<span>Saldo a Cobrar:</span>
													<span>
														{new Intl.NumberFormat("pt-BR", {
															style: "currency",
															currency: "BRL",
														}).format(order.financials.residualAmount)}
													</span>
												</div>
											)}
										</div>

										{/* Rodapé de Ações da Jornada */}
										<div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => handleRegressStage(order)}
													disabled={normStage === "DIGITADA"}
													className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
													title="Recuar estágio anterior"
												>
													<ArrowLeft className="size-3.5" />
												</button>

												<a
													href={waLink}
													target="_blank"
													rel="noreferrer"
													className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
													title="Avisar cliente no WhatsApp"
												>
													<SendAlt className="size-3.5" />
												</a>
											</div>

											<MnocxButton
												size="sm"
												onClick={() => handleAdvanceStage(order)}
												disabled={normStage === "ENTREGUE"}
												icon={ArrowRight}
											>
												{normStage === "LOJA"
													? "Entregar Óculos"
													: normStage === "ENTREGUE"
													? "Concluído"
													: "Avançar"}
											</MnocxButton>
										</div>
									</MnocxCard>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
