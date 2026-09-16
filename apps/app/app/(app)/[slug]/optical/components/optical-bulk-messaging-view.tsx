"use client";

import { useState, useEffect, useMemo } from "react";
import Phone from "@carbon/icons-react/es/Phone";
import Send from "@carbon/icons-react/es/Send";
import Edit from "@carbon/icons-react/es/Edit";
import Add from "@carbon/icons-react/es/Add";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Close from "@carbon/icons-react/es/Close";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import Warning from "@carbon/icons-react/es/Warning";
import { toast } from "sonner";
import {
	MessageTemplateItem,
	MessageTemplateType,
	OpticalOrder,
} from "@/lib/optical/optical-types";
import {
	fetchMessageTemplates,
	saveMessageTemplate,
} from "@/lib/optical/supabase-optical";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

export function OpticalBulkMessagingView() {
	const { orders } = useOpticalOrders();
	const [templates, setTemplates] = useState<MessageTemplateItem[]>([]);
	const [activeTab, setActiveTab] = useState<"DISPARO" | "TEMPLATES">("DISPARO");
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

	// Filtros do Disparo
	const [targetFilter, setTargetFilter] = useState<string>("PRONTA_LOJA");
	const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
	const [previewOrder, setPreviewOrder] = useState<OpticalOrder | null>(null);

	// Edição de Templates
	const [editingTemplate, setEditingTemplate] = useState<MessageTemplateItem | null>(null);
	const [templateFormTitle, setTemplateFormTitle] = useState("");
	const [templateFormText, setTemplateFormText] = useState("");
	const [templateFormType, setTemplateFormType] = useState<MessageTemplateType>("PRONTA_LOJA");

	useEffect(() => {
		fetchMessageTemplates().then((tpls) => {
			setTemplates(tpls);
			if (tpls.length > 0) {
				setSelectedTemplateId(tpls[0]!.id);
			}
		});
	}, []);

	const currentTemplate = useMemo(() => {
		return templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;
	}, [templates, selectedTemplateId]);

	// Filtra ordens de serviço elegíveis
	const eligibleOrders = useMemo(() => {
		return orders.filter((o) => {
			const hasPhone = Boolean(o.patient?.whatsapp || o.patient?.secondaryPhone);
			if (!hasPhone) return false;

			if (targetFilter === "PRONTA_LOJA") {
				return o.status === "PRONTA_LOJA" || o.status === "CONFERIDO";
			}
			if (targetFilter === "RESIDUO") {
				return (o.financials?.residualAmount || 0) > 0;
			}
			if (targetFilter === "ENTREGUE") {
				return o.status === "ENTREGUE";
			}
			return true;
		});
	}, [orders, targetFilter]);

	// Seleciona o primeiro da lista para prévia se ainda não houver um
	useEffect(() => {
		if (eligibleOrders.length > 0 && !previewOrder) {
			setPreviewOrder(eligibleOrders[0]!);
		}
	}, [eligibleOrders, previewOrder]);

	// Interpolação de variáveis
	const interpolate = (text: string, order: OpticalOrder | null) => {
		if (!order) return text;
		const residual = order.financials?.residualAmount || 0;
		const formattedSaldo = `R$ ${residual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

		return text
			.replace(/{{cliente}}/g, order.patient.name)
			.replace(/{{os}}/g, order.orderNumber)
			.replace(/{{loja}}/g, order.store?.name || "Nossa Loja")
			.replace(/{{vendedor}}/g, order.seller?.name || "Consultor Óptico")
			.replace(/{{saldo}}/g, formattedSaldo)
			.replace(/{{lente}}/g, order.aro1?.lensName || "Lentes Oftálmicas");
	};

	const toggleSelectOrder = (id: string) => {
		setSelectedOrders((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
		);
	};

	const toggleSelectAll = () => {
		if (selectedOrders.length === eligibleOrders.length) {
			setSelectedOrders([]);
		} else {
			setSelectedOrders(eligibleOrders.map((o) => o.id));
		}
	};

	const getWhatsAppUrl = (order: OpticalOrder) => {
		if (!currentTemplate) return "#";
		const phone = (order.patient.whatsapp || order.patient.secondaryPhone || "").replace(/\D/g, "");
		const cleanPhone = phone.startsWith("55") ? phone : `55${phone}`;
		const msg = interpolate(currentTemplate.texto, order);
		return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
	};

	const handleOpenTemplateEdit = (tpl: MessageTemplateItem) => {
		setEditingTemplate(tpl);
		setTemplateFormTitle(tpl.titulo);
		setTemplateFormText(tpl.texto);
		setTemplateFormType(tpl.tipo);
		setActiveTab("TEMPLATES");
	};

	const handleSaveTemplateForm = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTemplate) return;

		const updatedItem: MessageTemplateItem = {
			...editingTemplate,
			titulo: templateFormTitle.trim(),
			texto: templateFormText.trim(),
			tipo: templateFormType,
		};

		const updated = await saveMessageTemplate(updatedItem);
		setTemplates(updated);
		setEditingTemplate(null);
		toast.success("Template atualizado com sucesso!");
	};

	const insertTagIntoForm = (tag: string) => {
		setTemplateFormText((prev) => `${prev} ${tag} `);
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
							Mensagens Padrão & Envio em Massa
						</h1>
					</div>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
						Comunicação automatizada para WhatsApp com templates inteligentes de pós-venda, aviso de retirada de óculos e cobrança de saldo residual.
					</p>
				</div>

				{/* NAVEGAÇÃO DE ABAS */}
				<div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700">
					<button
						onClick={() => setActiveTab("DISPARO")}
						className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
							activeTab === "DISPARO"
								? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
						}`}
					>
						Central de Disparo
					</button>
					<button
						onClick={() => setActiveTab("TEMPLATES")}
						className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
							activeTab === "TEMPLATES"
								? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
						}`}
					>
						Gerenciar Modelos ({templates.length})
					</button>
				</div>
			</div>

			{activeTab === "DISPARO" && (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
					{/* COLUNA ESQUERDA: LISTA DE DESTINATÁRIOS */}
					<div className="lg:col-span-7 space-y-4">
						{/* SELETOR DE TEMPLATE E FILTROS */}
						<MnocxCard padding="sm">
							<div className="space-y-3">
								<div>
									<label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
										1. Selecione o Modelo de Mensagem
									</label>
									<select
										value={selectedTemplateId}
										onChange={(e) => setSelectedTemplateId(e.target.value)}
										className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
									>
										{templates.map((tpl) => (
											<option key={tpl.id} value={tpl.id}>
												[{tpl.tipo}] {tpl.titulo}
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
									<div className="flex items-center gap-2">
										<span className="text-[11px] text-zinc-500 font-medium">Filtrar por:</span>
										<select
											value={targetFilter}
											onChange={(e) => setTargetFilter(e.target.value)}
											className="text-xs py-1 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
										>
											<option value="PRONTA_LOJA">Pronto na Loja (Retirada)</option>
											<option value="RESIDUO">Com Saldo Residual Pendente</option>
											<option value="ENTREGUE">Entregues (Pós-Venda)</option>
											<option value="TODOS">Todos com Telefone Cadastrado</option>
										</select>
									</div>

									<button
										onClick={toggleSelectAll}
										className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 underline font-medium"
									>
										{selectedOrders.length === eligibleOrders.length ? "Desmarcar Todos" : "Selecionar Todos"}
									</button>
								</div>
							</div>
						</MnocxCard>

						{/* LISTA DE PACIENTES */}
						<MnocxCard padding="none">
							<div className="p-3 bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
								<span className="font-semibold text-zinc-700 dark:text-zinc-300">
									Destinatários Elegíveis ({eligibleOrders.length})
								</span>
								<span className="text-zinc-400 text-[11px]">
									{selectedOrders.length} selecionados para envio
								</span>
							</div>

							<div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[440px] overflow-y-auto">
								{eligibleOrders.length === 0 ? (
									<div className="p-8 text-center text-xs text-zinc-400">
										Nenhuma OS com telefone encontrada para o filtro atual.
									</div>
								) : (
									eligibleOrders.map((ord) => {
										const isSelected = selectedOrders.includes(ord.id);
										const isCurrentPreview = previewOrder?.id === ord.id;
										const phone = ord.patient.whatsapp || ord.patient.secondaryPhone;

										return (
											<div
												key={ord.id}
												onClick={() => setPreviewOrder(ord)}
												className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
													isCurrentPreview
														? "bg-zinc-100/80 dark:bg-zinc-800/60 border-l-2 border-zinc-900 dark:border-zinc-100"
														: "hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
												}`}
											>
												<div className="flex items-center gap-3 min-w-0">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={(e) => {
															e.stopPropagation();
															toggleSelectOrder(ord.id);
														}}
														className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-600 size-4 cursor-pointer"
													/>
													<div className="truncate">
														<div className="flex items-center gap-2">
															<span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
																{ord.patient.name}
															</span>
															<span className="text-[10px] font-mono text-zinc-400">
																#{ord.orderNumber}
															</span>
														</div>
														<div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
															<span className="font-mono text-emerald-600 font-medium">
																{phone}
															</span>
															<span>&bull;</span>
															<span>{ord.store?.name}</span>
															{ord.financials.residualAmount > 0 && (
																<>
																	<span>&bull;</span>
																	<span className="text-amber-600 font-bold">
																		Saldo: R$ {ord.financials.residualAmount.toFixed(2)}
																	</span>
																</>
															)}
														</div>
													</div>
												</div>

												<div className="shrink-0 flex items-center gap-2">
													<a
														href={getWhatsAppUrl(ord)}
														target="_blank"
														rel="noopener noreferrer"
														onClick={(e) => e.stopPropagation()}
														className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
													>
														<Phone className="size-3.5" />
														<span>Enviar</span>
													</a>
												</div>
											</div>
										);
									})
								)}
							</div>
						</MnocxCard>
					</div>

					{/* COLUNA DIREITA: PRÉVIA DO WHATSAPP */}
					<div className="lg:col-span-5 space-y-4">
						<MnocxCard padding="md" className="sticky top-6">
							<div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
								<div>
									<h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
										Prévia no WhatsApp
									</h3>
									<p className="text-[10px] text-zinc-400">
										Visualização com dados dinâmicos reais do paciente
									</p>
								</div>
								{previewOrder && (
									<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
										OS #{previewOrder.orderNumber}
									</span>
								)}
							</div>

							{/* SIMULADOR DE CHAT WHATSAPP */}
							<div className="mt-4 rounded-2xl bg-[#0b141a] p-4 text-white shadow-inner min-h-[280px] flex flex-col justify-between border border-zinc-800">
								<div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
									<div className="size-8 rounded-full bg-[#128c7e] flex items-center justify-center font-bold text-xs text-white">
										{previewOrder ? previewOrder.patient.name.charAt(0) : "C"}
									</div>
									<div className="truncate">
										<div className="text-xs font-semibold truncate text-white">
											{previewOrder ? previewOrder.patient.name : "Selecione um cliente"}
										</div>
										<div className="text-[10px] text-zinc-400 font-mono">
											{previewOrder ? previewOrder.patient.whatsapp : "WhatsApp"}
										</div>
									</div>
								</div>

								{/* BALÃO DA MENSAGEM */}
								<div className="my-4">
									<div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tr-none text-xs leading-relaxed max-w-[90%] ml-auto shadow-md">
										<p className="whitespace-pre-wrap">
											{currentTemplate
												? interpolate(currentTemplate.texto, previewOrder)
												: "Nenhum modelo de mensagem selecionado."}
										</p>
										<div className="text-[9px] text-zinc-300 text-right mt-1 font-mono">
											{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
										</div>
									</div>
								</div>

								{/* BOTÃO DE ENVIO RÁPIDO DO WHATSAPP */}
								<div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
									<span className="text-[10px] text-zinc-400">
										{previewOrder ? "Pronto para disparar" : "Aguardando seleção"}
									</span>

									{previewOrder && (
										<a
											href={getWhatsAppUrl(previewOrder)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#25d366] text-zinc-950 hover:bg-[#20bd5a] transition-colors"
										>
											<Phone className="size-3.5" />
											<span>Abrir no WhatsApp Web</span>
										</a>
									)}
								</div>
							</div>

							{/* BOTÃO DE ENVIO EM MASSA / DISPARO SEQUENCIAL */}
							<div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
								<MnocxButton
									variant="primary"
									size="md"
									className="w-full"
									icon={Send}
									disabled={selectedOrders.length === 0}
									onClick={() => {
										toast.success(
											`Iniciando fila de disparo para ${selectedOrders.length} clientes selecionados!`
										);
										// Abre o primeiro da seleção imediatamente
										const first = eligibleOrders.find((o) => o.id === selectedOrders[0]);
										if (first) {
											window.open(getWhatsAppUrl(first), "_blank");
										}
									}}
								>
									Disparar para os {selectedOrders.length} Selecionados
								</MnocxButton>
							</div>
						</MnocxCard>
					</div>
				</div>
			)}

			{/* ABA DE MODELOS / TEMPLATES */}
			{activeTab === "TEMPLATES" && (
				<div className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{templates.map((tpl) => (
							<MnocxCard key={tpl.id} padding="md" className="flex flex-col justify-between">
								<div className="space-y-2.5">
									<div className="flex items-start justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
										<div>
											<span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
												{tpl.tipo}
											</span>
											<h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
												{tpl.titulo}
											</h4>
										</div>
										<button
											onClick={() => handleOpenTemplateEdit(tpl)}
											className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
										>
											<Edit className="size-4" />
										</button>
									</div>

									<p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-5">
										{tpl.texto}
									</p>
								</div>

								<div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-4 flex items-center justify-between">
									<span className="text-[10px] text-zinc-400">
										Variáveis: {tpl.variaveis?.join(", ") || "{{cliente}}, {{os}}"}
									</span>
									<button
										onClick={() => handleOpenTemplateEdit(tpl)}
										className="text-xs text-zinc-700 dark:text-zinc-300 hover:underline font-medium"
									>
										Editar
									</button>
								</div>
							</MnocxCard>
						))}
					</div>

					{/* MODAL / FORMULÁRIO DE EDIÇÃO DE TEMPLATE */}
					{editingTemplate && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
							<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
								<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
									<div className="flex items-center gap-2">
										<Edit className="size-4 text-zinc-600" />
										<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
											Editar Modelo de Mensagem
										</h3>
									</div>
									<button
										onClick={() => setEditingTemplate(null)}
										className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
									>
										<Close className="size-4" />
									</button>
								</div>

								<form onSubmit={handleSaveTemplateForm} className="p-5 space-y-4">
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
												Título do Modelo *
											</label>
											<input
												type="text"
												required
												value={templateFormTitle}
												onChange={(e) => setTemplateFormTitle(e.target.value)}
												className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
											/>
										</div>

										<div>
											<label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
												Finalidade / Tipo *
											</label>
											<select
												value={templateFormType}
												onChange={(e) => setTemplateFormType(e.target.value as MessageTemplateType)}
												className="w-full text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
											>
												<option value="PRONTA_LOJA">Óculos Pronto (Retirada)</option>
												<option value="POS_7">Pós-Venda 7 Dias</option>
												<option value="POS_30">Pós-Venda 30 Dias</option>
												<option value="POS_90">Pós-Venda 90 Dias</option>
												<option value="ATIVO_PROMO">Ativo Promocional</option>
												<option value="COBRANCA_RESIDUAL">Cobrança de Saldo Residual</option>
												<option value="GERAL">Geral</option>
											</select>
										</div>
									</div>

									<div>
										<div className="flex items-center justify-between mb-1">
											<label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
												Texto da Mensagem *
											</label>
											<span className="text-[10px] text-zinc-400">
												Clique em uma tag para inserir:
											</span>
										</div>

										{/* TAGS INSERÍVEIS */}
										<div className="flex flex-wrap gap-1.5 mb-2">
											{["{{cliente}}", "{{os}}", "{{loja}}", "{{saldo}}", "{{vendedor}}", "{{lente}}"].map((tag) => (
												<button
													key={tag}
													type="button"
													onClick={() => insertTagIntoForm(tag)}
													className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200"
												>
													+ {tag}
												</button>
											))}
										</div>

										<textarea
											rows={6}
											required
											value={templateFormText}
											onChange={(e) => setTemplateFormText(e.target.value)}
											className="w-full text-xs p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500 leading-relaxed"
										/>
									</div>

									<div className="flex items-center justify-end gap-2 pt-2">
										<MnocxButton
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setEditingTemplate(null)}
										>
											Cancelar
										</MnocxButton>
										<MnocxButton type="submit" variant="primary" size="sm">
											Salvar Modelo
										</MnocxButton>
									</div>
								</form>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
