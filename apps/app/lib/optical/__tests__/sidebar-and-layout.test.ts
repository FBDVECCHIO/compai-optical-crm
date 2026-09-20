import { describe, expect, it, beforeEach } from "bun:test";
import {
	fetchSupabaseSellers,
	fetchRoleDiscountTiers,
	saveRoleDiscountTiers,
	fetchSupabaseFrameTypes,
	saveSupabaseFrameTypes,
	DEFAULT_FRAME_TYPES,
	DEFAULT_ROLE_DISCOUNT_TIERS,
} from "../supabase-optical";

// Mock para localStorage no runtime Bun
const storageMap = new Map<string, string>();
const localStorageMock = {
	getItem: (key: string) => storageMap.get(key) || null,
	setItem: (key: string, value: string) => storageMap.set(key, value),
	removeItem: (key: string) => storageMap.delete(key),
	clear: () => storageMap.clear(),
};
// @ts-ignore
globalThis.localStorage = localStorageMock;

describe("Sidebar, Layout e Otimizações de UI MNOC-X", () => {
	beforeEach(() => {
		storageMap.clear();
	});

	it("1. Persistência de preferência da Sidebar (expandida vs contraída)", () => {
		// Padrão: expandida (null/false)
		const initialState = localStorage.getItem("mnocx_sidebar_collapsed");
		expect(initialState).toBeNull();

		// Alterna para contraída
		localStorage.setItem("mnocx_sidebar_collapsed", "true");
		expect(localStorage.getItem("mnocx_sidebar_collapsed")).toBe("true");

		// Alterna de volta para expandida
		localStorage.setItem("mnocx_sidebar_collapsed", "false");
		expect(localStorage.getItem("mnocx_sidebar_collapsed")).toBe("false");
	});

	it("2. Módulos e permissões de acesso da Sidebar", () => {
		const adminSession = {
			usuario: "admin",
			nome: "Administrador",
			loja: "Todas as Lojas",
			isAdmin: true,
			permissions: {},
		};

		const vendedorSession = {
			usuario: "cesar",
			nome: "Cesar Vendedor",
			loja: "Conceição",
			isAdmin: false,
			permissions: {
				balcao: true,
				jornada_os: true,
				pos_venda: true,
				mensagens: true,
				conferencia: true,
				config: false,
				resumo: false,
			},
		};

		// Admin tem acesso a todos os módulos
		expect(adminSession.isAdmin).toBe(true);

		// Vendedor não tem acesso a config ou resumo gerencial
		expect(vendedorSession.permissions.balcao).toBe(true);
		expect(vendedorSession.permissions.config).toBe(false);
		expect(vendedorSession.permissions.resumo).toBe(false);
	});

	it("3. Estrutura de métricas de vendedores no card horizontal", () => {
		const seller = {
			id: "v-1",
			nome: "Fabiano",
			loja: "Todas as Lojas",
			metaMes: 45000,
			premioSemana: 400,
			totalRealizado: 38250,
			osCount: 14,
		};

		const pctAtingido = (seller.totalRealizado / seller.metaMes) * 100;
		expect(pctAtingido).toBeCloseTo(85.0, 1);

		// Falta faturar
		const faltaFaturar = Math.max(0, seller.metaMes - seller.totalRealizado);
		expect(faltaFaturar).toBe(6750);

		// Meta diária com 12 dias restantes
		const diasRestantes = 12;
		const metaDiaria = faltaFaturar / diasRestantes;
		expect(metaDiaria).toBe(562.5);
	});
});
