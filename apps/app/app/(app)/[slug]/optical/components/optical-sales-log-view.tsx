"use client";

import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import Search from "@carbon/icons-react/es/Search";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type { OpticalOrder } from "@/lib/optical/optical-types";
import { OpticalOrderDetailSheet } from "./optical-order-detail-sheet";

export function OpticalSalesLogView() {
	const { orders } = useOpticalOrders();
	const [filterType, setFilterType] = useState<"ALL" | "PAID" | "RESIDUAL">("ALL");
	const [search, setSearch] = useState("");
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);

	const filtered = orders.filter((o) => {
		// Filter by payment status
		if (filterType === "PAID" && o.financials.residualAmount > 0) return false;
		if (filterType === "RESIDUAL" && o.financials.residualAmount <= 0) return false;

		// Filter by search text (OS, Paciente, Vendedor, Loja)
		const query = search.toLowerCase();
		return (
			o.orderNumber.toLowerCase().includes(query) ||
			o.patient.name.toLowerCase().includes(query) ||
			o.seller.name.toLowerCase().includes(query) ||
			o.store.name.toLowerCase().includes(query)
		);
	});

	const handleWhatsAppNotice = (order: OpticalOrder) => {
		const url = generateWhatsAppLink(order);
		window.open(url, "_blank", "noopener,noreferrer");
		toast.success(`WhatsApp aberto para ${order.patient.name}!`);
	};

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Top Controls */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-bold tracking-tight">Log Histórico de Vendas</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Audite todas as ordens de serviço emitidas, valores recebidos e saldos residuais em aberto.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
						<TabsList className="h-9 gap-1 bg-muted/60 p-0.5">
							<TabsTrigger value="ALL" className="text-xs font-semibold px-3">
								Todas ({orders.length})
							</TabsTrigger>
							<TabsTrigger value="PAID" className="text-xs font-semibold px-3">
								Totalmente Quitadas
							</TabsTrigger>
							<TabsTrigger value="RESIDUAL" className="text-xs font-semibold px-3 text-amber-600 dark:text-amber-400">
								Com Saldo Residual ({orders.filter((o) => o.financials.residualAmount > 0).length})
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<div className="relative w-full sm:w-64">
						<Icon icon={Search} className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar OS, cliente ou vendedor..."
							className="h-9 pl-8 text-xs"
						/>
					</div>
				</div>
			</div>

			{/* Tabela do Log */}
			<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
								<th className="py-3 px-4 text-left">OS / Emissão</th>
								<th className="py-3 px-4 text-left">Paciente</th>
								<th className="py-3 px-4 text-left">Loja / Vendedor</th>
								<th className="py-3 px-4 text-left">Armações & Lentes</th>
								<th className="py-3 px-4 text-right">Total (R$)</th>
								<th className="py-3 px-4 text-right">Pago / Entrada</th>
								<th className="py-3 px-4 text-right">Saldo Residual</th>
								<th className="py-3 px-4 text-center">Status</th>
								<th className="py-3 px-4 text-center">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={9} className="py-12 text-center text-muted-foreground">
										Nenhuma venda encontrada com os filtros selecionados.
									</td>
								</tr>
							) : (
								filtered.map((order) => {
									const hasResidual = order.financials.residualAmount > 0;
									return (
										<tr key={order.id} className="hover:bg-muted/20 transition-colors">
											<td className="py-3 px-4">
												<span className="font-mono font-bold text-primary">{order.orderNumber}</span>
												<div className="text-[11px] text-muted-foreground">
													{new Date(order.orderDate).toLocaleDateString("pt-BR")}
												</div>
											</td>
											<td className="py-3 px-4">
												<div className="font-bold text-foreground uppercase">{order.patient.name}</div>
												<div className="text-[11px] text-muted-foreground font-mono">{order.patient.cpf}</div>
											</td>
											<td className="py-3 px-4">
												<div className="font-medium text-foreground">{order.store.name}</div>
												<div className="text-[11px] text-muted-foreground">{order.seller.name}</div>
											</td>
											<td className="py-3 px-4 max-w-xs">
												<div className="font-medium truncate">{order.aro1.frameBrand} ({order.aro1.lensName})</div>
												{order.hasAro2 && (
													<Badge variant="outline" className="text-[10px] mt-0.5">
														+ 2º Par: {order.aro2?.frameBrand}
													</Badge>
												)}
											</td>
											<td className="py-3 px-4 text-right font-mono font-bold">
												R$ {order.financials.totalAmount.toFixed(2)}
											</td>
											<td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
												R$ {order.financials.paidAmount.toFixed(2)}
											</td>
											<td className="py-3 px-4 text-right font-mono font-bold">
												{hasResidual ? (
													<span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
														R$ {order.financials.residualAmount.toFixed(2)}
													</span>
												) : (
													<span className="text-muted-foreground font-normal">R$ 0,00</span>
												)}
											</td>
											<td className="py-3 px-4 text-center">
												<Badge variant="outline" className="text-[10px] font-semibold">
													{order.status}
												</Badge>
											</td>
											<td className="py-3 px-4 text-center">
												<div className="flex items-center justify-center gap-1.5">
													<Button
														size="sm"
														variant="outline"
														onClick={() => setSelectedOrder(order)}
														className="h-7 text-xs px-2.5 font-medium"
													>
														Detalhes
													</Button>
													{hasResidual && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleWhatsAppNotice(order)}
															title="Avisar cliente no WhatsApp"
															className="size-7 p-0 text-emerald-600 hover:bg-emerald-500/10"
														>
															<Icon icon={Phone} className="size-4" />
														</Button>
													)}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Detalhes da OS em Sheet */}
			{selectedOrder && (
				<OpticalOrderDetailSheet
					order={selectedOrder}
					open={Boolean(selectedOrder)}
					onOpenChange={(open) => {
						if (!open) setSelectedOrder(null);
					}}
				/>
			)}
		</div>
	);
}
