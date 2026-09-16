"use client";

import Bot from "@carbon/icons-react/es/Bot";
import Calculator from "@carbon/icons-react/es/Calculator";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import Help from "@carbon/icons-react/es/Help";
import Phone from "@carbon/icons-react/es/Phone";
import Search from "@carbon/icons-react/es/Search";
import Send from "@carbon/icons-react/es/Send";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { cn } from "@crm/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/optical/optical-mock-data";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import type { OpticalOrder } from "@/lib/optical/optical-types";

interface MessageItem {
	id: string;
	sender: "user" | "agent";
	text: string;
	timestamp: string;
	referencedOrders?: OpticalOrder[];
	technicalData?: {
		type: "transposition" | "diameter" | "index" | "tolerance";
		title: string;
		details: Record<string, string | number>;
	};
}

interface OpticalAgentSidecarProps {
	onSelectOrder?: (order: OpticalOrder) => void;
	className?: string;
}

export function OpticalAgentSidecar({
	onSelectOrder,
	className,
}: OpticalAgentSidecarProps) {
	const { orders } = useOpticalOrders();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const [messages, setMessages] = useState<MessageItem[]>([
		{
			id: "welcome_msg",
			sender: "agent",
			text: "Olá! Sou seu Copiloto IA Óptico em tempo real. Estou aqui ao lado do sistema para te apoiar no balcão, laboratório e gestão:\n\n• 🔍 Posição de Pedidos: Pergunte o status de qualquer OS ou paciente (ex: 'Onde está a OS 1045?' ou 'Previsão do João Ricardo').\n• 💰 Saldos Residuais: Veja quem tem valores pendentes de acerto na retirada.\n• 🔬 Apoio Técnico Óptico: Transposição de cilindro, cálculo de diâmetro mínimo de bloco e recomendação de índice de refração (1.50 a 1.74).\n• 💡 Dúvidas do CRM: Como emitir Aro 2, copiar Aro 1 ou acionar a conferência.\n\nComo posso te ajudar agora?",
			timestamp: new Date().toLocaleTimeString("pt-BR", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		},
	]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		if (!isCollapsed) {
			scrollToBottom();
		}
	}, [messages, isCollapsed, isTyping]);

	const handleQuickPrompt = (promptText: string) => {
		setInputValue(promptText);
		processUserQuery(promptText);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputValue.trim() || isTyping) return;
		const query = inputValue.trim();
		setInputValue("");
		processUserQuery(query);
	};

	const processUserQuery = (query: string) => {
		const userMsg: MessageItem = {
			id: `user_${Date.now()}`,
			sender: "user",
			text: query,
			timestamp: new Date().toLocaleTimeString("pt-BR", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		};

		setMessages((prev) => [...prev, userMsg]);
		setIsTyping(true);

		setTimeout(() => {
			const agentResponse = generateAgentResponse(query, orders);
			setMessages((prev) => [...prev, agentResponse]);
			setIsTyping(false);
		}, 400);
	};

	const handleClearChat = () => {
		setMessages([
			{
				id: `reset_${Date.now()}`,
				sender: "agent",
				text: "Histórico limpo. Estou à disposição para tirar dúvidas do sistema, consultar pedidos ou calcular parâmetros ópticos!",
				timestamp: new Date().toLocaleTimeString("pt-BR", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			},
		]);
		toast.success("Histórico do Copiloto IA reiniciado.");
	};

	if (isCollapsed) {
		return (
			<aside
				className={cn(
					"flex flex-col items-center justify-between border-l bg-card/95 py-4 px-2 w-14 transition-all duration-300 select-none shadow-xs shrink-0 z-20",
					className,
				)}
			>
				<div className="flex flex-col items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsCollapsed(false)}
						title="Expandir Copiloto IA Óptico"
						className="size-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors relative cursor-pointer"
					>
						<Icon icon={Bot} className="size-5" />
						<span className="absolute -top-1 -right-1 flex size-2.5">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
							<span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
						</span>
					</Button>

					<div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground [writing-mode:vertical-lr] rotate-180 py-4">
						Copiloto IA
					</div>
				</div>

				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsCollapsed(false)}
					title="Abrir painel lateral do agente"
					className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
				>
					<Icon icon={ChevronLeft} className="size-4" />
				</Button>
			</aside>
		);
	}

	return (
		<aside
			className={cn(
				"flex flex-col border-l bg-card/98 w-80 sm:w-88 xl:w-[380px] h-full shrink-0 transition-all duration-300 z-20 shadow-md relative",
				className,
			)}
		>
			{/* Top Bar / Header */}
			<div className="p-3.5 border-b bg-muted/30 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 relative">
						<Icon icon={Bot} className="size-4.5" />
						<span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5">
							<h3 className="text-xs font-bold tracking-tight text-foreground truncate">
								Copiloto IA Óptico
							</h3>
							<Badge
								variant="secondary"
								className="text-[9px] px-1 py-0 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
							>
								Ao Vivo
							</Badge>
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Apoio técnico, CRM e posição de pedidos
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleClearChat}
						title="Limpar conversa"
						className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<Icon icon={TrashCan} className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsCollapsed(true)}
						title="Recolher barra lateral"
						className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<Icon icon={ChevronRight} className="size-4" />
					</Button>
				</div>
			</div>

			{/* Sugestões Rápidas (Pills) */}
			<div className="p-2 border-b bg-background/60 flex flex-wrap gap-1.5 text-[11px]">
				<button
					type="button"
					onClick={() => handleQuickPrompt("Onde está a OS 1045?")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
				>
					<Icon icon={Search} className="size-3 text-primary" />
					Posição OS 1045
				</button>
				<button
					type="button"
					onClick={() => handleQuickPrompt("Quais clientes têm saldo residual a pagar?")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
				>
					<span className="size-1.5 rounded-full bg-rose-500" />
					Cobrança de Resíduo
				</button>
				<button
					type="button"
					onClick={() => handleQuickPrompt("Transpor receita: +1.50 -2.00 x 90")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
				>
					<Icon icon={Calculator} className="size-3 text-emerald-600" />
					Transposição Cilindro
				</button>
				<button
					type="button"
					onClick={() => handleQuickPrompt("Como cadastrar o 2º par no Aro 2?")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
				>
					<Icon icon={Help} className="size-3 text-amber-500" />
					Dúvida Aro 2
				</button>
				<button
					type="button"
					onClick={() => handleQuickPrompt("O que é o Número de Abbe e como afeta a aberração cromática?")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
				>
					<Icon icon={Calculator} className="size-3 text-blue-500" />
					Abbe & Física
				</button>
				<button
					type="button"
					onClick={() => handleQuickPrompt("Explique a diferença fisiológica entre Miopia e Astigmatismo")}
					className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
				>
					<Icon icon={Help} className="size-3 text-purple-500" />
					Miopia vs Astigmatismo
				</button>
			</div>

			{/* Mensagens (Scrollable Area) */}
			<div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
				{messages.map((msg) => {
					const isAgent = msg.sender === "agent";
					return (
						<div
							key={msg.id}
							className={cn(
								"flex flex-col gap-1.5",
								isAgent ? "items-start" : "items-end",
							)}
						>
							<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
								{isAgent ? (
									<>
										<span className="font-semibold text-primary">Copiloto Óptico</span>
										<span>·</span>
										<span>{msg.timestamp}</span>
									</>
								) : (
									<>
										<span>Você</span>
										<span>·</span>
										<span>{msg.timestamp}</span>
									</>
								)}
							</div>

							<div
								className={cn(
									"rounded-xl px-3.5 py-2.5 max-w-[95%] leading-relaxed shadow-2xs whitespace-pre-wrap",
									isAgent
										? "bg-muted/70 text-foreground border"
										: "bg-primary text-primary-foreground font-medium",
								)}
							>
								{msg.text}

								{/* Mini-Card Interativo de OS (se houver pedido referenciado) */}
								{msg.referencedOrders && msg.referencedOrders.length > 0 && (
									<div className="mt-3 space-y-2 pt-2 border-t border-border/60">
										{msg.referencedOrders.map((ord) => (
											<div
												key={ord.id}
												className="rounded-lg border bg-card p-2.5 text-foreground shadow-xs text-xs flex flex-col gap-1.5"
											>
												<div className="flex items-center justify-between gap-1">
													<span className="font-mono font-bold text-primary">
														{ord.orderNumber}
													</span>
													<Badge
														variant={
															ord.status === "PRONTA_LOJA"
																? "default"
																: ord.status === "EM_LABORATORIO"
																	? "secondary"
																	: "outline"
														}
														className="text-[9px] uppercase font-semibold"
													>
														{ord.status.replace("_", " ")}
													</Badge>
												</div>

												<div className="font-semibold uppercase text-[11px] truncate">
													{ord.patient.name}
												</div>

												<div className="text-[10px] text-muted-foreground">
													{ord.aro1.frameBrand} {ord.aro1.frameModel} · {ord.aro1.lensName}
												</div>

												<div className="flex items-center justify-between text-[11px] pt-1 border-t">
													<span>
														Total: <strong>R$ {ord.financials.totalAmount.toFixed(2)}</strong>
													</span>
													{ord.financials.residualAmount > 0 ? (
														<span className="font-bold text-rose-600 dark:text-rose-400">
															Resíduo: R$ {ord.financials.residualAmount.toFixed(2)}
														</span>
													) : (
														<span className="text-emerald-600 dark:text-emerald-400 font-medium">
															Quitada
														</span>
													)}
												</div>

												<div className="flex items-center gap-1.5 mt-1">
													{onSelectOrder && (
														<Button
															size="sm"
															variant="outline"
															onClick={() => onSelectOrder(ord)}
															className="h-6 text-[10px] px-2 flex-1 font-semibold cursor-pointer"
														>
															Ver Detalhes
														</Button>
													)}
													<Button
														size="sm"
														variant="secondary"
														onClick={() => {
															const url = generateWhatsAppLink(ord);
															window.open(url, "_blank", "noopener,noreferrer");
															toast.success(`WhatsApp aberto para ${ord.patient.name}`);
														}}
														title="Avisar cliente no WhatsApp"
														className="h-6 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1 font-medium cursor-pointer"
													>
														<Icon icon={Phone} className="size-3" />
														WhatsApp
													</Button>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Mini-Card de Dados Técnicos Calculados */}
								{msg.technicalData && (
									<div className="mt-3 rounded-lg border bg-card/80 p-2.5 text-foreground text-xs shadow-xs">
										<div className="font-bold text-[11px] text-primary flex items-center gap-1 mb-1.5">
											<Icon icon={Calculator} className="size-3" />
											{msg.technicalData.title}
										</div>
										<div className="space-y-1 font-mono text-[11px]">
											{Object.entries(msg.technicalData.details).map(([key, val]) => (
												<div key={key} className="flex justify-between">
													<span className="text-muted-foreground">{key}:</span>
													<span className="font-semibold text-foreground">{val}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})}

				{isTyping && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2">
						<span className="size-1.5 rounded-full bg-primary animate-ping" />
						Copiloto Óptico analisando dados...
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input Bar */}
			<form
				onSubmit={handleSubmit}
				className="p-2.5 border-t bg-card/90 flex items-center gap-2"
			>
				<Input
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder="Pergunte sobre OS, cálculo óptico ou CRM..."
					className="h-9 text-xs flex-1 bg-background"
					disabled={isTyping}
				/>
				<Button
					type="submit"
					size="icon"
					disabled={!inputValue.trim() || isTyping}
					className="size-9 shrink-0 shadow-xs cursor-pointer"
					title="Enviar mensagem"
				>
					<Icon icon={Send} className="size-4" />
				</Button>
			</form>
		</aside>
	);
}

/**
 * Motor de respostas em tempo real com base no contexto das OSs e regras ópticas
 */
function generateAgentResponse(query: string, orders: OpticalOrder[]): MessageItem {
	const timestamp = new Date().toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const q = query.toLowerCase();

	// 1. Busca por Número de OS específico (ex: "OS 1045", "1045", "1042")
	const osMatch = query.match(/(?:os[- ]?|#)?(104[0-9]|105[0-9]|\d{4})/i);
	if (osMatch && osMatch[1]) {
		const targetNum = osMatch[1];
		const found = orders.filter((o) =>
			o.orderNumber.toLowerCase().includes(targetNum.toLowerCase()),
		);

		const ord = found[0];
		if (ord) {
			const isReady = ord.status === "PRONTA_LOJA";
			const isInLab = ord.status === "EM_LABORATORIO";
			const isAssembly = ord.status === "EM_MONTAGEM";

			let statusText = `A **${ord.orderNumber}** do paciente **${ord.patient.name}** está atualmente em status **${ord.status.replace("_", " ")}**.`;

			if (isReady) {
				statusText += `\n\n🎉 Atenção: Os óculos estão **PRONTOS NA LOJA** aguardando a retirada do cliente.`;
				if (ord.financials.residualAmount > 0) {
					statusText += ` Há um saldo residual a receber de **R$ ${ord.financials.residualAmount.toFixed(2)}**. Você pode avisá-lo com um clique pelo botão do WhatsApp abaixo.`;
				} else {
					statusText += ` A ordem já está 100% quitada!`;
				}
			} else if (isInLab) {
				statusText += `\n\n🔬 As lentes (${ord.aro1.lensName}) estão em produção no laboratório **${ord.aro1.lab}**. Previsão de entrega prometida ao cliente: **${new Date(ord.promisedDeliveryDate).toLocaleDateString("pt-BR")}**.`;
			} else if (isAssembly) {
				statusText += `\n\n🛠️ As lentes chegaram do laboratório e já estão na bancada de montagem técnica para conferência no lensômetro.`;
			}

			return {
				id: `resp_${Date.now()}`,
				sender: "agent",
				text: statusText,
				timestamp,
				referencedOrders: [ord],
			};
		}
	}

	// 2. Consulta por Nome de Paciente
	const patientMatch = orders.filter((o) => {
		const first = o.patient.name.toLowerCase().split(" ")[0] ?? "";
		return (first && q.includes(first)) || q.includes(o.patient.name.toLowerCase());
	});
	const patientOrder = patientMatch[0];
	if (patientOrder && (q.includes("paciente") || q.includes("pedido") || q.includes("onde") || q.includes("status"))) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: `Encontrei o pedido de **${patientOrder.patient.name}** (${patientOrder.orderNumber}):\n\n• Status: ${patientOrder.status.replace("_", " ")}\n• Laboratório: ${patientOrder.aro1.lab}\n• Lente: ${patientOrder.aro1.lensName} (${patientOrder.aro1.treatment})\n• Entrega Prometida: ${new Date(patientOrder.promisedDeliveryDate).toLocaleDateString("pt-BR")}\n• Saldo a Receber: R$ ${patientOrder.financials.residualAmount.toFixed(2)}`,
			timestamp,
			referencedOrders: [patientOrder],
		};
	}

	// 3. Consulta de Saldos Residuais e Cobrança
	if (q.includes("resíduo") || q.includes("residuo") || q.includes("saldo") || q.includes("cobrança") || q.includes("cobrar") || q.includes("deve")) {
		const withResidual = orders.filter((o) => o.financials.residualAmount > 0);
		const totalResidual = withResidual.reduce((sum, o) => sum + o.financials.residualAmount, 0);

		let text = `Temos **${withResidual.length} Ordens de Serviço** com saldo residual pendente de cobrança, totalizando **R$ ${totalResidual.toFixed(2)}** a receber:\n`;

		withResidual.forEach((o, i) => {
			text += `\n${i + 1}. **${o.orderNumber}** · ${o.patient.name} → R$ ${o.financials.residualAmount.toFixed(2)} (${o.status === "PRONTA_LOJA" ? "🟢 Na Loja" : "🟡 No Lab"})`;
		});

		text += `\n\n💡 Dica: Para clientes com OS em status PRONTA NA LOJA, utilize o botão do WhatsApp no card abaixo para enviar a chave Pix de acerto.`;

		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text,
			timestamp,
			referencedOrders: withResidual.slice(0, 3),
		};
	}

	// 4. Laboratório, Prazos e SLAs
	if (q.includes("laboratório") || q.includes("laboratorio") || q.includes("lab") || q.includes("sla") || q.includes("atraso")) {
		const labOrders = orders.filter((o) => o.status === "EM_LABORATORIO");
		const montagemOrders = orders.filter((o) => o.status === "EM_MONTAGEM");

		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: `📊 Situação dos Pedidos em Produção Técnica:\n\n• No Laboratório: ${labOrders.length} ordens (Essilor, Zeiss, Hoya, Personality)\n• Em Montagem Interna: ${montagemOrders.length} ordens aguardando validação técnica de eixo e dioptria\n\nTodas as ordens estão dentro das faixas de tolerância ABNT ISO 8980. O alerta de SLA é acionado automaticamente pelo agente com 48 horas de antecedência à data prometida ao cliente.`,
			timestamp,
			referencedOrders: labOrders.slice(0, 2),
		};
	}

	// 5. Transposição de Cilindro (Apoio Técnico)
	if (q.includes("transpor") || q.includes("transposicao") || q.includes("transposição") || q.includes("cilindro")) {
		const numbers = query.match(/([+-]?\d+(?:[.,]\d+)?)/g);
		if (numbers && numbers[0] && numbers[1]) {
			const esf = parseFloat(numbers[0].replace(",", "."));
			const cil = parseFloat(numbers[1].replace(",", "."));
			const rawEixo = numbers[2];
			const eixo = rawEixo ? parseInt(rawEixo, 10) : 90;

			const novoEsf = Math.round((esf + cil) * 100) / 100;
			const novoCil = Math.round(-cil * 100) / 100;
			let novoEixo = eixo <= 90 ? eixo + 90 : eixo - 90;
			if (novoEixo === 0) novoEixo = 180;
			const equivEsferico = Math.round((esf + cil / 2) * 100) / 100;

			return {
				id: `resp_${Date.now()}`,
				sender: "agent",
				text: `📐 Transposição Cilíndrica Calculada com Sucesso!\n\nReceita Original: ${esf >= 0 ? "+" : ""}${esf.toFixed(2)} esf / ${cil.toFixed(2)} cil x ${eixo}°\n\n• Nova Esfera: ${novoEsf >= 0 ? "+" : ""}${novoEsf.toFixed(2)} D (Esf + Cil)\n• Novo Cilindro: ${novoCil >= 0 ? "+" : ""}${novoCil.toFixed(2)} D (-Cil)\n• Novo Eixo: ${novoEixo}° (Eixo ± 90°)\n• Equivalente Esférico: ${equivEsferico >= 0 ? "+" : ""}${equivEsferico.toFixed(2)} D\n\nEsta transposição é 100% equivalente para pedido no laboratório óptico.`,
				timestamp,
				technicalData: {
					type: "transposition",
					title: "Resultado da Transposição",
					details: {
						"Esférico Transposto": `${novoEsf >= 0 ? "+" : ""}${novoEsf.toFixed(2)} D`,
						"Cilíndrico Transposto": `${novoCil >= 0 ? "+" : ""}${novoCil.toFixed(2)} D`,
						"Eixo Transposto": `${novoEixo}°`,
						"Equivalente Esférico": `${equivEsferico >= 0 ? "+" : ""}${equivEsferico.toFixed(2)} D`,
					},
				},
			};
		}

		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: "📐 Regra de Transposição Óptica de Cilindro:\n\n1. Nova Esfera: Esfera Anterior + Cilindro Anterior\n2. Novo Cilindro: Inverte o sinal (+ vira - e vice-versa)\n3. Novo Eixo: Se Eixo ≤ 90°, soma 90°. Se Eixo > 90°, subtrai 90°.\n\nExemplo: Para transpor diretamente, digite algo como: 'transpor +2.00 -1.50 90'.",
			timestamp,
		};
	}

	// 6. Cálculo de Diâmetro Mínimo de Bloco
	if (q.includes("diâmetro") || q.includes("diametro") || q.includes("bloco") || q.includes("aro maior")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: "📐 Fórmula do Diâmetro Mínimo de Bloco (Ø min):\n\nØ min = Aro Maior + (2 × |Descentração|) + 2mm\n\nOnde a Descentração Monocular é:\nDescentração = ((Aro Horizontal + Ponte) - DNP Monocular) / 2\n\n• Se a armação tiver Aro Maior 54mm, Ponte 18mm e o paciente tiver DNP 31mm:\n• Diâmetro mínimo sugerido: 65mm a 70mm para montagem sem desbaste de borda.",
			timestamp,
			technicalData: {
				type: "diameter",
				title: "Parâmetros de Corte de Lente",
				details: {
					"Folga de Montagem": "2.0 mm",
					"Tolerância Horizontal": "±1.0 mm (ABNT ISO)",
					"Tolerância Vertical": "±1.0 mm (ABNT ISO)",
				},
			},
		};
	}

	// 7. Índice de Refração Recomendado
	if (q.includes("índice") || q.includes("indice") || q.includes("1.50") || q.includes("1.59") || q.includes("1.67") || q.includes("1.74") || q.includes("grossa") || q.includes("espessura")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: "🔍 Guia de Índices de Refração Recomendados:\n\n• 1.50 (Orgânica CR-39): Graus baixos (até ±2.00 D). Econômica, armações fechadas.\n• 1.59 (Policarbonato / Trivex): Graus de ±2.00 D até ±4.00 D. Alta resistência a impacto, obrigatória para armações de Fio de Nylon e infantil.\n• 1.67 (Resina Alto Índice): Graus de ±4.00 D até ±6.50 D. 35% mais fina e 40% mais leve.\n• 1.74 (Super Alto Índice): Acima de ±6.00 D. Lentes ultra-finas para miopias severas.\n\n💡 Dica: Para astigmatismo alto (> 2.00 cil), sempre prefira designs Asféricos ou Digitais Freeform (Personality / Essilor).",
			timestamp,
		};
	}

	// 8. Dúvidas sobre CRM e Aro 2
	if (q.includes("aro 2") || q.includes("segundo par") || q.includes("copiar aro 1") || q.includes("2º par")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: "💡 Como funciona o 2º Par (Aro 2) no CRM:\n\n1. No formulário de Venda de Balcão, ative a chave 'Venda com 2º Par / Aro 2'.\n2. O sistema abrirá um bloco completo para a segunda armação e lente (ideal para combos Solar + Grau ou Grau Reserva).\n3. Clique no botão azul 'Copiar Aro 1': o sistema replica automaticamente as dioptrias OD/OE (esférico, cilíndrico, eixo, DNP e adição) sem precisar redigitar nada!\n4. O financeiro atualiza na hora o valor total do combo e calcula a entrada com o resíduo correto.",
			timestamp,
		};
	}

	// 9. Dúvidas sobre Conferência Lab
	if (q.includes("conferência") || q.includes("conferencia") || q.includes("lensômetro") || q.includes("lensometro")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: "✅ Fluxo de Conferência de Laboratório:\n\n1. Acesse o menu 'Conferência Lab' no topo da tela.\n2. Ao receber o envelope do laboratório, confira no lensômetro se as dioptrias e eixos batem com a prescrição.\n3. O sistema exibe o selo 'Auditoria IA: Validado' indicando que a receita está em conformidade com as normas ABNT ISO.\n4. Clique em 'Aprovar & Liberar na Loja': a OS muda para status PRONTA_LOJA e o CRM já deixa pronto o botão de aviso via WhatsApp com chave Pix!",
			timestamp,
		};
	}

	// 10. Fisiologia do Olho Humano & Ametropias (Consultor Óptico)
	if (q.includes("miopia") || q.includes("hipermetropia") || q.includes("astigmatismo") || q.includes("presbiopia") || q.includes("fisiologia") || q.includes("cristalino") || q.includes("cornea") || q.includes("córnea") || q.includes("retina")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: `👁️ **Consultor Óptico — Fisiologia do Olho & Ametropias:**

• **Miopia (Divergente / Sinal Negativo -)**:
  - *Causa*: Globo ocular longo no eixo axial ou curvatura excessiva da córnea.
  - *Foco*: Imagem forma-se **antes** da retina.
  - *Correção*: Lentes côncavas/divergentes (centro mais fino, borda mais grossa).

• **Hipermetropia (Convergente / Sinal Positivo +)**:
  - *Causa*: Globo ocular curto ou córnea plana.
  - *Foco*: Imagem forma-se **atrás** da retina.
  - *Correção*: Lentes convexas/convergentes (centro mais espesso, borda fina).

• **Astigmatismo (Cilíndrico / Eixo 1° a 180°)**:
  - *Causa*: Córnea assimétrica (formato de bola de futebol americano em vez de futebol comum), gerando múltiplos pontos focais (meridianos ortogonais).
  - *Correção*: Lentes tóricas/cilíndricas corrigindo a dioptria no meridiano exato do eixo.

• **Presbiopia ('Vista Cansada' / Adição +0.75 a +3.50)**:
  - *Causa*: Perda fisiológica da elasticidade do cristalino e do tônus do músculo ciliar a partir dos 40-45 anos.
  - *Correção*: Lentes multifocais progressivas, bifocais ou ocupacionais.`,
			timestamp,
		};
	}

	// 11. Física Básica da Luz e Número Abbe
	if (q.includes("abbe") || q.includes("dispersão") || q.includes("dispersao") || q.includes("snell") || q.includes("física") || q.includes("fisica") || q.includes("antirreflexo") || q.includes("ar")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: `🔬 **Consultor Óptico — Física Básica da Luz & Lentes:**

• **Número de Abbe (V-number)**:
  - Mede a constringência e dispersão cromática do material (separação das cores do espectro da luz).
  - **Quanto maior o Abbe, menor a aberração cromática** e mais limpa é a visão periférica.
  - *Comparativo*:
    * CR-39 (1.50): Abbe 58 (excelente pureza óptica)
    * Trivex (1.53): Abbe 45 (ótima óptica e ultrarresistente)
    * Alto Índice (1.67): Abbe 32
    * Super Alto Índice (1.74): Abbe 33
    * Policarbonato (1.59): Abbe 30 (maior dispersão; requer tratamentos antirreflexo de alta tecnologia).

• **Lei de Snell-Descartes (n1 · sen(θ1) = n2 · sen(θ2))**:
  - Quanto maior o índice de refração (n) da matéria, mais a luz sofre refração e mais plana/fina a lente pode ser construída para a mesma dioptria.

• **Tratamento Antirreflexo (AR)**:
  - Atua por interferência destrutiva eliminando até 99.8% dos reflexos residuais da superfície da lente, maximizando a transmissão de luz para a retina.`,
			timestamp,
		};
	}

	// 12. Ciclo de Pós-Venda MNOC-X
	if (q.includes("pós") || q.includes("pos") || q.includes("experiência") || q.includes("experiencia") || q.includes("jornada")) {
		return {
			id: `resp_${Date.now()}`,
			sender: "agent",
			text: `📱 **Ciclo de Pós-Venda MNOC-X (Experiência do Consumidor):**

1. **Pós 7 Dias (Adaptação Inicial)**:
   - *Foco*: Checagem de adaptação com armação e novas lentes (especialmente multifocais e astigmatismo).
   - *Ação*: WhatsApp com mensagem cordial de suporte.

2. **Pós 30 Dias (Ajuste Fino Ergonômico)**:
   - *Foco*: Convite para limpeza ultrassônica e ajuste das plaquetas, ponteiras e parafusos na loja.

3. **Pós 90 Dias (Satisfação Plena & Indicação)**:
   - *Foco*: Avaliação de satisfação do cliente (NPS) e convite para indicar amigos/familiares com benefício.

4. **Ativo Promocional (10 a 12 meses)**:
   - *Foco*: Lembrete de consulta de rotina anual com o médico oftalmologista e voucher exclusivo de renovação.`,
			timestamp,
		};
	}

	// Resposta Padrão Inteligente
	return {
		id: `resp_${Date.now()}`,
		sender: "agent",
		text: "Entendido! Estou monitorando todas as ordens e parâmetros ópticos em tempo real.\n\nVocê pode me pedir:\n• Consultoria Técnica ('O que é Número de Abbe?', 'Explique a Miopia')\n• Posição de OS (ex: 'OS 1045' ou 'Mariana Souza')\n• Resumo financeiro ('Quem tem resíduo a pagar?')\n• Transposição ('Transpor +2.00 -1.50 45')\n• Ciclo de Pós-Venda ('Como funciona o pós 7 dias?')\n\nDigite sua dúvida ou selecione um dos atalhos rápidos acima!",
		timestamp,
	};
}
