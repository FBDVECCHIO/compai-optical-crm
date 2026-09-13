import { db, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { focusOn } from "../lib/focus";

export default defineTool({
	description:
		"Monitor optical laboratory Service Orders (OSs) in real time. Compares the customer promised delivery date " +
		"(data prometida de entrega) against the laboratory expected delivery date (data esperada do laboratório), " +
		"calculates the risk of delay (CRITICAL, WARNING, ON_TRACK), and creates proactive alerts and AgentTasks " +
		"before the customer experiences frustration.",
	inputSchema: z.object({
		orderId: z
			.string()
			.nullable()
			.optional()
			.describe("Audit a single specific OpticalOrder ID or order number."),
		storeId: z
			.string()
			.nullable()
			.optional()
			.describe("Filter orders for a specific optical store."),
		status: z
			.enum([
				"ENVIADA_LABORATORIO",
				"EM_SURFACAGEM",
				"EM_MONTAGEM",
				"AGUARDANDO_CONFERENCIA",
				"DIGITADA",
				"CONFERIDA",
			])
			.nullable()
			.optional()
			.describe("Filter by current laboratory production status. Defaults to all active in-lab orders."),
		createAlerts: z
			.boolean()
			.default(true)
			.describe("Whether to automatically create proactive CRM Activities and AgentTasks for at-risk orders."),
		riskThreshold: z
			.enum(["ALL", "AT_RISK_ONLY", "CRITICAL_ONLY"])
			.default("ALL")
			.describe("Filter the output report by risk severity."),
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.default(20)
			.describe("Maximum number of orders to inspect."),
	}),
	async execute(input) {
		const now = new Date();

		const activeStatuses = input.status
			? [input.status]
			: [
					"ENVIADA_LABORATORIO",
					"EM_SURFACAGEM",
					"EM_MONTAGEM",
					"AGUARDANDO_CONFERENCIA",
				];

		// 1. Query Orders from Prisma
		let orders: any[] = [];
		try {
			orders = await db.opticalOrder.findMany({
				where: {
					...(input.orderId
						? {
								OR: [
									{ id: input.orderId },
									{ orderNumber: input.orderId },
									{ externalLabOrderNumber: input.orderId },
								],
							}
						: {
								status: { in: activeStatuses as any },
								...(input.storeId ? { storeId: input.storeId } : {}),
							}),
				},
				include: {
					customer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
						},
					},
					store: {
						select: {
							id: true,
							name: true,
							phone: true,
						},
					},
					lab: {
						select: {
							id: true,
							name: true,
							phone: true,
						},
					},
					seller: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
				orderBy: { promisedDeliveryDate: "asc" },
				take: input.limit,
			});
		} catch (error) {
			console.warn("[track_lab_sla] DB query warning:", error);
			return {
				audited: false as const,
				reason: "Erro ao consultar ordens de serviço no banco de dados.",
			};
		}

		if (orders.length === 0) {
			return {
				audited: true as const,
				totalMonitored: 0,
				criticalCount: 0,
				warningCount: 0,
				onTrackCount: 0,
				note: "Nenhuma ordem de serviço encontrada com os critérios fornecidos.",
				orders: [],
			};
		}

		type OrderAudit = {
			orderId: string;
			orderNumber: string;
			externalLabOrderNumber: string | null;
			customerName: string;
			customerPhone: string | null;
			storeName: string;
			labName: string;
			sellerName: string;
			status: string;
			promisedDeliveryDate: string;
			labExpectedAt: string | null;
			daysUntilPromised: number;
			daysUntilLabExpected: number | null;
			bufferDays: number | null;
			riskLevel: "CRITICAL" | "WARNING" | "ON_TRACK";
			delayReason: string | null;
			actionRequired: string;
			suggestedCustomerScript: string;
			alertCreated: boolean;
		};

		const auditedOrders: OrderAudit[] = [];
		let criticalCount = 0;
		let warningCount = 0;
		let onTrackCount = 0;

		for (const order of orders) {
			const promised = new Date(order.promisedDeliveryDate);
			const labExpected = order.labExpectedAt ? new Date(order.labExpectedAt) : null;

			const msPerDay = 1000 * 60 * 60 * 24;
			const daysUntilPromised =
				Math.round(((promised.getTime() - now.getTime()) / msPerDay) * 10) / 10;

			let daysUntilLabExpected: number | null = null;
			let bufferDays: number | null = null;

			if (labExpected) {
				daysUntilLabExpected =
					Math.round(((labExpected.getTime() - now.getTime()) / msPerDay) * 10) / 10;
				bufferDays =
					Math.round(((promised.getTime() - labExpected.getTime()) / msPerDay) * 10) / 10;
			}

			// Evaluate Risk Level
			let risk: "CRITICAL" | "WARNING" | "ON_TRACK" = "ON_TRACK";
			let delayReason: string | null = null;
			let actionRequired = "Monitoramento padrão de esteira.";
			let customerScript = "";

			const customerName = [order.customer?.firstName, order.customer?.lastName]
				.filter(Boolean)
				.join(" ");

			if (daysUntilPromised < 0) {
				risk = "CRITICAL";
				delayReason = `PRAZO EXPIRADO: A data prometida (${promised.toLocaleDateString("pt-BR")}) já venceu há ${Math.abs(daysUntilPromised)} dias e a OS ainda está em produção (${order.status}).`;
				actionRequired =
					"Cobrança imediata ao laboratório por transporte expresso. Notificação proativa ao cliente pelo gerente da loja antes que ele se desloque.";
				customerScript =
					`Olá, ${order.customer?.firstName || "Cliente"}! Tudo bem? Aqui é da ${order.store?.name}. ` +
					`Nossa equipe de controle de qualidade está finalizando a montagem dos seus óculos com todo o rigor óptico. ` +
					`Para garantir a perfeição visual, a liberação ocorrerá até ${new Date(now.getTime() + 2 * msPerDay).toLocaleDateString("pt-BR")}. Avisaremos assim que estiver pronto para retirada!`;
			} else if (bufferDays !== null && bufferDays < 0) {
				risk = "CRITICAL";
				delayReason = `ATRASO GARANTIDO: Previsão do laboratório (${labExpected?.toLocaleDateString("pt-BR")}) é POSTERIOR à data prometida ao cliente (${promised.toLocaleDateString("pt-BR")}). Déficit de ${Math.abs(bufferDays)} dias.`;
				actionRequired =
					"Solicitar antecipação urgente ao laboratório (pedido de urgência/fast-track). Alinhar nova previsão de entrega.";
				customerScript =
					`Olá, ${order.customer?.firstName || "Cliente"}! Estamos acompanhando a confecção dos seus óculos no laboratório. ` +
					`Devido ao acabamento de alta precisão das suas lentes, nossa equipe ajustou a previsão de entrega para ${labExpected?.toLocaleDateString("pt-BR")}. Estamos cuidando de cada detalhe da sua visão!`;
			} else if (labExpected && now > labExpected && order.status !== "AGUARDANDO_CONFERENCIA" && order.status !== "CONFERIDA") {
				risk = "CRITICAL";
				delayReason = `LABORATÓRIO EM ATRASO: A data prevista pelo laboratório era ${labExpected.toLocaleDateString("pt-BR")}, mas a OS permanece em ${order.status}.`;
				actionRequired = "Ligar para o expedidor do laboratório e exigir código de rastreio/malote.";
				customerScript =
					`Olá, ${order.customer?.firstName || "Cliente"}! Seus óculos estão na fase final de calibragem no laboratório. Logo mais enviaremos a confirmação para retirada!`;
			} else if (bufferDays !== null && bufferDays <= 1.0) {
				risk = "WARNING";
				delayReason = `MARGEM APERTADA: Apenas ${bufferDays} dia(s) de folga entre a chegada do laboratório e a entrega prometida. Risco em caso de falha na conferência ou logística.`;
				actionRequired =
					"Acompanhar recebimento do malote matutino e priorizar conferência no frontômetro assim que o pacote chegar.";
				customerScript = "Nenhum contato externo necessário no momento. Manter equipe interna em alerta.";
			} else if (daysUntilPromised <= 2.0 && order.status === "ENVIADA_LABORATORIO") {
				risk = "WARNING";
				delayReason = "OS ainda em status inicial ('ENVIADA_LABORATORIO') a menos de 48h da entrega ao cliente.";
				actionRequired = "Cobrar atualização de status e previsão de surfaçagem junto ao laboratório.";
				customerScript = "Acompanhar confirmação do laboratório.";
			} else {
				risk = "ON_TRACK";
				delayReason = null;
				actionRequired = "Produção dentro do cronograma normal de SLA.";
				customerScript = "Aguardar chegada na loja para envio de mensagem de pronta-retirada.";
			}

			if (risk === "CRITICAL") criticalCount++;
			else if (risk === "WARNING") warningCount++;
			else onTrackCount++;

			// Filter according to threshold
			if (input.riskThreshold === "CRITICAL_ONLY" && risk !== "CRITICAL") continue;
			if (input.riskThreshold === "AT_RISK_ONLY" && risk === "ON_TRACK") continue;

			// Proactive Alert & Task Creation
			let alertCreated = false;
			if (input.createAlerts && (risk === "CRITICAL" || risk === "WARNING")) {
				try {
					// 1. Create CRM Activity
					await db.activity.create({
						data: {
							type: "OPTICAL_LAB_STATUS_CHANGE" as any,
							subject: `[Alerta SLA - ${risk}] OS #${order.orderNumber} - Risco de atraso`,
							content:
								`Data prometida: ${promised.toLocaleDateString("pt-BR")} | Previsão lab: ${labExpected ? labExpected.toLocaleDateString("pt-BR") : "Não informada"} | Margem: ${bufferDays !== null ? bufferDays + "d" : "N/D"}. ` +
								`Motivo: ${delayReason || "Acompanhamento preventivo"}. Ação recomendada: ${actionRequired}`,
							contactId: order.customerId,
							companyId: order.storeId,
							opticalOrderId: order.id,
							authorId: order.sellerId,
						},
					});

					// 2. Schedule AgentTask for store follow-up
					await db.agentTask.create({
						data: {
							opticalOrderId: order.id,
							contactId: order.customerId,
							companyId: order.storeId,
							kind: "optical-lab-delay-alert",
							reason: `Acompanhar OS #${order.orderNumber} (${risk}): ${delayReason || actionRequired}`,
							priority: risk === "CRITICAL" ? 900 : 500,
							budget: 2,
							dueAt: now,
							payload: {
								orderNumber: order.orderNumber,
								risk,
								delayReason,
								actionRequired,
							} as Prisma.InputJsonValue,
						},
					});

					alertCreated = true;
				} catch (alertErr) {
					console.warn(`[track_lab_sla] Could not persist alert for OS ${order.orderNumber}:`, alertErr);
				}
			}

			auditedOrders.push({
				orderId: order.id,
				orderNumber: order.orderNumber,
				externalLabOrderNumber: order.externalLabOrderNumber,
				customerName,
				customerPhone: order.customer?.phone ?? null,
				storeName: order.store?.name ?? "Loja",
				labName: order.lab?.name ?? "Laboratório",
				sellerName: order.seller?.name ?? "Vendedor",
				status: order.status,
				promisedDeliveryDate: promised.toISOString().split("T")[0] as string,
				labExpectedAt: labExpected ? (labExpected.toISOString().split("T")[0] as string) : null,
				daysUntilPromised,
				daysUntilLabExpected,
				bufferDays,
				riskLevel: risk,
				delayReason,
				actionRequired,
				suggestedCustomerScript: customerScript,
				alertCreated,
			});
		}

		return {
			audited: true as const,
			totalMonitored: orders.length,
			criticalCount,
			warningCount,
			onTrackCount,
			healthIndex:
				orders.length > 0
					? Math.round(((onTrackCount + warningCount * 0.5) / orders.length) * 100)
					: 100,
			orders: auditedOrders,
		};
	},
});
