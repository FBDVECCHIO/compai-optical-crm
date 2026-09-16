"use client";

import { useState, useEffect, useMemo } from "react";
import Search from "@carbon/icons-react/es/Search";
import Add from "@carbon/icons-react/es/Add";
import Upload from "@carbon/icons-react/es/Upload";
import Catalog from "@carbon/icons-react/es/Catalog";
import Money from "@carbon/icons-react/es/Money";
import Close from "@carbon/icons-react/es/Close";
import Enterprise from "@carbon/icons-react/es/Enterprise";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import MagicWand from "@carbon/icons-react/es/MagicWand";
import {
	LensCatalogItem,
	LensCategory,
} from "@/lib/optical/optical-types";
import {
	fetchLensCatalog,
	saveLensCatalogItem,
	importLensCatalogBatch,
} from "@/lib/optical/supabase-optical";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

export function OpticalLensCatalogView() {
	const [lenses, setLenses] = useState<LensCatalogItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
	const [selectedLab, setSelectedLab] = useState<string>("ALL");
	const [selectedIndex, setSelectedIndex] = useState<string>("ALL");

	// Modais
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<LensCatalogItem | null>(null);

	// Formulário Manual
	const [formTipo, setFormTipo] = useState<LensCategory>("MULTIFOCAL");
	const [formFamilia, setFormFamilia] = useState("");
	const [formProduto, setFormProduto] = useState("");
	const [formLab, setFormLab] = useState("Hoya");
	const [formIR, setFormIR] = useState("1.50");
	const [formTecnologia, setFormTecnologia] = useState("Freeform");
	const [formCusto, setFormCusto] = useState<number>(180);
	const [formPreco, setFormPreco] = useState<number>(750);
	const [formValorPeca, setFormValorPeca] = useState<number>(375);

	// Lote
	const [batchText, setBatchText] = useState("");
	const [batchError, setBatchError] = useState<string | null>(null);
	const [batchPreview, setBatchPreview] = useState<LensCatalogItem[]>([]);

	const loadData = async () => {
		setIsLoading(true);
		const data = await fetchLensCatalog();
		setLenses(data);
		setIsLoading(false);
	};

	useEffect(() => {
		loadData();
	}, []);

	const labs = useMemo(() => {
		const set = new Set<string>();
		for (const l of lenses) {
			if (l.laboratorio) set.add(l.laboratorio);
		}
		return Array.from(set).sort();
	}, [lenses]);

	const indices = useMemo(() => {
		const set = new Set<string>();
		for (const l of lenses) {
			if (l.indiceRefrativo) set.add(l.indiceRefrativo);
		}
		return Array.from(set).sort();
	}, [lenses]);

	const filteredLenses = useMemo(() => {
		return lenses.filter((item) => {
			const matchesQuery =
				!searchQuery ||
				item.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.familia.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.laboratorio.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.tecnologia.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCategory =
				selectedCategory === "ALL" || item.tipo === selectedCategory;
			const matchesLab = selectedLab === "ALL" || item.laboratorio === selectedLab;
			const matchesIndex =
				selectedIndex === "ALL" || item.indiceRefrativo === selectedIndex;

			return matchesQuery && matchesCategory && matchesLab && matchesIndex;
		});
	}, [lenses, searchQuery, selectedCategory, selectedLab, selectedIndex]);

	const handleOpenNew = () => {
		setEditingItem(null);
		setFormTipo("MULTIFOCAL");
		setFormFamilia("");
		setFormProduto("");
		setFormLab("Hoya");
		setFormIR("1.50");
		setFormTecnologia("Freeform");
		setFormCusto(180);
		setFormPreco(750);
		setFormValorPeca(375);
		setIsNewModalOpen(true);
	};

	const handleOpenEdit = (item: LensCatalogItem) => {
		setEditingItem(item);
		setFormTipo(item.tipo);
		setFormFamilia(item.familia);
		setFormProduto(item.produto);
		setFormLab(item.laboratorio);
		setFormIR(item.indiceRefrativo);
		setFormTecnologia(item.tecnologia);
		setFormCusto(item.custo);
		setFormPreco(item.preco);
		setFormValorPeca(item.valorPeca);
		setIsNewModalOpen(true);
	};

	const handleSaveManual = async (e: React.FormEvent) => {
		e.preventDefault();
		const itemToSave: LensCatalogItem = {
			id: editingItem ? editingItem.id : `lens_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			tipo: formTipo,
			familia: formFamilia.trim(),
			produto: formProduto.trim(),
			laboratorio: formLab.trim(),
			indiceRefrativo: formIR,
			tecnologia: formTecnologia.trim(),
			custo: Number(formCusto) || 0,
			preco: Number(formPreco) || 0,
			valorPeca: Number(formValorPeca) || (Number(formPreco) / 2) || 0,
			ativo: true,
		};

		const updated = await saveLensCatalogItem(itemToSave);
		setLenses(updated);
		setIsNewModalOpen(false);
	};

	const handleParseBatch = (text: string) => {
		setBatchText(text);
		setBatchError(null);
		if (!text.trim()) {
			setBatchPreview([]);
			return;
		}

		try {
			const lines = text.trim().split("\n");
			const parsed: LensCatalogItem[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || !line.trim() || line.trim().startsWith("#")) continue;

				let parts = line.split("\t");
				if (parts.length < 4) parts = line.split(";");
				if (parts.length < 4) parts = line.split(",");

				if (parts.length >= 3) {
					const rawTipo = (parts[0] || "MULTIFOCAL").trim().toUpperCase();
					let validTipo: LensCategory = "MULTIFOCAL";
					if (rawTipo.includes("MONO")) validTipo = "MONOFOCAL";
					else if (rawTipo.includes("BI")) validTipo = "BIFOCAL";
					else if (rawTipo.includes("OCUP")) validTipo = "OCUPACIONAL";

					const familia = (parts[1] || "Geral").trim();
					const produto = (parts[2] || `Lente ${i + 1}`).trim();
					const p3 = parts[3];
					const p4 = parts[4];
					const p5 = parts[5];
					const p6 = parts[6];
					const p7 = parts[7];
					const p8 = parts[8];

					const custo = p3 ? parseFloat(p3.replace("R$", "").replace(",", ".").trim()) || 0 : 0;
					const preco = p4 ? parseFloat(p4.replace("R$", "").replace(",", ".").trim()) || custo * 3 : custo * 3;
					const ir = p5 ? p5.trim() : "1.50";
					const tec = p6 ? p6.trim() : "Digital";
					const lab = p7 ? p7.trim() : "Geral";
					const valorPeca = p8 ? parseFloat(p8.replace("R$", "").replace(",", ".").trim()) || (preco / 2) : (preco / 2);

					parsed.push({
						id: `batch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
						tipo: validTipo,
						familia,
						produto,
						custo,
						preco,
						indiceRefrativo: ir,
						tecnologia: tec,
						laboratorio: lab,
						valorPeca,
						ativo: true,
					});
				}
			}

			if (parsed.length === 0) {
				setBatchError("Nenhuma linha válida detectada. Use colunas separadas por tabulação ou ponto-e-vírgula.");
			}
			setBatchPreview(parsed);
		} catch (err: any) {
			setBatchError("Erro ao interpretar texto: " + (err.message || String(err)));
		}
	};

	const handleConfirmBatch = async () => {
		if (batchPreview.length === 0) return;
		const updated = await importLensCatalogBatch(batchPreview);
		setLenses(updated);
		setIsBatchModalOpen(false);
		setBatchText("");
		setBatchPreview([]);
	};

	return (
		<div className="space-y-6">
			{/* CABEÇALHO */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
							MNOC-X
						</span>
						<h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
							Catálogo de Lentes
						</h1>
					</div>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
						Base técnica para abastecer a Jornada da OS com suporte a variação por olho (OD e OE), índices de refração e precificação por peça.
					</p>
				</div>

				<div className="flex items-center gap-2.5">
					<MnocxButton
						variant="outline"
						size="sm"
						icon={Upload}
						onClick={() => setIsBatchModalOpen(true)}
					>
						Inserção em Lote
					</MnocxButton>
					<MnocxButton
						variant="primary"
						size="sm"
						icon={Add}
						onClick={handleOpenNew}
					>
						Nova Lente
					</MnocxButton>
				</div>
			</div>

			{/* KPIS SKEUOMÓRFICOS */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Total Cadastradas
						</span>
						<Catalog className="size-4 text-zinc-400" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{lenses.length}
						</span>
						<span className="text-[10px] text-zinc-400">lentes ativas</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Laboratórios
						</span>
						<Enterprise className="size-4 text-zinc-400" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{labs.length}
						</span>
						<span className="text-[10px] text-zinc-400">parceiros homologados</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Multifocais
						</span>
						<MagicWand className="size-4 text-zinc-400" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{lenses.filter((l) => l.tipo === "MULTIFOCAL").length}
						</span>
						<span className="text-[10px] text-zinc-400">designs no catálogo</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Média Par de Lentes
						</span>
						<Money className="size-4 text-emerald-600" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
							{lenses.length > 0
								? `R$ ${(
										lenses.reduce((acc, l) => acc + l.preco, 0) / lenses.length
								  ).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
								: "R$ 0"}
						</span>
						<span className="text-[10px] text-zinc-400">ticket médio</span>
					</div>
				</MnocxCard>
			</div>

			{/* FILTROS E BUSCA */}
			<MnocxCard padding="sm">
				<div className="flex flex-col lg:flex-row items-center justify-between gap-3">
					<div className="relative w-full lg:w-96">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
						<input
							type="text"
							placeholder="Buscar por produto, família, laboratório ou tecnologia..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-500"
						/>
					</div>

					<div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todas Categorias</option>
							<option value="MULTIFOCAL">Multifocal</option>
							<option value="MONOFOCAL">Monofocal</option>
							<option value="BIFOCAL">Bifocal</option>
							<option value="OCUPACIONAL">Ocupacional</option>
						</select>

						<select
							value={selectedLab}
							onChange={(e) => setSelectedLab(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todos Laboratórios</option>
							{labs.map((lab) => (
								<option key={lab} value={lab}>
									{lab}
								</option>
							))}
						</select>

						<select
							value={selectedIndex}
							onChange={(e) => setSelectedIndex(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todos Índices</option>
							{indices.map((idx) => (
								<option key={idx} value={idx}>
									IR {idx}
								</option>
							))}
						</select>

						{(searchQuery || selectedCategory !== "ALL" || selectedLab !== "ALL" || selectedIndex !== "ALL") && (
							<button
								onClick={() => {
									setSearchQuery("");
									setSelectedCategory("ALL");
									setSelectedLab("ALL");
									setSelectedIndex("ALL");
								}}
								className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 underline"
							>
								Limpar
							</button>
						)}
					</div>
				</div>
			</MnocxCard>

			{/* TABELA DE LENTES */}
			<MnocxCard padding="none">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold">
								<th className="py-3 px-4">Produto / Família</th>
								<th className="py-3 px-3">Tipo</th>
								<th className="py-3 px-3">Laboratório</th>
								<th className="py-3 px-3">Índice</th>
								<th className="py-3 px-3">Tecnologia</th>
								<th className="py-3 px-3 text-right">Custo Lab</th>
								<th className="py-3 px-3 text-right">Valor Peça (Olho)</th>
								<th className="py-3 px-3 text-right">Preço Par</th>
								<th className="py-3 px-3 text-right">Margem</th>
								<th className="py-3 px-4 text-center">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{filteredLenses.length === 0 ? (
								<tr>
									<td colSpan={10} className="py-8 text-center text-zinc-400">
										Nenhuma lente encontrada com os filtros selecionados.
									</td>
								</tr>
							) : (
								filteredLenses.map((lens) => {
									const margin = lens.preco > 0 ? ((lens.preco - lens.custo) / lens.preco) * 100 : 0;
									return (
										<tr
											key={lens.id}
											className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
										>
											<td className="py-3 px-4">
												<div className="font-medium text-zinc-900 dark:text-zinc-100">
													{lens.produto}
												</div>
												<div className="text-[11px] text-zinc-400">
													{lens.familia}
												</div>
											</td>
											<td className="py-3 px-3">
												<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
													{lens.tipo}
												</span>
											</td>
											<td className="py-3 px-3 font-medium text-zinc-700 dark:text-zinc-300">
												{lens.laboratorio}
											</td>
											<td className="py-3 px-3">
												<span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
													{lens.indiceRefrativo}
												</span>
											</td>
											<td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
												{lens.tecnologia}
											</td>
											<td className="py-3 px-3 text-right font-mono text-zinc-500">
												R$ {lens.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>
											<td className="py-3 px-3 text-right font-mono font-medium text-blue-600 dark:text-blue-400">
												R$ {lens.valorPeca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>
											<td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
												R$ {lens.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>
											<td className="py-3 px-3 text-right">
												<span
													className={`font-mono text-[11px] font-semibold ${
														margin >= 60 ? "text-emerald-600" : "text-amber-600"
													}`}
												>
													{margin.toFixed(0)}%
												</span>
											</td>
											<td className="py-3 px-4 text-center">
												<button
													onClick={() => handleOpenEdit(lens)}
													className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline font-medium"
												>
													Editar
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</MnocxCard>

			{/* MODAL: NOVA LENTE / EDITAR */}
			{isNewModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
					<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
							<div className="flex items-center gap-2">
								<Catalog className="size-4 text-zinc-600" />
								<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
									{editingItem ? "Editar Lente do Catálogo" : "Nova Lente Técnica"}
								</h3>
							</div>
							<button
								onClick={() => setIsNewModalOpen(false)}
								className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
							>
								<Close className="size-4" />
							</button>
						</div>

						<form onSubmit={handleSaveManual} className="p-5 space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Tipo da Lente *
									</label>
									<select
										value={formTipo}
										onChange={(e) => setFormTipo(e.target.value as LensCategory)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									>
										<option value="MULTIFOCAL">Multifocal</option>
										<option value="MONOFOCAL">Monofocal</option>
										<option value="BIFOCAL">Bifocal</option>
										<option value="OCUPACIONAL">Ocupacional</option>
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Laboratório *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Hoya, Zeiss, Sorolab"
										value={formLab}
										onChange={(e) => setFormLab(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Família da Lente *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Sync III, SmartLife, Varilux"
										value={formFamilia}
										onChange={(e) => setFormFamilia(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Nome Completo do Produto *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Sync III 1.50 BlueControl"
										value={formProduto}
										onChange={(e) => setFormProduto(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Índice de Refração (IR) *
									</label>
									<select
										value={formIR}
										onChange={(e) => setFormIR(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
									>
										<option value="1.50">1.50 (Resina Básica / CR-39)</option>
										<option value="1.56">1.56 (Intermediário)</option>
										<option value="1.59">1.59 (Policarbonato / Airwear)</option>
										<option value="1.67">1.67 (Alto Índice / Fina)</option>
										<option value="1.74">1.74 (Super Alto Índice / Ultra Fina)</option>
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Tecnologia de Surfaçagem *
									</label>
									<input
										type="text"
										placeholder="Ex: Freeform, Digital, HD"
										value={formTecnologia}
										onChange={(e) => setFormTecnologia(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Custo Lab (R$) *
									</label>
									<input
										type="number"
										step="0.01"
										required
										value={formCusto}
										onChange={(e) => setFormCusto(parseFloat(e.target.value) || 0)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Valor Peça / Olho (R$)
									</label>
									<input
										type="number"
										step="0.01"
										required
										value={formValorPeca}
										onChange={(e) => setFormValorPeca(parseFloat(e.target.value) || 0)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-blue-600 dark:text-blue-400"
									/>
									<span className="text-[10px] text-zinc-400">venda avulsa</span>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Preço Par (R$) *
									</label>
									<input
										type="number"
										step="0.01"
										required
										value={formPreco}
										onChange={(e) => {
											const val = parseFloat(e.target.value) || 0;
											setFormPreco(val);
											if (!editingItem) setFormValorPeca(val / 2);
										}}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
									/>
									<span className="text-[10px] text-zinc-400">venda padrão</span>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 pt-4">
								<MnocxButton
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsNewModalOpen(false)}
								>
									Cancelar
								</MnocxButton>
								<MnocxButton type="submit" variant="primary" size="sm">
									{editingItem ? "Salvar Alterações" : "Cadastrar Lente"}
								</MnocxButton>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* MODAL: INSERÇÃO EM LOTE */}
			{isBatchModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
					<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
							<div className="flex items-center gap-2">
								<DocumentExport className="size-4 text-zinc-600" />
								<div>
									<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
										Inserção de Lentes em Lote
									</h3>
									<p className="text-xs text-zinc-400">
										Cole linhas de planilhas (Excel/Google Sheets) ou CSV com tabulações.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsBatchModalOpen(false)}
								className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
							>
								<Close className="size-4" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 text-[11px] text-zinc-600 dark:text-zinc-300 space-y-1">
								<div className="font-semibold text-zinc-800 dark:text-zinc-100">
									Ordem esperada das colunas (separadas por TAB ou ponto-e-vírgula):
								</div>
								<div className="font-mono text-zinc-500 text-[10px]">
									Tipo | Família | Produto | Custo | Preço Par | IR | Tecnologia | Laboratório | Valor Peça
								</div>
								<div className="text-[10px] text-zinc-400">
									Exemplo: MULTIFOCAL	Varilux	Physio 3.0	320	1400	1.59	Digital	Essilor	700
								</div>
							</div>

							<div>
								<textarea
									rows={6}
									placeholder="Cole aqui as linhas copiadas da sua planilha..."
									value={batchText}
									onChange={(e) => handleParseBatch(e.target.value)}
									className="w-full p-3 font-mono text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
								/>
							</div>

							{batchError && (
								<div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
									{batchError}
								</div>
							)}

							{batchPreview.length > 0 && (
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
										<span>Prévia da Importação ({batchPreview.length} lentes identificadas)</span>
									</div>
									<div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
										<table className="w-full text-left text-[11px]">
											<thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 sticky top-0">
												<tr>
													<th className="p-2">Produto</th>
													<th className="p-2">Tipo</th>
													<th className="p-2">Lab</th>
													<th className="p-2">IR</th>
													<th className="p-2 text-right">Preço Par</th>
													<th className="p-2 text-right">Valor Peça</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
												{batchPreview.map((item, idx) => (
													<tr key={idx}>
														<td className="p-2 font-medium">{item.produto}</td>
														<td className="p-2">{item.tipo}</td>
														<td className="p-2">{item.laboratorio}</td>
														<td className="p-2 font-mono">{item.indiceRefrativo}</td>
														<td className="p-2 text-right font-mono">R$ {item.preco}</td>
														<td className="p-2 text-right font-mono text-blue-600">R$ {item.valorPeca}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}

							<div className="flex items-center justify-end gap-2 pt-2">
								<MnocxButton
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsBatchModalOpen(false)}
								>
									Cancelar
								</MnocxButton>
								<MnocxButton
									type="button"
									variant="primary"
									size="sm"
									disabled={batchPreview.length === 0}
									onClick={handleConfirmBatch}
								>
									Confirmar Importação de {batchPreview.length} Lentes
								</MnocxButton>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
