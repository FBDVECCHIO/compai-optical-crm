import { describe, expect, it } from "bun:test";
import {
	BRAZILIAN_UFS,
	isValidBrazilianUF,
	normalizeCrm,
	isDummyCrmNumber,
	validateCrm,
	normalizeDoctorName,
	isDoctorDuplicate,
	lookupCfmDoctor,
} from "../doctor-validation";
import type { DoctorItem } from "../supabase-optical";

describe("doctor-validation", () => {
	describe("normalizeCrm", () => {
		it("preserves already normalized CRM", () => {
			expect(normalizeCrm("151798/SP")).toBe("151798/SP");
			expect(normalizeCrm("12345/MG")).toBe("12345/MG");
		});

		it("normalizes lowercase UF with slash", () => {
			expect(normalizeCrm("151798/sp")).toBe("151798/SP");
			expect(normalizeCrm("12345/mg")).toBe("12345/MG");
		});

		it("normalizes digits without slash and lowercase UF", () => {
			expect(normalizeCrm("151798sp")).toBe("151798/SP");
			expect(normalizeCrm("12345mg")).toBe("12345/MG");
			expect(normalizeCrm("151798SP")).toBe("151798/SP");
		});

		it("handles hyphen and whitespace variations", () => {
			expect(normalizeCrm("151798-SP")).toBe("151798/SP");
			expect(normalizeCrm(" 151798 / sp ")).toBe("151798/SP");
			expect(normalizeCrm("12345 mg")).toBe("12345/MG");
		});

		it("strips CRM prefix", () => {
			expect(normalizeCrm("CRM 151798/SP")).toBe("151798/SP");
			expect(normalizeCrm("crm: 12345-mg")).toBe("12345/MG");
			expect(normalizeCrm("CRM/SP 151798")).toBe("151798/SP");
		});

		it("handles UF before digits", () => {
			expect(normalizeCrm("SP 151798")).toBe("151798/SP");
			expect(normalizeCrm("SP/151798")).toBe("151798/SP");
			expect(normalizeCrm("sp151798")).toBe("151798/SP");
		});

		it("returns empty string for falsy input", () => {
			expect(normalizeCrm("")).toBe("");
		});
	});

	describe("isValidBrazilianUF", () => {
		it("validates all 27 Brazilian UFs", () => {
			expect(BRAZILIAN_UFS.length).toBe(27);
			for (const uf of BRAZILIAN_UFS) {
				expect(isValidBrazilianUF(uf)).toBe(true);
				expect(isValidBrazilianUF(uf.toLowerCase())).toBe(true);
			}
		});

		it("rejects invalid UFs", () => {
			expect(isValidBrazilianUF("XX")).toBe(false);
			expect(isValidBrazilianUF("ZZ")).toBe(false);
			expect(isValidBrazilianUF("USA")).toBe(false);
			expect(isValidBrazilianUF("")).toBe(false);
		});
	});

	describe("isDummyCrmNumber", () => {
		it("detects repeated digits (000, 1111, 99999, etc)", () => {
			expect(isDummyCrmNumber("000")).toBe(true);
			expect(isDummyCrmNumber("0000")).toBe(true);
			expect(isDummyCrmNumber("1111")).toBe(true);
			expect(isDummyCrmNumber("99999")).toBe(true);
			expect(isDummyCrmNumber("88888888")).toBe(true);
		});

		it("detects ascending trivial sequences (1234, 12345, 123456, etc)", () => {
			expect(isDummyCrmNumber("1234")).toBe(true);
			expect(isDummyCrmNumber("12345")).toBe(true);
			expect(isDummyCrmNumber("123456")).toBe(true);
			expect(isDummyCrmNumber("1234567")).toBe(true);
			expect(isDummyCrmNumber("23456")).toBe(true);
		});

		it("detects descending trivial sequences (4321, 54321, 654321, etc)", () => {
			expect(isDummyCrmNumber("4321")).toBe(true);
			expect(isDummyCrmNumber("54321")).toBe(true);
			expect(isDummyCrmNumber("654321")).toBe(true);
			expect(isDummyCrmNumber("987654")).toBe(true);
		});

		it("detects cyclic trivial sequences (1212, 123123)", () => {
			expect(isDummyCrmNumber("1212")).toBe(true);
			expect(isDummyCrmNumber("123123")).toBe(true);
		});

		it("allows legitimate doctor CRM numbers", () => {
			expect(isDummyCrmNumber("151798")).toBe(false);
			expect(isDummyCrmNumber("162400")).toBe(false);
			expect(isDummyCrmNumber("144920")).toBe(false);
			expect(isDummyCrmNumber("98412")).toBe(false);
			expect(isDummyCrmNumber("741852")).toBe(false);
		});
	});

	describe("validateCrm", () => {
		it("validates legitimate CRMs with auto-normalization", () => {
			const res1 = validateCrm("151798/SP");
			expect(res1.isValid).toBe(true);
			expect(res1.normalizedCrm).toBe("151798/SP");

			const res2 = validateCrm("54123/MG");
			expect(res2.isValid).toBe(true);
			expect(res2.normalizedCrm).toBe("54123/MG");

			const res3 = validateCrm("151798sp");
			expect(res3.isValid).toBe(true);
			expect(res3.normalizedCrm).toBe("151798/SP");

			const res4 = validateCrm("98412/rj");
			expect(res4.isValid).toBe(true);
			expect(res4.normalizedCrm).toBe("98412/RJ");
		});

		it("rejects empty CRM", () => {
			const res = validateCrm("");
			expect(res.isValid).toBe(false);
			expect(res.error).toBeDefined();
		});

		it("rejects CRMs with fewer than 4 digits", () => {
			const res = validateCrm("123/SP");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("4 e 8 dígitos");
		});

		it("rejects CRMs with more than 8 digits", () => {
			const res = validateCrm("123456789/SP");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("4 e 8 dígitos");
		});

		it("rejects non-numeric characters in CRM number", () => {
			const res = validateCrm("ABCDE/SP");
			expect(res.isValid).toBe(false);
		});

		it("rejects invalid UFs", () => {
			const res = validateCrm("151798/XX");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("inválida");
		});

		it("rejects dummy repeated sequences (0000, 1111, 99999)", () => {
			const res1 = validateCrm("0000/SP");
			expect(res1.isValid).toBe(false);
			expect(res1.error).toContain("dummy");

			const res2 = validateCrm("1111/SP");
			expect(res2.isValid).toBe(false);
			expect(res2.error).toContain("dummy");

			const res3 = validateCrm("99999/SP");
			expect(res3.isValid).toBe(false);
			expect(res3.error).toContain("dummy");
		});

		it("rejects dummy trivial sequences (1234, 12345, 123456)", () => {
			const res1 = validateCrm("1234/SP");
			expect(res1.isValid).toBe(false);
			expect(res1.error).toContain("dummy");

			const res2 = validateCrm("12345/MG");
			expect(res2.isValid).toBe(false);
			expect(res2.error).toContain("dummy");

			const res3 = validateCrm("123456/RJ");
			expect(res3.isValid).toBe(false);
			expect(res3.error).toContain("dummy");
		});
	});

	describe("normalizeDoctorName", () => {
		it("removes Dr. and Dra. prefixes", () => {
			expect(normalizeDoctorName("Dr. Thiago de Souza Queiroz")).toBe("thiago de souza queiroz");
			expect(normalizeDoctorName("Dra. Camila Ribeiro")).toBe("camila ribeiro");
			expect(normalizeDoctorName("Dr Roberto Mendonça")).toBe("roberto mendonca");
		});

		it("removes Doutor and Doutora prefixes", () => {
			expect(normalizeDoctorName("Doutor Carlos Eduardo")).toBe("carlos eduardo");
			expect(normalizeDoctorName("Doutora Patricia Alencar")).toBe("patricia alencar");
		});

		it("removes diacritics / accents", () => {
			expect(normalizeDoctorName("André Silveira Gonçalves")).toBe("andre silveira goncalves");
			expect(normalizeDoctorName("João Lúcio Álvares")).toBe("joao lucio alvares");
		});

		it("collapses multiple spaces and trims", () => {
			expect(normalizeDoctorName("  Dr.   Thiago   de Souza  ")).toBe("thiago de souza");
		});
	});

	describe("isDoctorDuplicate", () => {
		const existingDoctors: DoctorItem[] = [
			{ id: 1, nome: "Dr. Thiago de Souza Queiroz", crm: "151798/SP", representante: "Juliana Representante" },
			{ id: 2, nome: "Dra. Camila Ribeiro", crm: "162400/SP", representante: "Marcos Consultor" },
			{ id: 3, nome: "Dr. Roberto Mendonça", crm: "144920/SP", representante: "Juliana Representante" },
		];

		it("detects duplication by CRM (even with different casing or formatting)", () => {
			const result = isDoctorDuplicate(
				{ nome: "Dr. Outro Nome", crm: "151798/sp" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toContain("CRM 151798/SP já cadastrado");
			expect(result.existingDoctor?.nome).toBe("Dr. Thiago de Souza Queiroz");
		});

		it("detects duplication by unformatted CRM (e.g. without slash)", () => {
			const result = isDoctorDuplicate(
				{ nome: "Dr. Alguém", crm: "162400SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toContain("CRM 162400/SP já cadastrado");
			expect(result.existingDoctor?.nome).toBe("Dra. Camila Ribeiro");
		});

		it("detects duplication by identical normalized name (ignoring titles and accents)", () => {
			const result = isDoctorDuplicate(
				{ nome: "Thiago de Souza Queiroz", crm: "998877/SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toContain("nome idêntico");
			expect(result.existingDoctor?.crm).toBe("151798/SP");
		});

		it("detects duplication by name with title variant (e.g. Dr vs Dra vs sem título)", () => {
			const result = isDoctorDuplicate(
				{ nome: "Camila Ribeiro", crm: "887766/SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toContain("nome idêntico");
		});

		it("detects duplication by name with accents removed", () => {
			const result = isDoctorDuplicate(
				{ nome: "Roberto Mendonca", crm: "776655/SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toContain("nome idêntico");
		});

		it("allows new doctor when neither CRM nor Name collides", () => {
			const result = isDoctorDuplicate(
				{ nome: "Dr. Fernando Rocha", crm: "984120/SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(false);
			expect(result.existingDoctor).toBeUndefined();
		});

		it("does not report self as duplicate when updating existing doctor by ID", () => {
			const result = isDoctorDuplicate(
				{ id: 1, nome: "Dr. Thiago de Souza Queiroz", crm: "151798/SP" },
				existingDoctors,
			);
			expect(result.isDuplicate).toBe(false);
		});
	});

	describe("lookupCfmDoctor", () => {
		it("returns status ATIVO and especialidade Oftalmologia for valid CRM", async () => {
			const res = await lookupCfmDoctor("151798/SP");
			expect(res.regular).toBe(true);
			expect(res.status).toBe("ATIVO");
			expect(res.especialidade).toBe("Oftalmologia");
			expect(res.crm).toBe("151798/SP");
			expect(res.uf).toBe("SP");
		});

		it("handles lowercase CRM in CFM lookup", async () => {
			const res = await lookupCfmDoctor("984120/mg");
			expect(res.regular).toBe(true);
			expect(res.status).toBe("ATIVO");
			expect(res.especialidade).toBe("Oftalmologia");
			expect(res.crm).toBe("984120/MG");
			expect(res.uf).toBe("MG");
		});

		it("returns NAO_ENCONTRADO for dummy or invalid CRM", async () => {
			const res = await lookupCfmDoctor("0000/SP");
			expect(res.regular).toBe(false);
			expect(res.status).toBe("NAO_ENCONTRADO");
			expect(res.especialidade).toBe("Não localizada");
		});
	});
});
