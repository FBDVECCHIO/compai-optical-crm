import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Aro 2 Diopters Locking and Monofocal Addition Hardening", () => {
	it("enforces allowOnlyDnpAndAlt and lockAddition prop interfaces", () => {
		const tablePath = join(process.cwd(), "apps/app/app/(app)/[slug]/optical/components/optical-diopters-table.tsx");
		const content = readFileSync(tablePath, "utf-8");

		expect(content).toContain("allowOnlyDnpAndAlt?: boolean");
		expect(content).toContain("lockAddition?: boolean");
		expect(content).toContain("disabled={readOnly || allowOnlyDnpAndAlt}");
		expect(content).toContain("disabled={readOnly || lockAddition}");
		expect(content).toContain("Grau Monofocal: Adição n/a");
	});
});
