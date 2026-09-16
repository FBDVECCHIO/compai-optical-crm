"use client";

import { useState, useEffect, useMemo } from "react";
import Search from "@carbon/icons-react/es/Search";
import Add from "@carbon/icons-react/es/Add";
import Upload from "@carbon/icons-react/es/Upload";
import Package from "@carbon/icons-react/es/Package";
import Sun from "@carbon/icons-react/es/Sun";
import Money from "@carbon/icons-react/es/Money";
import Close from "@carbon/icons-react/es/Close";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Catalog from "@carbon/icons-react/es/Catalog";
import Glasses from "@crm/ui/components/icons/glasses";
import {
	FrameCatalogItem,
	FrameCategory,
} from "@/lib/optical/optical-types";
import {
	fetchFrameCatalog,
	saveFrameCatalogItem,
	importFrameCatalogBatch,
} from "@/lib/optical/supabase-optical";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

export function OpticalFramesCatalogView() {
	const [frames, setFrames] = useState<FrameCatalogItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedType, setSelectedType] = useState<string>("ALL");
	const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
	const [stockFilter, setStockFilter] = useState<string>("ALL");

	// Modais
	const [isNewModalOpen, setIsNewModalOpen] = useState(false);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<FrameCatalogItem | null>(null);

	// Formulário Manual
	const [formTipo, setFormTipo] = useState<FrameCategory>("RECEITUARIO");
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
		const data = await fetchFrameCatalog();
		setFrames(data);
		setIsLoading(false);
	};

	useEffect(() => {
		loadData();
	}, []);

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
				item.produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.familia.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.fabricante.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType =
				selectedType === "ALL" || item.tipo === selectedType;
			const matchesBrand =
				selectedBrand === "ALL" || item.marca === selectedBrand;

			let matchesStock = true;
			if (stockFilter === "LOW") matchesStock = item.estoque > 0 && item.estoque <= 2;
			else if (stockFilter === "ZERO") matchesStock = item.estoque === 0;
			else if (stockFilter === "AVAILABLE") matchesStock = item.estoque > 0;

			return matchesQuery && matchesType && matchesBrand && matchesStock;
		});
	}, [frames, searchQuery, selectedType, selectedBrand, stockFilter]);

	const handleOpenNew = () => {
		setEditingItem(null);
		setFormTipo("RECEITUARIO");
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
		setFormTipo(item.tipo);
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
		const itemToSave: FrameCatalogItem = {
			id: editingItem ? editingItem.id : `frame_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
			tipo: formTipo,
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
		};

		const updated = await saveFrameCatalogItem(itemToSave);
		setFrames(updated);
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
			const parsed: FrameCatalogItem[] = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (!line || !line.trim() || line.trim().startsWith("#")) continue;

				let parts = line.split("\t");
				if (parts.length < 4) parts = line.split(";");
				if (parts.length < 4) parts = line.split(",");

				if (parts.length >= 3) {
					const rawTipo = (parts[0] || "RECEITUARIO").trim().toUpperCase();
					let validTipo: FrameCategory = "RECEITUARIO";
					if (rawTipo.includes("SOL")) validTipo = "SOLAR";
					else if (rawTipo.includes("CLIP")) validTipo = "CLIP_ON";

					const familia = (parts[1] || "Geral").trim();
					const produto = (parts[2] || `Peça ${i + 1}`).trim();
					const marca = (parts[3] || "Nacional").trim();
					const fabricante = (parts[4] || marca).trim();
					const aro = (parts[5] || "52").trim();
					const ponte = (parts[6] || "18").trim();
					const p7 = parts[7];
					const p8 = parts[8];
					const p9 = parts[9];
					const preco = p7 ? parseFloat(p7.replace("R$", "").replace(",", ".").trim()) || 250 : 250;
					const estoque = p8 ? parseInt(p8.trim(), 10) || 1 : 1;
					const fotoUrl = p9 ? p9.trim() || undefined : undefined;

					parsed.push({
						id: `bframe_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
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
					});
				}
			}

			if (parsed.length === 0) {
				setBatchError("Nenhuma linha de armação válida detectada.");
			}
			setBatchPreview(parsed);
		} catch (err: any) {
			setBatchError("Erro ao interpretar texto: " + (err.message || String(err)));
		}
	};

	const handleConfirmBatch = async () => {
		if (batchPreview.length === 0) return;
		const updated = await importFrameCatalogBatch(batchPreview);
		setFrames(updated);
		setIsBatchModalOpen(false);
		setBatchText("");
		setBatchPreview([]);
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

			{/* BARRA DE FILTROS */}
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
							<option value="ALL">Todos os Tipos</option>
							<option value="RECEITUARIO">Receituário</option>
							<option value="SOLAR">Solar</option>
							<option value="CLIP_ON">Clip-On</option>
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

						{(searchQuery || selectedType !== "ALL" || selectedBrand !== "ALL" || stockFilter !== "ALL") && (
							<button
								onClick={() => {
									setSearchQuery("");
									setSelectedType("ALL");
									setSelectedBrand("ALL");
									setStockFilter("ALL");
								}}
								className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 underline"
							>
								Limpar
							</button>
						)}
					</div>
				</div>
			</MnocxCard>

			{/* GRID SKEUOMÓRFICO DE PEÇAS */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filteredFrames.length === 0 ? (
					<div className="col-span-full py-12 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900 border border-dashed rounded-2xl">
						Nenhuma peça encontrada com os filtros aplicados.
					</div>
				) : (
					filteredFrames.map((frame) => (
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

								<div className="absolute top-3 left-3">
									<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 shadow-xs backdrop-blur-xs border border-zinc-200/60 dark:border-zinc-700/60">
										{frame.tipo}
									</span>
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
									<div className="text-[11px] font-semibold tracking-wide uppercase text-zinc-400">
										{frame.marca} &bull; {frame.fabricante}
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
										className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white underline font-medium"
									>
										Editar Peça
									</button>
								</div>
							</div>
						</MnocxCard>
					))
				)}
			</div>

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
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
										Tipo *
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

			{/* MODAL: INSERÇÃO EM LOTE */}
			{isBatchModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
					<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
							<div className="flex items-center gap-2">
								<DocumentExport className="size-4 text-zinc-600" />
								<div>
									<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
										Inserção de Peças em Lote
									</h3>
									<p className="text-xs text-zinc-400">
										Cole linhas de planilha para cadastrar armações e solares em massa.
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
									Tipo | Família | Produto | Marca | Fabricante | Aro | Ponte | Preço | Estoque | FotoUrl
								</div>
								<div className="text-[10px] text-zinc-400">
									Exemplo: RECEITUARIO	Aviator	RB 3025 Dourado	Ray-Ban	Luxottica	58	14	690	4	https://...
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
										<span>Prévia da Importação ({batchPreview.length} peças identificadas)</span>
									</div>
									<div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
										<table className="w-full text-left text-[11px]">
											<thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 sticky top-0">
												<tr>
													<th className="p-2">Produto</th>
													<th className="p-2">Marca</th>
													<th className="p-2">Tipo</th>
													<th className="p-2">Aro/Ponte</th>
													<th className="p-2 text-right">Preço</th>
													<th className="p-2 text-center">Estoque</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
												{batchPreview.map((item, idx) => (
													<tr key={idx}>
														<td className="p-2 font-medium">{item.produto}</td>
														<td className="p-2">{item.marca}</td>
														<td className="p-2">{item.tipo}</td>
														<td className="p-2 font-mono">{item.tamanhoAro}/{item.tamanhoPonte}</td>
														<td className="p-2 text-right font-mono font-bold">R$ {item.preco}</td>
														<td className="p-2 text-center font-mono">{item.estoque} un</td>
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
