"use client";

import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import Search from "@carbon/icons-react/es/Search";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type { OpticalOrder } from "@/lib/optical/optical-types";
import { OpticalOrderDetailSheet } from "./optical-order-detail-sheet";
import { printOpticalReport } from "@/lib/optical/optical-print-report";

export function OpticalSalesLogView() {
	const { orders } = useOpticalOrders();
	const [filterType, setFilterType] = useState<"ALL" | "PAID" | "RESIDUAL">("ALL");
	const [search, setSearch] = useState("");
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);

	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);

	const filtered = useMemo(() => {
		return orders.filter((o) => {
			if (!o) return false;
			const residual = Number(o.financials?.residualAmount) || 0;
			// Filter by payment status
			if (filterType === "PAID" && residual > 0) return false;
			if (filterType === "RESIDUAL" && residual <= 0) return false;

			// Filter by search text (OS, Paciente, Vendedor, Loja)
			const query = search.toLowerCase();
			return (
				(o.orderNumber || "").toLowerCase().includes(query) ||
				(o.patient?.name || "").toLowerCase().includes(query) ||
				(o.seller?.name || "").toLowerCase().includes(query) ||
				(o.store?.name || "").toLowerCase().includes(query)
			);
		});
	}, [orders, filterType, search]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filterType, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const paginated = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, currentPage, pageSize]);

	const handleWhatsAppNotice = (order: OpticalOrder) => {
		const url = generateWhatsAppLink(order);
		window.open(url, "_blank", "noopener,noreferrer");
		toast.success(`WhatsApp aberto para ${order.patient?.name || "Cliente"}!`);
	};

	const handleExportPDF = () => {
		const totalVendido = filtered.reduce((acc, o) => acc + (Number(o.financials?.totalAmount) || 0), 0);
		const totalRecebido = filtered.reduce((acc, o) => acc + (Number(o.financials?.paidAmount) || 0), 0);
		const totalResidual = filtered.reduce((acc, o) => acc + (Number(o.financials?.residualAmount) || 0), 0);

		printOpticalReport({
			title: "Relatório de Vendas e Ordens de Serviço (Balcão)",
			subtitle: "Histórico Operacional de Pedidos, Faturamento e Saldos Residuais",
			period: "Período Geral",
			kpis: [
				{ label: "Total de Ordens", value: filtered.length },
				{ label: "Faturamento Total", value: `R$ ${totalVendido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, highlight: true },
				{ label: "Entrada / Pago", value: `R$ ${totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
				{ label: "Saldo a Receber", value: `R$ ${totalResidual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
			],
			columns: [
				{ header: "OS", key: "os", width: "90px" },
				{ header: "Emissão", key: "emissao", width: "90px" },
				{ header: "Paciente / Cliente", key: "paciente", width: "180px" },
				{ header: "Loja", key: "loja", width: "120px" },
				{ header: "Vendedor", key: "vendedor", width: "120px" },
				{ header: "Valor Venda", key: "valorTotal", align: "right", width: "100px" },
				{ header: "Recebido", key: "valorPago", align: "right", width: "100px" },
				{ header: "Saldo Residual", key: "saldoResidual", align: "right", width: "100px" },
				{ header: "Status", key: "status", align: "center", width: "90px" },
			],
			data: filtered.map((o) => ({
				os: o.orderNumber || "—",
				emissao: (() => {
					try {
						const d = o.orderDate || o.createdAt ? new Date(o.orderDate || o.createdAt) : null;
						return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
					} catch {
						return "—";
					}
				})(),
				paciente: `${o.patient?.name || "Cliente"} (${o.patient?.cpf || "S/ CPF"})`,
				loja: o.store?.name || "—",
				vendedor: o.seller?.name || "—",
				valorTotal: `R$ ${(Number(o.financials?.totalAmount) || 0).toFixed(2)}`,
				valorPago: `R$ ${(Number(o.financials?.paidAmount) || 0).toFixed(2)}`,
				saldoResidual: `R$ ${(Number(o.financials?.residualAmount) || 0).toFixed(2)}`,
				status: o.status,
			})),
		});
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

					<Button
						variant="outline"
						size="sm"
						onClick={handleExportPDF}
						className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-neutral-300 dark:border-neutral-700 shadow-2xs"
					>
						<Icon icon={DocumentExport} className="size-3.5" />
						Exportar PDF
					</Button>
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
								paginated.map((order) => {
									const total = Number(order.financials?.totalAmount) || 0;
									const paid = Number(order.financials?.paidAmount) || 0;
									const residual = Number(order.financials?.residualAmount) || 0;
									const hasResidual = residual > 0;
									const dateFormatted = (() => {
										try {
											const d = order.orderDate || order.createdAt ? new Date(order.orderDate || order.createdAt) : null;
											return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
										} catch {
											return "—";
										}
									})();

									return (
										<tr key={order.id} className="hover:bg-muted/20 transition-colors">
											<td className="py-3 px-4">
												<span className="font-mono font-bold text-primary">{order.orderNumber}</span>
												<div className="text-[11px] text-muted-foreground">
													{dateFormatted}
												</div>
											</td>
											<td className="py-3 px-4">
												<div className="font-bold text-foreground uppercase">{order.patient?.name || "Cliente"}</div>
												<div className="text-[11px] text-muted-foreground font-mono">{order.patient?.cpf || "—"}</div>
											</td>
											<td className="py-3 px-4">
												<div className="font-medium text-foreground">{order.store?.name || "—"}</div>
												<div className="text-[11px] text-muted-foreground">{order.seller?.name || "—"}</div>
											</td>
											<td className="py-3 px-4 max-w-xs">
												<div className="font-medium truncate">{order.aro1?.frameBrand || "Armação"} ({order.aro1?.lensName || "Lente"})</div>
												{order.hasAro2 && (
													<Badge variant="outline" className="text-[10px] mt-0.5">
														+ 2º Par: {order.aro2?.frameBrand || "Armação 2"}
													</Badge>
												)}
											</td>
											<td className="py-3 px-4 text-right font-mono font-bold">
												R$ {total.toFixed(2)}
											</td>
											<td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
												R$ {paid.toFixed(2)}
											</td>
											<td className="py-3 px-4 text-right font-mono font-bold">
												{hasResidual ? (
													<span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
														R$ {residual.toFixed(2)}
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
														aria-label={`Ver detalhes completos da OS ${order.orderNumber}`}
														title={`Ver detalhes completos da OS ${order.orderNumber}`}
													>
														Detalhes
													</Button>
													{hasResidual && (
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleWhatsAppNotice(order)}
															title={`Avisar paciente ${order.patient?.name || "cliente"} sobre saldo residual no WhatsApp`}
															aria-label={`Avisar paciente ${order.patient?.name || "cliente"} sobre saldo residual de R$ ${residual.toFixed(2)} da OS ${order.orderNumber} no WhatsApp`}
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

				{/* Paginação Acessível */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<span>Linhas por página:</span>
						<select
							value={pageSize}
							onChange={(e) => {
								setPageSize(Number(e.target.value));
								setCurrentPage(1);
							}}
							aria-label="Selecione a quantidade de vendas exibidas por página"
							className="h-7 px-2 rounded-md border bg-background text-foreground text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
						>
							<option value={15}>15</option>
							<option value={30}>30</option>
							<option value={50}>50</option>
						</select>
						<span>
							Exibindo {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{" "}
							{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} vendas
						</span>
					</div>

					<div className="flex items-center gap-1">
						<span className="mr-2">
							Página {currentPage} de {totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							className="size-7"
							disabled={currentPage <= 1}
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							aria-label="Ir para a página anterior de vendas"
							title="Página anterior"
						>
							<Icon icon={ChevronLeft} className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="size-7"
							disabled={currentPage >= totalPages}
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							aria-label="Ir para a próxima página de vendas"
							title="Próxima página"
						>
							<Icon icon={ChevronRight} className="size-4" />
						</Button>
					</div>
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
