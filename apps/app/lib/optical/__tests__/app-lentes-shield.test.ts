import { describe, expect, it } from "bun:test";
import {
	AppLentesProtectionShield,
	isLegacyAppLentesUrl,
	assertAppLentesMutationAllowed,
} from "../app-lentes-shield";

describe("AppLentesProtectionShield", () => {
	it("detecta corretamente a URL do Supabase legado do App Lentes", () => {
		expect(isLegacyAppLentesUrl("https://mngwfearwjkpisararbe.supabase.co/rest/v1/vendas")).toBe(true);
		expect(isLegacyAppLentesUrl("https://mngwfearwjkpisararbe.supabase.co")).toBe(true);
		expect(isLegacyAppLentesUrl("https://outro-supabase.supabase.co")).toBe(false);
		expect(isLegacyAppLentesUrl("https://mnocx-crm.supabase.co/rest/v1/vendas")).toBe(false);
		expect(isLegacyAppLentesUrl("/api/mnocx/database")).toBe(false);
	});

	it("bloqueia mutações (POST, PUT, PATCH, DELETE) contra o banco do App Lentes", () => {
		const targetUrl = "https://mngwfearwjkpisararbe.supabase.co/rest/v1/vendas";
		
		expect(() => assertAppLentesMutationAllowed("POST", targetUrl)).toThrow(
			/App Lentes está protegido contra alterações pelo CRM MNOC-X/,
		);
		expect(() => assertAppLentesMutationAllowed("PUT", targetUrl)).toThrow(
			/App Lentes está protegido contra alterações pelo CRM MNOC-X/,
		);
		expect(() => assertAppLentesMutationAllowed("PATCH", targetUrl)).toThrow(
			/App Lentes está protegido contra alterações pelo CRM MNOC-X/,
		);
		expect(() => assertAppLentesMutationAllowed("DELETE", targetUrl)).toThrow(
			/App Lentes está protegido contra alterações pelo CRM MNOC-X/,
		);
	});

	it("permite leitura (GET) e não lança erro", () => {
		const targetUrl = "https://mngwfearwjkpisararbe.supabase.co/rest/v1/lojas";
		expect(() => assertAppLentesMutationAllowed("GET", targetUrl)).not.toThrow();
	});

	it("permite qualquer método em bancos dedicados MNOC-X", () => {
		const targetUrl = "https://mnocx-crm.supabase.co/rest/v1/vendas";
		expect(() => assertAppLentesMutationAllowed("POST", targetUrl)).not.toThrow();
		expect(() => assertAppLentesMutationAllowed("DELETE", targetUrl)).not.toThrow();
	});

	it("interceptFetch substitui e protege chamadas fetch nativas", async () => {
		const shield = new AppLentesProtectionShield();
		const legacyUrl = "https://mngwfearwjkpisararbe.supabase.co/rest/v1/vendas";

		const blockedResult = await shield.safeFetch(legacyUrl, {
			method: "POST",
			body: JSON.stringify({ os_venda: "TESTE" }),
		});

		expect(blockedResult.ok).toBe(false);
		expect(blockedResult.status).toBe(403);
		const data = await blockedResult.json();
		expect(data.shieldBlocked).toBe(true);
		expect(data.message).toContain("App Lentes está protegido");
	});

	it("fornece relatório de auditoria de isolamento", () => {
		const shield = new AppLentesProtectionShield();
		const report = shield.getAuditReport();
		expect(report.legacyDatabaseProtected).toBe(true);
		expect(report.legacyUrl).toContain("mngwfearwjkpisararbe");
		expect(report.blockedMutationsCount).toBeGreaterThanOrEqual(1);
	});
});
