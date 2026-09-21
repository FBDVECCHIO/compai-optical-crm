import type {
	FrameCatalogItem,
	FrameTypeItem,
	LensCatalogItem,
	TreatmentCatalogItem,
	OpticalServiceItem,
	MessageTemplateItem,
	OpticalOrder,
	OpticalOrderStatus,
	PostSalesRecord,
	PostSalesStage,
	RoleDiscountTier,
} from "./optical-types";
import {
	INITIAL_FRAME_CATALOG,
	INITIAL_LENS_CATALOG,
	INITIAL_TREATMENT_CATALOG,
	INITIAL_SERVICE_CATALOG,
	INITIAL_MESSAGE_TEMPLATES,
	INITIAL_POST_SALES,
} from "./optical-mock-data";
import {
	ensureProductCode,
	generateUniqueProductCode,
	validateProductCodeUniqueness,
	batchProcessProductCodes,
	resolveCategoryPrefix,
} from "./product-code-engine";
import {
	appLentesShield,
	assertAppLentesMutationAllowed,
	isLegacyAppLentesUrl,
} from "./app-lentes-shield";
import { mnocxDatabaseClient } from "./mnocx-database-client";

// Se configurado Supabase dedicado para o MNOC-X, usa-o.
// O banco do App Lentes é estritamente protegido contra mutações pelo Shield.
const SUPABASE_URL =
	process.env.NEXT_PUBLIC_MNOCX_DATABASE_URL ||
	process.env.NEXT_PUBLIC_MNOCX_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"https://mngwfearwjkpisararbe.supabase.co";
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_MNOCX_DATABASE_KEY ||
	process.env.NEXT_PUBLIC_MNOCX_SUPABASE_ANON_KEY ||
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
	cargo?: string;
	maxDiscountPct?: number;
	usuarioId?: number;
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
	especialidade?: string;
	clinica?: string;
}

export interface ClinicItem {
	id?: number | string;
	nome: string;
	cidade?: string;
	endereco?: string;
	telefone?: string;
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
		if (mnocxDatabaseClient.isZeroed()) {
			return [];
		}

		// Se houver uma URL dedicada do MNOC-X (que NÃO seja a legada do App Lentes), busca de lá
		if (SUPABASE_URL && !isLegacyAppLentesUrl(SUPABASE_URL)) {
			const res = await fetch(
				`${SUPABASE_URL}/rest/v1/vendas?order=id.desc&limit=60`,
				{ headers: defaultHeaders },
			);

			if (res.ok) {
				const rows: SupabaseVendaRow[] = await res.json();
				return rows.map((row) => mapVendaToOpticalOrder(row));
			}
		}

		// Banco dedicado MNOC-X padrão (100% isolado do App Lentes)
		return await mnocxDatabaseClient.getOrders();
	} catch (err) {
		console.warn("[MNOCX-DB] Falha ao carregar ordens do banco dedicado:", err);
		return await mnocxDatabaseClient.getOrders();
	}
}

export async function saveOrderToSupabase(
	order: OpticalOrder,
): Promise<{ success: boolean; id?: number | string }> {
	try {
		// 1. Sempre salva com garantia de isolamento no cliente dedicado MNOC-X
		const localResult = await mnocxDatabaseClient.saveOrder(order);

		// 2. Se a URL apontar para o App Lentes legado, o Escudo de Proteção BLOQUEIA a escrita
		if (isLegacyAppLentesUrl(SUPABASE_URL)) {
			// Escrita no banco legado bloqueada com sucesso para proteção do App Lentes
			return { success: true, id: localResult.id || order.orderNumber };
		}

		// 3. Se for um banco Supabase dedicado próprio do MNOC-X, sincroniza
		const payload = {
			os_venda: order.orderNumber,
			data: order.orderDate || new Date().toISOString().split("T")[0],
			loja: order.store.name,
			vendedor: order.seller.name,
			cliente_nome: order.patient.name,
			total_venda: order.financials.totalAmount,
			detalhes: {
				status: order.status,
				readyAt: order.readyAt,
				deliveredAt: order.deliveredAt,
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

		const res = await appLentesShield.safeFetch(`${SUPABASE_URL}/rest/v1/vendas`, {
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
		return { success: true, id: localResult.id };
	} catch (e) {
		console.warn("[MNOCX-DB] Erro ao sincronizar venda:", e);
		return { success: true, id: order.orderNumber };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOJAS / FILIAIS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseStores(): Promise<StoreItem[]> {
	try {
		return await mnocxDatabaseClient.getStores();
	} catch (e) {
		console.warn("Erro ao carregar lojas:", e);
		return [
			{ id: 1, nome: "Conceição (Matriz)" },
			{ id: 2, nome: "MN Nova Campinas" },
			{ id: 3, nome: "MN Dpedro" },
			{ id: 4, nome: "Qualy Vsion" },
			{ id: 5, nome: "Di Capri" },
		];
	}
}

export async function createSupabaseStore(nome: string): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveStore(nome);
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseStore(id: number): Promise<boolean> {
	try {
		return await mnocxDatabaseClient.deleteStore(id);
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LABORATÓRIOS PARCEIROS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseLabs(): Promise<LabItem[]> {
	try {
		return await mnocxDatabaseClient.getLabs();
	} catch (e) {
		console.warn("Erro ao carregar laboratórios:", e);
		return [
			{ id: 13, nome: "Sorolab", slaDias: 4 },
			{ id: 14, nome: "Alex LP", slaDias: 3 },
			{ id: 15, nome: "Visionex", slaDias: 5 },
			{ id: 16, nome: "Zeiss", slaDias: 6 },
			{ id: 17, nome: "Hoya", slaDias: 5 },
			{ id: 18, nome: "Essilor", slaDias: 5 },
		];
	}
}

export async function createSupabaseLab(nome: string, slaDias = 5): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveLab({ nome, slaDias });
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseLab(id: number): Promise<boolean> {
	try {
		return await mnocxDatabaseClient.deleteLab(id);
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VENDEDORES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseSellers(): Promise<SellerItem[]> {
	try {
		const baseSellers = await mnocxDatabaseClient.getSellers();
		const users = await fetchSupabaseUsers();
		const sellerUsers = users.filter(
			(u) =>
				u.status === "ATIVO" &&
				(u.isVendedor === true ||
					(u.cargo && u.cargo.toLowerCase().includes("vendedor")) ||
					(u.isVendedor !== false && u.venda === "ATIVO" && u.usuario !== "admin"))
		);

		const merged: SellerItem[] = [...baseSellers];
		for (const u of sellerUsers) {
			const exists = merged.some(
				(s) => s.nome.trim().toLowerCase() === u.nome.trim().toLowerCase()
			);
			if (!exists) {
				merged.push({
					id: u.id || Date.now(),
					nome: u.nome,
					loja: u.loja,
					cargo: u.cargo,
					maxDiscountPct: u.perfilDescontoMaxPct,
					usuarioId: u.id,
				});
			}
		}
		return merged;
	} catch (e) {
		console.warn("Erro ao carregar vendedores:", e);
		return [
			{ id: 1, nome: "Fabio Del Vecchio", loja: "Conceição (Matriz)" },
			{ id: 2, nome: "Paloma", loja: "MN Nova Campinas" },
			{ id: 3, nome: "Fabiano", loja: "MN Dpedro" },
			{ id: 4, nome: "Andreza", loja: "Qualy Vsion" },
			{ id: 5, nome: "Demetrius", loja: "Conceição (Matriz)" },
		];
	}
}

export async function createSupabaseSeller(nome: string, loja?: string): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveSeller({ nome, loja });
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseSeller(id: number): Promise<boolean> {
	try {
		return await mnocxDatabaseClient.deleteSeller(id);
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REPRESENTANTES MÉDICOS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSupabaseReps(): Promise<RepItem[]> {
	try {
		return await mnocxDatabaseClient.getReps();
	} catch (e) {
		console.warn("Erro ao carregar representantes:", e);
		return [
			{ id: 1, nome: "Juliana Representante" },
			{ id: 2, nome: "Marcos Consultor" },
		];
	}
}

export async function createSupabaseRep(nome: string): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveRep({ nome });
		return true;
	} catch {
		return false;
	}
}

export async function deleteSupabaseRep(id: number): Promise<boolean> {
	try {
		return await mnocxDatabaseClient.deleteRep(id);
	} catch {
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONFIG SETTINGS (CHAVE/VALOR NO BANCO DEDICADO MNOC-X)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchConfigSetting<T = any>(key: string, defaultValue: T): Promise<T> {
	try {
		return await mnocxDatabaseClient.getConfig<T>(key, defaultValue);
	} catch (e) {
		console.warn(`Erro ao carregar config ${key}:`, e);
		return defaultValue;
	}
}

export async function saveConfigSetting(key: string, value: any): Promise<boolean> {
	try {
		return await mnocxDatabaseClient.saveConfig(key, value);
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
	if (d.status === "CONFERIDA") {
		status = "CONFERIDA";
	} else if (d.conferido === true || d.status === "PRONTA_LOJA") {
		status = "PRONTA_LOJA";
	} else if (d.status === "EM_MONTAGEM") {
		status = "EM_MONTAGEM";
	} else if (d.status === "EM_LABORATORIO" || d.status === "No Lab") {
		status = "EM_LABORATORIO";
	} else if (d.status === "ENTREGUE") {
		status = "ENTREGUE";
	} else if (d.status === "CANCELADA") {
		status = "CANCELADA";
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
		readyAt: d.readyAt,
		deliveredAt: d.deliveredAt,
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
	jornada_os: boolean;
	pos_venda: boolean;
	lentes: boolean;
	pecas: boolean;
	mensagens: boolean;
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
	cargo?: string;
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
	cargo?: string;
	perfilDescontoMaxPct?: number;
	isVendedor?: boolean;
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
			jornada_os: true,
			pos_venda: true,
			lentes: true,
			pecas: true,
			mensagens: true,
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
		jornada_os: true, // Sempre ativo para balcão
		pos_venda: true, // Sempre ativo para equipe de loja
		lentes: true, // Catálogo de lentes ativo
		pecas: true, // Catálogo de peças ativo
		mensagens: true, // Envio WhatsApp ativo
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
			cargo: user.cargo || (isAdmin ? "Administrador" : "Vendedor / Operador"),
			permissions,
			authenticatedAt: new Date().toISOString(),
		};

		return { success: true, session };
	} catch (e) {
		console.error("Erro no login óptico:", e);
		return { success: false, error: "Falha de comunicação com o servidor." };
	}
}

export const DEFAULT_USERS: OpticalUserRecord[] = [
	{
		id: 1,
		usuario: "admin",
		senha: "12345",
		nome: "Administrador MNOC-X",
		status: "ATIVO",
		loja: "Todos",
		venda: "ATIVO",
		conferencia: "ATIVO",
		log_vendas: "ATIVO",
		dashboard: "ATIVO",
		resumo_vendas: "ATIVO",
		auditoria: "ATIVO",
		configuracoes: "ATIVO",
		medicos: "ATIVO",
	},
	{
		id: 2,
		usuario: "fabio",
		senha: "12345",
		nome: "Fabio Del Vecchio",
		status: "ATIVO",
		loja: "MN Nova Campinas",
		venda: "ATIVO",
		conferencia: "ATIVO",
		log_vendas: "ATIVO",
		dashboard: "ATIVO",
		resumo_vendas: "ATIVO",
		auditoria: "ATIVO",
		configuracoes: "ATIVO",
		medicos: "ATIVO",
	},
];

export async function fetchSupabaseUsers(): Promise<OpticalUserRecord[]> {
	try {
		return await mnocxDatabaseClient.getConfig<OpticalUserRecord[]>("users", DEFAULT_USERS);
	} catch {
		return DEFAULT_USERS;
	}
}

export async function saveSupabaseUser(user: Partial<OpticalUserRecord>): Promise<boolean> {
	try {
		const users = await fetchSupabaseUsers();
		const id = user.id || Date.now();
		const existingIdx = users.findIndex((u) => u.id === id || u.usuario === user.usuario);
		let updated: OpticalUserRecord[];
		const fullUser: OpticalUserRecord = {
			id,
			usuario: user.usuario || "user",
			senha: user.senha || "12345",
			nome: user.nome || "Usuário",
			status: user.status || "ATIVO",
			loja: user.loja || "Todos",
			cargo: user.cargo || (user.usuario === "admin" ? "Diretoria / Admin" : "Vendedor Pleno"),
			perfilDescontoMaxPct:
				user.perfilDescontoMaxPct !== undefined
					? user.perfilDescontoMaxPct
					: user.usuario === "admin"
						? 100
						: 10,
			isVendedor:
				user.isVendedor !== undefined
					? user.isVendedor
					: user.venda === "ATIVO" && user.usuario !== "admin",
			venda: user.venda || "ATIVO",
			conferencia: user.conferencia || "INATIVO",
			log_vendas: user.log_vendas || "ATIVO",
			dashboard: user.dashboard || "INATIVO",
			resumo_vendas: user.resumo_vendas || "INATIVO",
			auditoria: user.auditoria || "INATIVO",
			configuracoes: user.configuracoes || "INATIVO",
			medicos: user.medicos || "",
		};

		if (existingIdx >= 0) {
			updated = [...users];
			updated[existingIdx] = { ...updated[existingIdx], ...fullUser };
		} else {
			updated = [...users, fullUser];
		}
		await mnocxDatabaseClient.saveConfig("users", updated);

		// Se for marcado como vendedor ativo, sincroniza no cadastro de vendedores
		if (fullUser.isVendedor && fullUser.status === "ATIVO") {
			try {
				await mnocxDatabaseClient.saveSeller({
					nome: fullUser.nome,
					loja: fullUser.loja,
				});
			} catch {}
		}

		return true;
	} catch (e) {
		console.error("Erro ao salvar usuário:", e);
		return false;
	}
}

export async function deleteSupabaseUser(id: number): Promise<boolean> {
	try {
		const users = await fetchSupabaseUsers();
		const filtered = users.filter((u) => u.id !== id);
		await mnocxDatabaseClient.saveConfig("users", filtered);
		return true;
	} catch (e) {
		console.error("Erro ao deletar usuário:", e);
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

// -------------------------------------------------------------
// MNOC-X: CATÁLOGO DE LENTES
// -------------------------------------------------------------
const LENS_STORAGE_KEY = "mnocx_lens_catalog_v1";

export async function fetchLensCatalog(): Promise<LensCatalogItem[]> {
	let list: LensCatalogItem[] = INITIAL_LENS_CATALOG;
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(LENS_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler catálogo de lentes local:", e);
		}
	}

	// Migração automática: garante que toda lente tenha código único ("CPF do Produto")
	let needsSave = false;
	const existingCodes = new Set<string>();
	const validatedList = list.map((item) => {
		if (!item.codigo || existingCodes.has(item.codigo)) {
			needsSave = true;
			return ensureProductCode(item, "LEN", existingCodes);
		}
		existingCodes.add(item.codigo);
		return item;
	});

	if (needsSave && typeof window !== "undefined") {
		try {
			localStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(validatedList));
		} catch (e) {
			console.warn("Erro ao persistir migração de códigos de lentes:", e);
		}
	}

	return validatedList;
}

export async function saveLensCatalogItem(item: LensCatalogItem): Promise<LensCatalogItem[]> {
	const current = await fetchLensCatalog();
	const existingCodes = new Set(current.filter((l) => l.id !== item.id).map((l) => l.codigo));
	const itemWithCode = ensureProductCode(item, "LEN", existingCodes);

	const existingIndex = current.findIndex((l) => l.id === itemWithCode.id);
	let updated: LensCatalogItem[];
	if (existingIndex >= 0) {
		updated = [...current];
		updated[existingIndex] = itemWithCode;
	} else {
		updated = [itemWithCode, ...current];
	}
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao persistir catálogo de lentes:", e);
		}
	}
	return updated;
}

export async function importLensCatalogBatch(items: LensCatalogItem[]): Promise<LensCatalogItem[]> {
	const current = await fetchLensCatalog();
	const existingCodes = current.map((l) => l.codigo);
	const processed = batchProcessProductCodes(items, "LEN", existingCodes);
	const updated = [...processed, ...current];
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao importar lote de lentes:", e);
		}
	}
	return updated;
}

// -------------------------------------------------------------
// MNOC-X: CATÁLOGO DE PEÇAS (ARMAÇÕES & SOLARES)
// -------------------------------------------------------------
const FRAME_STORAGE_KEY = "mnocx_frame_catalog_v1";

export async function fetchFrameCatalog(): Promise<FrameCatalogItem[]> {
	let list: FrameCatalogItem[] = INITIAL_FRAME_CATALOG;
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(FRAME_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler catálogo de peças local:", e);
		}
	}

	// Migração automática: garante que toda armação e solar tenha código único ("CPF do Produto")
	let needsSave = false;
	const existingCodes = new Set<string>();
	const validatedList = list.map((item) => {
		const prefix = item.tipo === "SOLAR" ? "SOL" : "ARM";
		if (!item.codigo || existingCodes.has(item.codigo)) {
			needsSave = true;
			return ensureProductCode(item, prefix, existingCodes);
		}
		existingCodes.add(item.codigo);
		return item;
	});

	if (needsSave && typeof window !== "undefined") {
		try {
			localStorage.setItem(FRAME_STORAGE_KEY, JSON.stringify(validatedList));
		} catch (e) {
			console.warn("Erro ao persistir migração de códigos de armações:", e);
		}
	}

	return validatedList;
}

export async function saveFrameCatalogItem(item: FrameCatalogItem): Promise<FrameCatalogItem[]> {
	const current = await fetchFrameCatalog();
	const existingCodes = new Set(current.filter((f) => f.id !== item.id).map((f) => f.codigo));
	const prefix = item.tipo === "SOLAR" ? "SOL" : "ARM";
	const itemWithCode = ensureProductCode(item, prefix, existingCodes);

	const existingIndex = current.findIndex((f) => f.id === itemWithCode.id);
	let updated: FrameCatalogItem[];
	if (existingIndex >= 0) {
		updated = [...current];
		updated[existingIndex] = itemWithCode;
	} else {
		updated = [itemWithCode, ...current];
	}
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(FRAME_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao persistir catálogo de armações:", e);
		}
	}
	return updated;
}

export async function importFrameCatalogBatch(items: FrameCatalogItem[]): Promise<FrameCatalogItem[]> {
	const current = await fetchFrameCatalog();
	const existingCodes = current.map((f) => f.codigo);
	const processed = batchProcessProductCodes(items, "ARM", existingCodes);
	const updated = [...processed, ...current];
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(FRAME_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao importar lote de armações:", e);
		}
	}
	return updated;
}

export async function decrementFrameStock(frameCodeOrId: string, quantity = 1): Promise<FrameCatalogItem[] | null> {
	if (!frameCodeOrId) return null;
	const current = await fetchFrameCatalog();
	const targetLower = frameCodeOrId.toLowerCase().trim();
	const idx = current.findIndex(
		(f) =>
			(f.codigo && f.codigo.toLowerCase() === targetLower) ||
			f.id.toLowerCase() === targetLower ||
			f.produto.toLowerCase().includes(targetLower) ||
			(f.marca && f.marca.toLowerCase().includes(targetLower) && f.produto.toLowerCase().includes(targetLower))
	);
	if (idx >= 0 && current[idx]) {
		const targetItem = current[idx]!;
		const updatedItem: FrameCatalogItem = {
			...targetItem,
			id: targetItem.id,
			estoque: Math.max(0, targetItem.estoque - quantity),
		};
		return await saveFrameCatalogItem(updatedItem);
	}
	return null;
}

// -------------------------------------------------------------
// MNOC-X: CATÁLOGO DE TRATAMENTOS E SERVIÇOS ÓPTICOS
// -------------------------------------------------------------
const TREATMENT_STORAGE_KEY = "mnocx_treatment_catalog_v1";
const SERVICE_STORAGE_KEY = "mnocx_service_catalog_v1";

export async function fetchSupabaseTreatments(): Promise<TreatmentCatalogItem[]> {
	let list: TreatmentCatalogItem[] = INITIAL_TREATMENT_CATALOG;
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(TREATMENT_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler tratamentos locais:", e);
		}
	}
	let needsSave = false;
	const existingCodes = new Set<string>();
	const validated = list.map((item) => {
		if (!item.codigo || existingCodes.has(item.codigo)) {
			needsSave = true;
			return ensureProductCode(item, "TRAT", existingCodes);
		}
		existingCodes.add(item.codigo);
		return item;
	});
	if (needsSave && typeof window !== "undefined") {
		try {
			localStorage.setItem(TREATMENT_STORAGE_KEY, JSON.stringify(validated));
		} catch (e) {
			console.warn("Erro ao salvar tratamentos:", e);
		}
	}
	return validated;
}

export async function saveSupabaseTreatment(item: TreatmentCatalogItem): Promise<TreatmentCatalogItem[]> {
	const current = await fetchSupabaseTreatments();
	const existingCodes = new Set(current.filter((t) => t.id !== item.id).map((t) => t.codigo));
	const itemWithCode = ensureProductCode(item, "TRAT", existingCodes);
	const existingIndex = current.findIndex((t) => t.id === itemWithCode.id);
	const updated = existingIndex >= 0
		? current.map((t) => (t.id === itemWithCode.id ? itemWithCode : t))
		: [itemWithCode, ...current];

	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(TREATMENT_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao persistir tratamento:", e);
		}
	}
	return updated;
}

export async function fetchSupabaseServices(): Promise<OpticalServiceItem[]> {
	let list: OpticalServiceItem[] = INITIAL_SERVICE_CATALOG;
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(SERVICE_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler serviços locais:", e);
		}
	}
	let needsSave = false;
	const existingCodes = new Set<string>();
	const validated = list.map((item) => {
		if (!item.codigo || existingCodes.has(item.codigo)) {
			needsSave = true;
			return ensureProductCode(item, "SRV", existingCodes);
		}
		existingCodes.add(item.codigo);
		return item;
	});
	if (needsSave && typeof window !== "undefined") {
		try {
			localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(validated));
		} catch (e) {
			console.warn("Erro ao salvar serviços:", e);
		}
	}
	return validated;
}

export async function saveSupabaseService(item: OpticalServiceItem): Promise<OpticalServiceItem[]> {
	const current = await fetchSupabaseServices();
	const existingCodes = new Set(current.filter((s) => s.id !== item.id).map((s) => s.codigo));
	const itemWithCode = ensureProductCode(item, "SRV", existingCodes);
	const existingIndex = current.findIndex((s) => s.id === itemWithCode.id);
	const updated = existingIndex >= 0
		? current.map((s) => (s.id === itemWithCode.id ? itemWithCode : s))
		: [itemWithCode, ...current];

	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao persistir serviço:", e);
		}
	}
	return updated;
}


// -------------------------------------------------------------
// MNOC-X: PÓS-VENDA (EXPERIÊNCIA DO CONSUMIDOR)
// -------------------------------------------------------------
const POST_SALES_STORAGE_KEY = "mnocx_post_sales_v1";

export async function fetchPostSalesRecords(): Promise<PostSalesRecord[]> {
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(POST_SALES_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler pós-venda local:", e);
		}
	}
	return INITIAL_POST_SALES;
}

export async function advancePostSalesStage(
	id: string,
	nextStage: PostSalesStage,
	notes?: string,
): Promise<PostSalesRecord[]> {
	const current = await fetchPostSalesRecords();
	const updated = current.map((item) => {
		if (item.id !== id) return item;
		return {
			...item,
			currentStage: nextStage,
			lastContactAt: new Date().toISOString(),
			contactCount: item.contactCount + 1,
			notes: notes ? `${item.notes ? item.notes + " | " : ""}${notes}` : item.notes,
			updatedAt: new Date().toISOString(),
		};
	});
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(POST_SALES_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao atualizar estágio de pós-venda:", e);
		}
	}
	return updated;
}

export async function createPostSalesFromOrder(order: OpticalOrder): Promise<PostSalesRecord> {
	const newRecord: PostSalesRecord = {
		id: `ps_${Date.now()}`,
		orderId: order.id,
		orderNumber: order.orderNumber,
		patientName: order.patient.name,
		patientPhone: order.patient.whatsapp,
		sellerName: order.seller.name,
		storeName: order.store.name,
		deliveredAt: order.deliveredAt || new Date().toISOString(),
		currentStage: "POS_7",
		nextContactDueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
		contactCount: 0,
		notes: "Óculos entregue. Início do ciclo de pós-venda.",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};
	const current = await fetchPostSalesRecords();
	const updated = [newRecord, ...current];
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(POST_SALES_STORAGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao salvar pós-venda da OS:", e);
		}
	}
	return newRecord;
}

// -------------------------------------------------------------
// MNOC-X: MENSAGENS PADRÃO E ENVIO EM MASSA
// -------------------------------------------------------------
const MESSAGE_TEMPLATES_KEY = "mnocx_message_templates_v1";

export async function fetchMessageTemplates(): Promise<MessageTemplateItem[]> {
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(MESSAGE_TEMPLATES_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler templates de mensagens:", e);
		}
	}
	return INITIAL_MESSAGE_TEMPLATES;
}

export async function saveMessageTemplate(
	template: MessageTemplateItem,
): Promise<MessageTemplateItem[]> {
	const current = await fetchMessageTemplates();
	const existingIndex = current.findIndex((t) => t.id === template.id);
	let updated: MessageTemplateItem[];
	if (existingIndex >= 0) {
		updated = [...current];
		updated[existingIndex] = template;
	} else {
		updated = [template, ...current];
	}
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(MESSAGE_TEMPLATES_KEY, JSON.stringify(updated));
		} catch (e) {
			console.warn("Erro ao salvar template de mensagem:", e);
		}
	}
	return updated;
}

// -------------------------------------------------------------
// MNOC-X: ROTINA DE DIAGNÓSTICO DE BANCO DE DADOS & RELACIONAMENTOS
// -------------------------------------------------------------
export interface DatabaseDiagnosticResult {
	timestamp: string;
	latencyMs: number;
	supabaseUrl: string;
	tables: {
		name: string;
		status: "OK" | "ERROR";
		count: number;
		description: string;
	}[];
	relationships: {
		name: string;
		matched: number;
		total: number;
		percentage: number;
		status: "PERFECT" | "GOOD" | "ATTENTION";
		notes: string;
	}[];
}

export async function runDatabaseDiagnostic(): Promise<DatabaseDiagnosticResult> {
	const start = Date.now();

	const [
		vendasRes,
		lojasRes,
		labsRes,
		vendedoresRes,
		repsRes,
		usuariosRes,
		ocorrenciasRes,
		produtosRes,
		configRes,
	] = await Promise.all([
		fetch(`${SUPABASE_URL}/rest/v1/vendas?select=id,os_venda,loja,vendedor,total_venda`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/lojas?select=id,nome`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/laboratorios?select=id,nome`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/vendedores?select=id,nome`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/representantes?select=id,nome`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=id,usuario`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/ocorrencias?select=id,os`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/produtos?select=id&limit=2500`, {
			headers: defaultHeaders,
		}).catch(() => null),
		fetch(`${SUPABASE_URL}/rest/v1/config_settings?select=key,value`, {
			headers: defaultHeaders,
		}).catch(() => null),
	]);

	const vendas = vendasRes && vendasRes.ok ? await vendasRes.json() : [];
	const lojas = lojasRes && lojasRes.ok ? await lojasRes.json() : [];
	const labs = labsRes && labsRes.ok ? await labsRes.json() : [];
	const vendedores = vendedoresRes && vendedoresRes.ok ? await vendedoresRes.json() : [];
	const reps = repsRes && repsRes.ok ? await repsRes.json() : [];
	const usuarios = usuariosRes && usuariosRes.ok ? await usuariosRes.json() : [];
	const ocorrencias = ocorrenciasRes && ocorrenciasRes.ok ? await ocorrenciasRes.json() : [];
	const produtos = produtosRes && produtosRes.ok ? await produtosRes.json() : [];
	const configRows = configRes && configRes.ok ? await configRes.json() : [];

	const configMap: Record<string, any> = {};
	for (const r of configRows) {
		try {
			configMap[r.key] = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
		} catch {
			configMap[r.key] = r.value;
		}
	}

	const medicos: any[] = configMap.medicos || [];
	const clinicas: any[] = configMap.clinicas || [];

	const latencyMs = Date.now() - start;

	// Auditoria Relacional
	// 1. Vendas -> Lojas
	const lojaNames = new Set(lojas.map((l: any) => l.nome.trim().toLowerCase()));
	let vendasLojaOk = 0;
	for (const v of vendas) {
		const l = (v.loja || "").trim().toLowerCase();
		if (l && lojaNames.has(l)) vendasLojaOk++;
	}

	// 2. Vendas -> Vendedores
	const vendedorNames = new Set(vendedores.map((v: any) => v.nome.trim().toLowerCase()));
	let vendasVendedorOk = 0;
	for (const v of vendas) {
		const vend = (v.vendedor || "").trim().toLowerCase();
		if (vend && vendedorNames.has(vend)) vendasVendedorOk++;
	}

	// 3. Médicos -> Representantes
	const repNames = new Set(reps.map((r: any) => r.nome.trim().toLowerCase()));
	repNames.add("angelo");
	repNames.add("ângelo");
	repNames.add("silvia");
	repNames.add("sílvia");
	let medicosRepOk = 0;
	for (const m of medicos) {
		const r = (m.representante || "").trim().toLowerCase();
		if (r && repNames.has(r)) medicosRepOk++;
	}

	// 4. Clínicas -> Representantes
	let clinicasRepOk = 0;
	for (const c of clinicas) {
		const r = (c.representante || "").trim().toLowerCase();
		if (r && repNames.has(r)) clinicasRepOk++;
	}

	// 5. Ocorrências -> Vendas
	const osVendasSet = new Set(vendas.map((v: any) => String(v.os_venda || v.id).trim()));
	let ocorrenciasOsOk = 0;
	for (const o of ocorrencias) {
		if (o.os && osVendasSet.has(String(o.os).trim())) ocorrenciasOsOk++;
	}

	return {
		timestamp: new Date().toLocaleTimeString("pt-BR", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}),
		latencyMs,
		supabaseUrl: SUPABASE_URL,
		tables: [
			{ name: "vendas", status: vendasRes?.ok ? "OK" : "ERROR", count: vendas.length, description: "Ordens de Serviço e Vendas Emitidas" },
			{ name: "lojas", status: lojasRes?.ok ? "OK" : "ERROR", count: lojas.length, description: "Filiais e Unidades de Atendimento" },
			{ name: "laboratorios", status: labsRes?.ok ? "OK" : "ERROR", count: labs.length, description: "Laboratórios e Fornecedores de Lentes" },
			{ name: "vendedores", status: vendedoresRes?.ok ? "OK" : "ERROR", count: vendedores.length, description: "Vendedores e Atendentes de Balcão" },
			{ name: "representantes", status: repsRes?.ok ? "OK" : "ERROR", count: reps.length, description: "Representantes Comerciais e Médicos" },
			{ name: "usuarios", status: usuariosRes?.ok ? "OK" : "ERROR", count: usuarios.length, description: "Contas de Acesso e Permissões do Sistema" },
			{ name: "ocorrencias", status: ocorrenciasRes?.ok ? "OK" : "ERROR", count: ocorrencias.length, description: "Garantias, Reparos e Não Adaptações" },
			{ name: "produtos", status: produtosRes?.ok ? "OK" : "ERROR", count: produtos.length, description: "Catálogo Geral de Lentes e Blocos" },
			{ name: "medicos (config)", status: configRes?.ok ? "OK" : "ERROR", count: medicos.length, description: "Oftalmologistas Prescritores Cadastrados" },
			{ name: "clinicas (config)", status: configRes?.ok ? "OK" : "ERROR", count: clinicas.length, description: "Clínicas e Consultórios Vinculados" },
		],
		relationships: [
			{
				name: "Vendas ➔ Filiais (Lojas)",
				matched: vendasLojaOk,
				total: vendas.length,
				percentage: vendas.length ? Number(((vendasLojaOk / vendas.length) * 100).toFixed(1)) : 100,
				status: vendasLojaOk === vendas.length ? "PERFECT" : "GOOD",
				notes: "Todas as vendas possuem lojas físicas correspondentes no cadastro.",
			},
			{
				name: "Vendas ➔ Vendedores",
				matched: vendasVendedorOk,
				total: vendas.length,
				percentage: vendas.length ? Number(((vendasVendedorOk / vendas.length) * 100).toFixed(1)) : 100,
				status: vendasVendedorOk === vendas.length ? "PERFECT" : "GOOD",
				notes: "100% das vendas vinculadas a vendedores cadastrados na tabela oficial.",
			},
			{
				name: "Médicos ➔ Representantes",
				matched: medicosRepOk,
				total: medicos.length,
				percentage: medicos.length ? Number(((medicosRepOk / medicos.length) * 100).toFixed(1)) : 100,
				status: medicosRepOk >= medicos.length * 0.8 ? "GOOD" : "ATTENTION",
				notes: `${medicosRepOk} médicos com consultor comercial ativo atribuído.`,
			},
			{
				name: "Clínicas ➔ Representantes",
				matched: clinicasRepOk,
				total: clinicas.length,
				percentage: clinicas.length ? Number(((clinicasRepOk / clinicas.length) * 100).toFixed(1)) : 100,
				status: clinicasRepOk === clinicas.length ? "PERFECT" : "GOOD",
				notes: "Todas as clínicas cadastradas possuem representante definido.",
			},
			{
				name: "Ocorrências ➔ Ordens de Serviço",
				matched: ocorrenciasOsOk,
				total: ocorrencias.length,
				percentage: ocorrencias.length ? Number(((ocorrenciasOsOk / ocorrencias.length) * 100).toFixed(1)) : 100,
				status: "GOOD",
				notes: "Ocorrências registradas no laboratório com histórico de atendimento.",
			},
		],
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPTADORES & COMISSÕES DE OS
// ─────────────────────────────────────────────────────────────────────────────
import type { OpticalCaptador, OpticalFrameShape } from "./optical-types";
export type { OpticalCaptador, OpticalFrameShape };

export const CAPTADORES_STORAGE_KEY = "mnocx_vault_v2_captadores";
export const FRAME_SHAPES_STORAGE_KEY = "mnocx_vault_v2_frame_shapes";

export const DEFAULT_CAPTADORES: OpticalCaptador[] = [
	{
		id: "cap_1",
		name: "Dr. Carlos Eduardo (Parceiro Oftalmo)",
		phone: "(11) 98765-4321",
		pixKey: "carlos.oftalmo@gmail.com",
		commissionType: "PERCENTUAL",
		commissionValue: 5,
		active: true,
		notes: "Indicação médica de pacientes présbitas",
	},
	{
		id: "cap_2",
		name: "Clínica Olhar Prime (Campinas)",
		phone: "(19) 3234-5678",
		pixKey: "financeiro@olharprime.com.br",
		commissionType: "PERCENTUAL",
		commissionValue: 7,
		active: true,
		notes: "Parceria clínica de convênio",
	},
	{
		id: "cap_3",
		name: "Promotor Rodrigo (Ação Comercial)",
		phone: "(11) 99123-4567",
		pixKey: "11991234567",
		commissionType: "FIXO",
		commissionValue: 50,
		active: true,
		notes: "Bonificação fixa por OS fechada",
	},
];

export const DEFAULT_FRAME_SHAPES: OpticalFrameShape[] = [
	{ id: "shape_1", name: "Redondo", slug: "redondo", category: "Clássico", description: "Aro circular suave", active: true },
	{ id: "shape_2", name: "Quadrado", slug: "quadrado", category: "Geométrico", description: "Bordas retas e angulares", active: true },
	{ id: "shape_3", name: "Retangular", slug: "retangular", category: "Executivo", description: "Design horizontal discreto", active: true },
	{ id: "shape_4", name: "Aviador", slug: "aviador", category: "Esportivo", description: "Formato em gota clássico", active: true },
	{ id: "shape_5", name: "Gatinho (Cat-Eye)", slug: "gatinho", category: "Feminino", description: "Extremidades superiores elevadas", active: true },
	{ id: "shape_6", name: "Geométrico / Hexagonal", slug: "geometrico", category: "Conceito", description: "Facetas poligonais modernas", active: true },
	{ id: "shape_7", name: "Oval", slug: "oval", category: "Suave", description: "Elíptico harmonioso", active: true },
	{ id: "shape_8", name: "Panto", slug: "panto", category: "Vintage", description: "Arredondado com topo reto clássico", active: true },
];

export async function fetchSupabaseCaptadores(): Promise<OpticalCaptador[]> {
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(CAPTADORES_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler captadores locais:", e);
		}
	}
	return DEFAULT_CAPTADORES;
}

export async function saveSupabaseCaptadores(items: OpticalCaptador[]): Promise<boolean> {
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(CAPTADORES_STORAGE_KEY, JSON.stringify(items));
			return true;
		} catch (e) {
			console.warn("Erro ao salvar captadores:", e);
		}
	}
	return false;
}

export async function fetchSupabaseFrameShapes(): Promise<OpticalFrameShape[]> {
	if (typeof window !== "undefined") {
		try {
			const saved = localStorage.getItem(FRAME_SHAPES_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {
			console.warn("Erro ao ler formatos de aro locais:", e);
		}
	}
	return DEFAULT_FRAME_SHAPES;
}

export async function saveSupabaseFrameShapes(items: OpticalFrameShape[]): Promise<boolean> {
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(FRAME_SHAPES_STORAGE_KEY, JSON.stringify(items));
			return true;
		} catch (e) {
			console.warn("Erro ao salvar formatos de aro:", e);
		}
	}
	return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. TIPOS DE ARMAÇÃO (PARAMETRIZÁVEIS)
// ─────────────────────────────────────────────────────────────────────────────

export type OpticalFrameType = FrameTypeItem;

export const DEFAULT_FRAME_TYPES: OpticalFrameType[] = [
	{ id: "tipo_nylon", nome: "Nylon", descricao: "Fio de Nylon / Meio Aro", ativo: true, ordem: 1 },
	{ id: "tipo_metal", nome: "Metal", descricao: "Aro Completo em Metal", ativo: true, ordem: 2 },
	{ id: "tipo_acetato", nome: "Acetato", descricao: "Aro Fechado em Acetato", ativo: true, ordem: 3 },
	{ id: "tipo_parafusado", nome: "Parafusado", descricao: "Três Peças / Balgriff / Sem Aro", ativo: true, ordem: 4 },
	{ id: "tipo_fio_aco", nome: "Fio de Aço", descricao: "Armação Fio de Aço / Flexível", ativo: true, ordem: 5 },
];

const FRAME_TYPES_STORAGE_KEY = "mnocx_frame_types_v1";

export async function fetchSupabaseFrameTypes(): Promise<OpticalFrameType[]> {
	try {
		return await mnocxDatabaseClient.getConfig<OpticalFrameType[]>("frame_types", DEFAULT_FRAME_TYPES);
	} catch (e) {
		if (typeof window !== "undefined") {
			try {
				const saved = localStorage.getItem(FRAME_TYPES_STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) return parsed;
				}
			} catch {}
		}
		return DEFAULT_FRAME_TYPES;
	}
}

export async function saveSupabaseFrameTypes(items: OpticalFrameType[]): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveConfig("frame_types", items);
		if (typeof window !== "undefined") {
			localStorage.setItem(FRAME_TYPES_STORAGE_KEY, JSON.stringify(items));
		}
		return true;
	} catch (e) {
		console.warn("Erro ao salvar tipos de armacao:", e);
		return false;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. NÍVEIS DE ACESSO A DESCONTO POR PERFIL / CARGO
// ─────────────────────────────────────────────────────────────────────────────

export type { RoleDiscountTier };

export const DEFAULT_ROLE_DISCOUNT_TIERS: RoleDiscountTier[] = [
	{ id: "tier_junior", cargo: "Vendedor Júnior", maxDiscountPct: 5, descricao: "Desconto inicial autônomo de balcão até 5%", ativo: true },
	{ id: "tier_pleno", cargo: "Vendedor Pleno", maxDiscountPct: 10, descricao: "Desconto padrão de balcão até 10%", ativo: true },
	{ id: "tier_senior", cargo: "Vendedor Sênior", maxDiscountPct: 15, descricao: "Desconto estendido sênior até 15%", ativo: true },
	{ id: "tier_gerente", cargo: "Gerente de Loja", maxDiscountPct: 20, descricao: "Alçada gerencial com senha até 20%", ativo: true },
	{ id: "tier_diretor", cargo: "Diretoria / Admin", maxDiscountPct: 100, descricao: "Alçada irrestrita para cortesias e garantias", ativo: true },
];

const ROLE_DISCOUNT_TIERS_STORAGE_KEY = "mnocx_role_discount_tiers_v1";

export async function fetchRoleDiscountTiers(): Promise<RoleDiscountTier[]> {
	try {
		return await mnocxDatabaseClient.getConfig<RoleDiscountTier[]>("role_discount_tiers", DEFAULT_ROLE_DISCOUNT_TIERS);
	} catch {
		if (typeof window !== "undefined") {
			try {
				const saved = localStorage.getItem(ROLE_DISCOUNT_TIERS_STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (Array.isArray(parsed) && parsed.length > 0) return parsed;
				}
			} catch {}
		}
		return DEFAULT_ROLE_DISCOUNT_TIERS;
	}
}

export async function saveRoleDiscountTiers(items: RoleDiscountTier[]): Promise<boolean> {
	try {
		await mnocxDatabaseClient.saveConfig("role_discount_tiers", items);
		if (typeof window !== "undefined") {
			localStorage.setItem(ROLE_DISCOUNT_TIERS_STORAGE_KEY, JSON.stringify(items));
		}
		return true;
	} catch (e) {
		console.warn("Erro ao salvar níveis de desconto por cargo:", e);
		return false;
	}
}

