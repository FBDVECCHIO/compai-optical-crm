"use client";

import Checkmark from "@carbon/icons-react/es/Checkmark";
import OverflowMenuHorizontal from "@carbon/icons-react/es/OverflowMenuHorizontal";
import Phone from "@carbon/icons-react/es/Phone";
import Time from "@carbon/icons-react/es/Time";
import Warning from "@carbon/icons-react/es/Warning";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@crm/ui/components/dropdown-menu";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@crm/ui/components/table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type {
	OpticalOrder,
	OpticalOrderStatus,
} from "@/lib/optical/optical-types";
import { OpticalOrderDetailSheet } from "./optical-order-detail-sheet";

interface OpticalOrdersTableProps {
	searchQuery?: string;
	statusFilter?: string;
}

export function OpticalOrdersTable({
	searchQuery = "",
	statusFilter = "ALL",
}: OpticalOrdersTableProps) {
	const { orders, updateOrderStatus, payResidual } = useOpticalOrders();
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			if (statusFilter !== "ALL") {
				if (statusFilter === "RESIDUAL") {
					if (ord.financials.residualAmount <= 0) return false;
				} else if (ord.status !== statusFilter) {
					return false;
				}
			}

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchNum = ord.orderNumber.toLowerCase().includes(q);
				const matchClient = ord.patient.name.toLowerCase().includes(q);
				const matchCpf = ord.patient.cpf.includes(q);
				const matchLab = ord.aro1.lab.toLowerCase().includes(q);
				const matchFrame = ord.aro1.frameBrand.toLowerCase().includes(q);
				return matchNum || matchClient || matchCpf || matchLab || matchFrame;
			}

			return true;
		});
	}, [orders, searchQuery, statusFilter]);

	const handleRowClick = (order: OpticalOrder) => {
		setSelectedOrder(order);
		setSheetOpen(true);
	};

	return (
		<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
							<TableHead className="w-[180px]">OS & Paciente</TableHead>
							<TableHead className="w-[150px]">Promessa / SLA</TableHead>
							<TableHead className="w-[200px]">Aros & Lentes</TableHead>
							<TableHead className="w-[140px]">Status da OS</TableHead>
							<TableHead className="w-[150px] text-right">Financeiro</TableHead>
							<TableHead className="w-[160px] text-right">Ações</TableHead>
						</tr>
					</TableHeader>
					<TableBody>
						{filteredOrders.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-36 text-center text-xs text-muted-foreground"
								>
									<div className="flex flex-col items-center justify-center gap-2">
										<Icon
											icon={Glasses}
											className="size-8 text-muted-foreground/40"
										/>
										<p className="font-medium">
											Nenhuma Ordem de Serviço encontrada para os filtros
											aplicados.
										</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							filteredOrders.map((order) => {
								const slaInfo = calculateSla(
									order.promisedDeliveryDate,
									order.status,
								);
								const whatsappUrl = generateWhatsAppLink(order);

								return (
									<TableRow
										key={order.id}
										onClick={() => handleRowClick(order)}
										className="cursor-pointer transition-colors hover:bg-muted/50"
									>
										{/* OS & Paciente */}
										<TableCell className="py-3">
											<div className="flex flex-col">
												<span className="font-mono text-xs font-bold text-primary">
													{order.orderNumber}
												</span>
												<span className="font-medium text-xs text-foreground truncate max-w-[160px]">
													{order.patient.name}
												</span>
												<span className="text-[11px] text-muted-foreground font-mono">
													{order.patient.cpf}
												</span>
											</div>
										</TableCell>

										{/* SLA / Prazo */}
										<TableCell className="py-3">
											<div className="flex flex-col gap-1">
												<span className="text-xs font-medium text-foreground">
													{new Date(
														order.promisedDeliveryDate,
													).toLocaleDateString("pt-BR")}
												</span>
												<Badge
													variant="outline"
													className={`w-fit text-[10px] font-semibold gap-1 px-1.5 py-0 ${slaInfo.className}`}
												>
													<Icon icon={slaInfo.icon} className="size-3" />
													{slaInfo.label}
												</Badge>
											</div>
										</TableCell>

										{/* Aros & Lentes */}
										<TableCell className="py-3">
											<div className="flex flex-col text-xs">
												<span className="font-medium text-foreground truncate max-w-[190px]">
													{order.aro1.frameBrand} ({order.aro1.lab})
												</span>
												<span className="text-[11px] text-muted-foreground truncate max-w-[190px]">
													{order.aro1.lensName}
												</span>
												{order.hasAro2 && (
													<span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
														+ 2º Par: {order.aro2?.frameBrand}
													</span>
												)}
											</div>
										</TableCell>

										{/* Status Badge */}
										<TableCell className="py-3">
											<StatusBadge status={order.status} />
										</TableCell>

										{/* Financeiro */}
										<TableCell className="py-3 text-right">
											<div className="flex flex-col items-end">
												<span className="font-mono text-xs font-bold text-foreground">
													R$ {order.financials.totalAmount.toFixed(2)}
												</span>
												{order.financials.residualAmount > 0 ? (
													<Badge
														variant="destructive"
														className="text-[10px] font-mono px-1.5 py-0 mt-0.5"
													>
														Residual: R${" "}
														{order.financials.residualAmount.toFixed(2)}
													</Badge>
												) : (
													<span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
														Quitado
													</span>
												)}
											</div>
										</TableCell>

										{/* Ações */}
										<TableCell
											className="py-3 text-right"
											onClick={(e) => e.stopPropagation()}
										>
											<div className="flex items-center justify-end gap-1.5">
												<Button
													asChild
													variant="outline"
													size="sm"
													className="h-7 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 gap-1 px-2 border-emerald-500/30"
												>
													<a
														href={whatsappUrl}
														target="_blank"
														rel="noopener noreferrer"
														title="Enviar mensagem personalizada via WhatsApp"
													>
														<Icon icon={Phone} className="size-3" />
														WhatsApp
													</a>
												</Button>

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="size-7"
														>
															<Icon
																icon={OverflowMenuHorizontal}
																className="size-4"
															/>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent
														align="end"
														className="w-48 text-xs"
													>
														<DropdownMenuItem
															onClick={() => handleRowClick(order)}
														>
															Ver Detalhes & Dioptrias
														</DropdownMenuItem>
														{order.financials.residualAmount > 0 && (
															<DropdownMenuItem
																onClick={() => {
																	payResidual(order.id);
																	toast.success("Saldo residual quitado!");
																}}
															>
																Quitar Saldo Residual
															</DropdownMenuItem>
														)}
														<DropdownMenuItem
															onClick={() => {
																updateOrderStatus(order.id, "PRONTA_LOJA");
																toast.success(
																	"OS marcada como Pronta na Loja!",
																);
															}}
														>
															Marcar como Pronta na Loja
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => {
																updateOrderStatus(order.id, "ENTREGUE");
																toast.success("OS entregue ao cliente!");
															}}
														>
															Marcar como Entregue
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<OpticalOrderDetailSheet
				order={selectedOrder}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
			/>
		</div>
	);
}

// Helpers
function StatusBadge({ status }: { status: OpticalOrderStatus }) {
	switch (status) {
		case "DIGITADA":
			return (
				<Badge
					variant="outline"
					className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 font-semibold text-[11px]"
				>
					Digitada
				</Badge>
			);
		case "EM_LABORATORIO":
			return (
				<Badge
					variant="outline"
					className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 font-semibold text-[11px]"
				>
					Em Laboratório
				</Badge>
			);
		case "EM_MONTAGEM":
			return (
				<Badge
					variant="outline"
					className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 font-semibold text-[11px]"
				>
					Em Montagem
				</Badge>
			);
		case "CONFERIDA":
			return (
				<Badge
					variant="outline"
					className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300 font-semibold text-[11px]"
				>
					Conferida Técnica
				</Badge>
			);
		case "PRONTA_LOJA":
			return (
				<Badge
					variant="outline"
					className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-semibold text-[11px]"
				>
					Pronta na Loja
				</Badge>
			);
		case "ENTREGUE":
			return (
				<Badge
					variant="outline"
					className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 font-medium text-[11px]"
				>
					Entregue
				</Badge>
			);
		case "CANCELADA":
			return (
				<Badge variant="destructive" className="font-medium text-[11px]">
					Cancelada
				</Badge>
			);
	}
}

function calculateSla(promisedDateStr: string, status: OpticalOrderStatus) {
	if (status === "ENTREGUE") {
		return {
			label: "Concluído",
			icon: Checkmark,
			className: "text-zinc-500 border-zinc-200 dark:border-zinc-800",
		};
	}

	const now = new Date();
	const target = new Date(promisedDateStr);
	const diffMs = target.getTime() - now.getTime();
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return {
			label: `Atrasada ${Math.abs(diffDays)}d`,
			icon: Warning,
			className:
				"text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800",
		};
	}
	if (diffDays === 0) {
		return {
			label: "Vence hoje!",
			icon: Time,
			className:
				"text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
		};
	}
	if (diffDays === 1) {
		return {
			label: "Vence amanhã",
			icon: Time,
			className:
				"text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
		};
	}
	return {
		label: `${diffDays} dias restantes`,
		icon: Time,
		className:
			"text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800",
	};
}
