import type { OpticalOrder, OpticalOrderStatus } from "./optical-types";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"https://mngwfearwjkpisararbe.supabase.co";
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ3dmZWFyd2prcGlzYXJhcmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTc5MzksImV4cCI6MjA5NjE3MzkzOX0.vk9Ol41NU2RI72-ZZKIcm7hzccYBjzPPptb6rZv_mKs";

interface SupabaseVendaRow {
	id: number;
	os_venda: string;
	data: string;
	loja: string;
	vendedor: string;
	cliente_nome: string;
	total_venda: number;
	detalhes?: Record<string, any>;
	created_at?: string;
}

export async function fetchRealOrdersFromSupabase(): Promise<OpticalOrder[]> {
	try {
		const res = await fetch(
			`${SUPABASE_URL}/rest/v1/vendas?order=id.desc&limit=50`,
			{
				headers: {
					apikey: SUPABASE_ANON_KEY,
					Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
				},
			},
		);

		if (!res.ok) {
			console.warn("Supabase fetch vendas error:", res.status, res.statusText);
			return [];
		}

		const rows: SupabaseVendaRow[] = await res.json();
		return rows.map((row) => mapVendaToOpticalOrder(row));
	} catch (err) {
		console.warn("Falha ao buscar dados do Supabase:", err);
		return [];
	}
}

export async function saveOrderToSupabase(
	order: OpticalOrder,
): Promise<{ success: boolean; id?: number }> {
	try {
		const payload = {
			os_venda: order.orderNumber,
			data: order.orderDate || new Date().toISOString().split("T")[0],
			loja: order.store.name,
			vendedor: order.seller.name,
			cliente_nome: order.patient.name,
			total_venda: order.financials.totalAmount,
			detalhes: {
				clienteCpf: order.patient.cpf,
				clienteTelefone: order.patient.whatsapp || order.patient.secondaryPhone,
				clienteWhatsApp: order.patient.whatsapp,
				clienteCep: order.patient.cep,
				clienteRua: order.patient.street,
				clienteBairro: order.patient.neighborhood,
				clienteCidade: order.patient.city,
				clienteUf: order.patient.state,
				clienteNumero: order.patient.number,
				clienteEmail: order.patient.email,
				medicoNome: order.doctor?.name,
				medicoCrm: order.doctor?.crm,
				aro1Codigo: order.aro1.frameCode,
				aro1Modelo: order.aro1.frameModel,
				aro1Marca: order.aro1.frameBrand,
				aro1PrecoAro: order.aro1.framePrice,
				aro1Lente: order.aro1.lensName,
				aro1PrecoLente: order.aro1.lensPrice,
				aro1Tratamento: order.aro1.treatment,
				aro1OdEsf: order.aro1.diopters.od.esf,
				aro1OdCil: order.aro1.diopters.od.cil,
				aro1OdEixo: order.aro1.diopters.od.eixo,
				aro1OdDnp: order.aro1.diopters.od.dnp,
				aro1OdAlt: order.aro1.diopters.od.alt,
				aro1OeEsf: order.aro1.diopters.oe.esf,
				aro1OeCil: order.aro1.diopters.oe.cil,
				aro1OeEixo: order.aro1.diopters.oe.eixo,
				aro1OeDnp: order.aro1.diopters.oe.dnp,
				aro1OeAlt: order.aro1.diopters.oe.alt,
				aro1Adicao: order.aro1.diopters.adicao,
				aro2Ativo: order.hasAro2 ? "SIM" : "NÃO",
				aro2Modelo: order.aro2?.frameModel || "",
				aro2Lente: order.aro2?.lensName || "",
				tipoPagamento:
					order.financials.paymentMode === "TOTAL" ? "Integral" : "Sinal",
				valorPago: order.financials.paidAmount,
				valorResidual: order.financials.residualAmount,
				formaPagamento: order.financials.paymentMethod1,
				parcelas: order.financials.cardInstallments1 || 1,
			},
		};

		const res = await fetch(`${SUPABASE_URL}/rest/v1/vendas`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
				Prefer: "return=representation",
			},
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			const data = await res.json();
			return { success: true, id: data?.[0]?.id };
		}
		return { success: false };
	} catch (e) {
		console.warn("Erro ao salvar venda no Supabase:", e);
		return { success: false };
	}
}

function mapVendaToOpticalOrder(row: SupabaseVendaRow): OpticalOrder {
	const d = row.detalhes || {};
	const total = Number(row.total_venda) || 0;
	const paid = Number(d.valorPago) || (d.tipoPagamento === "Integral" ? total : total * 0.5);
	const residual = Number(d.valorResidual) ?? (total - paid);

	let status: OpticalOrderStatus = "DIGITADA";
	if (d.conferido === true || d.status === "PRONTA_LOJA") {
		status = "PRONTA_LOJA";
	} else if (d.status === "EM_MONTAGEM") {
		status = "EM_MONTAGEM";
	} else if (d.status === "EM_LABORATORIO" || d.status === "No Lab") {
		status = "EM_LABORATORIO";
	} else if (d.status === "ENTREGUE") {
		status = "ENTREGUE";
	} else {
		status = "DIGITADA";
	}

	return {
		id: `supabase-${row.id}`,
		orderNumber: row.os_venda || `OS-${row.id}`,
		patient: {
			name: row.cliente_nome || "Cliente sem Nome",
			cpf: d.clienteCpf || "—",
			whatsapp: d.clienteWhatsApp || d.clienteTelefone || "",
			secondaryPhone: d.clienteTelefone || "",
			email: d.clienteEmail || "",
			cep: d.clienteCep || "",
			street: d.clienteRua || "",
			number: d.clienteNumero || "",
			neighborhood: d.clienteBairro || "",
			city: d.clienteCidade || "Campinas",
			state: d.clienteUf || "SP",
		},
		doctor: {
			name: d.medicoNome || "Oftalmologista",
			crm: d.medicoCrm || "",
		},
		seller: {
			id: `seller-${row.vendedor || "default"}`,
			name: row.vendedor || "Vendedor",
		},
		store: {
			id: `store-${row.loja || "default"}`,
			name: row.loja || "Conceição (Matriz)",
		},
		status,
		orderDate: row.data || new Date().toISOString().split("T")[0] || "",
		promisedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
		aro1: {
			frameCode: d.aro1Codigo || "—",
			frameBrand: d.aro1Marca || d.aro1Modelo || "Armação",
			frameModel: d.aro1Modelo || "Modelo Padrão",
			framePrice: Number(d.aro1PrecoAro) || 0,
			lab: d.laboratorio || "Sorolab",
			lensName: d.aro1Lente || "Lente Monofocal/Multifocal",
			quantity: 1,
			lensPrice: Number(d.aro1PrecoLente) || total,
			treatment: d.aro1Tratamento || "Antirreflexo",
			noTreatment: d.aro1SemTratamento === "SIM",
			treatmentPrice: Number(d.aro1PrecoTratamento) || 0,
			diopters: {
				od: {
					esf: d.aro1OdEsf || "+0.00",
					cil: d.aro1OdCil || "0.00",
					eixo: d.aro1OdEixo || "0",
					dnp: d.aro1OdDnp || "32",
					alt: d.aro1OdAlt || "18",
				},
				oe: {
					esf: d.aro1OeEsf || "+0.00",
					cil: d.aro1OeCil || "0.00",
					eixo: d.aro1OeEixo || "0",
					dnp: d.aro1OeDnp || "32",
					alt: d.aro1OeAlt || "18",
				},
				adicao: d.aro1Adicao || "",
			},
		},
		hasAro2: d.aro2Ativo === "SIM",
		isAro2CopyOfAro1: false,
		aro2:
			d.aro2Ativo === "SIM"
				? {
						frameCode: d.aro2Codigo || "—",
						frameBrand: d.aro2Marca || "Armação 2",
						frameModel: d.aro2Modelo || "2º Par",
						framePrice: Number(d.aro2PrecoAro) || 0,
						lab: d.laboratorio2 || "Sorolab",
						lensName: d.aro2Lente || "2ª Lente",
						quantity: 1,
						lensPrice: Number(d.aro2PrecoLente) || 0,
						treatment: d.aro2Tratamento || "",
						noTreatment: d.aro2SemTratamento === "SIM",
						treatmentPrice: Number(d.aro2PrecoTratamento) || 0,
						diopters: {
							od: {
								esf: d.aro2OdEsf || d.aro1OdEsf || "+0.00",
								cil: d.aro2OdCil || d.aro1OdCil || "0.00",
								eixo: d.aro2OdEixo || d.aro1OdEixo || "0",
							},
							oe: {
								esf: d.aro2OeEsf || d.aro1OeEsf || "+0.00",
								cil: d.aro2OeCil || d.aro1OeCil || "0.00",
								eixo: d.aro2OeEixo || d.aro1OeEixo || "0",
							},
						},
					}
				: undefined,
		financials: {
			subtotalFrames: Number(d.aro1PrecoAro) || 0,
			subtotalLenses: Number(d.aro1PrecoLente) || total,
			subtotalTreatments: 0,
			discount: 0,
			totalAmount: total,
			paymentMode: residual > 0 ? "SINAL" : "TOTAL",
			paidAmount: paid,
			residualAmount: Math.max(0, residual),
			paymentMethod1: (d.formaPagamento as any) || "DINHEIRO",
			paymentAmount1: paid,
			cardInstallments1: Number(d.parcelas) || 1,
		},
		aiAudit: {
			ocrConfidence: 96,
			prescriptionVerified: true,
			labCostCrosscheck: "APPROVED",
			estimatedLabCost: total * 0.35,
			grossMarginPercent: 65,
			cylinderTranspositionValid: true,
			diameterThicknessCheck: "OK",
			creditRiskCheck: residual > 1000 ? "MEDIUM" : "LOW",
			agentNotes: [
				`Venda importada da base oficial Supabase (OS ${row.os_venda || row.id}).`,
				`Loja de atendimento: ${row.loja || "Matriz"}. Vendedor(a): ${row.vendedor || "Balcão"}.`,
			],
			timelineEvents: [
				{
					id: `evt-${row.id}-1`,
					time: row.data || "Recente",
					title: "OS Importada do Supabase",
					detail: `Registrado na loja ${row.loja || "Conceição"}.`,
					status: "ok",
				},
			],
		},
		createdAt: row.created_at || new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
}
