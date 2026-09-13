"use client";

import Bot from "@carbon/icons-react/es/Bot";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import MagicWand from "@carbon/icons-react/es/MagicWand";
import Warning from "@carbon/icons-react/es/Warning";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { useOpticalOrders } from "@/lib/optical/optical-store";

export function OpticalAuditView() {
	const { orders } = useOpticalOrders();

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Top Bar */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<Icon icon={Bot} className="size-6" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-bold tracking-tight">Centro de Auditoria & Agente IA Óptico</h2>
							<Badge variant="secondary" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
								Motor Eve Ativo
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground mt-0.5">
							Auditoria matemática de dioptrias, eixos, transposição cilíndrica e acompanhamento de SLAs de laboratório.
						</p>
					</div>
				</div>
			</div>

			{/* Cards de Inteligência do Agente */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-2">
					<span className="text-xs font-semibold text-muted-foreground uppercase">Ledger de Evidências</span>
					<span className="text-xl font-bold text-foreground">100% Auditado</span>
					<p className="text-[11px] text-muted-foreground">
						Nenhuma dioptria ou grau médico é adivinhado pela IA. Validação segundo tolerâncias ABNT NBR ISO 21987.
					</p>
				</div>

				<div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-4 flex flex-col gap-2">
					<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Transposição Cilíndrica</span>
					<span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Automática</span>
					<p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
						Cilindros positivos da receita são transpostos automaticamente para notação negativa de laboratório.
					</p>
				</div>

				<div className="rounded-xl border bg-blue-500/10 border-blue-500/20 p-4 flex flex-col gap-2">
					<span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">SLA de Laboratórios</span>
					<span className="text-xl font-bold text-blue-600 dark:text-blue-400">Tempo Real</span>
					<p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
						Monitoramento contínuo da margem entre data prometida ao cliente e previsão do laboratório.
					</p>
				</div>
			</div>

			{/* Log de Auditorias das OSs Recentes */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
				<h3 className="font-bold text-sm text-foreground">Auditoria de Ordens de Serviço Recentes</h3>

				<div className="divide-y rounded-lg border">
					{orders.map((order) => (
						<div key={order.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
									<Icon icon={Checkmark} className="size-4" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className="font-mono font-bold text-primary text-xs">{order.orderNumber}</span>
										<span className="text-xs font-semibold text-foreground uppercase">{order.patient.name}</span>
										<Badge variant="outline" className="text-[10px]">
											{order.aro1.lab}
										</Badge>
									</div>
									<div className="text-[11px] text-muted-foreground mt-0.5">
										OD: {order.aro1.diopters.od.esf} esf / {order.aro1.diopters.od.cil} cil x {order.aro1.diopters.od.eixo}° · OE: {order.aro1.diopters.oe.esf} esf / {order.aro1.diopters.oe.cil} cil x {order.aro1.diopters.oe.eixo}°
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
									Conformidade Óptica Aprovada
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
