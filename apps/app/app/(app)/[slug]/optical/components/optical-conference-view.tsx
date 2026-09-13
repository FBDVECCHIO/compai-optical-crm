"use client";

import { useEffect, useMemo, useState } from "react";
import Add from "@carbon/icons-react/es/Add";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Erase from "@carbon/icons-react/es/Erase";
import Reset from "@carbon/icons-react/es/Reset";
import Search from "@carbon/icons-react/es/Search";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { toast } from "sonner";
import {
	type ConferenciaItem,
	type LabItem,
	type StoreItem,
	deleteSupabaseConferencia,
	fetchSupabaseConferencias,
	fetchSupabaseLabs,
	fetchSupabaseStores,
	saveSupabaseConferencia,
} from "@/lib/optical/supabase-optical";
import { OpticalWarrantiesView } from "./optical-warranties-view";
import { printOpticalReport } from "@/lib/optical/optical-print-report";

type ConferenceSubTab = "conferencia" | "ocorrencias";

export function OpticalConferenceView() {
	const [activeSubTab, setActiveSubTab] = useState<ConferenceSubTab>("conferencia");
	const [conferencias, setConferencias] = useState<ConferenciaItem[]>([]);
	const [stores, setStores] = useState<StoreItem[]>([]);
	const [labs, setLabs] = useState<LabItem[]>([]);
	const [loading, setLoading] = useState(true);

	// Filtros da Tabela
	const [searchOsOrLab, setSearchOsOrLab] = useState("");
	const [selectedStoreFilter, setSelectedStoreFilter] = useState("TODAS");
	const [selectedLabFilter, setSelectedLabFilter] = useState("TODOS");
	const [startDateFilter, setStartDateFilter] = useState("");
	const [endDateFilter, setEndDateFilter] = useState("");

	// Formulário de Conferência - Estados
	const [isDobro, setIsDobro] = useState(false);
	const [confLoja, setConfLoja] = useState("");
	const [confOS, setConfOS] = useState("");
	const [confIDLab, setConfIDLab] = useState("");
	const [confLab, setConfLab] = useState("");
	const [confData, setConfData] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [confBeneficio, setConfBeneficio] = useState("");
	const [confBeneficioCodigo, setConfBeneficioCodigo] = useState("");

	// Oficial 1
	const [confLente, setConfLente] = useState("");
	const [confQtdd, setConfQtdd] = useState(1);
	const [confPrecoLente, setConfPrecoLente] = useState<number>(0);
	const [confSemTratamento, setConfSemTratamento] = useState(false);
	const [confTratamento, setConfTratamento] = useState("");
	const [confPrecoTrat, setConfPrecoTrat] = useState<number>(0);

	// Adaptado 1
	const [confLabEfetivo, setConfLabEfetivo] = useState("");
	const [confLenteEfetiva, setConfLenteEfetiva] = useState("");
	const [confQtddEf, setConfQtddEf] = useState(1);
	const [confPrecoLenteEfetiva, setConfPrecoLenteEfetiva] = useState<number>(0);
	const [confSemTratamentoEf, setConfSemTratamentoEf] = useState(false);
	const [confTratEfetivo, setConfTratEfetivo] = useState("");
	const [confPrecoTratEfetivo, setConfPrecoTratEfetivo] = useState<number>(0);

	// 2º Par (Dobro) Oficial
	const [confOS2, setConfOS2] = useState("");
	const [confIDLab2, setConfIDLab2] = useState("");
	const [confLente2, setConfLente2] = useState("");
	const [confQtdd2, setConfQtdd2] = useState(1);
	const [confPrecoLente2, setConfPrecoLente2] = useState<number>(0);
	const [confSemTratamento2, setConfSemTratamento2] = useState(false);
	const [confTratamento2, setConfTratamento2] = useState("");
	const [confPrecoTrat2, setConfPrecoTrat2] = useState<number>(0);

	// 2º Par (Dobro) Adaptado
	const [confLenteEfetiva2, setConfLenteEfetiva2] = useState("");
	const [confQtddEf2, setConfQtddEf2] = useState(1);
	const [confPrecoLenteEfetiva2, setConfPrecoLenteEfetiva2] = useState<number>(0);
	const [confSemTratamentoEf2, setConfSemTratamentoEf2] = useState(false);
	const [confTratEfetivo2, setConfTratEfetivo2] = useState("");
	const [confPrecoTratEfetivo2, setConfPrecoTratEfetivo2] = useState<number>(0);

	const [submitting, setSubmitting] = useState(false);

	async function loadData() {
		setLoading(true);
		try {
			const [confs, st, lb] = await Promise.all([
				fetchSupabaseConferencias(),
				fetchSupabaseStores(),
				fetchSupabaseLabs(),
			]);
			setConferencias(confs);
			setStores(st);
			setLabs(lb);
			if (st.length > 0 && !confLoja) setConfLoja(st[0]?.nome || "");
			if (lb.length > 0 && !confLab) setConfLab(lb[0]?.nome || "");
			if (lb.length > 0 && !confLabEfetivo) setConfLabEfetivo(lb[0]?.nome || "");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadData();
	}, []);

	// Cálculos do Lançamento Atual
	const totalOficialAtual =
		(confPrecoLente * confQtdd + (confSemTratamento ? 0 : confPrecoTrat)) +
		(isDobro ? confPrecoLente2 * confQtdd2 + (confSemTratamento2 ? 0 : confPrecoTrat2) : 0);

	const totalEfetivoAtual =
		(confPrecoLenteEfetiva * confQtddEf + (confSemTratamentoEf ? 0 : confPrecoTratEfetivo)) +
		(isDobro ? confPrecoLenteEfetiva2 * confQtddEf2 + (confSemTratamentoEf2 ? 0 : confPrecoTratEfetivo2) : 0);

	const economiaAtual = Math.max(0, totalOficialAtual - totalEfetivoAtual);

	// Reset Formulário
	const resetForm = () => {
		setIsDobro(false);
		setConfOS("");
		setConfIDLab("");
		setConfBeneficio("");
		setConfBeneficioCodigo("");
		setConfLente("");
		setConfPrecoLente(0);
		setConfTratamento("");
		setConfPrecoTrat(0);
		setConfSemTratamento(false);
		setConfLenteEfetiva("");
		setConfPrecoLenteEfetiva(0);
		setConfTratEfetivo("");
		setConfPrecoTratEfetivo(0);
		setConfSemTratamentoEf(false);
		setConfOS2("");
		setConfIDLab2("");
		setConfLente2("");
		setConfPrecoLente2(0);
		setConfTratamento2("");
		setConfPrecoTrat2(0);
		setConfSemTratamento2(false);
		setConfLenteEfetiva2("");
		setConfPrecoLenteEfetiva2(0);
		setConfTratEfetivo2("");
		setConfPrecoTratEfetivo2(0);
		setConfSemTratamentoEf2(false);
	};

	// Salvar Conferência
	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!confLoja || !confOS.trim() || !confIDLab.trim()) {
			toast.error("Preencha Loja, OS e ID Lab para salvar a conferência.");
			return;
		}

		setSubmitting(true);
		const payload: ConferenciaItem = {
			data: confData,
			loja: confLoja,
			osLoja: confOS.trim().toUpperCase(),
			idLab: confIDLab.trim().toUpperCase(),
			labPedido: confLab,
			lente: confLente,
			precoLente: confPrecoLente,
			tratamento: confSemTratamento ? "Sem Tratamento" : confTratamento,
			precoTratamento: confSemTratamento ? 0 : confPrecoTrat,
			qtyLente: confQtdd,
			semTratamento: confSemTratamento ? "SIM" : "NÃO",
			labEfetivo: confLabEfetivo,
			lenteEfetiva: confLenteEfetiva,
			precoLenteEfetiva: confPrecoLenteEfetiva,
			tratEfetivo: confSemTratamentoEf ? "Sem Tratamento" : confTratEfetivo,
			precoTratEfetivo: confSemTratamentoEf ? 0 : confPrecoTratEfetivo,
			qtyLenteEfetiva: confQtddEf,
			semTratamentoEf: confSemTratamentoEf ? "SIM" : "NÃO",
			confDobro: isDobro ? "SIM" : "NÃO",
			osLoja2: isDobro ? confOS2 : undefined,
			idLab2: isDobro ? confIDLab2 : undefined,
			lente2: isDobro ? confLente2 : undefined,
			precoLente2: isDobro ? confPrecoLente2 : undefined,
			tratamento2: isDobro ? (confSemTratamento2 ? "Sem Tratamento" : confTratamento2) : undefined,
			precoTratamento2: isDobro ? (confSemTratamento2 ? 0 : confPrecoTrat2) : undefined,
			qtyLente2: isDobro ? confQtdd2 : undefined,
			semTratamento2: isDobro && confSemTratamento2 ? "SIM" : "NÃO",
			lenteEfetiva2: isDobro ? confLenteEfetiva2 : undefined,
			precoLenteEfetiva2: isDobro ? confPrecoLenteEfetiva2 : undefined,
			tratEfetivo2: isDobro ? (confSemTratamentoEf2 ? "Sem Tratamento" : confTratEfetivo2) : undefined,
			precoTratEfetivo2: isDobro ? (confSemTratamentoEf2 ? 0 : confPrecoTratEfetivo2) : undefined,
			qtyLenteEfetiva2: isDobro ? confQtddEf2 : undefined,
			semTratamentoEf2: isDobro && confSemTratamentoEf2 ? "SIM" : "NÃO",
			confBeneficio: confBeneficio || undefined,
			confBeneficioCodigo: confBeneficioCodigo || undefined,
			status: "CONFERIDO",
		};

		const ok = await saveSupabaseConferencia(payload);
		setSubmitting(false);

		if (ok) {
			toast.success(`Conferência da OS ${payload.osLoja} registrada com sucesso!`, {
				description: economiaAtual > 0 ? `Economia gerada: R$ ${economiaAtual.toFixed(2)}` : undefined,
			});
			resetForm();
			loadData();
		} else {
			toast.error("Erro ao registrar conferência.");
		}
	}

	// Deletar
	async function handleDelete(id?: number) {
		if (!id) return;
		if (!confirm("Deseja realmente excluir este registro de conferência?")) return;
		const ok = await deleteSupabaseConferencia(id);
		if (ok) {
			toast.success("Registro de conferência excluído.");
			setConferencias((prev) => prev.filter((c) => c.id !== id));
		} else {
			toast.error("Falha ao excluir conferência.");
		}
	}

	// Filtros da Tabela
	const filtered = useMemo(() => {
		return conferencias.filter((c) => {
			if (searchOsOrLab) {
				const q = searchOsOrLab.toLowerCase();
				const matchOs = c.osLoja.toLowerCase().includes(q);
				const matchLabId = c.idLab.toLowerCase().includes(q);
				const matchLente = c.lenteEfetiva?.toLowerCase().includes(q);
				if (!matchOs && !matchLabId && !matchLente) return false;
			}
			if (selectedStoreFilter !== "TODAS" && c.loja !== selectedStoreFilter) return false;
			if (selectedLabFilter !== "TODOS" && c.labPedido !== selectedLabFilter && c.labEfetivo !== selectedLabFilter)
				return false;
			if (startDateFilter && c.data < startDateFilter) return false;
			if (endDateFilter && c.data > endDateFilter) return false;
			return true;
		});
	}, [conferencias, searchOsOrLab, selectedStoreFilter, selectedLabFilter, startDateFilter, endDateFilter]);

	// KPIs Gerais
	const totalConferidas = conferencias.length;
	const totalDobro = conferencias.filter((c) => c.confDobro === "SIM").length;
	const totalVouchers = conferencias.filter((c) => c.confBeneficio).length;

	const economiaTotalGeral = conferencias.reduce((acc, c) => {
		const custoOf = (c.precoLente || 0) * (c.qtyLente || 1) + (c.precoTratamento || 0);
		const custoEf = (c.precoLenteEfetiva || 0) * (c.qtyLenteEfetiva || 1) + (c.precoTratEfetivo || 0);
		const diff = custoOf - custoEf;
		return acc + (diff > 0 ? diff : 0);
	}, 0);

	// Exportar Relatório em PDF
	const handleExportPDF = () => {
		printOpticalReport({
			title: "Relatório de Conferência de Laboratório e Montagem",
			subtitle: "Comparativo de Pedido Oficial vs. Adaptado e Indicadores de Economia",
			period: startDateFilter && endDateFilter ? `${startDateFilter} até ${endDateFilter}` : "Período Geral",
			kpis: [
				{ label: "Total Conferências", value: filtered.length },
				{ label: "Economia Gerada", value: `R$ ${economiaTotalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, highlight: true },
				{ label: "Pedidos em Dobro", value: filtered.filter((c) => c.confDobro === "SIM").length },
				{ label: "Vouchers/Cortesias", value: filtered.filter((c) => c.confBeneficio).length },
			],
			columns: [
				{ header: "Data", key: "data", width: "80px" },
				{ header: "OS Loja", key: "osLoja", width: "90px" },
				{ header: "Loja", key: "loja", width: "120px" },
				{ header: "ID Lab", key: "idLab", width: "90px" },
				{ header: "Lab Oficial", key: "labPedido", width: "100px" },
				{ header: "Lente Efetiva", key: "lenteEfetiva", width: "200px" },
				{ header: "Tratamento", key: "tratEfetivo", width: "140px" },
				{ header: "Custo Efetivo", key: "custoTotal", align: "right", width: "100px" },
				{ header: "Benefício", key: "beneficio", width: "100px" },
			],
			data: filtered.map((c) => {
				const custoEf = (c.precoLenteEfetiva || 0) * (c.qtyLenteEfetiva || 1) + (c.precoTratEfetivo || 0);
				return {
					data: c.data,
					osLoja: c.osLoja,
					loja: c.loja,
					idLab: c.idLab,
					labPedido: c.labPedido,
					lenteEfetiva: c.lenteEfetiva || "-",
					tratEfetivo: c.tratEfetivo || "Padrão",
					custoTotal: `R$ ${custoEf.toFixed(2)}`,
					beneficio: c.confBeneficio ? `${c.confBeneficio} (${c.confBeneficioCodigo || "-"})` : "-",
				};
			}),
		});
	};

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Top Header com Alternância de Sub-abas */}
			<div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Icon icon={CheckmarkOutline} className="size-4" />
						</div>
						<h2 className="text-lg font-bold tracking-tight">Conferência de Laboratório</h2>
						<Badge variant="secondary" className="font-mono text-xs">
							{conferencias.length} Lançamentos
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">
						Lançamento de conferência de ordem de serviço (OS), adaptação de laboratório e ocorrências.
					</p>
				</div>

				{/* Sub-abas de Navegação Interna */}
				<div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 p-1">
					<button
						type="button"
						onClick={() => setActiveSubTab("conferencia")}
						className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
							activeSubTab === "conferencia"
								? "bg-primary text-primary-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Icon icon={Checkmark} className="size-3.5" />
						Registrar Conferência
					</button>

					<button
						type="button"
						onClick={() => setActiveSubTab("ocorrencias")}
						className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
							activeSubTab === "ocorrencias"
								? "bg-primary text-primary-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Icon icon={WarningAlt} className="size-3.5" />
						Ocorrências & Garantias
					</button>
				</div>
			</div>

			{/* Sub-aba 2: Ocorrências & Garantias */}
			{activeSubTab === "ocorrencias" && <OpticalWarrantiesView />}

			{/* Sub-aba 1: Conferência de Pedidos */}
			{activeSubTab === "conferencia" && (
				<>
					{/* Mini-KPIs no topo */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
							<div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Conferidos</div>
							<div className="text-2xl font-black mt-1 text-foreground">{totalConferidas}</div>
							<div className="text-[10px] text-muted-foreground mt-0.5">Ordens conferidas</div>
						</div>

						<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
							<div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Economia Adaptada</div>
							<div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
								R$ {economiaTotalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</div>
							<div className="text-[10px] text-muted-foreground mt-0.5">Ganho por adaptação</div>
						</div>

						<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
							<div className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pedidos em Dobro</div>
							<div className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">{totalDobro}</div>
							<div className="text-[10px] text-muted-foreground mt-0.5">2º par promocional</div>
						</div>

						<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
							<div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Vouchers / Cortesias</div>
							<div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">{totalVouchers}</div>
							<div className="text-[10px] text-muted-foreground mt-0.5">Zeram custo de lab</div>
						</div>
					</div>

					{/* Formulário de Conferência: Oficial vs Adaptado */}
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Card Dobro Toggle */}
						<div className="rounded-xl border bg-card p-3.5 shadow-2xs flex items-center justify-between">
							<label className="flex items-center gap-2.5 font-semibold text-xs cursor-pointer select-none">
								<input
									type="checkbox"
									checked={isDobro}
									onChange={(e) => setIsDobro(e.target.checked)}
									className="size-4 rounded-sm text-primary focus:ring-primary cursor-pointer"
								/>
								<span>Pedido em Dobro (2º Par Promocional)</span>
							</label>

							{economiaAtual > 0 && (
								<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
									<span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
									Economia nesta OS: R$ {economiaAtual.toFixed(2)}
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{/* Card 1: Pedido Oficial */}
							<div className="rounded-xl border bg-card p-5 shadow-xs space-y-3.5">
								<div className="flex items-center justify-between border-b pb-2.5">
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Icon icon={Checkmark} className="size-4 text-primary" />
										Pedido Oficial (Loja)
									</h3>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={resetForm}
										className="h-7 text-xs text-muted-foreground hover:text-rose-600 gap-1"
									>
										<Icon icon={Erase} className="size-3" />
										Limpar
									</Button>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Loja *</label>
										<select
											value={confLoja}
											onChange={(e) => setConfLoja(e.target.value)}
											required
											className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
										>
											{stores.map((s) => (
												<option key={s.nome} value={s.nome}>{s.nome}</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">OS da Loja *</label>
										<Input
											value={confOS}
											onChange={(e) => setConfOS(e.target.value)}
											placeholder="Ex: OS1045A ou 8198"
											required
											className="h-8 text-xs font-mono font-bold uppercase"
										/>
									</div>
								</div>

								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ID Lab *</label>
										<Input
											value={confIDLab}
											onChange={(e) => setConfIDLab(e.target.value)}
											placeholder="Cód. Laboratório"
											required
											className="h-8 text-xs font-mono font-bold uppercase"
										/>
									</div>

									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Laboratório *</label>
										<select
											value={confLab}
											onChange={(e) => setConfLab(e.target.value)}
											required
											className="h-8 w-full rounded-md border bg-background px-2 text-xs font-medium"
										>
											{labs.map((l) => (
												<option key={l.nome} value={l.nome}>{l.nome}</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Data *</label>
										<Input
											type="date"
											value={confData}
											onChange={(e) => setConfData(e.target.value)}
											required
											className="h-8 text-xs"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Benefício (Zerar Lab)</label>
										<select
											value={confBeneficio}
											onChange={(e) => setConfBeneficio(e.target.value)}
											className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
										>
											<option value="">Nenhum</option>
											<option value="Voucher">Voucher</option>
											<option value="Cortesia">Cortesia</option>
										</select>
									</div>

									<div>
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Cód. Voucher / Cortesia</label>
										<Input
											value={confBeneficioCodigo}
											onChange={(e) => setConfBeneficioCodigo(e.target.value)}
											placeholder="Opcional"
											disabled={!confBeneficio}
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>

								<div className="grid grid-cols-12 gap-2 pt-1 border-t">
									<div className="col-span-7">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Lente Oficial</label>
										<Input
											value={confLente}
											onChange={(e) => setConfLente(e.target.value)}
											placeholder="Ex: Varilux Comfort Max 1.60"
											className="h-8 text-xs font-medium"
										/>
									</div>

									<div className="col-span-2">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Qtdd</label>
										<select
											value={confQtdd}
											onChange={(e) => setConfQtdd(Number(e.target.value))}
											className="h-8 w-full rounded-md border bg-background px-1.5 text-xs"
										>
											<option value={1}>1 (Par)</option>
											<option value={0.5}>0.5 (Meio)</option>
										</select>
									</div>

									<div className="col-span-3">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Lente</label>
										<Input
											type="number"
											step="0.01"
											value={confPrecoLente || ""}
											onChange={(e) => setConfPrecoLente(Number(e.target.value))}
											placeholder="0.00"
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>

								<div className="grid grid-cols-12 gap-2">
									<div className="col-span-8">
										<div className="flex items-center justify-between mb-1">
											<label className="text-[11px] font-semibold text-muted-foreground">Tratamento Oficial</label>
											<label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
												<input
													type="checkbox"
													checked={confSemTratamento}
													onChange={(e) => setConfSemTratamento(e.target.checked)}
													className="size-3 cursor-pointer"
												/>
												Sem Trat.
											</label>
										</div>
										<Input
											value={confTratamento}
											onChange={(e) => setConfTratamento(e.target.value)}
											placeholder="Ex: Crizal Sapphire"
											disabled={confSemTratamento}
											className="h-8 text-xs font-medium"
										/>
									</div>

									<div className="col-span-4">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Tratamento</label>
										<Input
											type="number"
											step="0.01"
											value={confSemTratamento ? 0 : confPrecoTrat || ""}
											onChange={(e) => setConfPrecoTrat(Number(e.target.value))}
											disabled={confSemTratamento}
											placeholder="0.00"
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>

								{/* 2º Par Oficial (se ativado) */}
								{isDobro && (
									<div className="pt-3 border-t border-dashed space-y-3">
										<div className="text-xs font-bold text-primary flex items-center gap-1.5">
											<span>2º Par (Oficial)</span>
										</div>

										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">OS Loja 2</label>
												<Input
													value={confOS2}
													onChange={(e) => setConfOS2(e.target.value)}
													placeholder="Ex: OS1045B"
													className="h-8 text-xs font-mono uppercase"
												/>
											</div>
											<div>
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ID Lab 2</label>
												<Input
													value={confIDLab2}
													onChange={(e) => setConfIDLab2(e.target.value)}
													placeholder="Cod. Lab 2"
													className="h-8 text-xs font-mono uppercase"
												/>
											</div>
										</div>

										<div className="grid grid-cols-12 gap-2">
											<div className="col-span-7">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Lente 2</label>
												<Input
													value={confLente2}
													onChange={(e) => setConfLente2(e.target.value)}
													placeholder="Ex: Hoyalux Balansis"
													className="h-8 text-xs font-medium"
												/>
											</div>
											<div className="col-span-2">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Qtdd 2</label>
												<select
													value={confQtdd2}
													onChange={(e) => setConfQtdd2(Number(e.target.value))}
													className="h-8 w-full rounded-md border bg-background px-1 text-xs"
												>
													<option value={1}>1</option>
													<option value={0.5}>0.5</option>
												</select>
											</div>
											<div className="col-span-3">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Lente 2</label>
												<Input
													type="number"
													step="0.01"
													value={confPrecoLente2 || ""}
													onChange={(e) => setConfPrecoLente2(Number(e.target.value))}
													placeholder="0.00"
													className="h-8 text-xs font-mono"
												/>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Card 2: Pedido Adaptado (Efetivo) */}
							<div className="rounded-xl border bg-card p-5 shadow-xs space-y-3.5">
								<div className="flex items-center justify-between border-b pb-2.5">
									<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
										<Icon icon={CheckmarkOutline} className="size-4 text-emerald-600" />
										Pedido Adaptado (Laboratório Efetivo)
									</h3>
									<span className="text-xs font-mono font-bold text-muted-foreground">
										Total Adaptado: R$ {totalEfetivoAtual.toFixed(2)}
									</span>
								</div>

								<div>
									<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Laboratório Efetivo *</label>
									<select
										value={confLabEfetivo}
										onChange={(e) => setConfLabEfetivo(e.target.value)}
										required
										className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
									>
										{labs.map((l) => (
											<option key={l.nome} value={l.nome}>{l.nome}</option>
										))}
									</select>
								</div>

								<div className="grid grid-cols-12 gap-2">
									<div className="col-span-7">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Lente Efetiva</label>
										<Input
											value={confLenteEfetiva}
											onChange={(e) => setConfLenteEfetiva(e.target.value)}
											placeholder="Ex: Personality Advance 1.60"
											className="h-8 text-xs font-medium"
										/>
									</div>

									<div className="col-span-2">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Qtdd</label>
										<select
											value={confQtddEf}
											onChange={(e) => setConfQtddEf(Number(e.target.value))}
											className="h-8 w-full rounded-md border bg-background px-1.5 text-xs"
										>
											<option value={1}>1 (Par)</option>
											<option value={0.5}>0.5 (Meio)</option>
										</select>
									</div>

									<div className="col-span-3">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Lente Ef.</label>
										<Input
											type="number"
											step="0.01"
											value={confPrecoLenteEfetiva || ""}
											onChange={(e) => setConfPrecoLenteEfetiva(Number(e.target.value))}
											placeholder="0.00"
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>

								<div className="grid grid-cols-12 gap-2">
									<div className="col-span-8">
										<div className="flex items-center justify-between mb-1">
											<label className="text-[11px] font-semibold text-muted-foreground">Tratamento Efetivo</label>
											<label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
												<input
													type="checkbox"
													checked={confSemTratamentoEf}
													onChange={(e) => setConfSemTratamentoEf(e.target.checked)}
													className="size-3 cursor-pointer"
												/>
												Sem Trat.
											</label>
										</div>
										<Input
											value={confTratEfetivo}
											onChange={(e) => setConfTratEfetivo(e.target.value)}
											placeholder="Ex: AR Satin Clean"
											disabled={confSemTratamentoEf}
											className="h-8 text-xs font-medium"
										/>
									</div>

									<div className="col-span-4">
										<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Trat. Ef.</label>
										<Input
											type="number"
											step="0.01"
											value={confSemTratamentoEf ? 0 : confPrecoTratEfetivo || ""}
											onChange={(e) => setConfPrecoTratEfetivo(Number(e.target.value))}
											disabled={confSemTratamentoEf}
											placeholder="0.00"
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>

								{/* 2º Par Adaptado (se dobro ativo) */}
								{isDobro && (
									<div className="pt-3 border-t border-dashed space-y-3">
										<div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
											<span>2º Par (Adaptado)</span>
										</div>

										<div className="grid grid-cols-12 gap-2">
											<div className="col-span-7">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Lente Efetiva 2</label>
												<Input
													value={confLenteEfetiva2}
													onChange={(e) => setConfLenteEfetiva2(e.target.value)}
													placeholder="Ex: Personality Advance 2"
													className="h-8 text-xs font-medium"
												/>
											</div>
											<div className="col-span-2">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Qtdd 2</label>
												<select
													value={confQtddEf2}
													onChange={(e) => setConfQtddEf2(Number(e.target.value))}
													className="h-8 w-full rounded-md border bg-background px-1 text-xs"
												>
													<option value={1}>1</option>
													<option value={0.5}>0.5</option>
												</select>
											</div>
											<div className="col-span-3">
												<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">R$ Lente 2</label>
												<Input
													type="number"
													step="0.01"
													value={confPrecoLenteEfetiva2 || ""}
													onChange={(e) => setConfPrecoLenteEfetiva2(Number(e.target.value))}
													placeholder="0.00"
													className="h-8 text-xs font-mono"
												/>
											</div>
										</div>
									</div>
								)}

								<div className="pt-4 mt-auto">
									<Button
										type="submit"
										disabled={submitting}
										className="w-full h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
									>
										{submitting ? "Gravando..." : "Salvar Lançamento de Conferência"}
									</Button>
								</div>
							</div>
						</div>
					</form>

					{/* Card 3: Histórico e Filtros Avançados */}
					<div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
							<h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
								<Icon icon={CheckmarkOutline} className="size-4 text-primary" />
								Últimos Lançamentos de Conferência
							</h3>
							<Button
								variant="outline"
								size="sm"
								onClick={handleExportPDF}
								className="h-8 gap-1.5 text-xs font-semibold cursor-pointer border-neutral-300 dark:border-neutral-700 shadow-2xs"
							>
								<Icon icon={DocumentExport} className="size-3.5" />
								Exportar PDF
							</Button>
						</div>

						{/* Filtros */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
							<div className="md:col-span-2">
								<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Buscar OS ou ID Lab</label>
								<div className="relative">
									<Icon icon={Search} className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
									<Input
										value={searchOsOrLab}
										onChange={(e) => setSearchOsOrLab(e.target.value)}
										placeholder="Buscar por OS ou ID do laboratório..."
										className="h-8 pl-8 text-xs font-medium"
									/>
								</div>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Loja</label>
								<select
									value={selectedStoreFilter}
									onChange={(e) => setSelectedStoreFilter(e.target.value)}
									className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
								>
									<option value="TODAS">Todas as Lojas</option>
									{stores.map((s) => (
										<option key={s.nome} value={s.nome}>{s.nome}</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Data Inicial</label>
								<Input
									type="date"
									value={startDateFilter}
									onChange={(e) => setStartDateFilter(e.target.value)}
									className="h-8 text-xs"
								/>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Data Final</label>
								<Input
									type="date"
									value={endDateFilter}
									onChange={(e) => setEndDateFilter(e.target.value)}
									className="h-8 text-xs"
								/>
							</div>
						</div>

						{/* Tabela de Conferências */}
						<div className="rounded-lg border overflow-hidden">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
										<th className="py-2.5 px-3 text-left">Data</th>
										<th className="py-2.5 px-3 text-left">OS / Loja</th>
										<th className="py-2.5 px-3 text-left">ID Lab</th>
										<th className="py-2.5 px-3 text-left">Laboratório</th>
										<th className="py-2.5 px-3 text-left">Lente Efetiva</th>
										<th className="py-2.5 px-3 text-right">Custo Efetivo</th>
										<th className="py-2.5 px-3 text-center">Benefício</th>
										<th className="py-2.5 px-3 text-right">Ações</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{filtered.length === 0 ? (
										<tr>
											<td colSpan={8} className="py-10 text-center text-muted-foreground">
												Nenhum registro de conferência encontrado com os filtros selecionados.
											</td>
										</tr>
									) : (
										filtered.map((c) => {
											const custoEf =
												(c.precoLenteEfetiva || 0) * (c.qtyLenteEfetiva || 1) +
												(c.precoTratEfetivo || 0);

											return (
												<tr key={c.id} className="hover:bg-muted/20 transition-colors">
													<td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
														{c.data}
													</td>
													<td className="py-2.5 px-3">
														<div className="font-mono font-bold text-primary">{c.osLoja}</div>
														<div className="text-[10px] text-muted-foreground">{c.loja}</div>
													</td>
													<td className="py-2.5 px-3 font-mono font-bold text-foreground">
														{c.idLab}
													</td>
													<td className="py-2.5 px-3 font-medium">
														{c.labEfetivo || c.labPedido}
													</td>
													<td className="py-2.5 px-3">
														<div className="font-semibold text-foreground">{c.lenteEfetiva}</div>
														{c.tratEfetivo && c.tratEfetivo !== "Sem Tratamento" && (
															<div className="text-[10px] text-muted-foreground">{c.tratEfetivo}</div>
														)}
													</td>
													<td className="py-2.5 px-3 text-right font-mono font-bold">
														R$ {custoEf.toFixed(2)}
													</td>
													<td className="py-2.5 px-3 text-center">
														{c.confBeneficio ? (
															<Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
																{c.confBeneficio}
															</Badge>
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</td>
													<td className="py-2.5 px-3 text-right">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleDelete(c.id)}
															className="size-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
															title="Excluir lançamento"
														>
															<Icon icon={TrashCan} className="size-3.5" />
														</Button>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
