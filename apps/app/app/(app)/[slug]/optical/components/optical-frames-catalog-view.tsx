"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Search from "@carbon/icons-react/es/Search";
import Add from "@carbon/icons-react/es/Add";
import Upload from "@carbon/icons-react/es/Upload";
import Package from "@carbon/icons-react/es/Package";
import Sun from "@carbon/icons-react/es/Sun";
import Money from "@carbon/icons-react/es/Money";
import Close from "@carbon/icons-react/es/Close";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Download from "@carbon/icons-react/es/Download";
import Catalog from "@carbon/icons-react/es/Catalog";
import Table from "@carbon/icons-react/es/Table";
import Grid from "@carbon/icons-react/es/Grid";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import MagicWand from "@carbon/icons-react/es/MagicWand";
import { toast } from "sonner";
import Glasses from "@crm/ui/components/icons/glasses";
import {
	FrameCatalogItem,
	FrameCategory,
	FrameTypeItem,
} from "@/lib/optical/optical-types";
import {
	fetchFrameCatalog,
	saveFrameCatalogItem,
	importFrameCatalogBatch,
	fetchSupabaseFrameTypes,
} from "@/lib/optical/supabase-optical";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";
import { Badge } from "@crm/ui/components/badge";
import {
	generateUniqueProductCode,
	validateProductCodeUniqueness,
	batchProcessProductCodes,
	resolveCategoryPrefix,
} from "@/lib/optical/product-code-engine";

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

export function OpticalFramesCatalogView() {
	const [frames, setFrames] = useState<FrameCatalogItem[]>([]);
	const [frameTypes, setFrameTypes] = useState<FrameTypeItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedType, setSelectedType] = useState<string>("ALL");
	const [selectedFrameType, setSelectedFrameType] = useState<string>("ALL");
	const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
	const [stockFilter, setStockFilter] = useState<string>("ALL");

	// Visualização e Paginação
	const [viewMode, setViewMode] = useState<"table" | "cards">("table");
	const [pageSize, setPageSize] = useState<number>(10);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Modais
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<FrameCatalogItem | null>(null);

	// Formulário Manual com Código Mandatório ("CPF do Produto")
	const [formCodigo, setFormCodigo] = useState("");
	const [formTipo, setFormTipo] = useState<FrameCategory>("RECEITUARIO");
	const [formTipoArmacao, setFormTipoArmacao] = useState<string>("Metal");
	const [formFamilia, setFormFamilia] = useState("");
	const [formProduto, setFormProduto] = useState("");
	const [formMarca, setFormMarca] = useState("");
	const [formFabricante, setFormFabricante] = useState("");
	const [formAro, setFormAro] = useState("52");
	const [formPonte, setFormPonte] = useState("18");
	const [formFotoUrl, setFormFotoUrl] = useState("");
	const [formEstoque, setFormEstoque] = useState<number>(5);
	const [formPreco, setFormPreco] = useState<number>(380);

	// Lote
	const [batchText, setBatchText] = useState("");
	const [batchError, setBatchError] = useState<string | null>(null);
	const [batchPreview, setBatchPreview] = useState<FrameCatalogItem[]>([]);

	const loadData = async () => {
		setIsLoading(true);
		const [catalogData, typesData] = await Promise.all([
			fetchFrameCatalog(),
			fetchSupabaseFrameTypes(),
		]);
		setFrames(catalogData);
		setFrameTypes(typesData);
		setIsLoading(false);
	};

	useEffect(() => {
		loadData();
	}, []);

	// Reseta página ao alterar filtros
	useEffect(() => {
		setCurrentPage(1);
	}, [searchQuery, selectedType, selectedFrameType, selectedBrand, stockFilter]);

	const brands = useMemo(() => {
		const set = new Set<string>();
		for (const f of frames) {
			if (f.marca) set.add(f.marca);
		}
		return Array.from(set).sort();
	}, [frames]);

	const filteredFrames = useMemo(() => {
		return frames.filter((item) => {
			const matchesQuery =
				!searchQuery ||
				(item.codigo && item.codigo.toLowerCase().includes(searchQuery.toLowerCase())) ||
				item.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.familia.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.fabricante.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType =
				selectedType === "ALL" || item.tipo === selectedType;
			const matchesFrameType =
				selectedFrameType === "ALL" || item.tipoArmacao === selectedFrameType;
			const matchesBrand =
				selectedBrand === "ALL" || item.marca === selectedBrand;

			let matchesStock = true;
			if (stockFilter === "LOW") matchesStock = item.estoque > 0 && item.estoque <= 2;
			else if (stockFilter === "ZERO") matchesStock = item.estoque === 0;
			else if (stockFilter === "AVAILABLE") matchesStock = item.estoque > 0;

			return matchesQuery && matchesType && matchesFrameType && matchesBrand && matchesStock;
		});
	}, [frames, searchQuery, selectedType, selectedFrameType, selectedBrand, stockFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredFrames.length / pageSize));
	const paginatedFrames = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredFrames.slice(start, start + pageSize);
	}, [filteredFrames, currentPage, pageSize]);

	const handleOpenNew = () => {
		setEditingItem(null);
		const prefix = formTipo === "SOLAR" ? "SOL" : "ARM";
		const autoCode = generateUniqueProductCode(prefix, frames.map((f) => f.codigo));
		setFormCodigo(autoCode);
		setFormTipo("RECEITUARIO");
		setFormTipoArmacao(frameTypes.find((t) => t.ativo)?.nome || "Metal");
		setFormFamilia("");
		setFormProduto("");
		setFormMarca("Ray-Ban");
		setFormFabricante("Luxottica");
		setFormAro("52");
		setFormPonte("18");
		setFormFotoUrl("");
		setFormEstoque(5);
		setFormPreco(480);
		setIsNewModalOpen(true);
	};

	const handleOpenEdit = (item: FrameCatalogItem) => {
		setEditingItem(item);
		setFormCodigo(item.codigo || "");
		setFormTipo(item.tipo);
		setFormTipoArmacao(item.tipoArmacao || frameTypes.find((t) => t.ativo)?.nome || "Metal");
		setFormFamilia(item.familia);
		setFormProduto(item.produto);
		setFormMarca(item.marca);
		setFormFabricante(item.fabricante);
		setFormAro(item.tamanhoAro);
		setFormPonte(item.tamanhoPonte);
		setFormFotoUrl(item.fotoUrl || "");
		setFormEstoque(item.estoque);
		setFormPreco(item.preco);
		setIsNewModalOpen(true);
	};

	const handleSaveManual = async (e: React.FormEvent) => {
		e.preventDefault();
		const validation = validateProductCodeUniqueness(
			formCodigo,
			frames.map((f) => f.codigo),
			editingItem?.codigo
		);
		if (!validation.isValid) {
			toast.error(validation.error);
			return;
		}

		const itemToSave: FrameCatalogItem = {
			id: editingItem ? editingItem.id : `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			codigo: validation.normalizedCode,
			tipo: formTipo,
			tipoArmacao: formTipoArmacao,
			familia: formFamilia.trim(),
			produto: formProduto.trim(),
			marca: formMarca.trim(),
			fabricante: formFabricante.trim(),
			tamanhoAro: formAro.trim(),
			tamanhoPonte: formPonte.trim(),
			fotoUrl: formFotoUrl.trim() || undefined,
			estoque: Number(formEstoque) || 0,
			preco: Number(formPreco) || 0,
			ativo: true,
			origem: editingItem?.origem || "SISTEMA",
		};

		const updated = await saveFrameCatalogItem(itemToSave);
		setFrames(updated);
		setIsNewModalOpen(false);
		toast.success(editingItem ? "Peça atualizada com sucesso!" : "Peça cadastrada via Sistema!");
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
			const parsed: FrameCatalogItem[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || !line.trim() || line.trim().startsWith("#")) continue;

				// Pular linha de cabeçalho
				const lower = line.toLowerCase();
				if (
					i === 0 &&
					(lower.includes("tipo") || lower.includes("produto") || lower.includes("marca") || lower.includes("família") || lower.includes("familia"))
				) {
					continue;
				}

				const parts = parseDelimitedLine(line);

				if (parts.length >= 3) {
					let providedCode = "";
					let rawTipo = "";
					let familia = "";
					let produto = "";
					let marca = "";
					let fabricante = "";
					let aro = "52";
					let ponte = "18";
					let pPriceIdx = 7;
					let pStockIdx = 8;
					let pFotoIdx = 9;

					const part0Upper = (parts[0] || "").trim().toUpperCase();
					const part1Upper = (parts[1] || "").trim().toUpperCase();
					const isPart0Type = part0Upper.includes("RECEIT") || part0Upper.includes("SOLAR") || part0Upper.includes("CLIP");
					const isPart1Type = part1Upper.includes("RECEIT") || part1Upper.includes("SOLAR") || part1Upper.includes("CLIP");

					if (!isPart0Type && isPart1Type) {
						// Formato com Código: Código;Tipo;Família;Produto;Marca;Fabricante;Aro;Ponte;Preço;Estoque;Foto URL
						providedCode = (parts[0] || "").trim().toUpperCase();
						rawTipo = part1Upper;
						familia = (parts[2] || "Geral").trim();
						produto = (parts[3] || `Peça ${i + 1}`).trim();
						marca = (parts[4] || "Nacional").trim();
						fabricante = (parts[5] || marca).trim();
						aro = (parts[6] || "52").trim();
						ponte = (parts[7] || "18").trim();
						pPriceIdx = 8;
						pStockIdx = 9;
						pFotoIdx = 10;
					} else {
						// Formato sem Código: Tipo;Família;Produto;Marca;Fabricante;Aro;Ponte;Preço;Estoque;Foto URL
						rawTipo = part0Upper || "RECEITUARIO";
						familia = (parts[1] || "Geral").trim();
						produto = (parts[2] || `Peça ${i + 1}`).trim();
						marca = (parts[3] || "Nacional").trim();
						fabricante = (parts[4] || marca).trim();
						aro = (parts[5] || "52").trim();
						ponte = (parts[6] || "18").trim();
						pPriceIdx = 7;
						pStockIdx = 8;
						pFotoIdx = 9;
					}

					let validTipo: FrameCategory = "RECEITUARIO";
					if (rawTipo.includes("SOL")) validTipo = "SOLAR";
					else if (rawTipo.includes("CLIP")) validTipo = "CLIP_ON";

					let preco = 250;
					let estoque = 1;
					let fotoUrl: string | undefined = undefined;

					const pPreco = parts[pPriceIdx];
					const pEstoque = parts[pStockIdx];
					const pFoto = parts[pFotoIdx];

					if (pPreco && pPreco.startsWith("http")) {
						fotoUrl = pPreco.trim();
						estoque = pEstoque ? parseInt(pEstoque.trim(), 10) || 1 : 1;
						preco = parseNumericField(pFoto, 250);
					} else {
						preco = parseNumericField(pPreco, 250);
						estoque = pEstoque ? parseInt(pEstoque.trim(), 10) || 1 : 1;
						fotoUrl = pFoto && pFoto.trim() ? pFoto.trim() : undefined;
					}

					parsed.push({
						id: `bframe_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
						codigo: providedCode,
						tipo: validTipo,
						familia,
						produto,
						marca,
						fabricante,
						tamanhoAro: aro,
						tamanhoPonte: ponte,
						preco,
						estoque,
						fotoUrl,
						ativo: true,
						origem: "PLANILHA",
					});
				}
			}

			const withCodes = batchProcessProductCodes(parsed, "ARM", frames.map((f) => f.codigo));
			if (withCodes.length === 0) {
				setBatchError("Nenhuma linha de armação válida detectada no arquivo ou texto.");
			}
			setBatchPreview(withCodes);
		} catch (err: any) {
			setBatchError("Erro ao interpretar texto/CSV: " + (err.message || String(err)));
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
		const updated = await importFrameCatalogBatch(batchPreview);
		setFrames(updated);
		setIsBatchModalOpen(false);
		setBatchText("");
		setBatchPreview([]);
		toast.success(`${batchPreview.length} peças importadas com origem 'PLANILHA' com sucesso!`);
	};

	const handleDownloadFrameTemplate = () => {
		const headers = "Código;Tipo;Família;Produto;Marca;Fabricante;Aro;Ponte;Preço;Estoque;Foto URL\n";
		const rows = [
			"ARM-10001;RECEITUARIO;Acetato Classic;RB5228 Wayfarer;Ray-Ban;Luxottica;53;18;790;12;https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300",
			"SOL-10001;SOLAR;Metal Aviator;RB3025 Polarized;Ray-Ban;Luxottica;58;14;950;8;https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300",
			"ARM-10002;RECEITUARIO;Titanium Tech;OAK-8025 Titanium;Oakley;Luxottica;55;17;890;5;https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=300",
			"ARM-10003;RECEITUARIO;Fashion CatEye;MK-3015 Rose Gold;Michael Kors;Marchon;52;16;720;7;https://images.unsplash.com/photo-1577803645773-f96470509666?w=300",
			"SOL-10002;SOLAR;Sport Wrap;Flak 2.0 XL Prizm;Oakley;Luxottica;59;12;820;15;https://images.unsplash.com/photo-1508296695146-257a814070b4?w=300",
		].join("\n");

		const csvContent = "\uFEFF" + headers + rows;
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", "modelo_importacao_pecas_armacoes.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success("Planilha modelo de peças (.csv) baixada com sucesso!");
	};

	const totalStockValue = frames.reduce((acc, f) => acc + f.preco * f.estoque, 0);

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
							Catálogo de Peças (Armações & Solares)
						</h1>
					</div>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
						Controle técnico e físico de armações de receituário, solares e clip-ons com dados de aro, ponte e estoque em tempo real.
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
						onClick={handleDownloadFrameTemplate}
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
						Nova Peça
					</MnocxButton>
				</div>
			</div>

			{/* KPIS SKEUOMÓRFICOS */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Total de Modelos
						</span>
						<Catalog className="size-4 text-zinc-400" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{frames.length}
						</span>
						<span className="text-[10px] text-zinc-400">cadastrados</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Peças em Estoque
						</span>
						<Package className="size-4 text-zinc-400" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{frames.reduce((acc, f) => acc + f.estoque, 0)}
						</span>
						<span className="text-[10px] text-zinc-400">unidades físicas</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Óculos Solares
						</span>
						<Sun className="size-4 text-amber-500" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-2xl font-bold text-zinc-900 dark:text-white">
							{frames.filter((f) => f.tipo === "SOLAR").length}
						</span>
						<span className="text-[10px] text-zinc-400">modelos sol</span>
					</div>
				</MnocxCard>

				<MnocxCard padding="sm">
					<div className="flex items-center justify-between">
						<span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
							Patrimônio de Estoque
						</span>
						<Money className="size-4 text-emerald-600" />
					</div>
					<div className="mt-1 flex items-baseline gap-2">
						<span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
							R$ {totalStockValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
						</span>
						<span className="text-[10px] text-zinc-400">valor de venda</span>
					</div>
				</MnocxCard>
			</div>

			{/* BARRA DE FILTROS E SELETOR DE VISUALIZAÇÃO */}
			<MnocxCard padding="sm">
				<div className="flex flex-col lg:flex-row items-center justify-between gap-3">
					<div className="relative w-full lg:w-96">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
						<input
							type="text"
							placeholder="Buscar por modelo, marca, família ou fabricante..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-500"
						/>
					</div>

					<div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
						<select
							value={selectedType}
							onChange={(e) => setSelectedType(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todas Categorias</option>
							<option value="RECEITUARIO">Receituário</option>
							<option value="SOLAR">Solar</option>
							<option value="CLIP_ON">Clip-On</option>
						</select>

						<select
							value={selectedFrameType}
							onChange={(e) => setSelectedFrameType(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todos os Tipos de Armação</option>
							{frameTypes.map((t) => (
								<option key={t.id} value={t.nome}>
									{t.nome}
								</option>
							))}
						</select>

						<select
							value={selectedBrand}
							onChange={(e) => setSelectedBrand(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todas as Marcas</option>
							{brands.map((b) => (
								<option key={b} value={b}>
									{b}
								</option>
							))}
						</select>

						<select
							value={stockFilter}
							onChange={(e) => setStockFilter(e.target.value)}
							className="text-xs py-1.5 px-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
						>
							<option value="ALL">Todo Estoque</option>
							<option value="AVAILABLE">Disponível (&gt; 0)</option>
							<option value="LOW">Estoque Baixo (&le; 2)</option>
							<option value="ZERO">Sem Estoque (0)</option>
						</select>

						{(searchQuery || selectedType !== "ALL" || selectedFrameType !== "ALL" || selectedBrand !== "ALL" || stockFilter !== "ALL") && (
							<button
								onClick={() => {
									setSearchQuery("");
									setSelectedType("ALL");
									setSelectedFrameType("ALL");
									setSelectedBrand("ALL");
									setStockFilter("ALL");
								}}
								className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 underline cursor-pointer"
							>
								Limpar
							</button>
						)}

						{/* ALTERNADOR COMPACTO TABELA / CARDS */}
						<div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700 shrink-0 ml-1">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
									viewMode === "table"
										? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold"
										: "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
								}`}
								title="Visualização em Lista / Tabela Compacta"
							>
								<Table className="size-3.5" />
								<span>Tabela</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("cards")}
								className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
									viewMode === "cards"
										? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-semibold"
										: "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
								}`}
								title="Visualização em Cards Grandes"
							>
								<Grid className="size-3.5" />
								<span>Cards</span>
							</button>
						</div>
					</div>
				</div>
			</MnocxCard>

			{/* VISUALIZAÇÃO: TABELA COMPACTA (PADRÃO) OU CARDS */}
			{viewMode === "table" ? (
				<MnocxCard padding="none">
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 font-semibold">
									<th className="py-2.5 px-3 text-left w-14">Foto</th>
									<th className="py-2.5 px-3 text-left font-mono">Código (CPF)</th>
									<th className="py-2.5 px-3 text-left">Produto / Modelo</th>
									<th className="py-2.5 px-3 text-left">Marca / Fabricante</th>
									<th className="py-2.5 px-3 text-left">Tipo</th>
									<th className="py-2.5 px-3 text-left">Aro / Ponte</th>
									<th className="py-2.5 px-3 text-left">Preço</th>
									<th className="py-2.5 px-3 text-left">Estoque</th>
									<th className="py-2.5 px-3 text-left">Origem</th>
									<th className="py-2.5 px-3 text-left">Ações</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
								{paginatedFrames.length === 0 ? (
									<tr>
										<td colSpan={10} className="py-8 text-center text-zinc-400">
											Nenhuma peça encontrada com os filtros selecionados.
										</td>
									</tr>
								) : (
									paginatedFrames.map((frame) => (
										<tr
											key={frame.id}
											className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
										>
											{/* Foto pequena e quadrada de 36x36px */}
											<td className="py-2 px-3 text-left">
												{frame.fotoUrl ? (
													<img
														src={frame.fotoUrl}
														alt={frame.produto}
														className="size-9 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white"
													/>
												) : (
													<div className="size-9 rounded-md border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 text-zinc-400">
														{frame.tipo === "SOLAR" ? (
															<Sun className="size-4 text-amber-500" />
														) : (
															<Glasses className="size-4" />
														)}
													</div>
												)}
											</td>

											{/* Código Mandatório ("CPF do Produto") */}
											<td className="py-2 px-3 text-left">
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 tracking-wider">
													{frame.codigo}
												</span>
											</td>

											{/* Produto / Modelo */}
											<td className="py-2 px-3 text-left">
												<div className="font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
													{frame.produto}
												</div>
												<div className="text-[11px] text-zinc-400 leading-tight">
													{frame.familia}
												</div>
											</td>

											{/* Marca / Fabricante */}
											<td className="py-2 px-3 text-left">
												<div className="font-medium text-zinc-800 dark:text-zinc-200 leading-tight">
													{frame.marca}
												</div>
												<div className="text-[11px] text-zinc-400 leading-tight">
													{frame.fabricante}
												</div>
											</td>

											{/* Tipo & Armação */}
											<td className="py-2 px-3 text-left">
												<div className="flex flex-col gap-1 items-start">
													<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
														{frame.tipo}
													</span>
													{frame.tipoArmacao && (
														<span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
															{frame.tipoArmacao}
														</span>
													)}
												</div>
											</td>

											{/* Aro / Ponte */}
											<td className="py-2 px-3 text-left font-mono text-zinc-800 dark:text-zinc-200">
												{frame.tamanhoAro}/{frame.tamanhoPonte} mm
											</td>

											{/* Preço */}
											<td className="py-2 px-3 text-left font-mono font-semibold text-zinc-900 dark:text-zinc-100">
												R$ {frame.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>

											{/* Estoque */}
											<td className="py-2 px-3 text-left">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
														frame.estoque === 0
															? "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
															: frame.estoque <= 2
															? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
															: "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
													}`}
												>
													{frame.estoque === 0 ? "Esgotado" : `${frame.estoque} un`}
												</span>
											</td>

											{/* Origem (Badge Planilha vs Sistema) */}
											<td className="py-2 px-3 text-left">
												{frame.origem === "PLANILHA" ? (
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

											{/* Ações */}
											<td className="py-2 px-3 text-left">
												<button
													onClick={() => handleOpenEdit(frame)}
													className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white underline font-medium cursor-pointer"
												>
													Editar
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* BARRA DE PAGINAÇÃO COMPLETA */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
						<div className="text-xs text-zinc-500 dark:text-zinc-400">
							{filteredFrames.length === 0 ? (
								"Nenhuma peça para exibir"
							) : (
								<>
									Mostrando{" "}
									<span className="font-semibold text-zinc-800 dark:text-zinc-200">
										{(currentPage - 1) * pageSize + 1}
									</span>{" "}
									a{" "}
									<span className="font-semibold text-zinc-800 dark:text-zinc-200">
										{Math.min(currentPage * pageSize, filteredFrames.length)}
									</span>{" "}
									de{" "}
									<span className="font-semibold text-zinc-800 dark:text-zinc-200">
										{filteredFrames.length}
									</span>{" "}
									peças
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
			) : (
				/* VISUALIZAÇÃO EM CARDS GRANDES COM PAGINAÇÃO */
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{paginatedFrames.length === 0 ? (
							<div className="col-span-full py-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 border border-dashed rounded-2xl">
								Nenhuma peça encontrada com os filtros aplicados.
							</div>
						) : (
							paginatedFrames.map((frame) => (
								<MnocxCard key={frame.id} padding="none" className="overflow-hidden group hover:border-zinc-400/80 transition-all">
									<div className="relative h-40 bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900/60 flex items-center justify-center p-4 border-b border-zinc-100 dark:border-zinc-800">
										{frame.fotoUrl ? (
											<img
												src={frame.fotoUrl}
												alt={frame.produto}
												className="h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform"
											/>
										) : (
											<div className="flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-600">
												{frame.tipo === "SOLAR" ? (
													<Sun className="size-16" />
												) : (
													<Glasses className="size-16" />
												)}
												<span className="text-[10px] mt-1 text-zinc-400">Foto não cadastrada</span>
											</div>
										)}

										<div className="absolute top-3 left-3 flex items-center gap-1">
											<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 shadow-xs backdrop-blur-xs border border-zinc-200/60 dark:border-zinc-700/60">
												{frame.tipo}
											</span>
											{frame.tipoArmacao && (
												<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs backdrop-blur-xs">
													{frame.tipoArmacao}
												</span>
											)}
											{frame.origem === "PLANILHA" ? (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200 shadow-xs backdrop-blur-xs">
													<span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
													Planilha
												</span>
											) : (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-200/90 text-zinc-700 border border-zinc-300 shadow-xs backdrop-blur-xs">
													<span className="size-1.5 rounded-full bg-zinc-500 shrink-0" />
													Sistema
												</span>
											)}
										</div>

										<div className="absolute top-3 right-3">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
													frame.estoque === 0
														? "bg-rose-100 text-rose-700 border border-rose-200"
														: frame.estoque <= 2
														? "bg-amber-100 text-amber-800 border border-amber-200"
														: "bg-emerald-100 text-emerald-800 border border-emerald-200"
												}`}
											>
												{frame.estoque === 0 ? "Esgotado" : `${frame.estoque} un`}
											</span>
										</div>
									</div>

									<div className="p-4 space-y-3">
										<div>
											<div className="flex items-center justify-between gap-1 mb-1">
												<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
													{frame.codigo}
												</span>
												<div className="text-[11px] font-semibold tracking-wide uppercase text-zinc-400 truncate">
													{frame.marca} &bull; {frame.fabricante}
												</div>
											</div>
											<h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
												{frame.produto}
											</h4>
											<div className="text-xs text-zinc-500 dark:text-zinc-400">
												{frame.familia}
											</div>
										</div>

										<div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
											<div className="flex items-center gap-3">
												<div>
													<span className="text-[10px] text-zinc-400 block">Aro</span>
													<span className="font-semibold text-zinc-800 dark:text-zinc-200">
														{frame.tamanhoAro} mm
													</span>
												</div>
												<div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-700" />
												<div>
													<span className="text-[10px] text-zinc-400 block">Ponte</span>
													<span className="font-semibold text-zinc-800 dark:text-zinc-200">
														{frame.tamanhoPonte} mm
													</span>
												</div>
											</div>

											<div className="text-right">
												<span className="text-[10px] text-zinc-400 block">Preço</span>
												<span className="text-sm font-bold font-mono text-zinc-950 dark:text-white">
													R$ {frame.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
												</span>
											</div>
										</div>

										<div className="flex items-center justify-end pt-1">
											<button
												onClick={() => handleOpenEdit(frame)}
												className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white underline font-medium cursor-pointer"
											>
												Editar Peça
											</button>
										</div>
									</div>
								</MnocxCard>
							))
						)}
					</div>

					{/* PAGINAÇÃO PARA MODO CARDS */}
					<MnocxCard padding="sm">
						<div className="flex flex-col sm:flex-row items-center justify-between gap-3">
							<div className="text-xs text-zinc-500 dark:text-zinc-400">
								{filteredFrames.length === 0 ? (
									"Nenhuma peça para exibir"
								) : (
									<>
										Mostrando{" "}
										<span className="font-semibold text-zinc-800 dark:text-zinc-200">
											{(currentPage - 1) * pageSize + 1}
										</span>{" "}
										a{" "}
										<span className="font-semibold text-zinc-800 dark:text-zinc-200">
											{Math.min(currentPage * pageSize, filteredFrames.length)}
										</span>{" "}
										de{" "}
										<span className="font-semibold text-zinc-800 dark:text-zinc-200">
											{filteredFrames.length}
										</span>{" "}
										peças
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
										className="py-1 px-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
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
				</div>
			)}

			{/* MODAL: NOVA PEÇA / EDITAR */}
			{isNewModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
					<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
							<div className="flex items-center gap-2">
								<Catalog className="size-4 text-zinc-600" />
								<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
									{editingItem ? "Editar Peça do Catálogo" : "Nova Peça / Armação"}
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
										<span>Código Mandatório ("CPF do Produto") *</span>
										<span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 uppercase font-semibold">
											Único & Anti-Duplicidade
										</span>
									</label>
									<button
										type="button"
										onClick={() => {
											const prefix = formTipo === "SOLAR" ? "SOL" : "ARM";
											const autoCode = generateUniqueProductCode(prefix, frames.map((f) => f.codigo));
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
									placeholder="Ex: ARM-10001 ou código de barras/SKU"
									value={formCodigo}
									onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
									className="w-full text-xs p-2 rounded-xl bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-[10px] text-blue-600 dark:text-blue-400">
									Identificador único mandatório. Não pode se repetir em nenhum produto do sistema.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Categoria *
									</label>
									<select
										value={formTipo}
										onChange={(e) => setFormTipo(e.target.value as FrameCategory)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									>
										<option value="RECEITUARIO">Receituário</option>
										<option value="SOLAR">Solar</option>
										<option value="CLIP_ON">Clip-On</option>
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Tipo de Armação *
									</label>
									<select
										value={formTipoArmacao}
										onChange={(e) => setFormTipoArmacao(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold"
									>
										{frameTypes
											.filter((t) => t.ativo)
											.map((t) => (
												<option key={t.id} value={t.nome}>
													{t.nome}
												</option>
											))}
									</select>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Marca *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Ray-Ban, Oakley, MN Prime"
										value={formMarca}
										onChange={(e) => setFormMarca(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Fabricante *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Luxottica, Marchon, Sáfilo"
										value={formFabricante}
										onChange={(e) => setFormFabricante(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Família / Coleção *
									</label>
									<input
										type="text"
										required
										placeholder="Ex: Aviator, Wayfarer, Carbon"
										value={formFamilia}
										onChange={(e) => setFormFamilia(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
									/>
								</div>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
									Nome do Produto / Modelo *
								</label>
								<input
									type="text"
									required
									placeholder="Ex: RB 3025 Aviator Classic Dourado G-15"
									value={formProduto}
									onChange={(e) => setFormProduto(e.target.value)}
									className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
								/>
							</div>

							<div className="grid grid-cols-4 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Aro (mm) *
									</label>
									<input
										type="text"
										required
										value={formAro}
										onChange={(e) => setFormAro(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-center"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Ponte (mm) *
									</label>
									<input
										type="text"
										required
										value={formPonte}
										onChange={(e) => setFormPonte(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-center"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Estoque *
									</label>
									<input
										type="number"
										required
										min="0"
										value={formEstoque}
										onChange={(e) => setFormEstoque(parseInt(e.target.value, 10) || 0)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-center font-bold"
									/>
								</div>

								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Preço (R$) *
									</label>
									<input
										type="number"
										step="0.01"
										required
										value={formPreco}
										onChange={(e) => setFormPreco(parseFloat(e.target.value) || 0)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono font-bold"
									/>
								</div>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
									URL da Foto do Modelo
								</label>
								<input
									type="url"
									placeholder="https://exemplo.com/fotos/armacao.jpg"
									value={formFotoUrl}
									onChange={(e) => setFormFotoUrl(e.target.value)}
									className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono"
								/>
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
									{editingItem ? "Salvar Alterações" : "Cadastrar Peça"}
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
										Subir Planilha / Inserção em Lote de Peças
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
											onClick={handleDownloadFrameTemplate}
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
									Tipo;Família;Produto;Marca;Fabricante;Aro;Ponte;Preço;Estoque;Foto URL
								</div>
								<div className="text-[10px] text-zinc-400">
									Exemplo: RECEITUARIO;Aviator;RB 3025 Dourado;Ray-Ban;Luxottica;58;14;690;4;https://...
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
										<span>Prévia da Importação ({batchPreview.length} peças identificadas)</span>
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
													<th className="p-2">Marca</th>
													<th className="p-2">Tipo</th>
													<th className="p-2">Aro/Ponte</th>
													<th className="p-2 text-right">Preço</th>
													<th className="p-2 text-center">Estoque</th>
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
														<td className="p-2">{item.marca}</td>
														<td className="p-2">{item.tipo}</td>
														<td className="p-2 font-mono">{item.tamanhoAro}/{item.tamanhoPonte}</td>
														<td className="p-2 text-right font-mono font-bold">R$ {item.preco}</td>
														<td className="p-2 text-center font-mono">{item.estoque} un</td>
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
									Confirmar Importação de {batchPreview.length} Peças
								</MnocxButton>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
