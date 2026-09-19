"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import OverflowMenuHorizontal from "@carbon/icons-react/es/OverflowMenuHorizontal";
import Phone from "@carbon/icons-react/es/Phone";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import { Icon } from "@crm/ui/components/icon";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type {
	OpticalOrder,
	OpticalOrderStatus,
} from "@/lib/optical/optical-types";
import { OpticalOrderDetailSheet } from "./optical-order-detail-sheet";

const KANBAN_COLUMNS: {
	status: OpticalOrderStatus;
	title: string;
	color: string;
}[] = [
	{ status: "DIGITADA", title: "1. Digitada", color: "border-slate-500/40" },
	{
		status: "EM_LABORATORIO",
		title: "2. Em Laboratório",
		color: "border-amber-500/40",
	},
	{
		status: "EM_MONTAGEM",
		title: "3. Em Montagem",
		color: "border-purple-500/40",
	},
	{
		status: "CONFERIDA",
		title: "4. Conferida Técnica",
		color: "border-cyan-500/40",
	},
	{
		status: "PRONTA_LOJA",
		title: "5. Pronta na Loja",
		color: "border-emerald-500/40",
	},
	{ status: "ENTREGUE", title: "6. Entregue", color: "border-zinc-500/40" },
];

export function OpticalKanban({ searchQuery = "" }: { searchQuery?: string }) {
	const { orders, updateOrderStatus } = useOpticalOrders();
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [dragOverCol, setDragOverCol] = useState<OpticalOrderStatus | null>(null);
	const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

	const handleDrop = (orderId: string, targetStatus: OpticalOrderStatus) => {
		const order = orders.find((o) => o.id === orderId);
		if (!order) return;
		if (order.status === targetStatus) return;

		updateOrderStatus(orderId, targetStatus);
		const targetCol = KANBAN_COLUMNS.find((c) => c.status === targetStatus);
		const targetTitle = targetCol?.title || targetStatus;
		toast.success(`OS #${order.orderNumber} movida para ${targetTitle}`);
	};

	const filteredOrders = useMemo(() => {
		if (!searchQuery.trim()) return orders;
		const q = searchQuery.toLowerCase();
		return orders.filter(
			(o) =>
				(o.orderNumber || "").toLowerCase().includes(q) ||
				(o.patient?.name || "").toLowerCase().includes(q) ||
				(o.patient?.cpf || "").includes(q),
		);
	}, [orders, searchQuery]);

	return (
		<div className="w-full overflow-x-auto pb-4">
			<div className="flex gap-4 min-w-[1280px]">
				{KANBAN_COLUMNS.map((col) => {
					const colOrders = filteredOrders.filter(
						(o) => o.status === col.status,
					);

					return (
						<div
							key={col.status}
							onDragOver={(e) => {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
								if (dragOverCol !== col.status) {
									setDragOverCol(col.status);
								}
							}}
							onDragEnter={(e) => {
								e.preventDefault();
								setDragOverCol(col.status);
							}}
							onDragLeave={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) {
									setDragOverCol(null);
								}
							}}
							onDrop={(e) => {
								e.preventDefault();
								setDragOverCol(null);
								const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
								if (orderId) {
									handleDrop(orderId, col.status);
								}
							}}
							className={`flex-1 min-w-[240px] rounded-xl border bg-muted/20 p-3 flex flex-col gap-3 transition-all ${
								dragOverCol === col.status
									? "ring-2 ring-primary border-primary bg-primary/10 shadow-md"
									: ""
							}`}
						>
							<div className="flex items-center justify-between border-b pb-2 px-1">
								<span className="font-semibold text-xs text-foreground tracking-tight">
									{col.title}
								</span>
								<Badge
									variant="secondary"
									className="font-mono text-[10px] size-5 rounded-full p-0 flex items-center justify-center"
								>
									{colOrders.length}
								</Badge>
							</div>

							<div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
								{colOrders.length === 0 ? (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-[11px] text-muted-foreground/60">
										Sem OSs nesta etapa
									</div>
								) : (
									colOrders.map((order) => {
										const whatsappUrl = generateWhatsAppLink(order);
										const sla = getKanbanSla(
											order.promisedDeliveryDate,
											order.status,
										);
										const colIndex = KANBAN_COLUMNS.findIndex(
											(c) => c.status === order.status,
										);
										const prevCol =
											colIndex > 0 ? KANBAN_COLUMNS[colIndex - 1] : null;
										const nextCol =
											colIndex < KANBAN_COLUMNS.length - 1
												? KANBAN_COLUMNS[colIndex + 1]
												: null;

										return (
											<div
												key={order.id}
												draggable
												onDragStart={(e) => {
													e.dataTransfer.setData("text/plain", order.id);
													e.dataTransfer.dropEffect = "move";
													setDraggedOrderId(order.id);
												}}
												onDragEnd={() => {
													setDraggedOrderId(null);
													setDragOverCol(null);
												}}
												className={`rounded-lg border bg-card p-3 shadow-xs hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing ${col.color} ${
													draggedOrderId === order.id
														? "opacity-50 scale-[0.98] border-primary"
														: ""
												}`}
											>
												<button
													type="button"
													onClick={() => {
														setSelectedOrder(order);
														setSheetOpen(true);
													}}
													className="w-full text-left cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-md"
													aria-label={`Ver detalhes da OS ${order.orderNumber} do paciente ${order.patient?.name || "cliente"}`}
												>
													<div className="flex items-center justify-between mb-1">
														<span className="font-mono text-xs font-bold text-primary">
															{order.orderNumber}
														</span>
														<Badge
															variant="outline"
															className={`text-[9px] px-1 py-0 ${sla.className}`}
														>
															{sla.label}
														</Badge>
													</div>

													<div className="font-semibold text-xs text-foreground truncate">
														{order.patient?.name || "Cliente sem Nome"}
													</div>

													<div className="text-[11px] text-muted-foreground truncate mt-0.5">
														{order.aro1?.frameBrand || "Armação"} • {order.aro1?.lab || "Lab"}
													</div>
												</button>

												<div className="mt-2 flex items-center justify-between border-t pt-2 gap-1">
													<div className="flex flex-col min-w-0 flex-1">
														<span className="text-[11px] font-bold font-mono text-foreground truncate">
															R$ {(Number(order.financials?.totalAmount) || 0).toFixed(2)}
														</span>
														{(Number(order.financials?.residualAmount) || 0) > 0 && (
															<span className="text-[10px] font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
																Residual: R${" "}
																{(Number(order.financials?.residualAmount) || 0).toFixed(2)}
															</span>
														)}
													</div>

													<div className="flex items-center gap-0.5 shrink-0">
														{/* Botão rápido: Etapa anterior */}
														<Button
															type="button"
															size="icon"
															variant="ghost"
															disabled={!prevCol}
															onClick={(e) => {
																e.stopPropagation();
																if (prevCol) handleDrop(order.id, prevCol.status);
															}}
															className="size-7 text-muted-foreground hover:text-foreground disabled:opacity-25 focus-visible:ring-2 focus-visible:ring-primary"
															title={
																prevCol
																	? `Mover para ${prevCol.title}`
																	: "Primeira etapa"
															}
															aria-label={
																prevCol
																	? `Mover OS ${order.orderNumber} para ${prevCol.title}`
																	: "Primeira etapa"
															}
														>
															<Icon icon={ChevronLeft} className="size-3.5" />
														</Button>

														{/* Botão rápido: Próxima etapa */}
														<Button
															type="button"
															size="icon"
															variant="ghost"
															disabled={!nextCol}
															onClick={(e) => {
																e.stopPropagation();
																if (nextCol) handleDrop(order.id, nextCol.status);
															}}
															className="size-7 text-muted-foreground hover:text-primary disabled:opacity-25 focus-visible:ring-2 focus-visible:ring-primary"
															title={
																nextCol
																	? `Mover para ${nextCol.title}`
																	: "Última etapa"
															}
															aria-label={
																nextCol
																	? `Mover OS ${order.orderNumber} para ${nextCol.title}`
																	: "Última etapa"
															}
														>
															<Icon icon={ChevronRight} className="size-3.5" />
														</Button>

														{/* Menu dropdown rápido para qualquer etapa */}
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	type="button"
																	size="icon"
																	variant="ghost"
																	className="size-7 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
																	title="Mudar etapa da OS"
																	aria-label={`Mudar etapa da OS ${order.orderNumber}`}
																>
																	<Icon
																		icon={OverflowMenuHorizontal}
																		className="size-3.5"
																	/>
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-48 text-xs">
																<div className="px-2 py-1.5 font-semibold text-[10px] text-muted-foreground">
																	Mover para etapa:
																</div>
																{KANBAN_COLUMNS.map((target) => (
																	<DropdownMenuItem
																		key={target.status}
																		disabled={target.status === order.status}
																		onClick={() => handleDrop(order.id, target.status)}
																		className={`cursor-pointer ${
																			target.status === order.status
																				? "font-bold text-primary bg-muted/50"
																				: ""
																		}`}
																	>
																		{target.title}
																	</DropdownMenuItem>
																))}
															</DropdownMenuContent>
														</DropdownMenu>

														{/* Botão WhatsApp */}
														<Button
															asChild
															size="icon"
															variant="ghost"
															className="size-7 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
														>
															<a
																href={whatsappUrl}
																target="_blank"
																rel="noopener noreferrer"
																title={`Avisar paciente ${order.patient?.name || "cliente"} sobre a OS ${order.orderNumber} no WhatsApp`}
																aria-label={`Avisar paciente ${order.patient?.name || "cliente"} sobre a OS ${order.orderNumber} no WhatsApp`}
															>
																<Icon icon={Phone} className="size-3.5" />
															</a>
														</Button>
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					);
				})}
			</div>

			<OpticalOrderDetailSheet
				order={selectedOrder}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
			/>
		</div>
	);
}

function getKanbanSla(dateStr?: string | null, status?: OpticalOrderStatus) {
	if (status === "ENTREGUE") {
		return { label: "Entregue", className: "text-zinc-500" };
	}
	if (!dateStr) {
		return { label: "Sem prazo", className: "text-zinc-500" };
	}
	const now = new Date();
	const target = new Date(dateStr);
	if (isNaN(target.getTime())) {
		return { label: "Prazo pendente", className: "text-zinc-500" };
	}
	const diffDays = Math.ceil(
		(target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	if (diffDays < 0) {
		return {
			label: `Atrasada ${Math.abs(diffDays)}d`,
			className: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
		};
	}
	if (diffDays === 0) {
		return {
			label: "Vence hoje",
			className: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
		};
	}
	return {
		label: `${diffDays}d prazo`,
		className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
	};
}
