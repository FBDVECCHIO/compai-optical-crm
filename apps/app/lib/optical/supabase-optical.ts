import type { OpticalOrder, OpticalOrderStatus } from "./optical-types";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"https://mngwfearwjkpisararbe.supabase.co";
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ3dmZWFyd2prcGlzYXJhcmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTc5MzksImV4cCI6MjA5NjE3MzkzOX0.vk9Ol41NU2RI72-ZZKIcm7hzccYBjzPPptb6rZv_mKs";

const defaultHeaders = {
	apikey: SUPABASE_ANON_KEY,
	Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export interface StoreItem {
	id: number;
	nome: string;
}

export interface LabItem {
	id: number;
	nome: string;
	slaDias?: number;
}

export interface SellerItem {
	id: number;
	nome: string;
	loja?: string;
}

export interface RepItem {
	id: number;
	nome: string;
}

export interface DoctorItem {
	id?: number | string;
	nome: string;
	crm: string;
	representante?: string;
}

export interface ClinicItem {
	id?: number | string;
	nome: string;
	cidade?: string;
	representante?: string;
}

export interface TechnicianItem {
	nome: string;
	whatsapp: string;
	calendlyUrl: string;
}

export interface WarrantyItem {
	id?: number;
	os: string;
	loja: string;
	vendedor: string;
	cliente_nome: string;
	data: string;
	motivo: string;
	custo_adicional: number;
	detalhes?: Record<string, any>;
}

export interface CommissionSettings {
	medicoPerc: number;
	repMetaVolume: number;
	repPercAbaixo: number;
	repPercAcima: number;
	vendedorPerc: number;
	gerentePerc: number;
	lojaPerc: number;
}

export interface OpticalTolerances {
	sphericalTolerance: number;
	cylindricalTolerance: number;
	axisToleranceHigh: number;
	axisToleranceLow: number;
	dnpTolerance: number;
	heightTolerance: number;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// 1. ORDENS DE SERVIÇO / VENDAS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRealOrdersFromSupabase(): Promise<OpticalOrder[]> {
	try {
		const res = await fetch(
			`${SUPABASE_URL}/rest/v1/vendas?order=id.desc&limit=60`,
			{ headers: defaultHeaders },
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
				...defaultHeaders,
				"Content-Type": "application/json",
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOJAS / FILIAIS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseStores(): Promise<StoreItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/lojas?order=id.asc`, {
			headers: defaultHeaders,
		});
		if (res.ok) return await res.json();
	} catch (e) {
		console.warn("Erro ao carregar lojas do Supabase:", e);
	}
	return [
		{ id: 1, nome: "Conceição (Matriz)" },
		{ id: 2, nome: "MN Nova Campinas" },
		{ id: 3, nome: "MN Dpedro" },
		{ id: 4, nome: "Qualy Vsion" },
		{ id: 5, nome: "Di Capri" },
	];
}

export async function createSupabaseStore(nome: string): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/lojas`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify({ nome }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function deleteSupabaseStore(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/lojas?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LABORATÓRIOS PARCEIROS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseLabs(): Promise<LabItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/laboratorios?order=id.asc`, {
			headers: defaultHeaders,
		});
		if (res.ok) {
			const rows = await res.json();
			return rows.map((r: any) => ({
				id: r.id,
				nome: r.nome,
				slaDias: r.sla_dias || 5,
			}));
		}
	} catch (e) {
		console.warn("Erro ao carregar laboratorios do Supabase:", e);
	}
	return [
		{ id: 13, nome: "Sorolab", slaDias: 4 },
		{ id: 14, nome: "Alex LP", slaDias: 3 },
		{ id: 15, nome: "Visionex", slaDias: 5 },
		{ id: 16, nome: "Zeiss", slaDias: 6 },
		{ id: 17, nome: "Hoya", slaDias: 5 },
		{ id: 18, nome: "Essilor", slaDias: 5 },
	];
}

export async function createSupabaseLab(nome: string, slaDias = 5): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/laboratorios`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify({ nome, sla_dias: slaDias }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function deleteSupabaseLab(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/laboratorios?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VENDEDORES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseSellers(): Promise<SellerItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/vendedores?order=id.asc`, {
			headers: defaultHeaders,
		});
		if (res.ok) return await res.json();
	} catch (e) {
		console.warn("Erro ao carregar vendedores:", e);
	}
	return [
		{ id: 1, nome: "Fabio Del Vecchio", loja: "Conceição (Matriz)" },
		{ id: 2, nome: "Paloma", loja: "MN Nova Campinas" },
		{ id: 3, nome: "Fabiano", loja: "MN Dpedro" },
		{ id: 4, nome: "Andreza", loja: "Qualy Vsion" },
		{ id: 5, nome: "Demetrius", loja: "Conceição (Matriz)" },
	];
}

export async function createSupabaseSeller(nome: string, loja?: string): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/vendedores`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify({ nome, loja }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function deleteSupabaseSeller(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/vendedores?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REPRESENTANTES MÉDICOS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseReps(): Promise<RepItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/representantes?order=id.asc`, {
			headers: defaultHeaders,
		});
		if (res.ok) return await res.json();
	} catch (e) {
		console.warn("Erro ao carregar representantes:", e);
	}
	return [
		{ id: 1, nome: "Juliana Representante" },
		{ id: 2, nome: "Marcos Consultor" },
	];
}

export async function createSupabaseRep(nome: string): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/representantes`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify({ nome }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function deleteSupabaseRep(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/representantes?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONFIG SETTINGS (CHAVE/VALOR NO SUPABASE)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchConfigSetting<T = any>(key: string, defaultValue: T): Promise<T> {
	try {
		const res = await fetch(
			`${SUPABASE_URL}/rest/v1/config_settings?key=eq.${encodeURIComponent(key)}`,
			{ headers: defaultHeaders },
		);
		if (res.ok) {
			const data = await res.json();
			if (data && data.length > 0) {
				const raw = data[0].value;
				try {
					return JSON.parse(raw);
				} catch {
					return raw as unknown as T;
				}
			}
		}
	} catch (e) {
		console.warn(`Erro ao carregar config ${key}:`, e);
	}
	return defaultValue;
}

export async function saveConfigSetting(key: string, value: any): Promise<boolean> {
	try {
		const strValue = typeof value === "string" ? value : JSON.stringify(value);
		const check = await fetch(
			`${SUPABASE_URL}/rest/v1/config_settings?key=eq.${encodeURIComponent(key)}`,
			{ headers: defaultHeaders },
		);
		const exists = check.ok ? (await check.json()).length > 0 : false;

		if (exists) {
			const patchRes = await fetch(
				`${SUPABASE_URL}/rest/v1/config_settings?key=eq.${encodeURIComponent(key)}`,
				{
					method: "PATCH",
					headers: { ...defaultHeaders, "Content-Type": "application/json" },
					body: JSON.stringify({ value: strValue }),
				},
			);
			return patchRes.ok;
		}

		const postRes = await fetch(`${SUPABASE_URL}/rest/v1/config_settings`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify({ key, value: strValue }),
		});
		return postRes.ok;
	} catch (e) {
		console.warn(`Erro ao gravar config ${key}:`, e);
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MÉDICOS, CLÍNICAS & TÉCNICOS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseDoctors(): Promise<DoctorItem[]> {
	return await fetchConfigSetting<DoctorItem[]>("medicos", [
		{ nome: "Dr. Thiago de Souza Queiroz", crm: "151798/SP", representante: "Juliana Representante" },
		{ nome: "Dra. Camila Ribeiro", crm: "162400/SP", representante: "Marcos Consultor" },
		{ nome: "Dr. Roberto Mendonça", crm: "144920/SP", representante: "Juliana Representante" },
	]);
}

export async function saveSupabaseDoctors(doctors: DoctorItem[]): Promise<boolean> {
	return await saveConfigSetting("medicos", doctors);
}

export async function fetchSupabaseClinics(): Promise<ClinicItem[]> {
	return await fetchConfigSetting<ClinicItem[]>("clinicas", [
		{ nome: "Clínica Olhar Certo", cidade: "Campinas", representante: "Juliana Representante" },
		{ nome: "Hospital de Olhos Campinas", cidade: "Campinas", representante: "Marcos Consultor" },
		{ nome: "Instituto da Visão", cidade: "Valinhos", representante: "Juliana Representante" },
	]);
}

export async function saveSupabaseClinics(clinics: ClinicItem[]): Promise<boolean> {
	return await saveConfigSetting("clinicas", clinics);
}

export async function fetchSupabaseTechnicians(): Promise<TechnicianItem[]> {
	return await fetchConfigSetting<TechnicianItem[]>("tecnicos", [
		{
			nome: "Fabio Del Vecchio",
			whatsapp: "19971113013",
			calendlyUrl: "https://calendly.com/fbdv1202",
		},
	]);
}

export async function saveSupabaseTechnicians(tecnicos: TechnicianItem[]): Promise<boolean> {
	return await saveConfigSetting("tecnicos", tecnicos);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. COMISSÕES, FORMAS DE PAGAMENTO E PARÂMETROS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COMMISSIONS: CommissionSettings = {
	medicoPerc: 10,
	repMetaVolume: 50000,
	repPercAbaixo: 3,
	repPercAcima: 5,
	vendedorPerc: 4,
	gerentePerc: 2,
	lojaPerc: 1.5,
};

export async function fetchCommissionSettings(): Promise<CommissionSettings> {
	return await fetchConfigSetting<CommissionSettings>("comissaoParams", DEFAULT_COMMISSIONS);
}

export async function saveCommissionSettings(settings: CommissionSettings): Promise<boolean> {
	return await saveConfigSetting("comissaoParams", settings);
}

export async function fetchPaymentMethods(): Promise<string[]> {
	return await fetchConfigSetting<string[]>("formasPagamento", [
		"Dinheiro",
		"Pix",
		"Cartão de Crédito",
		"Cartão de Débito",
		"Crediário",
		"Depósito/Transferência",
	]);
}

export async function savePaymentMethods(methods: string[]): Promise<boolean> {
	return await saveConfigSetting("formasPagamento", methods);
}

export const DEFAULT_TOLERANCES: OpticalTolerances = {
	sphericalTolerance: 0.12,
	cylindricalTolerance: 0.12,
	axisToleranceHigh: 2,
	axisToleranceLow: 5,
	dnpTolerance: 1.0,
	heightTolerance: 1.0,
};

export async function fetchOpticalTolerances(): Promise<OpticalTolerances> {
	return await fetchConfigSetting<OpticalTolerances>("opticalTolerances", DEFAULT_TOLERANCES);
}

export async function saveOpticalTolerances(tol: OpticalTolerances): Promise<boolean> {
	return await saveConfigSetting("opticalTolerances", tol);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. GARANTIAS & OCORRÊNCIAS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseWarranties(): Promise<WarrantyItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?order=id.desc&limit=50`, {
			headers: defaultHeaders,
		});
		if (res.ok) return await res.json();
	} catch (e) {
		console.warn("Erro ao buscar ocorrencias no Supabase:", e);
	}
	return [
		{
			id: 1,
			os: "1045A",
			loja: "Conceição (Matriz)",
			vendedor: "Flavia",
			cliente_nome: "MARIA SOUZA DE OLIVEIRA",
			data: "2026-09-10",
			motivo: "Erro de Dioptria / Não Adaptação",
			custo_adicional: 180,
			detalhes: { lab: "Essilor", tipo: "Garantia Fabricante" },
		},
	];
}

export async function createSupabaseWarranty(item: Omit<WarrantyItem, "id">): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify(item),
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPEADOR INTERNO DE VENDA SUPABASE -> OPTICAL ORDER
// ─────────────────────────────────────────────────────────────────────────────

function mapVendaToOpticalOrder(row: SupabaseVendaRow): OpticalOrder {
	const d = row.detalhes || {};
	const total = Number(row.total_venda) || 0;
	const paid = Number(d.valorPago) || (d.tipoPagamento === "Integral" ? total : total * 0.5);
	const residual = Number(d.valorResidual) ?? Math.max(0, total - paid);

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

// ─────────────────────────────────────────────────────────────────────────────
// 12. OCORRÊNCIAS, GARANTIAS & ASSISTÊNCIA TÉCNICA
// ─────────────────────────────────────────────────────────────────────────────

export interface OcorrenciaDetalhes {
	lab?: string;
	lente?: string;
	precoLente?: number;
	semTratamento?: boolean;
	tratamento?: string;
	precoTratamento?: number;
	qtdd?: number;
	obs?: string;
	bonificacao?: boolean;
	cortesia?: boolean;
	beneficioObs?: string;
	labOriginal?: string;
	lenteOriginal?: string;
	precoLenteOriginal?: number;
	tratamentoOriginal?: string;
	precoTratamentoOriginal?: number;
	custoOriginalTotal?: number;
}

export interface OcorrenciaItem {
	id?: number;
	os: string;
	loja: string;
	vendedor: string;
	cliente_nome: string;
	data: string;
	motivo: string;
	custo_adicional: number;
	detalhes: string | OcorrenciaDetalhes;
	created_at?: string;
}

export async function fetchSupabaseOcorrencias(): Promise<OcorrenciaItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?order=data.desc,id.desc`, {
			headers: defaultHeaders,
		});
		if (res.ok) {
			const rows = await res.json();
			return rows.map((r: any) => ({
				id: r.id,
				os: r.os || "",
				loja: r.loja || "",
				vendedor: r.vendedor || "",
				cliente_nome: r.cliente_nome || "",
				data: r.data || "",
				motivo: r.motivo || "",
				custo_adicional: Number(r.custo_adicional) || 0,
				detalhes: typeof r.detalhes === "string" ? r.detalhes : JSON.stringify(r.detalhes || {}),
				created_at: r.created_at,
			}));
		}
	} catch (e) {
		console.warn("Erro ao buscar ocorrências no Supabase:", e);
	}
	return [];
}

export async function saveSupabaseOcorrencia(record: OcorrenciaItem): Promise<boolean> {
	try {
		const payload = {
			os: record.os || "",
			loja: record.loja || "",
			vendedor: record.vendedor || "",
			cliente_nome: record.cliente_nome || "",
			data: record.data,
			motivo: record.motivo || "",
			custo_adicional: Number(record.custo_adicional) || 0.0,
			detalhes: typeof record.detalhes === "object" ? JSON.stringify(record.detalhes) : (record.detalhes || "{}"),
		};

		if (record.id) {
			const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?id=eq.${record.id}`, {
				method: "PATCH",
				headers: { ...defaultHeaders, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			return res.ok;
		} else {
			const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias`, {
				method: "POST",
				headers: { ...defaultHeaders, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			return res.ok;
		}
	} catch (e) {
		console.error("Erro ao salvar ocorrência no Supabase:", e);
		return false;
	}
}

export async function deleteSupabaseOcorrencia(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch (e) {
		console.error("Erro ao excluir ocorrência no Supabase:", e);
		return false;
	}
}

export async function deleteSupabaseOcorrenciasBulk(ids: number[]): Promise<boolean> {
	if (!ids || ids.length === 0) return true;
	try {
		const idsStr = ids.join(",");
		const res = await fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?id=in.(${idsStr})`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch (e) {
		console.error("Erro ao excluir ocorrências em massa no Supabase:", e);
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. CONTROLE DE ACESSO, AUTENTICAÇÃO E USUÁRIOS (SUPABASE)
// ─────────────────────────────────────────────────────────────────────────────

export interface OpticalUserPermissions {
	balcao: boolean;
	conferencia: boolean;
	log_vendas: boolean;
	resumo: boolean;
	visita_medica: boolean;
	medicos: boolean;
	garantias: boolean;
	auditoria: boolean;
	catalogo: boolean;
	config: boolean;
}

export interface OpticalUserSession {
	id: number;
	usuario: string;
	nome: string;
	loja: string;
	isAdmin: boolean;
	permissions: OpticalUserPermissions;
	authenticatedAt: string;
}

export interface OpticalUserRecord {
	id?: number;
	usuario: string;
	senha: string;
	nome: string;
	status: "ATIVO" | "INATIVO";
	loja: string;
	conferencia: "ATIVO" | "INATIVO";
	registros?: "ATIVO" | "INATIVO";
	dashboard: "ATIVO" | "INATIVO";
	auditoria: "ATIVO" | "INATIVO";
	configuracoes: "ATIVO" | "INATIVO";
	logs?: "ATIVO" | "INATIVO";
	venda: "ATIVO" | "INATIVO";
	log_vendas: "ATIVO" | "INATIVO";
	resumo_vendas: "ATIVO" | "INATIVO";
	medicos?: string;
}

export function decodeUserPermissions(user: OpticalUserRecord): OpticalUserPermissions {
	const isAdmin = (user.usuario || "").toLowerCase().trim() === "admin";
	if (isAdmin) {
		return {
			balcao: true,
			conferencia: true,
			log_vendas: true,
			resumo: true,
			visita_medica: true,
			medicos: true,
			garantias: true,
			auditoria: true,
			catalogo: true,
			config: true,
		};
	}

	const medStr = user.medicos || "";
	const hasMedicos =
		medStr === "ATIVO" ||
		medStr.includes("med") ||
		medStr.includes("vis");
	const hasGarantias =
		medStr === "ATIVO" ||
		medStr.includes("gar") ||
		medStr.includes("dev") ||
		medStr.includes("oco") ||
		medStr.includes("ast");

	return {
		balcao: user.venda === "ATIVO",
		conferencia: user.conferencia === "ATIVO",
		log_vendas: user.log_vendas === "ATIVO" || user.venda === "ATIVO",
		resumo: user.dashboard === "ATIVO" || user.resumo_vendas === "ATIVO",
		visita_medica: hasMedicos,
		medicos: hasMedicos,
		garantias: hasGarantias,
		auditoria: user.auditoria === "ATIVO",
		catalogo: true, // Catálogo liberado para operadores ativos
		config: user.configuracoes === "ATIVO",
	};
}

export async function authenticateOpticalUser(
	usuarioInput: string,
	senhaInput: string
): Promise<{ success: boolean; session?: OpticalUserSession; error?: string }> {
	try {
		const cleanUser = usuarioInput.trim();
		if (!cleanUser || !senhaInput) {
			return { success: false, error: "Informe usuário e senha." };
		}

		const res = await fetch(
			`${SUPABASE_URL}/rest/v1/usuarios?usuario=ilike.${encodeURIComponent(cleanUser)}&limit=1`,
			{ headers: defaultHeaders }
		);

		if (!res.ok) {
			return { success: false, error: "Erro de conexão com o banco de dados." };
		}

		const rows: OpticalUserRecord[] = await res.json();
		if (!rows || rows.length === 0) {
			return { success: false, error: "Usuário não encontrado." };
		}

		const user = rows[0];
		if (!user) {
			return { success: false, error: "Usuário não encontrado." };
		}

		if (user.senha !== senhaInput) {
			return { success: false, error: "Senha incorreta." };
		}

		if (user.status !== "ATIVO") {
			return { success: false, error: "Este usuário está desativado. Contate o administrador." };
		}

		const isAdmin = (user.usuario || "").toLowerCase().trim() === "admin";
		const permissions = decodeUserPermissions(user);

		const session: OpticalUserSession = {
			id: user.id || 0,
			usuario: user.usuario,
			nome: user.nome || user.usuario,
			loja: user.loja || "Todos",
			isAdmin,
			permissions,
			authenticatedAt: new Date().toISOString(),
		};

		return { success: true, session };
	} catch (e) {
		console.error("Erro no login óptico:", e);
		return { success: false, error: "Falha de comunicação com o servidor." };
	}
}

export async function fetchSupabaseUsers(): Promise<OpticalUserRecord[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?order=id.asc`, {
			headers: defaultHeaders,
		});
		if (res.ok) {
			return await res.json();
		}
	} catch (e) {
		console.warn("Erro ao buscar usuários no Supabase:", e);
	}
	return [];
}

export async function saveSupabaseUser(user: Partial<OpticalUserRecord>): Promise<boolean> {
	try {
		const payload = {
			usuario: user.usuario?.trim(),
			senha: user.senha,
			nome: user.nome?.trim(),
			status: user.status || "ATIVO",
			loja: user.loja || "Todos",
			conferencia: user.conferencia || "INATIVO",
			registros: user.registros || "INATIVO",
			dashboard: user.dashboard || "INATIVO",
			auditoria: user.auditoria || "INATIVO",
			configuracoes: user.configuracoes || "INATIVO",
			logs: user.logs || "INATIVO",
			venda: user.venda || "INATIVO",
			log_vendas: user.log_vendas || "INATIVO",
			resumo_vendas: user.resumo_vendas || "INATIVO",
			medicos: user.medicos || "",
		};

		if (user.id) {
			const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${user.id}`, {
				method: "PATCH",
				headers: { ...defaultHeaders, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			return res.ok;
		} else {
			const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
				method: "POST",
				headers: { ...defaultHeaders, "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			return res.ok;
		}
	} catch (e) {
		console.error("Erro ao salvar usuário no Supabase:", e);
		return false;
	}
}

export async function deleteSupabaseUser(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		return res.ok;
	} catch (e) {
		console.error("Erro ao deletar usuário no Supabase:", e);
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. CONFERÊNCIAS DE LABORATÓRIO
// ─────────────────────────────────────────────────────────────────────────────

export interface ConferenciaItem {
	id?: number;
	data: string;
	loja: string;
	osLoja: string;
	idLab: string;
	labPedido: string;
	lente: string;
	precoLente: number;
	tratamento: string;
	precoTratamento: number;
	qtyLente: number;
	semTratamento: string;
	labEfetivo: string;
	lenteEfetiva: string;
	precoLenteEfetiva: number;
	tratEfetivo: string;
	precoTratEfetivo: number;
	qtyLenteEfetiva: number;
	semTratamentoEf: string;
	confDobro: string;
	osLoja2?: string;
	idLab2?: string;
	lente2?: string;
	precoLente2?: number;
	tratamento2?: string;
	precoTratamento2?: number;
	qtyLente2?: number;
	semTratamento2?: string;
	lenteEfetiva2?: string;
	precoLenteEfetiva2?: number;
	tratEfetivo2?: string;
	precoTratEfetivo2?: number;
	qtyLenteEfetiva2?: number;
	semTratamentoEf2?: string;
	confBeneficio?: string;
	confBeneficioCodigo?: string;
	status?: "CONFERIDO" | "PENDENTE" | "OCORRENCIA";
	created_at?: string;
}

const LOCAL_CONF_KEY = "compai_optical_conferencias_cache";

export async function fetchSupabaseConferencias(): Promise<ConferenciaItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/conferencias?order=id.desc`, {
			headers: defaultHeaders,
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data) && data.length > 0) {
				return data;
			}
		}
	} catch (e) {
		console.warn("Tabela de conferências remota inacessível, usando cache local:", e);
	}

	try {
		const cached = localStorage.getItem(LOCAL_CONF_KEY);
		if (cached) return JSON.parse(cached);
	} catch {}

	return [
		{
			id: 101,
			data: new Date().toISOString().slice(0, 10),
			loja: "MN Barão",
			osLoja: "OS-8198",
			idLab: "LAB-4401",
			labPedido: "Essilor",
			lente: "Varilux Comfort Max 1.60",
			precoLente: 890.0,
			tratamento: "Crizal Sapphire",
			precoTratamento: 220.0,
			qtyLente: 1,
			semTratamento: "NÃO",
			labEfetivo: "Visionex",
			lenteEfetiva: "Personality Advance 1.60",
			precoLenteEfetiva: 410.0,
			tratEfetivo: "AR Satin Clean",
			precoTratEfetivo: 90.0,
			qtyLenteEfetiva: 1,
			semTratamentoEf: "NÃO",
			confDobro: "NÃO",
			status: "CONFERIDO",
		},
		{
			id: 102,
			data: new Date().toISOString().slice(0, 10),
			loja: "MN Nova Campinas",
			osLoja: "OS-8205",
			idLab: "LAB-4412",
			labPedido: "Hoya",
			lente: "Hoyalux ID MyStyle V+ 1.67",
			precoLente: 1450.0,
			tratamento: "LongLife BlueControl",
			precoTratamento: 280.0,
			qtyLente: 1,
			semTratamento: "NÃO",
			labEfetivo: "Hoya",
			lenteEfetiva: "Hoyalux ID MyStyle V+ 1.67",
			precoLenteEfetiva: 1450.0,
			tratEfetivo: "LongLife BlueControl",
			precoTratEfetivo: 280.0,
			qtyLenteEfetiva: 1,
			semTratamentoEf: "NÃO",
			confDobro: "SIM",
			osLoja2: "OS-8205-B",
			idLab2: "LAB-4413",
			lente2: "Hoyalux Balansis 1.60",
			precoLente2: 650.0,
			tratamento2: "LongLife",
			precoTratamento2: 180.0,
			qtyLente2: 1,
			lenteEfetiva2: "Hoyalux Balansis 1.60",
			precoLenteEfetiva2: 650.0,
			tratEfetivo2: "LongLife",
			precoTratEfetivo2: 180.0,
			qtyLenteEfetiva2: 1,
			status: "CONFERIDO",
		},
	];
}

export async function saveSupabaseConferencia(item: ConferenciaItem): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/conferencias`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify(item),
		});
		if (res.ok) return true;
	} catch (e) {
		console.warn("Erro ao salvar no Supabase, mantendo localmente:", e);
	}

	try {
		const current = await fetchSupabaseConferencias();
		const newItem = { ...item, id: item.id || Date.now() };
		const updated = [newItem, ...current.filter((c) => c.id !== newItem.id)];
		localStorage.setItem(LOCAL_CONF_KEY, JSON.stringify(updated));
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseConferencia(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/conferencias?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		if (res.ok) return true;
	} catch (e) {
		console.warn("Erro ao deletar conferencia no Supabase:", e);
	}

	try {
		const current = await fetchSupabaseConferencias();
		const updated = current.filter((c) => c.id !== id);
		localStorage.setItem(LOCAL_CONF_KEY, JSON.stringify(updated));
		return true;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. VISITAS MÉDICAS
// ─────────────────────────────────────────────────────────────────────────────

export interface MedicalVisitItem {
	id?: number;
	data: string;
	hora?: string;
	medico: string;
	crm?: string;
	clinica?: string;
	representante: string;
	assunto: string;
	status: "EFETIVA" | "AUSENTE" | "REAGENDADA";
	observacoes?: string;
	created_at?: string;
}

const LOCAL_VISITAS_KEY = "compai_optical_visitas_medicas_cache";

export async function fetchSupabaseMedicalVisits(): Promise<MedicalVisitItem[]> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/visitas_medicas?order=id.desc`, {
			headers: defaultHeaders,
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data) && data.length > 0) return data;
		}
	} catch (e) {
		console.warn("Tabela visitas_medicas remota inacessível, usando cache:", e);
	}

	try {
		const cached = localStorage.getItem(LOCAL_VISITAS_KEY);
		if (cached) return JSON.parse(cached);
	} catch {}

	return [
		{
			id: 1,
			data: new Date().toISOString().slice(0, 10),
			hora: "10:30",
			medico: "Dr. Thiago de Souza Queiroz",
			crm: "151798/SP",
			clinica: "Clínica Olhar Certo",
			representante: "Juliana Representante",
			assunto: "Apresentação Lentes Personality Advance",
			status: "EFETIVA",
			observacoes: "Médico receptivo ao material técnico, solicitou bloco de receituário.",
		},
		{
			id: 2,
			data: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
			hora: "14:00",
			medico: "Dra. Camila Ribeiro",
			crm: "162400/SP",
			clinica: "Hospital de Olhos Campinas",
			representante: "Marcos Consultor",
			assunto: "Alinhamento de Tratamento Antirreflexo",
			status: "EFETIVA",
			observacoes: "Discutidas queixas de reflexo residual em lentes convencionais.",
		},
		{
			id: 3,
			data: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
			hora: "16:15",
			medico: "Dr. Roberto Mendonça",
			crm: "144920/SP",
			clinica: "Instituto da Visão",
			representante: "Juliana Representante",
			assunto: "Apresentação Catálogo 2026",
			status: "AUSENTE",
			observacoes: "Médico em cirurgia de urgência. Visita remarcada para próxima terça.",
		},
	];
}

export async function saveSupabaseMedicalVisit(visit: MedicalVisitItem): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/visitas_medicas`, {
			method: "POST",
			headers: { ...defaultHeaders, "Content-Type": "application/json" },
			body: JSON.stringify(visit),
		});
		if (res.ok) return true;
	} catch (e) {
		console.warn("Erro ao salvar visita no Supabase, gravando localmente:", e);
	}

	try {
		const current = await fetchSupabaseMedicalVisits();
		const newItem = { ...visit, id: visit.id || Date.now() };
		const updated = [newItem, ...current.filter((v) => v.id !== newItem.id)];
		localStorage.setItem(LOCAL_VISITAS_KEY, JSON.stringify(updated));
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseMedicalVisit(id: number): Promise<boolean> {
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/visitas_medicas?id=eq.${id}`, {
			method: "DELETE",
			headers: defaultHeaders,
		});
		if (res.ok) return true;
	} catch (e) {
		console.warn("Erro ao deletar visita médica:", e);
	}

	try {
		const current = await fetchSupabaseMedicalVisits();
		const updated = current.filter((v) => v.id !== id);
		localStorage.setItem(LOCAL_VISITAS_KEY, JSON.stringify(updated));
		return true;
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. TABELAS DE APOIO DO APP LENTES (CAPTADORES, MOTIVOS, TEMPLATES)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchLeadCaptadores(): Promise<string[]> {
	return await fetchConfigSetting<string[]>("captadores", [
		"Tráfego Pago Instagram",
		"Google Ads",
		"Indicação Médica",
		"Passante / Vitrine",
		"WhatsApp Campanha",
		"Parceria Empresa",
	]);
}

export async function saveLeadCaptadores(captadores: string[]): Promise<boolean> {
	return await saveConfigSetting("captadores", captadores);
}

export async function fetchMotivosPerda(): Promise<string[]> {
	return await fetchConfigSetting<string[]>("motivos_perda", [
		"Preço / Achou caro",
		"Não gostou da armação",
		"Vai pesquisar concorrente",
		"Sem limite no cartão",
		"Prazo de entrega longo",
		"Apenas pesquisando",
	]);
}

export async function saveMotivosPerda(motivos: string[]): Promise<boolean> {
	return await saveConfigSetting("motivos_perda", motivos);
}

export async function fetchMotivosOcorrencia(): Promise<string[]> {
	return await fetchConfigSetting<string[]>("motivos_ocorrencia", [
		"Erro de Digitação de Dioptria",
		"Quebra na Montagem de Loja",
		"Erro de Gravação no Laboratório",
		"Não Adaptação Médica",
		"Atraso Inaceitável do Fornecedor",
		"Vício Oculto na Armação",
		"Defeito no Tratamento Antirreflexo",
	]);
}

export async function saveMotivosOcorrencia(motivos: string[]): Promise<boolean> {
	return await saveConfigSetting("motivos_ocorrencia", motivos);
}

export async function fetchAssuntosVisita(): Promise<string[]> {
	return await fetchConfigSetting<string[]>("assuntos_visita", [
		"Apresentação de Novo Catálogo",
		"Lançamento de Lentes Multifocais",
		"Demonstração de Antirreflexo",
		"Alinhamento de Comissões e Campanhas",
		"Entrega de Receituários",
		"Feedback de Pacientes",
		"Cortesia e Relacionamento",
	]);
}

export async function saveAssuntosVisita(assuntos: string[]): Promise<boolean> {
	return await saveConfigSetting("assuntos_visita", assuntos);
}

export interface AssistenciaTemplates {
	tecnicoMsg: string;
	clientePendenteMsg: string;
	clienteConfirmadoMsg: string;
}

export const DEFAULT_ASSIST_TEMPLATES: AssistenciaTemplates = {
	tecnicoMsg:
		"Olá {tecnico}, temos uma assistência técnica aberta para a OS {os} do cliente {cliente} na loja {loja}. Motivo: {motivo}.",
	clientePendenteMsg:
		"Olá {cliente}, recebemos sua solicitação de assistência da OS {os}. Nosso técnico especializado está avaliando o caso e retornaremos em breve.",
	clienteConfirmadoMsg:
		"Olá {cliente}, seu atendimento de assistência técnica da OS {os} foi confirmado para {data} às {hora} na loja {loja}.",
};

export async function fetchAssistenciaTemplates(): Promise<AssistenciaTemplates> {
	return await fetchConfigSetting<AssistenciaTemplates>(
		"templates_assistencia",
		DEFAULT_ASSIST_TEMPLATES,
	);
}

export async function saveAssistenciaTemplates(
	templates: AssistenciaTemplates,
): Promise<boolean> {
	return await saveConfigSetting("templates_assistencia", templates);
}



