"use client";

import { useMemo, useState } from "react";
import Analytics from "@carbon/icons-react/es/Analytics";
import Calendar from "@carbon/icons-react/es/Calendar";
import ChartLineData from "@carbon/icons-react/es/ChartLineData";
import Edit from "@carbon/icons-react/es/Edit";
import Money from "@carbon/icons-react/es/Money";
import Search from "@carbon/icons-react/es/Search";
import Trophy from "@carbon/icons-react/es/Trophy";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import Reset from "@carbon/icons-react/es/Reset";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { toast } from "sonner";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";
import { CreateOpticalOrderSheet } from "./create-optical-order-sheet";
import { OpticalOrdersTable } from "./optical-orders-table";

interface SellerGoalItem {
	id: string;
	nome: string;
	loja: string;
	metaMes: number;
	premioSemana: number;
}

export function OpticalSalesPerformanceView() {
	const { orders } = useOpticalOrders();

	// 1. CONTROLE DE DIAS ÚTEIS (Cálculo Automático com Ajuste)
	const now = new Date();
	const currentMonthName = now.toLocaleDateString("pt-BR", { month: "long" });
	const capitalizedMonth =
		currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
	const currentYear = now.getFullYear();

	// Dias úteis: padrão de óticas (Segunda a Sábado = ~26 dias úteis; Seg-Sex = ~22)
	const [regimeSabado, setRegimeSabado] = useState(true);
	const [customTotalDiasUteis, setCustomTotalDiasUteis] = useState<number>(26);
	const [customDiasDecorridos, setCustomDiasDecorridos] = useState<number>(14);

	const totalDiasUteis = customTotalDiasUteis;
	const diasDecorridos = Math.min(customDiasDecorridos, totalDiasUteis);
	const diasRestantes = Math.max(0, totalDiasUteis - diasDecorridos);
	const progressDiasUteisPct =
		totalDiasUteis > 0 ? (diasDecorridos / totalDiasUteis) * 100 : 0;

	// 2. VENDEDORES E METAS
	const [sellerGoals, setSellerGoals] = useState<SellerGoalItem[]>([
		{
			id: "v-1",
			nome: "Fabiano",
			loja: "Todas as Lojas",
			metaMes: 45000,
			premioSemana: 400,
		},
		{
			id: "v-2",
			nome: "CESAR",
			loja: "Conceição (Matriz)",
			metaMes: 38000,
			premioSemana: 350,
		},
		{
			id: "v-3",
			nome: "MN Barao",
			loja: "MN (Barão)",
			metaMes: 32000,
			premioSemana: 300,
		},
		{
			id: "v-4",
			nome: "Tati - Lab",
			loja: "Laboratório / Apoio",
			metaMes: 25000,
			premioSemana: 250,
		},
	]);

	// Modal para editar meta do vendedor
	const [editingSeller, setEditingSeller] = useState<SellerGoalItem | null>(null);
	const [editMetaValue, setEditMetaValue] = useState<number>(0);
	const [editPremioValue, setEditPremioValue] = useState<number>(0);

	// Filtros da Lista de OSs
	const [orderSearchQuery, setOrderSearchQuery] = useState("");
	const [orderFilterStatus, setOrderFilterStatus] = useState("ALL");

	// Agregação de vendas reais por vendedor
	const sellerPerformance = useMemo(() => {
		return sellerGoals.map((seller) => {
			const sOrders = orders.filter((o) => {
				const sellerName = o.seller?.name || "";
				return (
					sellerName.toLowerCase().includes(seller.nome.toLowerCase()) ||
					seller.nome.toLowerCase().includes(sellerName.toLowerCase())
				);
			});

			const totalRealizado = sOrders.reduce(
				(acc, o) => acc + o.financials.totalAmount,
				0,
			);

			// Vendas da semana atual (aproximação pelos últimos 6 dias)
			const seisDiasAtras = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
			const vendasSemana = sOrders
				.filter((o) => new Date(o.createdAt) >= seisDiasAtras)
				.reduce((acc, o) => acc + o.financials.totalAmount, 0);

			const pctAtingidoMes =
				seller.metaMes > 0 ? (totalRealizado / seller.metaMes) * 100 : 0;

			// Meta esperada hoje no ritmo dos dias úteis
			const metaEsperadaHoje =
				seller.metaMes * (progressDiasUteisPct / 100);

			// Diferença entre o faturado e o esperado no tempo
			const diferencaRitmo = totalRealizado - metaEsperadaHoje;

			// Pace (Ritmo de Venda estilo Salesforce: Realizado / Esperado)
			const paceMultiplier =
				metaEsperadaHoje > 0
					? totalRealizado / metaEsperadaHoje
					: totalRealizado > 0
						? 1.5
						: 0;
			const pacePct = paceMultiplier * 100;

			// Meta diária necessária para os dias úteis restantes
			const valorFaltante = Math.max(0, seller.metaMes - totalRealizado);
			const metaDiariaNecessaria =
				diasRestantes > 0 ? valorFaltante / diasRestantes : 0;

			// Meta semanal (meta do mês / ~4.3 semanas)
			const metaSemana = seller.metaMes / 4.3;
			const atingiuPremioSemana =
				vendasSemana >= metaSemana || (pacePct >= 100 && vendasSemana > 0);

			return {
				...seller,
				osCount: sOrders.length,
				totalRealizado,
				vendasSemana,
				pctAtingidoMes,
				metaEsperadaHoje,
				diferencaRitmo,
				pacePct,
				paceMultiplier,
				metaDiariaNecessaria,
				metaSemana,
				atingiuPremioSemana,
			};
		});
	}, [sellerGoals, orders, progressDiasUteisPct, diasRestantes, now]);

	// Métricas Globais da Loja
	const totalFaturadoGeral = useMemo(() => {
		return orders.reduce((acc, o) => acc + o.financials.totalAmount, 0);
	}, [orders]);

	const totalMetaLoja = useMemo(() => {
		return sellerGoals.reduce((acc, s) => acc + s.metaMes, 0);
	}, [sellerGoals]);

	const totalResiduosGeral = useMemo(() => {
		return orders.reduce((acc, o) => acc + o.financials.residualAmount, 0);
	}, [orders]);

	const ticketMedioGeral = useMemo(() => {
		return orders.length > 0 ? totalFaturadoGeral / orders.length : 0;
	}, [orders, totalFaturadoGeral]);

	const metaEsperadaLojaHoje =
		totalMetaLoja * (progressDiasUteisPct / 100);
	const diferencaLojaRitmo = totalFaturadoGeral - metaEsperadaLojaHoje;
	const paceLojaGeral =
		metaEsperadaLojaHoje > 0
			? (totalFaturadoGeral / metaEsperadaLojaHoje) * 100
			: 100;
	const metaDiariaLojaNecessaria =
		diasRestantes > 0
			? Math.max(0, totalMetaLoja - totalFaturadoGeral) / diasRestantes
			: 0;

	const handleOpenEditSeller = (seller: SellerGoalItem) => {
		setEditingSeller(seller);
		setEditMetaValue(seller.metaMes);
		setEditPremioValue(seller.premioSemana);
	};

	const handleSaveSellerGoal = () => {
		if (!editingSeller) return;
		setSellerGoals((prev) =>
			prev.map((s) =>
				s.id === editingSeller.id
					? {
							...s,
							metaMes: Number(editMetaValue) || s.metaMes,
							premioSemana: Number(editPremioValue) || s.premioSemana,
						}
					: s,
			),
		);
		toast.success(`Metas de ${editingSeller.nome} atualizadas com sucesso!`);
		setEditingSeller(null);
	};

	return (
		<div className="space-y-6">
			{/* 1. CABEÇALHO COM AÇÃO PRINCIPAL DE LANÇAR OS */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
							MNOC-X
						</span>
						<h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
							Balcão & Vendas
						</h1>
					</div>
					<p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
						Dashboard de performance comercial, controle de metas por dias úteis
						e lançamento de ordens de serviço.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<CreateOpticalOrderSheet />
				</div>
			</div>

			{/* 2. KPIS GERAIS DE PERFORMANCE (Cards Brancos em Container Cinza Baixo) */}
			<MnocxCard variant="container" padding="md" className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded-lg bg-zinc-800 text-white text-xs font-bold">
							<Icon icon={Analytics} className="size-3.5" />
						</div>
						<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							Performance Consolidada da Rede • {capitalizedMonth} / {currentYear}
						</h2>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-zinc-500 font-medium">
							Dias Úteis: {diasDecorridos} decorridos de {totalDiasUteis} ({progressDiasUteisPct.toFixed(1)}% do mês)
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* Card 1: Faturamento do Mês */}
					<MnocxCard variant="info" padding="sm">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
								Faturamento do Mês
							</span>
							<Icon icon={Money} className="size-4 text-emerald-600" />
						</div>
						<div className="mt-1 flex items-baseline justify-between">
							<span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(totalFaturadoGeral)}
							</span>
							<Badge
								variant="default"
								className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
							>
								{totalMetaLoja > 0
									? `${((totalFaturadoGeral / totalMetaLoja) * 100).toFixed(1)}% da Meta`
									: "100%"}
							</Badge>
						</div>
						<div className="mt-2 text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
							<span>Meta Total:</span>
							<span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(totalMetaLoja)}
							</span>
						</div>
					</MnocxCard>

					{/* Card 2: Meta Diária Necessária */}
					<MnocxCard variant="info" padding="sm">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
								Meta Diária Necessária
							</span>
							<Icon icon={Calendar} className="size-4 text-blue-600" />
						</div>
						<div className="mt-1 flex items-baseline justify-between">
							<span className="text-xl font-bold text-blue-700 dark:text-blue-400 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(metaDiariaLojaNecessaria)}
								<span className="text-xs font-normal text-zinc-500">/dia</span>
							</span>
							<span className="text-[10px] font-semibold text-zinc-500">
								{diasRestantes} dias restantes
							</span>
						</div>
						<div className="mt-2 text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
							<span>Falta Faturar:</span>
							<span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(Math.max(0, totalMetaLoja - totalFaturadoGeral))}
							</span>
						</div>
					</MnocxCard>

					{/* Card 3: Tíquete Médio & OSs */}
					<MnocxCard variant="info" padding="sm">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
								Tíquete Médio / OSs
							</span>
							<Icon icon={ChartLineData} className="size-4 text-zinc-500" />
						</div>
						<div className="mt-1 flex items-baseline justify-between">
							<span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(ticketMedioGeral)}
							</span>
							<span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
								{orders.length} OSs
							</span>
						</div>
						<div className="mt-2 text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
							<span>Ritmo da Loja:</span>
							<span
								className={`font-semibold font-mono ${
									diferencaLojaRitmo >= 0
										? "text-emerald-600"
										: "text-amber-600"
								}`}
							>
								{diferencaLojaRitmo >= 0 ? "+" : ""}
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(diferencaLojaRitmo)}
							</span>
						</div>
					</MnocxCard>

					{/* Card 4: Saldo Residual a Receber */}
					<MnocxCard variant="info" padding="sm">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
								Saldo Residual a Receber
							</span>
							<Icon icon={WarningAlt} className="size-4 text-rose-500" />
						</div>
						<div className="mt-1 flex items-baseline justify-between">
							<span className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(totalResiduosGeral)}
							</span>
							<Badge
								variant="outline"
								className="text-[10px] text-rose-600 border-rose-200"
							>
								{orders.filter((o) => o.financials.residualAmount > 0).length} OSs
							</Badge>
						</div>
						<div className="mt-2 text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
							<span>Receber na Retirada:</span>
							<span className="font-semibold text-zinc-700 dark:text-zinc-300">
								Aviso automático ativo
							</span>
						</div>
					</MnocxCard>
				</div>
			</MnocxCard>

			{/* 3. GESTÃO DE METAS POR DIAS ÚTEIS COM MEDIDOR ESTILO SALESFORCE */}
			<MnocxCard variant="container" padding="md" className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
					<div>
						<div className="flex items-center gap-2">
							<div className="flex size-6 items-center justify-center rounded-lg bg-zinc-800 text-white text-xs font-bold">
								<Icon icon={Trophy} className="size-3.5" />
							</div>
							<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
								Gestão de Metas por Vendedor • Medidor Salesforce
							</h2>
						</div>
						<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
							Acompanhe o Pace (ritmo de venda real vs tempo útil decorrido), meta
							diária de fechamento e o prêmio da semana.
						</p>
					</div>

					{/* Ajustes rápidos de dias úteis */}
					<div className="flex items-center gap-2 text-xs bg-white dark:bg-zinc-800 p-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700">
						<span className="text-zinc-500 font-medium pl-1">Dias Úteis Mês:</span>
						<input
							type="number"
							min={10}
							max={31}
							value={customTotalDiasUteis}
							onChange={(e) => setCustomTotalDiasUteis(Number(e.target.value) || 26)}
							className="w-12 px-1.5 py-0.5 text-center font-bold font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-700 rounded border"
							title="Total de dias úteis no mês"
						/>
						<span className="text-zinc-400">•</span>
						<span className="text-zinc-500 font-medium">Decorridos:</span>
						<input
							type="number"
							min={1}
							max={customTotalDiasUteis}
							value={customDiasDecorridos}
							onChange={(e) => setCustomDiasDecorridos(Number(e.target.value) || 1)}
							className="w-12 px-1.5 py-0.5 text-center font-bold font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-700 rounded border"
							title="Dias úteis decorridos até hoje"
						/>
					</div>
				</div>

				{/* Grid de Vendedores com Medidor Salesforce */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{sellerPerformance.map((seller) => {
						// Salesforce Status colors & badge
						const isAhead = seller.pacePct >= 105;
						const isOnTrack = seller.pacePct >= 95 && seller.pacePct < 105;
						const isBehind = seller.pacePct < 95;

						return (
							<MnocxCard
								key={seller.id}
								variant="info"
								padding="md"
								className="space-y-3.5 relative overflow-hidden"
							>
								{/* Header do Vendedor */}
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-center gap-2.5">
										<div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-bold">
											<Icon icon={UserAvatar} className="size-4" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
													{seller.nome}
												</h3>
												<span className="text-[10px] text-zinc-400 font-medium">
													• {seller.loja}
												</span>
											</div>
											<span className="text-xs text-zinc-500 font-mono">
												{seller.osCount} vendas concluídas no mês
											</span>
										</div>
									</div>

									<div className="flex items-center gap-1.5">
										{/* Badge Estilo Salesforce de Pace */}
										{isAhead && (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
												🚀 À Frente ({seller.paceMultiplier.toFixed(2)}x)
											</span>
										)}
										{isOnTrack && (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
												🎯 No Ritmo ({seller.paceMultiplier.toFixed(2)}x)
											</span>
										)}
										{isBehind && (
											<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
												⚠️ Abaixo do Ritmo ({seller.paceMultiplier.toFixed(2)}x)
											</span>
										)}

										<button
											type="button"
											onClick={() => handleOpenEditSeller(seller)}
											className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
											title="Editar metas"
										>
											<Icon icon={Edit} className="size-3.5" />
										</button>
									</div>
								</div>

								{/* MEDIDOR ESTILO SALESFORCE (PACE GAUGE TRACKER) */}
								<div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
									<div className="flex items-center justify-between text-xs">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-zinc-700 dark:text-zinc-300">
												Medidor Salesforce (Pace de Metas)
											</span>
										</div>
										<span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
											{new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(seller.totalRealizado)}{" "}
											/{" "}
											<span className="text-zinc-500 font-normal">
												{new Intl.NumberFormat("pt-BR", {
													style: "currency",
													currency: "BRL",
												}).format(seller.metaMes)}
											</span>
										</span>
									</div>

									{/* Barra de Progresso com Marcador Salesforce de Tempo Útil */}
									<div className="relative h-4 w-full bg-zinc-200 dark:bg-zinc-750 rounded-full overflow-hidden">
										{/* Barra Realizada */}
										<div
											className={`h-full rounded-full transition-all duration-500 ${
												isAhead
													? "bg-emerald-600"
													: isOnTrack
														? "bg-blue-600"
														: "bg-rose-500"
											}`}
											style={{
												width: `${Math.min(100, seller.pctAtingidoMes)}%`,
											}}
										/>
										{/* Marcador Vertical de Tempo Decorrido (Expected Marker) */}
										<div
											className="absolute top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white z-10 shadow-xs"
											style={{
												left: `${Math.min(99, progressDiasUteisPct)}%`,
											}}
											title={`Meta Proporcional Hoje (${progressDiasUteisPct.toFixed(0)}% do tempo): R$ ${seller.metaEsperadaHoje.toFixed(0)}`}
										/>
									</div>

									{/* Legenda do Medidor */}
									<div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
										<span>
											Realizado:{" "}
											<strong className="text-zinc-900 dark:text-zinc-100 font-mono">
												{seller.pctAtingidoMes.toFixed(1)}%
											</strong>
										</span>
										<span className="flex items-center gap-1 font-medium">
											<span className="size-1.5 rounded-full bg-zinc-900 dark:bg-white" />
											Esperado hoje:{" "}
											<strong className="text-zinc-700 dark:text-zinc-300 font-mono">
												{new Intl.NumberFormat("pt-BR", {
													style: "currency",
													currency: "BRL",
												}).format(seller.metaEsperadaHoje)}
											</strong>
										</span>
										<span>
											{seller.diferencaRitmo >= 0 ? (
												<span className="text-emerald-600 font-bold">
													+{new Intl.NumberFormat("pt-BR", {
														style: "currency",
														currency: "BRL",
													}).format(seller.diferencaRitmo)}
												</span>
											) : (
												<span className="text-rose-600 font-bold">
													{new Intl.NumberFormat("pt-BR", {
														style: "currency",
														currency: "BRL",
													}).format(seller.diferencaRitmo)}
												</span>
											)}
										</span>
									</div>
								</div>

								{/* DETALHES DE DIÁRIA, SEMANA E PRÊMIO */}
								<div className="grid grid-cols-3 gap-2 pt-1">
									{/* Meta Diária Necessária */}
									<div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-center">
										<span className="text-[10px] text-zinc-500 block uppercase font-medium">
											Meta Diária
										</span>
										<span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
											{new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(seller.metaDiariaNecessaria)}
										</span>
										<span className="text-[9px] text-zinc-400 block mt-0.5">
											{diasRestantes} dias úteis
										</span>
									</div>

									{/* Vendas da Semana */}
									<div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-center">
										<span className="text-[10px] text-zinc-500 block uppercase font-medium">
											Meta Semana
										</span>
										<span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
											{new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(seller.metaSemana)}
										</span>
										<span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
											Feito: {new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(seller.vendasSemana)}
										</span>
									</div>

									{/* Prêmio da Semana */}
									<div
										className={`p-2 rounded-lg border text-center transition-colors ${
											seller.atingiuPremioSemana
												? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
												: "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-800"
										}`}
									>
										<div className="flex items-center justify-center gap-1">
											<Icon
												icon={Trophy}
												className={`size-3 ${
													seller.atingiuPremioSemana
														? "text-amber-500"
														: "text-zinc-400"
												}`}
											/>
											<span className="text-[10px] uppercase font-bold">
												Prêmio Semana
											</span>
										</div>
										<span className="text-xs font-bold font-mono block text-zinc-900 dark:text-zinc-100">
											{new Intl.NumberFormat("pt-BR", {
												style: "currency",
												currency: "BRL",
											}).format(seller.premioSemana)}
										</span>
										<span
											className={`text-[9px] font-semibold block mt-0.5 ${
												seller.atingiuPremioSemana
													? "text-emerald-600 dark:text-emerald-400"
													: "text-zinc-400"
											}`}
										>
											{seller.atingiuPremioSemana
												? "✓ Qualificado"
												: "Em disputa"}
										</span>
									</div>
								</div>
							</MnocxCard>
						);
					})}
				</div>
			</MnocxCard>

			{/* 4. LISTA DIRETA DE ORDENS DE SERVIÇO (Sem kanban duplicado, com busca e filtros) */}
			<MnocxCard variant="container" padding="md" className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
					<div>
						<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							Lista de Ordens de Serviço Lançadas
						</h2>
						<p className="text-xs text-zinc-500">
							Histórico operacional de vendas com busca instantânea e filtros por
							status financeiro.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{/* Barra de Pesquisa */}
						<div className="relative w-full sm:w-64">
							<Icon
								icon={Search}
								className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400"
							/>
							<Input
								placeholder="Buscar por cliente, OS ou CPF..."
								value={orderSearchQuery}
								onChange={(e) => setOrderSearchQuery(e.target.value)}
								className="pl-8 h-8 text-xs bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 rounded-xl"
							/>
						</div>

						{/* Filtros de Status */}
						<div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-300 dark:border-zinc-700">
							<Button
								variant={orderFilterStatus === "ALL" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2 text-xs font-semibold"
								onClick={() => setOrderFilterStatus("ALL")}
							>
								Todas ({orders.length})
							</Button>
							<Button
								variant={orderFilterStatus === "RESIDUAL" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
								onClick={() => setOrderFilterStatus("RESIDUAL")}
							>
								Com Saldo (
								{orders.filter((o) => o.financials.residualAmount > 0).length})
							</Button>
						</div>
					</div>
				</div>

				{/* Tabela de OSs */}
				<div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
					<OpticalOrdersTable
						searchQuery={orderSearchQuery}
						statusFilter={orderFilterStatus}
					/>
				</div>
			</MnocxCard>

			{/* MODAL PARA EDITAR META DO VENDEDOR */}
			{editingSeller && (
				<Dialog open={true} onOpenChange={() => setEditingSeller(null)}>
					<DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
						<DialogHeader>
							<DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								<Icon icon={Trophy} className="size-4 text-amber-500" />
								Editar Metas • {editingSeller.nome}
							</DialogTitle>
						</DialogHeader>

						<div className="space-y-4 py-3">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Meta Mensal de Vendas (R$)
								</label>
								<Input
									type="number"
									value={editMetaValue}
									onChange={(e) => setEditMetaValue(Number(e.target.value) || 0)}
									className="text-sm font-mono"
								/>
								<span className="text-[11px] text-zinc-500">
									Usado para o cálculo diário por dias úteis e medidor Salesforce.
								</span>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
									Prêmio da Semana (R$)
								</label>
								<Input
									type="number"
									value={editPremioValue}
									onChange={(e) =>
										setEditPremioValue(Number(e.target.value) || 0)
									}
									className="text-sm font-mono"
								/>
								<span className="text-[11px] text-zinc-500">
									Bonificação liberada ao atingir o ritmo/meta semanal.
								</span>
							</div>
						</div>

						<DialogFooter className="gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditingSeller(null)}
							>
								Cancelar
							</Button>
							<MnocxButton
								variant="primary"
								size="sm"
								onClick={handleSaveSellerGoal}
							>
								Salvar Metas
							</MnocxButton>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
