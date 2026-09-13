import { Suspense } from "react";
import { GlassesIcon } from "@crm/ui/components/icons/glasses";
import { OpticalClientView } from "../(app)/[slug]/optical/optical-client-view";
import { OpticalAuthProvider } from "@/lib/optical/optical-auth-context";

export const metadata = {
	title: "Balcão Óptico & Ordens de Serviço | Comp AI CRM",
	description: "Módulo de vendas rápidas de armações, lentes oftálmicas e gestão de ordens de serviço.",
};

export default function StandaloneOpticalPage() {
	return (
		<OpticalAuthProvider>
			<main className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
				{/* Top Bar */}
				<header className="border-b bg-card px-6 py-3.5 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
							<GlassesIcon className="size-5" />
						</div>
						<div>
							<h1 className="text-base font-semibold tracking-tight">Balcão Óptico & Ordens de Serviço</h1>
							<p className="text-xs text-muted-foreground">Fusão Comp AI CRM + App Lentes · Gestão de OS, Dioptrias e Laboratórios</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
							Copiloto IA Ativo
						</span>
					</div>
				</header>

				{/* Main Optical Client View */}
				<div className="flex-1 flex min-h-0 overflow-hidden">
					<Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Carregando balcão óptico...</div>}>
						<OpticalClientView />
					</Suspense>
				</div>
			</main>
		</OpticalAuthProvider>
	);
}
