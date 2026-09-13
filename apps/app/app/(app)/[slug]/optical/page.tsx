import type { Metadata } from "next";
import { Suspense } from "react";
import {
	PageShell,
	PageShellActions,
	PageShellContent,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellLoading,
	PageShellTitle,
} from "@/components/page-shell";
import { requireSession } from "@/lib/session";
import { CreateOpticalOrderSheet } from "./components/create-optical-order-sheet";
import { OpticalClientView } from "./optical-client-view";

export const metadata: Metadata = {
	title: "Balcão Óptico & Ordens de Serviço",
	description:
		"Gestão de balcão óptico, armações Aro 1/Aro 2, dioptrias, laboratórios parceiros e ordens de serviço.",
};

export default function OpticalPage() {
	return (
		<PageShell className="min-h-0">
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Balcão Óptico & Ordens de Serviço</PageShellTitle>
					<PageShellDescription>
						Gestão de vendas ópticas, confecção de lentes, auditoria IA de
						laboratório e controle de saldo residual.
					</PageShellDescription>
				</PageShellHeading>
				<PageShellActions>
					<CreateOpticalOrderSheet />
				</PageShellActions>
			</PageShellHeader>

			<PageShellContent className="min-h-0 p-0">
				<Suspense fallback={<PageShellLoading />}>
					<OpticalContent />
				</Suspense>
			</PageShellContent>
		</PageShell>
	);
}

import { OpticalAuthProvider } from "@/lib/optical/optical-auth-context";

async function OpticalContent() {
	await requireSession();
	return (
		<OpticalAuthProvider>
			<OpticalClientView />
		</OpticalAuthProvider>
	);
}
