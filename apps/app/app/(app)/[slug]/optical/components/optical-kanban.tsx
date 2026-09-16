"use client";

import Phone from "@carbon/icons-react/es/Phone";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { useMemo, useState } from "react";
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
	const { orders } = useOpticalOrders();
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

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
							className="flex-1 min-w-[240px] rounded-xl border bg-muted/20 p-3 flex flex-col gap-3"
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

										return (
											<div
												key={order.id}
												className={`rounded-lg border bg-card p-3 shadow-xs hover:border-primary/50 transition-all ${col.color}`}
											>
												<button
													type="button"
													onClick={() => {
														setSelectedOrder(order);
														setSheetOpen(true);
													}}
													className="w-full text-left cursor-pointer"
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

												<div className="mt-2 flex items-center justify-between border-t pt-2">
													<div className="flex flex-col">
														<span className="text-[11px] font-bold font-mono text-foreground">
															R$ {(Number(order.financials?.totalAmount) || 0).toFixed(2)}
														</span>
														{(Number(order.financials?.residualAmount) || 0) > 0 && (
															<span className="text-[10px] font-bold font-mono text-rose-600 dark:text-rose-400">
																Residual: R${" "}
																{(Number(order.financials?.residualAmount) || 0).toFixed(2)}
															</span>
														)}
													</div>

													<Button
														asChild
														size="icon"
														variant="ghost"
														className="size-7 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400"
													>
														<a
															href={whatsappUrl}
															target="_blank"
															rel="noopener noreferrer"
															title="Avisar no WhatsApp"
														>
															<Icon icon={Phone} className="size-3.5" />
														</a>
													</Button>
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
