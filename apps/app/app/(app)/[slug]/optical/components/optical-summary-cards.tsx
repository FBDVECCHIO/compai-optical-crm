"use client";

import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import Money from "@carbon/icons-react/es/Money";
import Time from "@carbon/icons-react/es/Time";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import { useMemo } from "react";
import { useOpticalOrders } from "@/lib/optical/optical-store";

export function OpticalSummaryCards() {
	const { orders } = useOpticalOrders();

	const metrics = useMemo(() => {
		let inProgress = 0;
		let inLabOrMontagem = 0;
		let readyInStore = 0;
		let totalResidual = 0;

		for (const ord of orders) {
			if (ord.status !== "ENTREGUE" && ord.status !== "CANCELADA") {
				inProgress++;
			}
			if (ord.status === "EM_LABORATORIO" || ord.status === "EM_MONTAGEM") {
				inLabOrMontagem++;
			}
			if (ord.status === "PRONTA_LOJA") {
				readyInStore++;
			}
			totalResidual += ord.financials.residualAmount;
		}

		return {
			inProgress,
			inLabOrMontagem,
			readyInStore,
			totalResidual,
		};
	}, [orders]);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{/* Card 1: OS em Andamento */}
			<div className="rounded-xl border bg-card p-4 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">
						OSs em Andamento
					</span>
					<div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
						<Icon icon={Glasses} className="size-4" />
					</div>
				</div>
				<div className="mt-2 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono tracking-tight text-foreground">
						{metrics.inProgress}
					</span>
					<span className="text-xs text-muted-foreground">
						ativas no balcão
					</span>
				</div>
			</div>

			{/* Card 2: No Laboratório / Montagem */}
			<div className="rounded-xl border bg-card p-4 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">
						No Lab / Montagem
					</span>
					<div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
						<Icon icon={Time} className="size-4" />
					</div>
				</div>
				<div className="mt-2 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono tracking-tight text-foreground">
						{metrics.inLabOrMontagem}
					</span>
					<span className="text-xs text-muted-foreground">em confecção</span>
				</div>
			</div>

			{/* Card 3: Prontas na Loja */}
			<div className="rounded-xl border bg-card p-4 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">
						Prontas na Loja (Retirada)
					</span>
					<div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<Icon icon={CheckmarkFilled} className="size-4" />
					</div>
				</div>
				<div className="mt-2 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
						{metrics.readyInStore}
					</span>
					<span className="text-xs text-muted-foreground">
						aguardando cliente
					</span>
				</div>
			</div>

			{/* Card 4: Saldo Residual Total */}
			<div className="rounded-xl border bg-card p-4 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">
						Saldo Residual a Receber
					</span>
					<div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
						<Icon icon={Money} className="size-4" />
					</div>
				</div>
				<div className="mt-2 flex items-baseline gap-2">
					<span className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
						R${" "}
						{metrics.totalResidual.toLocaleString("pt-BR", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					</span>
					<span className="text-xs text-muted-foreground">
						a cobrar na retirada
					</span>
				</div>
			</div>
		</div>
	);
}
