"use client";

import Catalog from "@carbon/icons-react/es/Catalog";
import Search from "@carbon/icons-react/es/Search";
import { Badge } from "@crm/ui/components/badge";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { useState } from "react";

interface LensProduct {
	id: string;
	brand: string;
	name: string;
	type: "PROGRESSIVE" | "SINGLE_VISION" | "OCCUPATIONAL";
	index: "1.50" | "1.53" | "1.59" | "1.60" | "1.67" | "1.74";
	labCost: number;
	retailPrice: number;
	minPrice: number;
	tier: string;
}

const MOCK_LENSES: LensProduct[] = [
	{
		id: "l1",
		brand: "Personality",
		name: "Personality Master IA 360",
		type: "PROGRESSIVE",
		index: "1.67",
		labCost: 190,
		retailPrice: 1890,
		minPrice: 1390,
		tier: "Marca Própria Premium",
	},
	{
		id: "l2",
		brand: "Personality",
		name: "Personality Advanced BlueCut",
		type: "PROGRESSIVE",
		index: "1.59",
		labCost: 95,
		retailPrice: 990,
		minPrice: 750,
		tier: "Marca Própria",
	},
	{
		id: "l3",
		brand: "Essilor",
		name: "Varilux Comfort Max",
		type: "PROGRESSIVE",
		index: "1.50",
		labCost: 380,
		retailPrice: 1890,
		minPrice: 1490,
		tier: "Multifocal Tradicional",
	},
	{
		id: "l4",
		brand: "Essilor",
		name: "Varilux Physio 3.0",
		type: "PROGRESSIVE",
		index: "1.59",
		labCost: 590,
		retailPrice: 2890,
		minPrice: 2200,
		tier: "Premium",
	},
	{
		id: "l5",
		brand: "Zeiss",
		name: "Zeiss Progressive Light 3D",
		type: "PROGRESSIVE",
		index: "1.50",
		labCost: 320,
		retailPrice: 1590,
		minPrice: 1250,
		tier: "Multifocal",
	},
	{
		id: "l6",
		brand: "Zeiss",
		name: "Zeiss SmartLife Individual",
		type: "PROGRESSIVE",
		index: "1.67",
		labCost: 980,
		retailPrice: 4890,
		minPrice: 3900,
		tier: "Super Premium",
	},
	{
		id: "l7",
		brand: "Hoya",
		name: "Hoyalux Amplitude Max",
		type: "PROGRESSIVE",
		index: "1.50",
		labCost: 260,
		retailPrice: 1390,
		minPrice: 990,
		tier: "Multifocal",
	},
	{
		id: "l8",
		brand: "Hoya",
		name: "Hoyalux MyStyle V+ Individual",
		type: "PROGRESSIVE",
		index: "1.67",
		labCost: 890,
		retailPrice: 4490,
		minPrice: 3600,
		tier: "Super Premium",
	},
	{
		id: "l9",
		brand: "Essilor",
		name: "Eyezen Start (Visão Simples)",
		type: "SINGLE_VISION",
		index: "1.59",
		labCost: 140,
		retailPrice: 790,
		minPrice: 590,
		tier: "Visão Simples Avançada",
	},
];

export function OpticalCatalogView() {
	const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
	const [search, setSearch] = useState("");

	const filtered = MOCK_LENSES.filter((lens) => {
		if (selectedBrand !== "ALL" && lens.brand !== selectedBrand) return false;
		const q = search.toLowerCase();
		return (
			lens.name.toLowerCase().includes(q) ||
			lens.brand.toLowerCase().includes(q) ||
			lens.index.includes(q)
		);
	});

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Top Bar */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-bold tracking-tight">Catálogo & Tabela de Lentes</h2>
						<Badge variant="secondary" className="font-mono text-xs">
							{MOCK_LENSES.length} Lentes Cadastradas
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">
						Consulte custos de laboratório, preços sugeridos de venda e margens de lucro por fabricante.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Tabs value={selectedBrand} onValueChange={setSelectedBrand}>
						<TabsList className="h-9 gap-1 bg-muted/60 p-0.5">
							<TabsTrigger value="ALL" className="text-xs font-semibold px-3">
								Todas as Marcas
							</TabsTrigger>
							<TabsTrigger value="Personality" className="text-xs font-semibold px-3 text-primary">
								Personality (Marca Própria)
							</TabsTrigger>
							<TabsTrigger value="Essilor" className="text-xs font-semibold px-3">
								Essilor / Varilux
							</TabsTrigger>
							<TabsTrigger value="Zeiss" className="text-xs font-semibold px-3">
								Zeiss
							</TabsTrigger>
							<TabsTrigger value="Hoya" className="text-xs font-semibold px-3">
								Hoya
							</TabsTrigger>
						</TabsList>
					</Tabs>

					<div className="relative w-full sm:w-60">
						<Icon icon={Search} className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar design ou índice..."
							className="h-9 pl-8 text-xs"
						/>
					</div>
				</div>
			</div>

			{/* Tabela do Catálogo */}
			<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
								<th className="py-3 px-4 text-left">Marca / Fabricante</th>
								<th className="py-3 px-4 text-left">Design da Lente</th>
								<th className="py-3 px-4 text-center">Tipo</th>
								<th className="py-3 px-4 text-center">Índice</th>
								<th className="py-3 px-4 text-right">Custo Lab (R$)</th>
								<th className="py-3 px-4 text-right">Preço Sugerido</th>
								<th className="py-3 px-4 text-right">Piso Mínimo</th>
								<th className="py-3 px-4 text-right">Margem Bruta</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.map((lens) => {
								const margin = ((lens.retailPrice - lens.labCost) / lens.retailPrice) * 100;
								const isPersonality = lens.brand === "Personality";
								return (
									<tr key={lens.id} className="hover:bg-muted/20 transition-colors">
										<td className="py-3 px-4">
											<span className={`font-bold ${isPersonality ? "text-primary" : "text-foreground"}`}>
												{lens.brand}
											</span>
											<div className="text-[11px] text-muted-foreground">{lens.tier}</div>
										</td>
										<td className="py-3 px-4 font-semibold text-foreground">{lens.name}</td>
										<td className="py-3 px-4 text-center">
											<Badge variant="outline" className="text-[10px]">
												{lens.type}
											</Badge>
										</td>
										<td className="py-3 px-4 text-center font-mono font-bold">{lens.index}</td>
										<td className="py-3 px-4 text-right font-mono text-muted-foreground">
											R$ {lens.labCost.toFixed(2)}
										</td>
										<td className="py-3 px-4 text-right font-mono font-bold text-foreground">
											R$ {lens.retailPrice.toFixed(2)}
										</td>
										<td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
											R$ {lens.minPrice.toFixed(2)}
										</td>
										<td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
											{margin.toFixed(0)}%
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
