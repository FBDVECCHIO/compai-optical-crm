import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Anti-Translation Shield & Select Component Hardening", () => {
	it("enforces lang=pt-BR, translate=no and notranslate in RootLayout", () => {
		const layoutPath = join(process.cwd(), "apps/app/app/layout.tsx");
		const content = readFileSync(layoutPath, "utf-8");

		expect(content).toContain('lang="pt-BR"');
		expect(content).toContain('translate="no"');
		expect(content).toContain("notranslate");
		expect(content).toContain('google: "notranslate"');
	});

	it("enforces translate=no on SelectTrigger and SelectValue to prevent text multiplication", () => {
		const selectPath = join(process.cwd(), "packages/ui/src/components/select.tsx");
		const content = readFileSync(selectPath, "utf-8");

		expect(content).toContain('translate="no"');
		expect(content).toContain("notranslate");
		expect(content).toContain('data-slot="select-value"');
		expect(content).toContain('data-slot="select-trigger"');
	});

	it("enforces translate=no on Optical Standalone Container", () => {
		const containerPath = join(process.cwd(), "apps/app/app/optical/optical-standalone-container.tsx");
		const content = readFileSync(containerPath, "utf-8");

		expect(content).toContain('translate="no"');
		expect(content).toContain("notranslate");
	});
});
