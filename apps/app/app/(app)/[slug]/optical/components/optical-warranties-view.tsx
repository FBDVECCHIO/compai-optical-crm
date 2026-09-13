"use client";

import { useEffect, useMemo, useState } from "react";
import Add from "@carbon/icons-react/es/Add";
import Calendar from "@carbon/icons-react/es/Calendar";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Copy from "@carbon/icons-react/es/Copy";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Filter from "@carbon/icons-react/es/Filter";
import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import Reset from "@carbon/icons-react/es/Reset";
import Search from "@carbon/icons-react/es/Search";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { toast } from "sonner";
import {
	type LabItem,
	type OcorrenciaDetalhes,
	type OcorrenciaItem,
	type StoreItem,
	deleteSupabaseOcorrencia,
	deleteSupabaseOcorrenciasBulk,
	fetchConfigSetting,
	fetchSupabaseLabs,
	fetchSupabaseOcorrencias,
	fetchSupabaseStores,
	fetchSupabaseTechnicians,
	saveSupabaseOcorrencia,
	type TechnicianItem,
} from "@/lib/optical/supabase-optical";
import { useOpticalOrders } from "@/lib/optical/optical-store";

export function OpticalWarrantiesView() {
	const { orders } = useOpticalOrders();

	// Estados de dados
	const [ocorrencias, setOcorrencias] = useState<OcorrenciaItem[]>([]);
	const [stores, setStores] = useState<StoreItem[]>([]);
	const [labs, setLabs] = useState<LabItem[]>([]);
	const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
	const [motivosList, setMotivosList] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);

	// Filtros
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStoreFilter, setSelectedStoreFilter] = useState("ALL");
	const [selectedMotivoFilter, setSelectedMotivoFilter] = useState("ALL");
	const [startDateFilter, setStartDateFilter] = useState("");
	const [endDateFilter, setEndDateFilter] = useState("");

	// Seleção em lote
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	// Modal de Criação / Edição
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | undefined>(undefined);

	// Form State
	const [formOS, setFormOS] = useState("");
	const [formLoja, setFormLoja] = useState("");
	const [formVendedor, setFormVendedor] = useState("");
	const [formCliente, setFormCliente] = useState("");
	const [formData, setFormData] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [formMotivo, setFormMotivo] = useState("");
	const [formObs, setFormObs] = useState("");

	// Dados originais buscados
	const [origLab, setOrigLab] = useState("");
	const [origLente, setOrigLente] = useState("");
	const [origTratamento, setOrigTratamento] = useState("");
	const [origPrecoLente, setOrigPrecoLente] = useState(0);
	const [origPrecoTrat, setOrigPrecoTrat] = useState(0);

	// Refação / Ocorrência
	const [refLab, setRefLab] = useState("");
	const [refLente, setRefLente] = useState("");
	const [refQtdd, setRefQtdd] = useState(1);
	const [refPrecoLente, setRefPrecoLente] = useState(0);
	const [refSemTratamento, setRefSemTratamento] = useState(false);
	const [refTratamento, setRefTratamento] = useState("");
	const [refPrecoTrat, setRefPrecoTrat] = useState(0);
	const [refBonificacao, setRefBonificacao] = useState(false);
	const [refCortesia, setRefCortesia] = useState(false);
	const [refBeneficioObs, setRefBeneficioObs] = useState("");

	// Modal de Detalhes
	const [viewingOco, setViewingOco] = useState<OcorrenciaItem | null>(null);

	// Modal de Acionamento de Técnico
	const [techModalOco, setTechModalOco] = useState<OcorrenciaItem | null>(null);
	const [selectedTech, setSelectedTech] = useState("");
	const [techTemplate, setTechTemplate] = useState("");

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		try {
			const [ocList, stList, lbList, tcList, mtList, tpl] = await Promise.all([
				fetchSupabaseOcorrencias(),
				fetchSupabaseStores(),
				fetchSupabaseLabs(),
				fetchSupabaseTechnicians(),
				fetchConfigSetting<string[]>("motivosOcorrencia", [
					"Troca Produto (Não Adaptação)",
					"Erro de Digitação",
					"Erro Médico",
					"Garantia Lab (Defeito Fabril)",
					"Quebra de Armação",
					"Montagem Incorreta",
					"Descolamento de Antirreflexo",
					"Outros",
				]),
				fetchConfigSetting<string>(
					"assistTemplateTecnico",
					"Olá {tecnico}, solicito assistência técnica para a OS {os} na loja {loja}. Cliente: {cliente}. Motivo: {motivo}. Link: {calendly}",
				),
			]);

			setOcorrencias(ocList);
			setStores(stList);
			setLabs(lbList);
			setTechnicians(tcList);
			setMotivosList(mtList);
			setTechTemplate(tpl);

			if (tcList && tcList.length > 0 && tcList[0]?.nome) {
				setSelectedTech(tcList[0].nome);
			}
		} catch (e) {
			console.error("Erro ao carregar dados de garantias:", e);
		} finally {
			setLoading(false);
		}
	}

	// Auto-busca dados da OS original a partir das ordens locais e Supabase
	function handleOSSearch(searchVal: string) {
		setFormOS(searchVal);
		if (!searchVal.trim()) return;

		const cleanVal = searchVal.trim().toUpperCase();
		const matchedOrder = orders.find(
			(o) =>
				o.id.toUpperCase() === cleanVal ||
				o.orderNumber.toUpperCase() === cleanVal ||
				o.orderNumber.toUpperCase().includes(cleanVal),
		);

		if (matchedOrder) {
			setFormLoja(matchedOrder.store?.name || "");
			setFormVendedor(matchedOrder.seller?.name || "");
			setFormCliente(matchedOrder.patient?.name || "");
			setOrigLab(matchedOrder.aro1?.lab || "");
			setOrigLente(matchedOrder.aro1?.lensName || "");
			setOrigTratamento(matchedOrder.aro1?.treatment || "Sem Tratamento");
			setOrigPrecoLente(matchedOrder.aro1?.lensPrice || 0);
			setOrigPrecoTrat(matchedOrder.aro1?.treatmentPrice || 0);

			toast.success(`OS ${matchedOrder.orderNumber} localizada! Dados preenchidos.`);
		}
	}

	// Copia dados originais para o pedido de refação
	function handleCopyOriginals() {
		setRefLab(origLab);
		setRefLente(origLente);
		setRefTratamento(origTratamento);
		setRefPrecoLente(origPrecoLente);
		setRefPrecoTrat(origPrecoTrat);
		setRefSemTratamento(origTratamento === "Sem Tratamento" || !origTratamento);
		toast.info("Dados originais copiados para a refação.");
	}

	// Cálculo do custo adicional
	const calculatedAdditionalCost = useMemo(() => {
		if (refBonificacao || refCortesia) return 0;
		const totalUnit = (refPrecoLente || 0) + (refSemTratamento ? 0 : (refPrecoTrat || 0));
		return totalUnit * (refQtdd || 1);
	}, [refPrecoLente, refPrecoTrat, refSemTratamento, refQtdd, refBonificacao, refCortesia]);

	function openCreateForm() {
		setEditingId(undefined);
		setFormOS("");
		setFormLoja(stores[0]?.nome || "");
		setFormVendedor("");
		setFormCliente("");
		setFormData(new Date().toISOString().slice(0, 10));
		setFormMotivo(motivosList[0] || "Troca Produto (Não Adaptação)");
		setFormObs("");
		setOrigLab("");
		setOrigLente("");
		setOrigTratamento("");
		setOrigPrecoLente(0);
		setOrigPrecoTrat(0);
		setRefLab(labs[0]?.nome || "");
		setRefLente("");
		setRefQtdd(1);
		setRefPrecoLente(0);
		setRefSemTratamento(false);
		setRefTratamento("");
		setRefPrecoTrat(0);
		setRefBonificacao(false);
		setRefCortesia(false);
		setRefBeneficioObs("");
		setIsFormOpen(true);
	}

	function openEditForm(oco: OcorrenciaItem) {
		setEditingId(oco.id);
		setFormOS(oco.os);
		setFormLoja(oco.loja);
		setFormVendedor(oco.vendedor);
		setFormCliente(oco.cliente_nome);
		setFormData(oco.data);
		setFormMotivo(oco.motivo);

		const det: OcorrenciaDetalhes =
			typeof oco.detalhes === "string"
				? (() => {
						try {
							return JSON.parse(oco.detalhes);
						} catch {
							return {};
						}
				  })()
				: (oco.detalhes || {});

		setFormObs(det.obs || "");
		setOrigLab(det.labOriginal || "");
		setOrigLente(det.lenteOriginal || "");
		setOrigTratamento(det.tratamentoOriginal || "");
		setOrigPrecoLente(det.precoLenteOriginal || 0);
		setOrigPrecoTrat(det.precoTratamentoOriginal || 0);

		setRefLab(det.lab || "");
		setRefLente(det.lente || "");
		setRefQtdd(det.qtdd ?? 1);
		setRefPrecoLente(det.precoLente || 0);
		setRefSemTratamento(det.semTratamento ?? false);
		setRefTratamento(det.tratamento || "");
		setRefPrecoTrat(det.precoTratamento || 0);
		setRefBonificacao(det.bonificacao ?? false);
		setRefCortesia(det.cortesia ?? false);
		setRefBeneficioObs(det.beneficioObs || "");

		setIsFormOpen(true);
	}

	async function handleSaveOcorrencia() {
		if (!formOS.trim()) {
			toast.error("Informe a OS da ocorrência.");
			return;
		}

		const detalhesPayload: OcorrenciaDetalhes = {
			lab: refLab,
			lente: refLente,
			precoLente: refPrecoLente,
			semTratamento: refSemTratamento,
			tratamento: refSemTratamento ? "" : refTratamento,
			precoTratamento: refSemTratamento ? 0 : refPrecoTrat,
			qtdd: refQtdd,
			obs: formObs,
			bonificacao: refBonificacao,
			cortesia: refCortesia,
			beneficioObs: refBeneficioObs,
			labOriginal: origLab,
			lenteOriginal: origLente,
			precoLenteOriginal: origPrecoLente,
			tratamentoOriginal: origTratamento,
			precoTratamentoOriginal: origPrecoTrat,
			custoOriginalTotal: origPrecoLente + origPrecoTrat,
		};

		const item: OcorrenciaItem = {
			id: editingId,
			os: formOS.trim(),
			loja: formLoja,
			vendedor: formVendedor,
			cliente_nome: formCliente,
			data: formData || new Date().toISOString().slice(0, 10),
			motivo: formMotivo,
			custo_adicional: calculatedAdditionalCost,
			detalhes: detalhesPayload,
		};

		const ok = await saveSupabaseOcorrencia(item);
		if (ok) {
			toast.success(editingId ? "Ocorrência atualizada com sucesso!" : "Ocorrência registrada no Supabase!");
			setIsFormOpen(false);
			await loadData();
		} else {
			toast.error("Falha ao salvar ocorrência no Supabase.");
		}
	}

	async function handleDelete(id: number) {
		if (!confirm("Tem certeza que deseja excluir esta ocorrência?")) return;
		const ok = await deleteSupabaseOcorrencia(id);
		if (ok) {
			toast.success("Ocorrência excluída com sucesso.");
			setOcorrencias((prev) => prev.filter((o) => o.id !== id));
			setSelectedIds((prev) => prev.filter((i) => i !== id));
		} else {
			toast.error("Erro ao excluir ocorrência.");
		}
	}

	async function handleBulkDelete() {
		if (selectedIds.length === 0) return;
		if (!confirm(`Deseja excluir ${selectedIds.length} ocorrências selecionadas?`)) return;
		const ok = await deleteSupabaseOcorrenciasBulk(selectedIds);
		if (ok) {
			toast.success(`${selectedIds.length} ocorrências excluídas com sucesso.`);
			setOcorrencias((prev) => prev.filter((o) => !o.id || !selectedIds.includes(o.id)));
			setSelectedIds([]);
		} else {
			toast.error("Erro ao excluir ocorrências em lote.");
		}
	}

	function handleToggleSelect(id: number) {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	}

	function handleSelectAll(checked: boolean) {
		if (checked) {
			const allIds = filteredOcorrencias
				.map((o) => o.id)
				.filter((id): id is number => typeof id === "number");
			setSelectedIds(allIds);
		} else {
			setSelectedIds([]);
		}
	}

	// Dispara mensagem no WhatsApp para o Técnico
	function handleTriggerWhatsAppTechnician() {
		if (!techModalOco) return;
		const targetTech = technicians.find((t) => t.nome === selectedTech);
		if (!targetTech || !targetTech.whatsapp) {
			toast.error("Técnico sem WhatsApp cadastrado.");
			return;
		}

		let msg = techTemplate || "Olá {tecnico}, solicito assistência para OS {os} na loja {loja}.";
		msg = msg
			.replace("{tecnico}", targetTech.nome)
			.replace("{os}", techModalOco.os)
			.replace("{loja}", techModalOco.loja)
			.replace("{cliente}", techModalOco.cliente_nome || "Cliente")
			.replace("{motivo}", techModalOco.motivo)
			.replace("{calendly}", targetTech.calendlyUrl || "");

		const cleanPhone = targetTech.whatsapp.replace(/\D/g, "");
		const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`;
		window.open(url, "_blank");
		setTechModalOco(null);
		toast.success(`Encaminhado para o WhatsApp de ${targetTech.nome}!`);
	}

	// Filtros aplicados
	const filteredOcorrencias = useMemo(() => {
		return ocorrencias.filter((o) => {
			if (selectedStoreFilter !== "ALL" && o.loja !== selectedStoreFilter) return false;
			if (selectedMotivoFilter !== "ALL" && o.motivo !== selectedMotivoFilter) return false;
			if (startDateFilter && o.data < startDateFilter) return false;
			if (endDateFilter && o.data > endDateFilter) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchOs = o.os.toLowerCase().includes(q);
				const matchLoja = o.loja.toLowerCase().includes(q);
				const matchCliente = o.cliente_nome.toLowerCase().includes(q);
				const matchVendedor = o.vendedor.toLowerCase().includes(q);
				const matchMotivo = o.motivo.toLowerCase().includes(q);
				if (!matchOs && !matchLoja && !matchCliente && !matchVendedor && !matchMotivo) {
					return false;
				}
			}

			return true;
		});
	}, [ocorrencias, selectedStoreFilter, selectedMotivoFilter, startDateFilter, endDateFilter, searchQuery]);

	// KPIs
	const totalPrejuizo = useMemo(() => {
		return filteredOcorrencias.reduce((acc, o) => acc + (o.custo_adicional || 0), 0);
	}, [filteredOcorrencias]);

	const motivoMaisFrequente = useMemo(() => {
		if (filteredOcorrencias.length === 0) return "Nenhum";
		const counts: Record<string, number> = {};
		for (const o of filteredOcorrencias) {
			counts[o.motivo] = (counts[o.motivo] || 0) + 1;
		}
		let maxMotivo = "";
		let maxCount = 0;
		for (const [m, c] of Object.entries(counts)) {
			if (c > maxCount) {
				maxCount = c;
				maxMotivo = m;
			}
		}
		return `${maxMotivo} (${maxCount})`;
	}, [filteredOcorrencias]);

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
						<Icon icon={WarningAlt} className="size-5 text-amber-500" />
						Garantias, Devoluções & Ocorrências de Balcão
					</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Gestão de trocas por não adaptação, erros de refação de laboratório, estornos e acionamento técnico via WhatsApp.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={loadData}
						className="h-8 text-xs font-semibold gap-1.5"
					>
						<Icon icon={Reset} className="size-3.5" />
						Atualizar
					</Button>
					<Button
						size="sm"
						onClick={openCreateForm}
						className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
					>
						<Icon icon={Add} className="size-3.5" />
						Nova Ocorrência
					</Button>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
				<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="font-medium">Total de Ocorrências</span>
						<Icon icon={WarningAlt} className="size-4 text-amber-500" />
					</div>
					<div className="mt-2">
						<div className="text-2xl font-black text-foreground">
							{filteredOcorrencias.length}
						</div>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							{ocorrencias.length} no banco histórico
						</p>
					</div>
				</div>

				<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="font-medium">Custo Adicional / Prejuízo</span>
						<Icon icon={Money} className="size-4 text-rose-500" />
					</div>
					<div className="mt-2">
						<div className="text-2xl font-black text-rose-600 dark:text-rose-400">
							R$ {totalPrejuizo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</div>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							Refações de laboratório e lentes
						</p>
					</div>
				</div>

				<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="font-medium">Motivo Mais Frequente</span>
						<Icon icon={Filter} className="size-4 text-primary" />
					</div>
					<div className="mt-2">
						<div className="text-sm font-bold text-foreground truncate" title={motivoMaisFrequente}>
							{motivoMaisFrequente}
						</div>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							Alvo prioritário de auditoria
						</p>
					</div>
				</div>

				<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="font-medium">Assistência Técnica</span>
						<Icon icon={UserFollow} className="size-4 text-emerald-500" />
					</div>
					<div className="mt-2">
						<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
							{technicians.length} Técnicos
						</div>
						<p className="text-[11px] text-muted-foreground mt-0.5">
							Com WhatsApp e Calendly ativos
						</p>
					</div>
				</div>
			</div>

			{/* Barra de Filtros e Busca */}
			<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
					{/* Busca texto */}
					<div className="relative md:col-span-2">
						<Icon
							icon={Search}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
						/>
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Buscar por OS, Loja, Vendedor, Cliente..."
							className="h-8 pl-8 text-xs font-medium"
						/>
					</div>

					{/* Filtro Loja */}
					<select
						value={selectedStoreFilter}
						onChange={(e) => setSelectedStoreFilter(e.target.value)}
						className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium"
					>
						<option value="ALL">Todas as Lojas</option>
						{stores.map((s) => (
							<option key={s.id} value={s.nome}>
								{s.nome}
							</option>
						))}
					</select>

					{/* Filtro Motivo */}
					<select
						value={selectedMotivoFilter}
						onChange={(e) => setSelectedMotivoFilter(e.target.value)}
						className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium"
					>
						<option value="ALL">Todos os Motivos</option>
						{motivosList.map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>

					{/* Botão de Exclusão em Massa */}
					<div className="flex items-center justify-end">
						<Button
							variant="destructive"
							size="sm"
							disabled={selectedIds.length === 0}
							onClick={handleBulkDelete}
							className="h-8 text-xs font-bold gap-1.5 w-full sm:w-auto"
						>
							<Icon icon={TrashCan} className="size-3.5" />
							Excluir ({selectedIds.length})
						</Button>
					</div>
				</div>
			</div>

			{/* Tabela de Ocorrências */}
			<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
								<th className="p-3 w-10 text-center">
									<input
										type="checkbox"
										checked={
											filteredOcorrencias.length > 0 &&
											selectedIds.length === filteredOcorrencias.length
										}
										onChange={(e) => handleSelectAll(e.target.checked)}
										className="rounded cursor-pointer"
									/>
								</th>
								<th className="p-3">Data</th>
								<th className="p-3">OS</th>
								<th className="p-3">Loja</th>
								<th className="p-3">Cliente / Vendedor</th>
								<th className="p-3">Motivo da Ocorrência</th>
								<th className="p-3 text-right">Custo Refação</th>
								<th className="p-3 text-center">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{loading ? (
								<tr>
									<td colSpan={8} className="p-8 text-center text-muted-foreground">
										Carregando ocorrências do Supabase...
									</td>
								</tr>
							) : filteredOcorrencias.length === 0 ? (
								<tr>
									<td colSpan={8} className="p-8 text-center text-muted-foreground">
										Nenhuma ocorrência encontrada com os filtros selecionados.
									</td>
								</tr>
							) : (
								filteredOcorrencias.map((oco) => {
									const isSelected = oco.id ? selectedIds.includes(oco.id) : false;
									const det: OcorrenciaDetalhes =
										typeof oco.detalhes === "string"
											? (() => {
													try {
														return JSON.parse(oco.detalhes);
													} catch {
														return {};
													}
											  })()
											: (oco.detalhes || {});

									return (
										<tr
											key={oco.id || oco.os}
											className={`hover:bg-muted/30 transition-colors ${
												isSelected ? "bg-primary/5" : ""
											}`}
										>
											<td className="p-3 text-center">
												{oco.id && (
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => handleToggleSelect(oco.id!)}
														className="rounded cursor-pointer"
													/>
												)}
											</td>
											<td className="p-3 font-medium whitespace-nowrap text-muted-foreground">
												{oco.data || "—"}
											</td>
											<td className="p-3 font-bold text-foreground">
												OS {oco.os}
											</td>
											<td className="p-3 text-muted-foreground font-medium whitespace-nowrap">
												{oco.loja || "—"}
											</td>
											<td className="p-3">
												<div className="font-semibold text-foreground">
													{oco.cliente_nome || det.obs?.match(/Cliente: ([^\n\r]+)/)?.[1] || "Consumidor"}
												</div>
												<div className="text-[11px] text-muted-foreground">
													Vend: {oco.vendedor || det.obs?.match(/VENDEDORA: ([^\n\r/]+)/)?.[1] || "—"}
												</div>
											</td>
											<td className="p-3">
												<Badge
													variant={
														oco.motivo.includes("Não Adaptação")
															? "secondary"
															: oco.motivo.includes("Erro")
															? "destructive"
															: "outline"
													}
													className="text-[11px] font-semibold"
												>
													{oco.motivo}
												</Badge>
												{det.lab && (
													<div className="text-[10px] text-muted-foreground mt-0.5">
														Refação: {det.lab}
													</div>
												)}
											</td>
											<td className="p-3 text-right font-bold whitespace-nowrap">
												{oco.custo_adicional > 0 ? (
													<span className="text-rose-600 dark:text-rose-400">
														R$ {oco.custo_adicional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
													</span>
												) : (
													<span className="text-emerald-600 dark:text-emerald-400">
														Cortesia / R$ 0,00
													</span>
												)}
											</td>
											<td className="p-3 text-center whitespace-nowrap">
												<div className="flex items-center justify-center gap-1">
													<Button
														variant="ghost"
														size="sm"
														className="h-7 px-2 text-xs"
														onClick={() => setViewingOco(oco)}
														title="Ver Detalhes da Ocorrência"
													>
														Detalhes
													</Button>
													<Button
														variant="outline"
														size="sm"
														className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1"
														onClick={() => setTechModalOco(oco)}
														title="Acionar Assistência Técnica no WhatsApp"
													>
														<Icon icon={Phone} className="size-3" />
														Técnico
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
														onClick={() => openEditForm(oco)}
														title="Editar Ocorrência"
													>
														Editar
													</Button>
													{oco.id && (
														<Button
															variant="ghost"
															size="sm"
															className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
															onClick={() => handleDelete(oco.id!)}
															title="Excluir Ocorrência"
														>
															<Icon icon={TrashCan} className="size-3" />
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

			{/* Modal de Formulário: Nova / Editar Ocorrência */}
			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-base font-bold flex items-center gap-2">
							<Icon icon={WarningAlt} className="size-4 text-amber-500" />
							{editingId ? "Editar Ocorrência" : "Nova Ocorrência / Garantia de Balcão"}
						</DialogTitle>
						<DialogDescription className="text-xs">
							Registre refações, não adaptações e prejuízos com sincronização no banco Supabase.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-5 py-2">
						{/* Card 1: Pedido Original */}
						<div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3">
							<div className="text-xs font-bold text-foreground flex items-center justify-between">
								<span>1. Pedido Registrado Original</span>
								<span className="text-[11px] text-muted-foreground font-normal">
									Digite a OS para puxar os dados salvos
								</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">OS da Venda</label>
									<Input
										value={formOS}
										onChange={(e) => handleOSSearch(e.target.value)}
										placeholder="Ex: 8198 ou OS1045A"
										className="h-8 text-xs font-bold"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Loja</label>
									<select
										value={formLoja}
										onChange={(e) => setFormLoja(e.target.value)}
										className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs"
									>
										<option value="">Selecione a Loja...</option>
										{stores.map((s) => (
											<option key={s.id} value={s.nome}>
												{s.nome}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Vendedor(a)</label>
									<Input
										value={formVendedor}
										onChange={(e) => setFormVendedor(e.target.value)}
										placeholder="Nome do vendedor"
										className="h-8 text-xs"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Cliente / Paciente</label>
									<Input
										value={formCliente}
										onChange={(e) => setFormCliente(e.target.value)}
										placeholder="Nome do cliente"
										className="h-8 text-xs font-medium"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Data da Ocorrência</label>
									<Input
										type="date"
										value={formData}
										onChange={(e) => setFormData(e.target.value)}
										className="h-8 text-xs"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t text-xs">
								<div>
									<label className="text-[11px] text-muted-foreground">Lab Original:</label>
									<Input
										value={origLab}
										onChange={(e) => setOrigLab(e.target.value)}
										placeholder="Ex: Sorolab, Zeiss..."
										className="h-7 text-xs"
									/>
								</div>
								<div>
									<label className="text-[11px] text-muted-foreground">Lente Original:</label>
									<Input
										value={origLente}
										onChange={(e) => setOrigLente(e.target.value)}
										placeholder="Ex: Varilux Comfort..."
										className="h-7 text-xs"
									/>
								</div>
								<div>
									<label className="text-[11px] text-muted-foreground">Custo Lente Original (R$):</label>
									<Input
										type="number"
										value={origPrecoLente || ""}
										onChange={(e) => setOrigPrecoLente(Number(e.target.value))}
										placeholder="0.00"
										className="h-7 text-xs"
									/>
								</div>
							</div>
						</div>

						{/* Card 2: Motivo da Ocorrência */}
						<div className="rounded-xl border bg-muted/20 p-4 flex flex-col gap-3">
							<div className="text-xs font-bold text-foreground">
								2. Motivo & Observações do Caso
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Motivo</label>
									<select
										value={formMotivo}
										onChange={(e) => setFormMotivo(e.target.value)}
										className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs font-semibold"
									>
										{motivosList.map((m) => (
											<option key={m} value={m}>
												{m}
											</option>
										))}
									</select>
								</div>
								<div className="sm:col-span-2">
									<label className="text-[11px] font-medium text-muted-foreground">Observações Técnicas / Relato</label>
									<textarea
										value={formObs}
										onChange={(e) => setFormObs(e.target.value)}
										rows={2}
										placeholder="Ex: Cliente relatou tontura e distorção lateral no campo intermediário. Feita aferição com técnico..."
										className="w-full rounded-lg border bg-background p-2 text-xs"
									/>
								</div>
							</div>
						</div>

						{/* Card 3: Refação / Pedido Ocorrência */}
						<div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-foreground flex items-center gap-2">
									3. Pedido de Refação (Laboratório & Lentes)
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleCopyOriginals}
									className="h-6 text-[10px] font-semibold gap-1"
								>
									<Icon icon={Copy} className="size-3" />
									Copiar Originais
								</Button>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Laboratório</label>
									<select
										value={refLab}
										onChange={(e) => setRefLab(e.target.value)}
										className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs font-medium"
									>
										<option value="">Selecione...</option>
										{labs.map((l) => (
											<option key={l.id} value={l.nome}>
												{l.nome}
											</option>
										))}
									</select>
								</div>
								<div className="sm:col-span-2">
									<label className="text-[11px] font-medium text-muted-foreground">Lente Refação</label>
									<Input
										value={refLente}
										onChange={(e) => setRefLente(e.target.value)}
										placeholder="Ex: 1.59 Inc. Esf +6.00 a -6.00"
										className="h-8 text-xs font-medium"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Quantidade</label>
									<select
										value={refQtdd}
										onChange={(e) => setRefQtdd(Number(e.target.value))}
										className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs font-medium"
									>
										<option value={1}>1 (Par completo)</option>
										<option value={0.5}>0.5 (Meio par / 1 olho)</option>
									</select>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">R$ Custo Lente</label>
									<Input
										type="number"
										step="0.01"
										value={refPrecoLente || ""}
										onChange={(e) => setRefPrecoLente(Number(e.target.value))}
										placeholder="0.00"
										className="h-8 text-xs font-medium"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Tratamento / AR</label>
									<Input
										value={refTratamento}
										onChange={(e) => setRefTratamento(e.target.value)}
										disabled={refSemTratamento}
										placeholder={refSemTratamento ? "Sem Tratamento" : "Ex: Crizal Rock"}
										className="h-8 text-xs font-medium"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">R$ Custo Tratamento</label>
									<Input
										type="number"
										step="0.01"
										value={refSemTratamento ? 0 : refPrecoTrat || ""}
										onChange={(e) => setRefPrecoTrat(Number(e.target.value))}
										disabled={refSemTratamento}
										placeholder="0.00"
										className="h-8 text-xs font-medium"
									/>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
								<div className="flex items-center gap-4 text-xs">
									<label className="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={refSemTratamento}
											onChange={(e) => setRefSemTratamento(e.target.checked)}
											className="rounded"
										/>
										<span>Sem Tratamento</span>
									</label>
									<label className="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold">
										<input
											type="checkbox"
											checked={refBonificacao || refCortesia}
											onChange={(e) => {
												setRefBonificacao(e.target.checked);
												setRefCortesia(e.target.checked);
											}}
											className="rounded"
										/>
										<span>Bonificação / Cortesia Lab (Custo R$ 0)</span>
									</label>
								</div>

								<div className="text-right">
									<span className="text-xs text-muted-foreground mr-2">Custo Adicional:</span>
									<span className="text-sm font-black text-rose-600 dark:text-rose-400">
										R$ {calculatedAdditionalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
									</span>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
							Cancelar
						</Button>
						<Button size="sm" onClick={handleSaveOcorrencia} className="font-bold">
							Salvar Ocorrência
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal de Detalhes da Ocorrência */}
			{viewingOco && (
				<Dialog open={Boolean(viewingOco)} onOpenChange={(open) => !open && setViewingOco(null)}>
					<DialogContent className="max-w-xl">
						<DialogHeader>
							<DialogTitle className="text-base font-bold flex items-center justify-between">
								<span>Detalhes da Ocorrência — OS {viewingOco.os}</span>
								<Badge variant="outline">{viewingOco.loja}</Badge>
							</DialogTitle>
						</DialogHeader>

						<div className="flex flex-col gap-4 text-xs py-2">
							<div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
								<div><span className="text-muted-foreground">Data:</span> <strong className="text-foreground">{viewingOco.data}</strong></div>
								<div><span className="text-muted-foreground">Vendedor:</span> <strong className="text-foreground">{viewingOco.vendedor || "—"}</strong></div>
								<div><span className="text-muted-foreground">Cliente:</span> <strong className="text-foreground">{viewingOco.cliente_nome || "—"}</strong></div>
								<div><span className="text-muted-foreground">Motivo:</span> <strong className="text-amber-500">{viewingOco.motivo}</strong></div>
								<div className="col-span-2">
									<span className="text-muted-foreground">Custo Adicional / Prejuízo:</span>{" "}
									<strong className={viewingOco.custo_adicional > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
										R$ {viewingOco.custo_adicional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
									</strong>
								</div>
							</div>

							<div>
								<span className="font-semibold text-foreground">Relatório / Detalhes Registrados:</span>
								<pre className="mt-1 p-3 rounded-lg border bg-muted/40 font-mono text-[11px] whitespace-pre-wrap">
									{typeof viewingOco.detalhes === "string" ? viewingOco.detalhes : JSON.stringify(viewingOco.detalhes, null, 2)}
								</pre>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" size="sm" onClick={() => setViewingOco(null)}>
								Fechar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* Modal de Envio para WhatsApp do Técnico */}
			{techModalOco && (
				<Dialog open={Boolean(techModalOco)} onOpenChange={(open) => !open && setTechModalOco(null)}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600">
								<Icon icon={Phone} className="size-4" />
								Acionar Técnico Óptico no WhatsApp
							</DialogTitle>
							<DialogDescription className="text-xs">
								Envie a ficha da ocorrência da OS {techModalOco.os} diretamente para o técnico responsável com agendamento Calendly.
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col gap-3 py-2 text-xs">
							<div>
								<label className="text-[11px] font-semibold text-foreground">Selecionar Técnico Responsável</label>
								<select
									value={selectedTech}
									onChange={(e) => setSelectedTech(e.target.value)}
									className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs mt-1"
								>
									{technicians.map((t, idx) => (
										<option key={idx} value={t.nome}>
											{t.nome} — {t.whatsapp || "Sem tel"}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-foreground">Prévia da Mensagem</label>
								<div className="p-3 rounded-lg border bg-muted/40 text-muted-foreground text-[11px] leading-relaxed mt-1">
									{techTemplate
										.replace("{tecnico}", selectedTech)
										.replace("{os}", techModalOco.os)
										.replace("{loja}", techModalOco.loja)
										.replace("{cliente}", techModalOco.cliente_nome || "Cliente")
										.replace("{motivo}", techModalOco.motivo)
										.replace(
											"{calendly}",
											technicians.find((t) => t.nome === selectedTech)?.calendlyUrl ||
												"https://calendly.com/suporte-optico",
										)}
								</div>
							</div>
						</div>

						<DialogFooter>
							<Button variant="outline" size="sm" onClick={() => setTechModalOco(null)}>
								Cancelar
							</Button>
							<Button
								size="sm"
								onClick={handleTriggerWhatsAppTechnician}
								className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
							>
								<Icon icon={Phone} className="size-3.5" />
								Abrir WhatsApp
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
