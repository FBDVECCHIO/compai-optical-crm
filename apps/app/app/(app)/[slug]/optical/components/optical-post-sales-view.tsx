"use client";

import { useState, useEffect, useMemo } from "react";
import Search from "@carbon/icons-react/es/Search";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import SendAlt from "@carbon/icons-react/es/SendAlt";
import CheckmarkFilled from "@carbon/icons-react/es/CheckmarkFilled";
import Phone from "@carbon/icons-react/es/Phone";
import Chat from "@carbon/icons-react/es/Chat";
import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import Tag from "@carbon/icons-react/es/Tag";
import StarFilled from "@carbon/icons-react/es/StarFilled";
import Add from "@carbon/icons-react/es/Add";
import { Badge } from "@crm/ui/components/badge";
import { Input } from "@crm/ui/components/input";
import { toast } from "sonner";
import {
	fetchPostSalesRecords,
	advancePostSalesStage,
	fetchMessageTemplates,
} from "@/lib/optical/supabase-optical";
import type { PostSalesRecord, PostSalesStage, MessageTemplateItem } from "@/lib/optical/optical-types";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

const COLUMNS: {
	stage: PostSalesStage;
	title: string;
	intervalDays: number;
	objective: string;
	badgeColor: string;
}[] = [
	{
		stage: "POS_7",
		title: "Pós 7",
		intervalDays: 7,
		objective: "Adaptação inicial, conforto e ajuste de plaquetas",
		badgeColor: "bg-blue-500",
	},
	{
		stage: "POS_30",
		title: "Pós 30",
		intervalDays: 30,
		objective: "Avaliação de uso diário e tratamentos antirreflexo",
		badgeColor: "bg-indigo-500",
	},
	{
		stage: "POS_90",
		title: "Pós 90",
		intervalDays: 90,
		objective: "Convite para higienização e revisão preventiva",
		badgeColor: "bg-purple-500",
	},
	{
		stage: "ATIVO_PROMO",
		title: "Ativo Promo",
		intervalDays: 120,
		objective: "Cliente fidelizado para novas ofertas de 2º par solar",
		badgeColor: "bg-emerald-600",
	},
];

export function OpticalPostSalesView() {
	const [records, setRecords] = useState<PostSalesRecord[]>([]);
	const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSeller, setSelectedSeller] = useState("TODOS");

	useEffect(() => {
		async function loadData() {
			setLoading(true);
			try {
				const [rec, tmpl] = await Promise.all([
					fetchPostSalesRecords(),
					fetchMessageTemplates(),
				]);
				setRecords(rec);
				setTemplates(tmpl);
			} catch (e) {
				console.warn("Erro ao carregar dados de pós-venda:", e);
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, []);

	// Filtro de registros
	const filteredRecords = useMemo(() => {
		return records.filter((r) => {
			if (selectedSeller !== "TODOS" && r.sellerName !== selectedSeller) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchName = r.patientName.toLowerCase().includes(q);
				const matchOs = r.orderNumber.toLowerCase().includes(q);
				const matchPhone = r.patientPhone.includes(q);
				return matchName || matchOs || matchPhone;
			}
			return true;
		});
	}, [records, selectedSeller, searchQuery]);

	// Lista de vendedores únicos
	const sellers = useMemo(() => {
		const set = new Set<string>();
		for (const r of records) if (r.sellerName) set.add(r.sellerName);
		return Array.from(set);
	}, [records]);

	// Avanço de coluna
	const handleAdvance = async (record: PostSalesRecord) => {
		const stageOrder: PostSalesStage[] = ["POS_7", "POS_30", "POS_90", "ATIVO_PROMO"];
		const currentIdx = stageOrder.indexOf(record.currentStage);
		if (currentIdx >= 0 && currentIdx < stageOrder.length - 1) {
			const next = stageOrder[currentIdx + 1];
			if (!next) return;
			const nextCol = COLUMNS[currentIdx + 1];
			const nextTitle = nextCol ? nextCol.title : next;
			const updated = await advancePostSalesStage(
				record.id,
				next,
				`Contato realizado com sucesso em ${new Date().toLocaleDateString("pt-BR")}`
			);
			setRecords(updated);
			toast.success(
				`${record.patientName} avançado para o estágio ${nextTitle}!`
			);
		} else {
			toast.info(`${record.patientName} já está em Ativo Promo (estágio máximo).`);
		}
	};

	// Disparo de mensagem no WhatsApp com o template correspondente
	const getWhatsAppLink = (record: PostSalesRecord) => {
		const rawPhone = record.patientPhone.replace(/\D/g, "");
		const cleanPhone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;

		// Procura template específico da fase
		const template = templates.find((t) => t.tipo === record.currentStage);
		let messageText = "";

		if (template) {
			messageText = template.texto
				.replace(/\{\{cliente\}\}/g, record.patientName)
				.replace(/\{\{loja\}\}/g, record.storeName)
				.replace(/\{\{os\}\}/g, record.orderNumber)
				.replace(/\{\{lente\}\}/g, "novas lentes oftálmicas")
				.replace(/\{\{saldo\}\}/g, "");
		} else {
			if (record.currentStage === "POS_7") {
				messageText = `Olá, ${record.patientName}! Aqui é da ${record.storeName}. Passando para saber como está a adaptação aos seus novos óculos da OS ${record.orderNumber}? O conforto visual e apoio nasal estão 100%?`;
			} else if (record.currentStage === "POS_30") {
				messageText = `Olá, ${record.patientName}! Daqui a pouco completa 1 mês que você retirou seus óculos na ${record.storeName}. Como tem sido sua experiência no dia a dia?`;
			} else if (record.currentStage === "POS_90") {
				messageText = `Olá, ${record.patientName}! Gostaríamos de convidá-lo para uma revisão preventiva e higienização ultrassônica cortesia dos seus óculos na ${record.storeName}.`;
			} else {
				messageText = `Olá, ${record.patientName}! Temos uma condição exclusiva para você na ${record.storeName}: bônus especial para confecção do seu 2º par solar graduado!`;
			}
		}

		return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
	};

	return (
		<div className="space-y-6">
			{/* Cabeçalho */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
						<span>Gestão de Pós-Venda</span>
						<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
							Experiência do Consumidor
						</span>
					</h2>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Acompanhamento nos intervalos de 7, 30 e 90 dias com transição progressiva para Ativo Promo.
					</p>
				</div>

				{/* Barra de Busca e Filtro de Vendedor */}
				<div className="flex flex-wrap items-center gap-2">
					<div className="relative min-w-[200px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
						<Input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Buscar cliente, OS ou telefone..."
							className="pl-9 h-9 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl"
						/>
					</div>

					<select
						value={selectedSeller}
						onChange={(e) => setSelectedSeller(e.target.value)}
						className="h-9 px-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300"
					>
						<option value="TODOS">Todos os Vendedores</option>
						{sellers.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Grid das 4 Colunas da Jornada de Pós-Venda */}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
				{COLUMNS.map((col) => {
					const colRecords = filteredRecords.filter((r) => r.currentStage === col.stage);

					return (
						<div
							key={col.stage}
							className="flex flex-col rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3 shadow-xs space-y-3 min-h-[500px]"
						>
							{/* Cabeçalho da Coluna */}
							<div className="flex items-start justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
								<div>
									<div className="flex items-center gap-2">
										<span className={`size-2.5 rounded-full ${col.badgeColor}`} />
										<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
											{col.title}
										</h3>
									</div>
									<p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
										{col.objective}
									</p>
								</div>
								<Badge variant="secondary" className="text-xs font-bold shrink-0">
									{colRecords.length}
								</Badge>
							</div>

							{/* Lista de Cards da Coluna */}
							<div className="space-y-3 flex-1 overflow-y-auto">
								{colRecords.length === 0 ? (
									<div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
										Nenhum cliente nesta fase.
									</div>
								) : (
									colRecords.map((item) => {
										const waLink = getWhatsAppLink(item);
										const daysSinceDelivery = Math.floor(
											(Date.now() - new Date(item.deliveredAt).getTime()) / 86400000
										);

										return (
											<MnocxCard key={item.id} padding="sm" className="space-y-2.5">
												{/* Cabeçalho do Card */}
												<div className="flex items-start justify-between gap-2">
													<div>
														<h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
															{item.patientName}
														</h4>
														<p className="text-[10px] text-zinc-400">
															OS #{item.orderNumber} · {item.storeName}
														</p>
													</div>
													<span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
														{daysSinceDelivery}d atrás
													</span>
												</div>

												{/* Informações de Vendedor e Contatos */}
												<div className="text-[11px] text-zinc-500 space-y-0.5">
													<div className="flex justify-between">
														<span>Vendedor:</span>
														<span className="font-medium text-zinc-700 dark:text-zinc-300">
															{item.sellerName}
														</span>
													</div>
													<div className="flex justify-between">
														<span>Contatos feitos:</span>
														<span className="font-semibold text-zinc-800 dark:text-zinc-200">
															{item.contactCount}x
														</span>
													</div>
													{item.lastContactAt && (
														<div className="flex justify-between text-[10px] text-zinc-400">
															<span>Último contato:</span>
															<span>
																{new Date(item.lastContactAt).toLocaleDateString("pt-BR")}
															</span>
														</div>
													)}
												</div>

												{/* Notas */}
												{item.notes && (
													<p className="text-[11px] p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 italic">
														"{item.notes}"
													</p>
												)}

												{/* Botões de Ação */}
												<div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
													<a
														href={waLink}
														target="_blank"
														rel="noreferrer"
														className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs"
													>
														<SendAlt className="size-3.5" />
														<span>WhatsApp</span>
													</a>

													{col.stage !== "ATIVO_PROMO" ? (
														<MnocxButton
															size="sm"
															variant="primary"
															onClick={() => handleAdvance(item)}
															icon={ArrowRight}
														>
															Avançar
														</MnocxButton>
													) : (
														<span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
															<CheckmarkFilled className="size-3.5" />
															Fidelizado
														</span>
													)}
												</div>
											</MnocxCard>
										);
									})
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
