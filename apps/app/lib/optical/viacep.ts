export interface ViaCepAddress {
	cep: string;
	logradouro: string;
	complemento: string;
	bairro: string;
	localidade: string;
	uf: string;
	ibge?: string;
	gia?: string;
	ddd?: string;
	siafi?: string;
	erro?: boolean;
}

export interface NormalizedAddress {
	cep: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
	complement?: string;
}

const cepCache = new Map<string, NormalizedAddress>();

export async function fetchViaCep(
	rawCep?: string | null,
): Promise<NormalizedAddress | null> {
	if (!rawCep) return null;
	const cleaned = String(rawCep).replace(/\D/g, "");
	if (cleaned.length !== 8) return null;

	const cached = cepCache.get(cleaned);
	if (cached) {
		return cached;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 6000);

		const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`, {
			signal: controller.signal,
			headers: { Accept: "application/json" },
		});
		clearTimeout(timeoutId);

		if (!response.ok) return null;

		const data: ViaCepAddress = await response.json();
		if (data.erro) return null;

		const result: NormalizedAddress = {
			cep: cleaned.replace(/(\d{5})(\d{3})/, "$1-$2"),
			street: data.logradouro || "",
			neighborhood: data.bairro || "",
			city: data.localidade || "",
			state: data.uf || "",
			complement: data.complemento || "",
		};

		cepCache.set(cleaned, result);
		return result;
	} catch (error) {
		console.warn("Falha ao consultar ViaCEP:", error);
		return null;
	}
}

export function formatCep(val?: string | null): string {
	if (!val) return "";
	const digits = String(val).replace(/\D/g, "").slice(0, 8);
	if (digits.length <= 5) return digits;
	return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(val?: string | null): string {
	if (!val) return "";
	const digits = String(val).replace(/\D/g, "").slice(0, 11);
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
	if (digits.length <= 9)
		return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
	return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(val?: string | null): string {
	if (!val) return "";
	const digits = String(val).replace(/\D/g, "").slice(0, 11);
	if (digits.length <= 2) return digits ? `(${digits}` : "";
	if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 10)
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
