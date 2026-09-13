import { db, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { focusOn } from "../lib/focus";

export default defineTool({
	description:
		"Calculate the remaining residual balance for an optical order ready for pickup (status PRONTA_LOJA), " +
		"audit customer and payment details, and generate a cordial, frictionless WhatsApp message template with " +
		"the Pix key, breakdown of amounts paid vs remaining, and store pickup instructions.",
	inputSchema: z.object({
		orderId: z
			.string()
			.describe("The OpticalOrder ID or unique orderNumber to inspect and format notice for."),
		customPixKey: z
			.string()
			.nullable()
			.optional()
			.describe("Override Pix key for payment. Defaults to store's registered Pix key or financial key."),
		customStoreAddress: z
			.string()
			.nullable()
			.optional()
			.describe("Override store pickup address. Defaults to store's address on record."),
		customStoreHours: z
			.string()
			.nullable()
			.optional()
			.describe("Store operating hours (e.g. 'Segunda a Sexta das 09h às 19h | Sábado das 09h às 14h')."),
		tone: z
			.enum(["WARM_PREMIUM", "CONCISE_DIRECT", "FORMAL"])
			.default("WARM_PREMIUM")
			.describe("Communication tone for the WhatsApp message."),
		recordActivity: z
			.boolean()
			.default(true)
			.describe("Whether to log this notice event in CRM Activity history."),
	}),
	async execute(input) {
		// 1. Fetch Order with Relations
		let order: any = null;
		try {
			order = await db.opticalOrder.findFirst({
				where: {
					OR: [{ id: input.orderId }, { orderNumber: input.orderId }],
				},
				include: {
					customer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							phone: true,
							email: true,
						},
					},
					store: {
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
					payments: {
						select: {
							id: true,
							type: true,
							method: true,
							amount: true,
							paidAt: true,
						},
						orderBy: { paidAt: "asc" },
					},
				},
			});
		} catch (error) {
			console.warn("[format_residual_payment_notice] DB query error:", error);
		}

		if (!order) {
			return {
				formatted: false as const,
				reason: `Ordem de serviço não encontrada com identificador '${input.orderId}'. Verifique o número da OS.`,
			};
		}

		if (order.customerId) {
			focusOn({ contactId: order.customerId });
		}

		// 2. Financial Balance Audit
		const totalAmount = Number(order.totalAmount);
		const sumPayments =
			order.payments && order.payments.length > 0
				? order.payments.reduce(
						(acc: number, p: any) => acc + Number(p.amount),
						0,
					)
				: Number(order.paidAmount);

		const residualAmount = Math.max(
			0,
			Math.round((totalAmount - sumPayments) * 100) / 100,
		);
		const isFullyPaid = residualAmount <= 0.01;

		// 3. Extract Customer & Store Details
		const customerFirstName = order.customer?.firstName || "Cliente";
		const customerFullName = [order.customer?.firstName, order.customer?.lastName]
			.filter(Boolean)
			.join(" ");

		const storeName = order.store?.name || "Nossa Óptica";
		const storeAddress =
			input.customStoreAddress ||
			"nossa loja física (consulte endereço no comprovante)";
		const storeHours =
			input.customStoreHours ||
			"Segunda a Sexta das 09h às 19h | Sábado das 09h às 14h";
		const pixKey =
			input.customPixKey || "financeiro@compai-optica.com.br (Chave Pix Oficial)";

		const frameModel = order.aro1FrameModel || "Armação selecionada";
		const lensDescription =
			order.aro1LensDescription || "Lentes oftálmicas de alta precisão";

		// 4. Status Check Note
		let statusNote: string | undefined;
		if (order.status !== "PRONTA_LOJA") {
			statusNote =
				`AVISO DE ESTEIRA: A OS está atualmente em status '${order.status}', e não 'PRONTA_LOJA'. ` +
				"A mensagem foi gerada como prévia; certifique-se de que a conferência de montagem foi concluída antes do envio ao cliente.";
		}

		// 5. Generate WhatsApp Message Templates
		const formatCurrency = (val: number) =>
			val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

		let message = "";

		if (isFullyPaid) {
			if (input.tone === "CONCISE_DIRECT") {
				message =
					`Olá, ${customerFirstName}! Seus óculos da OS #${order.orderNumber} já estão prontos para retirada na ${storeName}.\n\n` +
					`• Pedido 100% quitado.\n` +
					`• Local: ${storeAddress}\n` +
					`• Horário: ${storeHours}\n\n` +
					`Aguardamos sua visita para fazer o ajuste ergonômico no rosto!`;
			} else if (input.tone === "FORMAL") {
				message =
					`Prezado(a) ${customerFullName},\n\n` +
					`Comunicamos que os seus óculos referentes à Ordem de Serviço nº ${order.orderNumber} encontram-se finalizados e disponíveis para retirada em nossa unidade ${storeName}.\n\n` +
					`Constatamos que os valores referentes ao pedido encontram-se integralmente quitados.\n\n` +
					`Endereço para retirada: ${storeAddress}\n` +
					`Horário de atendimento: ${storeHours}\n\n` +
					`Nossa equipe técnica permanece à disposição para a devida conferência e adaptação.`;
			} else {
				// WARM_PREMIUM (Default)
				message =
					`Olá, ${customerFirstName}! Que prazer trazer essa notícia: seus novos óculos ficaram prontos e já estão aqui na ${storeName}! 👓✨\n\n` +
					`Nossa equipe técnica realizou a inspeção de montagem e as suas lentes ficaram perfeitas.\n\n` +
					`📋 *Resumo da sua OS #${order.orderNumber}*:\n` +
					`• Armação: ${frameModel}\n` +
					`• Lentes: ${lensDescription}\n` +
					`• Pagamento: *100% quitado*\n\n` +
					`📍 *Onde retirar*: ${storeAddress}\n` +
					`⏰ *Horário*: ${storeHours}\n\n` +
					`💡 *Dica*: Venha com calma para ajustarmos as plaquetas e hastes com todo carinho ao seu rosto, garantindo conforto visual imediato. Estamos te esperando!`;
			}
		} else {
			// Residual Balance Pending
			if (input.tone === "CONCISE_DIRECT") {
				message =
					`Olá, ${customerFirstName}! Seus óculos da OS #${order.orderNumber} estão prontos na ${storeName}.\n\n` +
					`• Total: ${formatCurrency(totalAmount)}\n` +
					`• Sinal pago: ${formatCurrency(sumPayments)}\n` +
					`• Saldo a acertar: *${formatCurrency(residualAmount)}*\n\n` +
					`Chave Pix para agilizar: ${pixKey}\n` +
					`Local: ${storeAddress} (${storeHours}).\n\n` +
					`Aguardamos você para ajuste e retirada!`;
			} else if (input.tone === "FORMAL") {
				message =
					`Prezado(a) ${customerFullName},\n\n` +
					`Informamos que seus óculos correspondentes à Ordem de Serviço nº ${order.orderNumber} foram conferidos e já se encontram prontos para retirada na ${storeName}.\n\n` +
					`Demonstrativo financeiro:\n` +
					`• Valor total: ${formatCurrency(totalAmount)}\n` +
					`• Sinal recebido: ${formatCurrency(sumPayments)}\n` +
					`• Saldo residual a quitar: *${formatCurrency(residualAmount)}*\n\n` +
					`Caso opte por efetuar a quitação antecipada via Pix, utilize a chave: ${pixKey}.\n\n` +
					`Endereço de retirada: ${storeAddress}\n` +
					`Horário: ${storeHours}\n\n` +
					`Atenciosamente,\nEquipe ${storeName}`;
			} else {
				// WARM_PREMIUM (Default - frictionless & cordial)
				message =
					`Olá, ${customerFirstName}! Temos uma excelente notícia: seus novos óculos ficaram prontos e já estão disponíveis para retirada na ${storeName}! 👓✨\n\n` +
					`Nosso óptico responsável realizou a conferência técnica no frontômetro e a montagem ficou impecável.\n\n` +
					`📋 *Detalhes do seu pedido (OS #${order.orderNumber})*:\n` +
					`• Armação: ${frameModel}\n` +
					`• Lentes: ${lensDescription}\n` +
					`• Valor total: ${formatCurrency(totalAmount)}\n` +
					`• Sinal pago: ${formatCurrency(sumPayments)}\n` +
					`• Saldo restante para retirada: *${formatCurrency(residualAmount)}*\n\n` +
					`💡 *Comodidade no pagamento*: Para agilizar a sua liberação na loja, você pode realizar o acerto do saldo via Pix:\n` +
					`*Chave Pix*: \`${pixKey}\`\n` +
					`_(Se preferir, você também pode acertar presencialmente no ato da retirada via cartão ou dinheiro)._\n\n` +
					`📍 *Endereço de retirada*: ${storeAddress}\n` +
					`⏰ *Horário de atendimento*: ${storeHours}\n\n` +
					`💡 *Dica*: Se desejar, traga seus óculos anteriores para fazermos uma higienização ultrassônica de cortesia e venha com calma para ajustarmos as hastes perfeitamente ao seu rosto. Aguardamos sua visita!`;
			}
		}

		// 6. Record Activity in CRM
		if (input.recordActivity) {
			try {
				await db.activity.create({
					data: {
						type: "OPTICAL_RESIDUAL_REMINDER" as any,
						subject: `Aviso de retirada OS #${order.orderNumber} (${isFullyPaid ? "Quitado" : "Saldo " + formatCurrency(residualAmount)})`,
						content:
							`Mensagem WhatsApp formatada e pronta para envio.\n` +
							`Saldo residual: ${formatCurrency(residualAmount)} | Total: ${formatCurrency(totalAmount)} | Pago: ${formatCurrency(sumPayments)}.\n` +
							`Destinatário: ${customerFullName} (${order.customer?.phone || "Sem telefone"}).`,
						contactId: order.customerId,
						companyId: order.storeId,
						opticalOrderId: order.id,
						authorId: order.sellerId,
					},
				});
			} catch (actErr) {
				console.warn("[format_residual_payment_notice] Could not persist activity:", actErr);
			}
		}

		return {
			formatted: true as const,
			orderId: order.id,
			orderNumber: order.orderNumber,
			currentStatus: order.status,
			statusNote,
			customer: {
				id: order.customerId,
				name: customerFullName,
				phone: order.customer?.phone ?? null,
			},
			financials: {
				totalAmount,
				totalFormatted: formatCurrency(totalAmount),
				paidAmount: sumPayments,
				paidFormatted: formatCurrency(sumPayments),
				residualAmount,
				residualFormatted: formatCurrency(residualAmount),
				isFullyPaid,
				paymentsCount: order.payments?.length ?? 1,
			},
			pixKey,
			storeAddress,
			storeHours,
			whatsAppMessage: message,
			summary:
				`OS #${order.orderNumber} (${order.status}): Saldo ${formatCurrency(residualAmount)} sobre total ${formatCurrency(totalAmount)}. ` +
				`Template WhatsApp ${input.tone} gerado para ${customerFirstName}.`,
		};
	},
});
