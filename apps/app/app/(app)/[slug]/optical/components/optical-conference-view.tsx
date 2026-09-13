"use client";

import Bot from "@carbon/icons-react/es/Bot";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Search from "@carbon/icons-react/es/Search";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";
import { useOpticalOrders } from "@/lib/optical/optical-store";

export function OpticalConferenceView() {
	const { orders, updateOrderStatus } = useOpticalOrders();
	const [searchOs, setSearchOs] = useState("");

	// Pedidos que estão no laboratório ou aguardando conferência
	const conferenceOrders = orders.filter(
		(o) =>
			o.status === "EM_LABORATORIO" ||
			o.status === "EM_MONTAGEM" ||
			o.status === "CONFERIDA" ||
			o.status === "PRONTA_LOJA",
	);

	const filtered = conferenceOrders.filter(
		(o) =>
			o.orderNumber.toLowerCase().includes(searchOs.toLowerCase()) ||
			o.patient.name.toLowerCase().includes(searchOs.toLowerCase()),
	);

	const handleApprove = (orderId: string, orderNumber: string) => {
		updateOrderStatus(orderId, "PRONTA_LOJA");
		toast.success(`Conferência da OS ${orderNumber} aprovada!`, {
			description: "Status alterado para PRONTA NA LOJA. Alerta de retirada com Pix gerado para o cliente.",
		});
	};

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Header */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-bold tracking-tight">Conferência de Laboratório e Montagem</h2>
						<Badge variant="secondary" className="font-mono text-xs">
							{conferenceOrders.length} OSs no Circuito
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">
						Valide a chegada das lentes do laboratório, confira dioptrias no lensômetro e libere para retirada na loja.
					</p>
				</div>

				<div className="flex items-center gap-3 w-full sm:w-72">
					<div className="relative w-full">
						<Icon icon={Search} className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
						<Input
							value={searchOs}
							onChange={(e) => setSearchOs(e.target.value)}
							placeholder="Buscar por OS ou Paciente..."
							className="h-9 pl-8 text-xs"
						/>
					</div>
				</div>
			</div>

			{/* Tabela de Conferência */}
			<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
								<th className="py-3 px-4 text-left">OS / Loja</th>
								<th className="py-3 px-4 text-left">Paciente</th>
								<th className="py-3 px-4 text-left">Laboratório</th>
								<th className="py-3 px-4 text-left">Lente e Tratamento</th>
								<th className="py-3 px-4 text-center">Dioptrias OD / OE</th>
								<th className="py-3 px-4 text-center">Status Atual</th>
								<th className="py-3 px-4 text-center">Auditoria IA</th>
								<th className="py-3 px-4 text-right">Ação</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="py-12 text-center text-muted-foreground">
										Nenhuma ordem de serviço pendente de conferência no momento.
									</td>
								</tr>
							) : (
								filtered.map((order) => {
									const isReady = order.status === "PRONTA_LOJA";
									return (
										<tr key={order.id} className="hover:bg-muted/20 transition-colors">
											<td className="py-3 px-4">
												<span className="font-mono font-bold text-primary">{order.orderNumber}</span>
												<div className="text-[11px] text-muted-foreground">{order.store.name}</div>
											</td>
											<td className="py-3 px-4">
												<div className="font-semibold text-foreground uppercase">{order.patient.name}</div>
												<div className="text-[11px] text-muted-foreground">{order.patient.whatsapp}</div>
											</td>
											<td className="py-3 px-4">
												<Badge variant="outline" className="font-medium text-[11px]">
													{order.aro1.lab}
												</Badge>
											</td>
											<td className="py-3 px-4 max-w-xs">
												<div className="font-medium truncate">{order.aro1.lensName}</div>
												<div className="text-[11px] text-muted-foreground truncate">{order.aro1.treatment}</div>
											</td>
											<td className="py-3 px-4 text-center font-mono text-[11px]">
												<div>OD: {order.aro1.diopters.od.esf} esf / {order.aro1.diopters.od.cil} cil x {order.aro1.diopters.od.eixo}°</div>
												<div>OE: {order.aro1.diopters.oe.esf} esf / {order.aro1.diopters.oe.cil} cil x {order.aro1.diopters.oe.eixo}°</div>
											</td>
											<td className="py-3 px-4 text-center">
												<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
													isReady
														? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
														: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
												}`}>
													{isReady ? "CONFERIDA / NA LOJA" : order.status}
												</span>
											</td>
											<td className="py-3 px-4 text-center">
												<div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
													<Icon icon={Bot} className="size-3.5" />
													<span>Validado</span>
												</div>
											</td>
											<td className="py-3 px-4 text-right">
												{isReady ? (
													<Button size="sm" variant="ghost" disabled className="h-8 text-xs text-muted-foreground">
														Já na Loja
													</Button>
												) : (
													<Button
														size="sm"
														onClick={() => handleApprove(order.id, order.orderNumber)}
														className="h-8 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
													>
														<Icon icon={Checkmark} className="size-3.5" />
														Aprovar
													</Button>
												)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
