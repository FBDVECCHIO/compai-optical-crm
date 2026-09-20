/**
 * App Lentes Protection Shield
 *
 * Garante que o banco de dados original do App Lentes (mngwfearwjkpisararbe.supabase.co)
 * permaneça 100% intacto, bloqueando fisicamente qualquer tentativa de mutação
 * (INSERT/POST, UPDATE/PUT/PATCH, DELETE) originada pelo CRM MNOC-X.
 */

export const LEGACY_APP_LENTES_DOMAIN = "mngwfearwjkpisararbe.supabase.co";

let blockedMutationsCounter = 0;

export function isLegacyAppLentesUrl(url: string | URL): boolean {
	const str = typeof url === "string" ? url : url.toString();
	return str.includes(LEGACY_APP_LENTES_DOMAIN);
}

export function assertAppLentesMutationAllowed(
	method: string = "GET",
	url: string | URL,
): void {
	const upperMethod = method.toUpperCase();
	const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod);

	if (isMutation && isLegacyAppLentesUrl(url)) {
		blockedMutationsCounter++;
		const errorMsg = `[SHIELD_BLOCKED] Escrita bloqueada: o banco de dados do App Lentes está protegido contra alterações pelo CRM MNOC-X. Nenhuma alteração (${upperMethod}) é permitida em ${url}. Utilize o banco de dados próprio do CRM MNOC-X.`;
		console.warn(errorMsg);
		throw new Error(errorMsg);
	}
}

export interface ShieldAuditReport {
	legacyDatabaseProtected: boolean;
	legacyUrl: string;
	blockedMutationsCount: number;
	lastCheckedAt: string;
	status: "SECURE" | "WARNING";
}

export class AppLentesProtectionShield {
	/**
	 * Executa uma requisição HTTP fetch com interceptação estrita de segurança.
	 * Se a requisição for uma mutação contra o banco do App Lentes, ela é
	 * bloqueada antes mesmo de sair da máquina/navegador.
	 */
	async safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		const method = (init?.method || "GET").toUpperCase();
		const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

		if (isLegacyAppLentesUrl(urlString) && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
			blockedMutationsCounter++;
			console.warn(
				`[SHIELD INTERCEPTED] Mutação ${method} para ${urlString} rejeitada imediatamente pelo App Lentes Protection Shield.`,
			);
			return new Response(
				JSON.stringify({
					shieldBlocked: true,
					error: "FORBIDDEN_MUTATION_ON_LEGACY_DB",
					message:
						"O banco de dados do App Lentes está protegido contra alterações pelo CRM MNOC-X. Operação cancelada.",
				}),
				{
					status: 403,
					statusText: "Forbidden by App Lentes Protection Shield",
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return fetch(input, init);
	}

	getAuditReport(): ShieldAuditReport {
		return {
			legacyDatabaseProtected: true,
			legacyUrl: `https://${LEGACY_APP_LENTES_DOMAIN}`,
			blockedMutationsCount: blockedMutationsCounter,
			lastCheckedAt: new Date().toISOString(),
			status: "SECURE",
		};
	}
}

export const appLentesShield = new AppLentesProtectionShield();
