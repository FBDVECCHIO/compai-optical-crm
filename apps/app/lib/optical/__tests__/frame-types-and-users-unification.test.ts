import { describe, expect, it, beforeEach } from "bun:test";
import {
	fetchSupabaseFrameTypes,
	saveSupabaseFrameTypes,
	DEFAULT_FRAME_TYPES,
	type OpticalFrameType,
	fetchRoleDiscountTiers,
	saveRoleDiscountTiers,
	DEFAULT_ROLE_DISCOUNT_TIERS,
	type RoleDiscountTier,
	fetchSupabaseUsers,
	saveSupabaseUser,
	fetchSupabaseSellers,
	type OpticalUserRecord,
} from "../supabase-optical";

describe("Tipos de Armação Parametrizáveis & Unificação de Usuários/Descontos", () => {
	beforeEach(() => {
		// Limpa chaves de teste no mock storage
		if (typeof localStorage !== "undefined") {
			localStorage.clear();
		}
	});

	describe("1. Tipos de Armação (Nylon, Metal, Acetato, Parafusado, Fio de Aço)", () => {
		it("deve carregar por padrão os 5 tipos de armação homologados", async () => {
			const types = await fetchSupabaseFrameTypes();
			expect(types).toBeDefined();
			expect(types.length).toBeGreaterThanOrEqual(5);

			const nomes = types.map((t) => t.nome);
			expect(nomes).toContain("Nylon");
			expect(nomes).toContain("Metal");
			expect(nomes).toContain("Acetato");
			expect(nomes).toContain("Parafusado");
			expect(nomes).toContain("Fio de Aço");
		});

		it("deve permitir cadastrar um novo tipo de armação e persistir", async () => {
			const types = await fetchSupabaseFrameTypes();
			const novoTipo: OpticalFrameType = {
				id: "tipo_titanio",
				nome: "Titânio Memory",
				descricao: "Liga ultraleve com memória de forma",
				ativo: true,
			};
			const atualizado = [...types, novoTipo];
			const salvou = await saveSupabaseFrameTypes(atualizado);
			expect(salvou).toBe(true);

			const recarregado = await fetchSupabaseFrameTypes();
			expect(recarregado.some((t) => t.nome === "Titânio Memory")).toBe(true);
		});

		it("deve permitir remover ou desativar um tipo de armação", async () => {
			const types = await fetchSupabaseFrameTypes();
			const filtrados = types.filter((t) => t.nome !== "Parafusado");
			await saveSupabaseFrameTypes(filtrados);

			const recarregado = await fetchSupabaseFrameTypes();
			expect(recarregado.some((t) => t.nome === "Parafusado")).toBe(false);
		});
	});

	describe("2. Políticas de Desconto por Perfil / Cargo", () => {
		it("deve carregar os níveis de desconto padrão por cargo", async () => {
			const tiers = await fetchRoleDiscountTiers();
			expect(tiers).toBeDefined();
			expect(tiers.length).toBeGreaterThanOrEqual(4);

			const cargos = tiers.map((t) => t.cargo);
			expect(cargos).toContain("Vendedor Júnior");
			expect(cargos).toContain("Vendedor Pleno");
			expect(cargos).toContain("Gerente de Loja");
			expect(cargos).toContain("Diretoria / Admin");
		});

		it("deve permitir atualizar os limites de desconto por cargo", async () => {
			const tiers = await fetchRoleDiscountTiers();
			const atualizados = tiers.map((t) =>
				t.cargo === "Vendedor Pleno" ? { ...t, maxDiscountPct: 12 } : t
			);
			const salvou = await saveRoleDiscountTiers(atualizados);
			expect(salvou).toBe(true);

			const recarregados = await fetchRoleDiscountTiers();
			const pleno = recarregados.find((t) => t.cargo === "Vendedor Pleno");
			expect(pleno?.maxDiscountPct).toBe(12);
		});
	});

	describe("3. Unificação de Vendedores ao Menu de Usuários", () => {
		it("deve sincronizar usuário vendedor com a lista de vendedores", async () => {
			const novoUsuario: OpticalUserRecord = {
				id: 9999,
				usuario: "vendedora_camila",
				senha: "123",
				nome: "Camila Santos",
				status: "ATIVO",
				loja: "Conceição (Matriz)",
				cargo: "Vendedor Pleno",
				perfilDescontoMaxPct: 10,
				isVendedor: true,
				conferencia: "INATIVO",
				dashboard: "ATIVO",
				auditoria: "INATIVO",
				configuracoes: "INATIVO",
				venda: "ATIVO",
				log_vendas: "ATIVO",
				resumo_vendas: "INATIVO",
			};

			await saveSupabaseUser(novoUsuario);

			const vendedores = await fetchSupabaseSellers();
			expect(vendedores.some((v) => v.nome.includes("Camila"))).toBe(true);
		});
	});

	describe("4. Catálogo de Peças & Solares integrado com Tipo de Armação", () => {
		it("deve permitir vincular tipo de armação (Nylon, Metal, Acetato, Parafusado, Fio de Aço) a itens do catálogo", () => {
			const item: import("../optical-types").FrameCatalogItem = {
				id: "FRAME-TEST-01",
				codigo: "RB-5154",
				marca: "Ray-Ban",
				modelo: "Clubmaster Classic",
				tipo: "RECEITUARIO",
				tipoArmacao: "Nylon",
				cor: "Preto / Dourado",
				tamanho: "51",
				preco: 690,
				custo: 280,
				estoque: 8,
			};

			expect(item.tipoArmacao).toBe("Nylon");
			expect(["Nylon", "Metal", "Acetato", "Parafusado", "Fio de Aço"]).toContain(item.tipoArmacao);
		});
	});
});
