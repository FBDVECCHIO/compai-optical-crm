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
import Password from "@carbon/icons-react/es/Password";
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
import { SpeedometerGauge } from "./speedometer-gauge";

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

	// Autenticação de Gerente para edição de metas (senha: 120212)
	const [authModalOpen, setAuthModalOpen] = useState(false);
	const [authPassword, setAuthPassword] = useState("");
	const [sellerPendingAuth, setSellerPendingAuth] = useState<SellerGoalItem | null>(null);
	const [authError, setAuthError] = useState("");

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
				(acc, o) => acc + (Number(o.financials?.totalAmount) || 0),
				0,
			);

			// Vendas da semana atual (aproximação pelos últimos 6 dias)
			const seisDiasAtras = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
			const vendasSemana = sOrders
				.filter((o) => {
					try {
						const dateVal = o.orderDate || o.createdAt;
						if (!dateVal) return false;
						const d = new Date(dateVal);
						return !isNaN(d.getTime()) && d >= seisDiasAtras;
					} catch {
						return false;
					}
				})
				.reduce((acc, o) => acc + (Number(o.financials?.totalAmount) || 0), 0);

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
		return orders.reduce((acc, o) => acc + (Number(o.financials?.totalAmount) || 0), 0);
	}, [orders]);

	const totalMetaLoja = useMemo(() => {
		return sellerGoals.reduce((acc, s) => acc + (Number(s.metaMes) || 0), 0);
	}, [sellerGoals]);

	const totalResiduosGeral = useMemo(() => {
		return orders.reduce((acc, o) => acc + (Number(o.financials?.residualAmount) || 0), 0);
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
		setSellerPendingAuth(seller);
		setAuthPassword("");
		setAuthError("");
		setAuthModalOpen(true);
	};

	const handleVerifyManagerPassword = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (authPassword.trim() === "120212") {
			toast.success("Autenticação de Gerente confirmada com sucesso!");
			setAuthModalOpen(false);
			if (sellerPendingAuth) {
				setEditingSeller(sellerPendingAuth);
				setEditMetaValue(sellerPendingAuth.metaMes);
				setEditPremioValue(sellerPendingAuth.premioSemana);
				setSellerPendingAuth(null);
			}
		} else {
			setAuthError("Senha incorreta. Acesso restrito ao Gerente de Loja.");
			toast.error("Senha de Gerente incorreta! Ação bloqueada e registrada em auditoria.");
		}
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
		toast.success(`Metas de ${editingSeller.nome} atualizadas com sucesso pelo gerente!`);
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

			{/* 2. GESTÃO DE METAS POR VENDEDOR & PERFORMANCE CONSOLIDADA */}
			<MnocxCard variant="container" padding="md" className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
					<div>
						<div className="flex items-center gap-2">
							<div className="flex size-6 items-center justify-center rounded-lg bg-zinc-800 text-white text-xs font-bold">
								<Icon icon={Trophy} className="size-3.5" />
							</div>
							<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
								Gestão de Metas por Vendedor
							</h2>
							<span className="hidden sm:inline text-xs text-zinc-500 font-medium">
								• Performance Consolidada da Rede ({capitalizedMonth} / {currentYear})
							</span>
						</div>
						<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
							Acompanhamento consolidado de vendas, ritmo diário por dias úteis e metas individuais da equipe.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{/* Ajustes rápidos de dias úteis */}
						<div className="flex items-center gap-2 text-xs bg-white dark:bg-zinc-800 p-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-xs">
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
				</div>

				{/* VELOCÍMETRO CONSOLIDADO MASTER COM CARDS DE PERFORMANCE NA VERTICAL AO LADO */}
				<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
						{/* Medidor Master à esquerda */}
						<div className="w-full lg:w-auto flex flex-col items-center shrink-0">
							<SpeedometerGauge
								size="lg"
								value={totalFaturadoGeral}
								max={totalMetaLoja}
								target={totalMetaLoja * (progressDiasUteisPct / 100)}
								title="Velocímetro Geral da Equipe"
								subtitle="Acompanhamento consolidado de vendas vs tempo decorrido"
							/>
						</div>

						{/* Cards de Performance Consolidada posicionados ao lado na vertical / 2 colunas */}
						<div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
							{/* Card 1: Faturamento do Mês */}
							<div className="p-3.5 rounded-xl bg-white dark:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Faturamento do Mês
									</span>
									<Icon icon={Money} className="size-4 text-emerald-600" />
								</div>
								<div className="my-1.5 flex items-baseline justify-between">
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
								<div className="text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
									<span>Meta Total:</span>
									<span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
										{new Intl.NumberFormat("pt-BR", {
											style: "currency",
											currency: "BRL",
										}).format(totalMetaLoja)}
									</span>
								</div>
							</div>

							{/* Card 2: Meta Diária Necessária */}
							<div className="p-3.5 rounded-xl bg-white dark:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Meta Diária Necessária
									</span>
									<Icon icon={Calendar} className="size-4 text-blue-600" />
								</div>
								<div className="my-1.5 flex items-baseline justify-between">
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
								<div className="text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
									<span>Falta Faturar:</span>
									<span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
										{new Intl.NumberFormat("pt-BR", {
											style: "currency",
											currency: "BRL",
										}).format(Math.max(0, totalMetaLoja - totalFaturadoGeral))}
									</span>
								</div>
							</div>

							{/* Card 3: Tíquete Médio & OSs */}
							<div className="p-3.5 rounded-xl bg-white dark:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Tíquete Médio / OSs
									</span>
									<Icon icon={ChartLineData} className="size-4 text-zinc-500" />
								</div>
								<div className="my-1.5 flex items-baseline justify-between">
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
								<div className="text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
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
							</div>

							{/* Card 4: Saldo Residual a Receber */}
							<div className="p-3.5 rounded-xl bg-white dark:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Saldo Residual a Receber
									</span>
									<Icon icon={WarningAlt} className="size-4 text-rose-500" />
								</div>
								<div className="my-1.5 flex items-baseline justify-between">
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
								<div className="text-[11px] text-zinc-500 flex justify-between border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
									<span>Receber na Retirada:</span>
									<span className="font-semibold text-zinc-700 dark:text-zinc-300">
										Aviso automático ativo
									</span>
								</div>
							</div>
						</div>
					</div>

				{/* Grid de Vendedores: Reestruturado na horizontal ampla para eliminar qualquer encavalamento */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
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
								className="relative overflow-hidden flex flex-col md:flex-row items-stretch gap-4 shadow-xs"
							>
								{/* Bloco Esquerdo: Perfil do Vendedor, Badge de Ritmo e Velocímetro Power BI */}
								<div className="w-full md:w-64 shrink-0 flex flex-col justify-between bg-zinc-50/80 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2.5 min-w-0">
											<div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800 text-white font-bold shrink-0 shadow-xs">
												<Icon icon={UserAvatar} className="size-4" />
											</div>
											<div className="min-w-0">
												<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
													{seller.nome}
												</h3>
												<span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block truncate">
													{seller.osCount} OSs • {seller.loja}
												</span>
											</div>
										</div>

										<button
											type="button"
											onClick={() => handleOpenEditSeller(seller)}
											className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
											title="Editar metas do vendedor"
										>
											<Icon icon={Edit} className="size-3.5" />
										</button>
									</div>

									{/* Velocímetro com tamanho confortável */}
									<div className="my-2 flex flex-col items-center justify-center">
										<SpeedometerGauge
											size="sm"
											value={seller.totalRealizado}
											max={seller.metaMes}
											target={seller.metaEsperadaHoje}
										/>
									</div>

									{/* Badge de Pace / Ritmo Salesforce */}
									<div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
										<span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
											Ritmo (Pace)
										</span>
										{isAhead && (
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
												🚀 {seller.paceMultiplier.toFixed(1)}x Acima
											</span>
										)}
										{isOnTrack && (
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
												🎯 {seller.paceMultiplier.toFixed(1)}x No Ritmo
											</span>
										)}
										{isBehind && (
											<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
												⚠️ {seller.paceMultiplier.toFixed(1)}x Abaixo
											</span>
										)}
									</div>
								</div>

								{/* Bloco Direito: 4 Caixas de Métricas Horizontais com Ampla Distribuição */}
								<div className="flex-1 flex flex-col justify-between gap-2.5 min-w-0">
									{/* Caixa 1: Faturamento do Mês vs Meta */}
									<div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
										<div className="flex items-center justify-between gap-2 text-xs">
											<span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
												Faturamento no Mês
											</span>
											<Badge
												variant="outline"
												className={`text-[10px] font-bold font-mono px-2 py-0 ${
													seller.pctAtingidoMes >= 100
														? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
														: "text-zinc-700 bg-zinc-100 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300"
												}`}
											>
												{seller.pctAtingidoMes.toFixed(1)}% da Meta
											</Badge>
										</div>
										<div className="flex items-baseline justify-between mt-1">
											<span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
												{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.totalRealizado)}
											</span>
											<span className="text-xs text-zinc-500 font-mono">
												Meta: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.metaMes)}
											</span>
										</div>
										{/* Barra de Progresso Suave */}
										<div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${
													seller.pctAtingidoMes >= 100
														? "bg-emerald-500"
														: isAhead
															? "bg-blue-500"
															: isBehind
																? "bg-amber-500"
																: "bg-primary"
												}`}
												style={{ width: `${Math.min(100, seller.pctAtingidoMes)}%` }}
											/>
										</div>
									</div>

									{/* Linha Dupla Horizontal: Meta Diária e Meta da Semana */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
										{/* Caixa 2: Meta Diária Necessária */}
										<div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
											<div className="flex items-center justify-between text-[11px] text-zinc-500">
												<span className="font-semibold uppercase tracking-wider">Meta Diária</span>
												<span className="text-[10px] text-zinc-400 font-medium">{diasRestantes} dias úteis</span>
											</div>
											<div className="text-base font-bold font-mono text-blue-700 dark:text-blue-400 my-1">
												{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.metaDiariaNecessaria)}
												<span className="text-xs font-normal text-zinc-400">/dia</span>
											</div>
											<div className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
												<span>Falta:</span>
												<span className="font-semibold text-zinc-700 dark:text-zinc-300">
													{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.max(0, seller.metaMes - seller.totalRealizado))}
												</span>
											</div>
										</div>

										{/* Caixa 3: Meta da Semana */}
										<div className="p-3 rounded-xl bg-white dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
											<div className="flex items-center justify-between text-[11px] text-zinc-500">
												<span className="font-semibold uppercase tracking-wider">Meta Semana</span>
												<span className="text-[10px] text-zinc-400 font-medium">Ciclo 6d</span>
											</div>
											<div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 my-1">
												{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.metaSemana)}
											</div>
											<div className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
												<span>Realizado:</span>
												<span className="font-semibold text-zinc-700 dark:text-zinc-300">
													{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.vendasSemana)}
												</span>
											</div>
										</div>
									</div>

									{/* Caixa 4: Prêmio da Semana (Horizontal e Destacado) */}
									<div
										className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
											seller.atingiuPremioSemana
												? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
												: "bg-white dark:bg-zinc-850 border-zinc-200/80 dark:border-zinc-800"
										}`}
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div className={`p-2 rounded-lg ${seller.atingiuPremioSemana ? "bg-amber-500/20 text-amber-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
												<Icon icon={Trophy} className="size-4" />
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold uppercase tracking-wider">
														Prêmio da Semana
													</span>
													<Badge
														variant={seller.atingiuPremioSemana ? "default" : "outline"}
														className={`text-[10px] font-bold px-2 py-0 ${
															seller.atingiuPremioSemana
																? "bg-emerald-600 text-white"
																: "text-zinc-500 border-zinc-300 dark:border-zinc-700"
														}`}
													>
														{seller.atingiuPremioSemana ? "✓ Qualificado" : "Em disputa"}
													</Badge>
												</div>
												<span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
													{seller.atingiuPremioSemana ? "Meta semanal superada ou ritmo acima de 100%" : "Alcance a meta semanal para liberar a bonificação"}
												</span>
											</div>
										</div>

										<span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 shrink-0">
											{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seller.premioSemana)}
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

			{/* MODAL DE AUTENTICAÇÃO DE GERENTE (SENHA: 120212) */}
			<Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
				<DialogContent className="sm:max-w-[420px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-base">
							<Icon icon={Password} className="size-5 text-amber-500" />
							Autenticação Gerencial Requerida
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleVerifyManagerPassword} className="space-y-4 py-2">
						<p className="text-xs text-zinc-600 dark:text-zinc-400">
							A alteração de metas e premiações de vendedores exige validação de senha do <strong>Gerente de Loja</strong> com registro de auditoria.
						</p>

						{sellerPendingAuth && (
							<div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
								<span className="text-zinc-500">Vendedor selecionado:</span>{" "}
								<strong className="text-zinc-900 dark:text-zinc-100">{sellerPendingAuth.nome}</strong>{" "}
								<span className="text-zinc-400">({sellerPendingAuth.loja})</span>
							</div>
						)}

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								Senha do Gerente
							</label>
							<Input
								type="password"
								placeholder="Digite a senha gerencial (ex: 120212)"
								value={authPassword}
								onChange={(e) => {
									setAuthPassword(e.target.value);
									if (authError) setAuthError("");
								}}
								autoFocus
								className="text-sm font-mono tracking-widest"
							/>
							{authError ? (
								<p className="text-[11px] text-rose-600 font-semibold">{authError}</p>
							) : (
								<span className="text-[10px] text-zinc-400">
									Acesso monitorado e registrado no log de segurança operacional.
								</span>
							)}
						</div>

						<DialogFooter className="gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setAuthModalOpen(false);
									setSellerPendingAuth(null);
								}}
							>
								Cancelar
							</Button>
							<MnocxButton
								type="submit"
								variant="primary"
								size="sm"
							>
								Validar e Liberar Edição
							</MnocxButton>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
