"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Search from "@carbon/icons-react/es/Search";
import Add from "@carbon/icons-react/es/Add";
import Upload from "@carbon/icons-react/es/Upload";
import Catalog from "@carbon/icons-react/es/Catalog";
import Money from "@carbon/icons-react/es/Money";
import Close from "@carbon/icons-react/es/Close";
import Enterprise from "@carbon/icons-react/es/Enterprise";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Download from "@carbon/icons-react/es/Download";
import MagicWand from "@carbon/icons-react/es/MagicWand";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import { toast } from "sonner";
import {
	LensCatalogItem,
	LensCategory,
} from "@/lib/optical/optical-types";
import {
	fetchLensCatalog,
	saveLensCatalogItem,
	importLensCatalogBatch,
} from "@/lib/optical/supabase-optical";
import {
	generateUniqueProductCode,
	validateProductCodeUniqueness,
	batchProcessProductCodes,
} from "@/lib/optical/product-code-engine";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

function parseDelimitedLine(line: string): string[] {
	let delimiter = "\t";
	if (line.includes("\t")) delimiter = "\t";
	else if (line.includes(";")) delimiter = ";";
	else if (line.includes(",")) delimiter = ",";

	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === delimiter && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}

function parseNumericField(val?: string, defaultVal = 0): number {
	if (!val) return defaultVal;
	let clean = val.replace("R$", "").replace(/\s/g, "").trim();
	if (clean.includes(",")) {
		clean = clean.replace(/\./g, "").replace(",", ".");
	}
	const parsed = parseFloat(clean);
	return isNaN(parsed) ? defaultVal : parsed;
}

export function OpticalLensCatalogView() {
	const [lenses, setLenses] = useState<LensCatalogItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
	const [selectedLab, setSelectedLab] = useState<string>("ALL");
	const [selectedIndex, setSelectedIndex] = useState<string>("ALL");

	// Paginação e Arquivo
	const [pageSize, setPageSize] = useState<number>(10);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Modais
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<LensCatalogItem | null>(null);

	// Formulário Manual com Código Mandatório ("CPF do Produto")
	const [formCodigo, setFormCodigo] = useState("");
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

	// Reseta página ao alterar filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedCategory, selectedLab, selectedIndex]);

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
				(item.codigo && item.codigo.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

	const totalPages = Math.max(1, Math.ceil(filteredLenses.length / pageSize));
	const paginatedLenses = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredLenses.slice(start, start + pageSize);
	}, [filteredLenses, currentPage, pageSize]);

	const handleOpenNew = () => {
		setEditingItem(null);
		const autoCode = generateUniqueProductCode("LEN", lenses.map((l) => l.codigo));
		setFormCodigo(autoCode);
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
		setFormCodigo(item.codigo || generateUniqueProductCode("LEN", lenses.map((l) => l.codigo)));
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
		const validation = validateProductCodeUniqueness(
			formCodigo,
			lenses.map((l) => l.codigo),
			editingItem?.codigo
		);
		if (!validation.isValid) {
			toast.error(validation.error);
			return;
		}

		const itemToSave: LensCatalogItem = {
			id: editingItem ? editingItem.id : `lens_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			codigo: validation.normalizedCode,
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
			origem: editingItem?.origem || "SISTEMA",
		};

		const updated = await saveLensCatalogItem(itemToSave);
		setLenses(updated);
		setIsNewModalOpen(false);
		toast.success(editingItem ? "Lente atualizada com sucesso!" : "Lente cadastrada via Sistema!");
	};

	const handleParseBatch = (text: string) => {
		setBatchText(text);
		setBatchError(null);
		if (!text.trim()) {
			setBatchPreview([]);
			return;
		}

		try {
			const lines = text.trim().split(/\r?\n/);
			const parsed: LensCatalogItem[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || !line.trim() || line.trim().startsWith("#")) continue;

				// Pular linha de cabeçalho
				const lower = line.toLowerCase();
				if (
					i === 0 &&
					(lower.includes("tipo") || lower.includes("produto") || lower.includes("laboratório") || lower.includes("laboratorio") || lower.includes("custo"))
				) {
					continue;
				}

				const parts = parseDelimitedLine(line);

				if (parts.length >= 3) {
					let providedCode = "";
					let rawTipo = "";
					let familia = "";
					let produto = "";
					let custo = 0;
					let preco = 500;
					let ir = "1.50";
					let tec = "Digital";
					let lab = "Geral";
					let valorPeca = 250;

					const part0Upper = (parts[0] || "").trim().toUpperCase();
					const part1Upper = (parts[1] || "").trim().toUpperCase();
					const isPart0Type = part0Upper.includes("MONO") || part0Upper.includes("MULTI") || part0Upper.includes("BI") || part0Upper.includes("OCUP");
					const isPart1Type = part1Upper.includes("MONO") || part1Upper.includes("MULTI") || part1Upper.includes("BI") || part1Upper.includes("OCUP");

					if (!isPart0Type && isPart1Type) {
						// Formato com Código: Código;Tipo;Família;Produto;Custo;Preço Par;Índice Refrativo;Tecnologia;Laboratório;Valor Peça
						providedCode = (parts[0] || "").trim().toUpperCase();
						rawTipo = part1Upper;
						familia = (parts[2] || "Geral").trim();
						produto = (parts[3] || `Lente ${i + 1}`).trim();
						custo = parseNumericField(parts[4], 0);
						preco = parseNumericField(parts[5], custo > 0 ? custo * 3 : 500);
						ir = (parts[6] || "1.50").trim();
						tec = (parts[7] || "Digital").trim();
						lab = (parts[8] || "Geral").trim();
						valorPeca = parseNumericField(parts[9], preco / 2);
					} else {
						// Formato sem Código: Tipo;Família;Produto;Custo;Preço Par;Índice Refrativo;Tecnologia;Laboratório;Valor Peça
						rawTipo = part0Upper || "MULTIFOCAL";
						familia = (parts[1] || "Geral").trim();
						produto = (parts[2] || `Lente ${i + 1}`).trim();
						custo = parseNumericField(parts[3], 0);
						preco = parseNumericField(parts[4], custo > 0 ? custo * 3 : 500);
						ir = (parts[5] || "1.50").trim();
						tec = (parts[6] || "Digital").trim();
						lab = (parts[7] || "Geral").trim();
						valorPeca = parseNumericField(parts[8], preco / 2);
					}

					let validTipo: LensCategory = "MULTIFOCAL";
					if (rawTipo.includes("MONO")) validTipo = "MONOFOCAL";
					else if (rawTipo.includes("BI")) validTipo = "BIFOCAL";
					else if (rawTipo.includes("OCUP")) validTipo = "OCUPACIONAL";

					parsed.push({
						id: `batch_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
						codigo: providedCode,
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
						origem: "PLANILHA",
					});
				}
			}

			const withCodes = batchProcessProductCodes(parsed, "LEN", lenses.map((l) => l.codigo));
			if (withCodes.length === 0) {
				setBatchError("Nenhuma linha válida detectada. Use colunas separadas por ponto-e-vírgula ou tabulação.");
			}
			setBatchPreview(withCodes);
		} catch (err: any) {
			setBatchError("Erro ao interpretar texto: " + (err.message || String(err)));
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const content = event.target?.result as string;
			if (content) {
				handleParseBatch(content);
				setIsBatchModalOpen(true);
				toast.info(`Arquivo "${file.name}" carregado. Confira a prévia e confirme a importação.`);
			}
		};
		reader.readAsText(file, "UTF-8");
		e.target.value = "";
	};

	const handleConfirmBatch = async () => {
		if (batchPreview.length === 0) return;
		const updated = await importLensCatalogBatch(batchPreview);
		setLenses(updated);
		setIsBatchModalOpen(false);
		setBatchText("");
		setBatchPreview([]);
		toast.success(`${batchPreview.length} lentes importadas com origem 'PLANILHA' com sucesso!`);
	};

	const handleDownloadLensTemplate = () => {
		const headers = "Código;Tipo;Família;Produto;Custo;Preço Par;Índice Refrativo;Tecnologia;Laboratório;Valor Peça\n";
		const rows = [
			"LEN-10001;MULTIFOCAL;Varilux;Varilux Physio 3.0;320;1400;1.59;Digital HD;Essilor;700",
			"LEN-10002;MULTIFOCAL;Hoyalux;Hoyalux ID Myself;450;2200;1.67;Freeform 3D;Hoya;1100",
			"LEN-10003;MONOFOCAL;Zeiss Single;ClearView 1.56;120;550;1.56;Freeform;Zeiss;275",
			"LEN-10004;MONOFOCAL;Personality;Poly Antirreflexo;60;320;1.59;Convencional;Personality;160",
			"LEN-10005;MULTIFOCAL;Space;Space Advanced 1.50;150;680;1.50;Digital;Sorolab;340",
		].join("\n");

		const csvContent = "\uFEFF" + headers + rows;
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "modelo_importacao_lentes.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success("Planilha modelo de lentes (.csv) baixada com sucesso!");
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

				<div className="flex items-center flex-wrap gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".csv,text/csv,application/vnd.ms-excel"
						className="hidden"
						onChange={handleFileUpload}
					/>
					<MnocxButton
						variant="outline"
						size="sm"
						icon={Download}
						onClick={handleDownloadLensTemplate}
					>
						Baixar Modelo (.csv)
					</MnocxButton>
					<MnocxButton
						variant="outline"
						size="sm"
						icon={Upload}
						onClick={() => fileInputRef.current?.click()}
					>
						Subir Planilha (.csv)
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
								<th className="py-3 px-3 font-mono">Código (CPF)</th>
								<th className="py-3 px-4">Produto / Família</th>
								<th className="py-3 px-3">Tipo</th>
								<th className="py-3 px-3">Laboratório</th>
								<th className="py-3 px-3">Índice</th>
								<th className="py-3 px-3">Tecnologia</th>
								<th className="py-3 px-3 text-right">Custo Lab</th>
								<th className="py-3 px-3 text-right">Valor Peça (Olho)</th>
								<th className="py-3 px-3 text-right">Preço Par</th>
								<th className="py-3 px-3 text-right">Margem</th>
								<th className="py-3 px-3 text-center">Origem</th>
								<th className="py-3 px-4 text-center">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
							{paginatedLenses.length === 0 ? (
								<tr>
									<td colSpan={12} className="py-8 text-center text-zinc-400">
										Nenhuma lente encontrada com os filtros selecionados.
									</td>
								</tr>
							) : (
								paginatedLenses.map((lens) => {
									const margin = lens.preco > 0 ? ((lens.preco - lens.custo) / lens.preco) * 100 : 0;
									return (
										<tr
											key={lens.id}
											className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
										>
											<td className="py-3 px-3">
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 tracking-wider">
													{lens.codigo}
												</span>
											</td>
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
											<td className="py-3 px-3 text-center">
												{lens.origem === "PLANILHA" ? (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
														<span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
														Planilha
													</span>
												) : (
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
														<span className="size-1.5 rounded-full bg-zinc-400 shrink-0" />
														Sistema
													</span>
												)}
											</td>
											<td className="py-3 px-4 text-center">
												<button
													onClick={() => handleOpenEdit(lens)}
													className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline font-medium cursor-pointer"
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

				{/* BARRA DE PAGINAÇÃO COMPLETA */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
					<div className="text-xs text-zinc-500 dark:text-zinc-400">
						{filteredLenses.length === 0 ? (
							"Nenhuma lente para exibir"
						) : (
							<>
								Mostrando{" "}
								<span className="font-semibold text-zinc-800 dark:text-zinc-200">
									{(currentPage - 1) * pageSize + 1}
								</span>{" "}
								a{" "}
								<span className="font-semibold text-zinc-800 dark:text-zinc-200">
									{Math.min(currentPage * pageSize, filteredLenses.length)}
								</span>{" "}
								de{" "}
								<span className="font-semibold text-zinc-800 dark:text-zinc-200">
									{filteredLenses.length}
								</span>{" "}
								lentes
							</>
						)}
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
							<span>Exibir:</span>
							<select
								value={pageSize}
								onChange={(e) => {
									setPageSize(Number(e.target.value));
									setCurrentPage(1);
								}}
								className="py-1 px-2 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
							>
								<option value={10}>10 por página</option>
								<option value={20}>20 por página</option>
								<option value={50}>50 por página</option>
							</select>
						</div>

						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
								title="Página anterior"
							>
								<ChevronLeft className="size-4" />
							</button>
							<span className="px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
								{currentPage} / {totalPages}
							</span>
							<button
								type="button"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage >= totalPages}
								className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
								title="Próxima página"
							>
								<ChevronRight className="size-4" />
							</button>
						</div>
					</div>
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
							{/* Código Mandatório do Produto ("CPF do Produto") */}
							<div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
										<span>Código Mandatório ("CPF da Lente") *</span>
										<span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 uppercase font-semibold">
											Único & Anti-Duplicidade
										</span>
									</label>
									<button
										type="button"
										onClick={() => {
											const autoCode = generateUniqueProductCode("LEN", lenses.map((l) => l.codigo));
											setFormCodigo(autoCode);
											toast.info(`Código único ${autoCode} gerado pelo sistema!`);
										}}
										className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
									>
										<MagicWand className="size-3" />
										Gerar Código
									</button>
								</div>
								<input
									type="text"
									required
									placeholder="Ex: LEN-10001 ou código/EAN da lente"
									value={formCodigo}
									onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
									className="w-full text-xs p-2 rounded-xl bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-[10px] text-blue-600 dark:text-blue-400">
									Identificador único mandatório. Não pode se repetir em nenhum produto do sistema.
								</p>
							</div>

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

			{/* MODAL: SUBIR PLANILHA / INSERÇÃO EM LOTE */}
			{isBatchModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
					<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
							<div className="flex items-center gap-2">
								<DocumentExport className="size-4 text-zinc-600" />
								<div>
									<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
										Subir Planilha / Inserção em Lote de Lentes
									</h3>
									<p className="text-xs text-zinc-400">
										Itens importados serão gravados com a origem <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">PLANILHA</strong>.
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsBatchModalOpen(false)}
								className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
							>
								<Close className="size-4" />
							</button>
						</div>

						<div className="p-5 space-y-4">
							<div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="font-semibold text-zinc-800 dark:text-zinc-100 text-[11px]">
										Ordem esperada das colunas (separadas por ponto-e-vírgula ou tab):
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={handleDownloadLensTemplate}
											className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-600 shadow-2xs cursor-pointer transition-colors"
										>
											<Download className="size-3.5 text-zinc-700 dark:text-zinc-200" />
											<span>Baixar Modelo (.csv)</span>
										</button>
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white shadow-2xs cursor-pointer transition-colors"
										>
											<Upload className="size-3.5" />
											<span>Selecionar Arquivo CSV</span>
										</button>
									</div>
								</div>
								<div className="font-mono text-zinc-600 dark:text-zinc-300 text-[10px]">
									Código;Tipo;Família;Produto;Custo;Preço Par;Índice Refrativo;Tecnologia;Laboratório;Valor Peça
								</div>
								<div className="text-[10px] text-zinc-400">
									Exemplo: LEN-10001;MULTIFOCAL;Varilux;Physio 3.0;320;1400;1.59;Digital;Essilor;700
								</div>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
									Ou cole diretamente as linhas da planilha / texto CSV:
								</label>
								<textarea
									rows={5}
									placeholder="Cole aqui as linhas copiadas da sua planilha ou suba o arquivo pelo botão acima..."
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
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
											<span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
											Origem: PLANILHA
										</span>
									</div>
									<div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
										<table className="w-full text-left text-[11px]">
											<thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 sticky top-0">
												<tr>
													<th className="p-2 font-mono">Código (CPF)</th>
													<th className="p-2">Produto</th>
													<th className="p-2">Tipo</th>
													<th className="p-2">Lab</th>
													<th className="p-2">IR</th>
													<th className="p-2 text-right">Preço Par</th>
													<th className="p-2 text-right">Valor Peça</th>
													<th className="p-2 text-center">Origem</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
												{batchPreview.map((item, idx) => (
													<tr key={idx}>
														<td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">
															{item.codigo}
														</td>
														<td className="p-2 font-medium">{item.produto}</td>
														<td className="p-2">{item.tipo}</td>
														<td className="p-2">{item.laboratorio}</td>
														<td className="p-2 font-mono">{item.indiceRefrativo}</td>
														<td className="p-2 text-right font-mono">R$ {item.preco}</td>
														<td className="p-2 text-right font-mono text-blue-600">R$ {item.valorPeca}</td>
														<td className="p-2 text-center">
															<span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
																Planilha
															</span>
														</td>
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
