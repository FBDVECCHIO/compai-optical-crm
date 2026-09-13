"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Money from "@carbon/icons-react/es/Money";
import Store from "@carbon/icons-react/es/Store";
import Wallet from "@carbon/icons-react/es/Wallet";
import { Badge } from "@crm/ui/components/badge";
import { Icon } from "@crm/ui/components/icon";
import { useOpticalOrders } from "@/lib/optical/optical-store";

export function OpticalManagementSummaryView() {
	const { orders } = useOpticalOrders();

	// Financial Aggregates
	const totalRevenue = orders.reduce((sum, o) => sum + o.financials.totalAmount, 0);
	const totalPaid = orders.reduce((sum, o) => sum + o.financials.paidAmount, 0);
	const totalResidual = orders.reduce((sum, o) => sum + o.financials.residualAmount, 0);
	const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

	// Per-store Breakdown
	const storeMap = new Map<
		string,
		{ total: number; paid: number; residual: number; count: number }
	>();

	for (const order of orders) {
		const name = order.store.name;
		const curr = storeMap.get(name) || { total: 0, paid: 0, residual: 0, count: 0 };
		curr.total += order.financials.totalAmount;
		curr.paid += order.financials.paidAmount;
		curr.residual += order.financials.residualAmount;
		curr.count += 1;
		storeMap.set(name, curr);
	}

	const storeStats = Array.from(storeMap.entries()).map(([store, stats]) => ({
		store,
		...stats,
	}));

	// Payment Methods Breakdown
	const methodMap = new Map<string, number>();
	for (const order of orders) {
		const method = order.financials.paymentMethod1;
		methodMap.set(method, (methodMap.get(method) || 0) + order.financials.paidAmount);
	}
	const methodStats = Array.from(methodMap.entries());

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Top Summary Header */}
			<div className="rounded-xl border bg-card p-5 shadow-xs">
				<div className="flex items-center gap-3 mb-4 border-b pb-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Icon icon={Analytics} className="size-5" />
					</div>
					<div>
						<h2 className="text-base font-bold tracking-tight">Resumo Gerencial e Financeiro de Vendas</h2>
						<p className="text-xs text-muted-foreground">Consolidação de faturamento, recebimentos em caixa e saldos residuais por loja.</p>
					</div>
				</div>

				{/* 4 Cards Principais */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className="rounded-xl border bg-muted/20 p-4 flex flex-col">
						<span className="text-xs font-semibold text-muted-foreground uppercase">Faturamento Total Bruto</span>
						<span className="text-2xl font-bold font-mono text-foreground mt-1">
							R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</span>
						<span className="text-[11px] text-muted-foreground mt-1">{orders.length} OSs emitidas</span>
					</div>

					<div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-4 flex flex-col">
						<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Recebido em Caixa (Sinais)</span>
						<span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
							R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</span>
						<span className="text-[11px] text-emerald-600/80 mt-1">
							{totalRevenue > 0 ? `${((totalPaid / totalRevenue) * 100).toFixed(0)}% do total realizado` : "0%"}
						</span>
					</div>

					<div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-4 flex flex-col">
						<span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Residual a Receber na Retirada</span>
						<span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
							R$ {totalResidual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</span>
						<span className="text-[11px] text-amber-600/80 mt-1">
							{orders.filter((o) => o.financials.residualAmount > 0).length} clientes com resíduo
						</span>
					</div>

					<div className="rounded-xl border bg-muted/20 p-4 flex flex-col">
						<span className="text-xs font-semibold text-muted-foreground uppercase">Ticket Médio por OS</span>
						<span className="text-2xl font-bold font-mono text-primary mt-1">
							R$ {averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
						</span>
						<span className="text-[11px] text-muted-foreground mt-1">Média por atendimento</span>
					</div>
				</div>
			</div>

			{/* Faturamento por Loja & Métodos de Pagamento */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Tabela de Lojas (7 colunas) */}
				<div className="lg:col-span-8 rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
					<div className="flex items-center gap-2 border-b pb-3 font-bold text-sm">
						<Icon icon={Store} className="size-4 text-primary" />
						Faturamento e Resíduos por Loja Física
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
									<th className="py-2.5 px-3 text-left">Loja da Rede</th>
									<th className="py-2.5 px-3 text-center">Vendas</th>
									<th className="py-2.5 px-3 text-right">Faturamento</th>
									<th className="py-2.5 px-3 text-right">Recebido (Caixa)</th>
									<th className="py-2.5 px-3 text-right">Residual Pendente</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{storeStats.map((st) => (
									<tr key={st.store} className="hover:bg-muted/20 transition-colors">
										<td className="py-3 px-3 font-semibold text-foreground">{st.store}</td>
										<td className="py-3 px-3 text-center font-mono">{st.count}</td>
										<td className="py-3 px-3 text-right font-mono font-bold">R$ {st.total.toFixed(2)}</td>
										<td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
											R$ {st.paid.toFixed(2)}
										</td>
										<td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
											R$ {st.residual.toFixed(2)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Meios de Pagamento (4 colunas) */}
				<div className="lg:col-span-4 rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
					<div className="flex items-center gap-2 border-b pb-3 font-bold text-sm">
						<Icon icon={Wallet} className="size-4 text-primary" />
						Modalidades de Pagamento
					</div>

					<div className="flex flex-col gap-3">
						{methodStats.map(([method, amount]) => {
							const perc = totalPaid > 0 ? (amount / totalPaid) * 100 : 0;
							return (
								<div key={method} className="flex flex-col gap-1 border-b pb-2.5 last:border-0">
									<div className="flex items-center justify-between text-xs">
										<span className="font-semibold">{method}</span>
										<span className="font-mono font-bold">R$ {amount.toFixed(2)}</span>
									</div>
									<div className="flex items-center justify-between text-[11px] text-muted-foreground">
										<div className="w-full bg-muted rounded-full h-1.5 mr-3 overflow-hidden">
											<div
												className="bg-primary h-full rounded-full transition-all"
												style={{ width: `${perc}%` }}
											/>
										</div>
										<span className="shrink-0">{perc.toFixed(0)}%</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
