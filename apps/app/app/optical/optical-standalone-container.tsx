"use client";

import { Suspense } from "react";
import { GlassesIcon } from "@crm/ui/components/icons/glasses";
import { useOpticalAuth } from "@/lib/optical/optical-auth-context";
import { OpticalLoginView } from "../(app)/[slug]/optical/components/optical-login-view";
import { OpticalClientView } from "../(app)/[slug]/optical/optical-client-view";
import { OpticalThemeToggle } from "../(app)/[slug]/optical/components/optical-theme-toggle";

export function OpticalStandaloneContainer() {
	const { isAuthenticated, isLoading } = useOpticalAuth();

	if (isLoading) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-3 text-muted-foreground text-xs font-semibold">
					<div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md animate-pulse">
						<GlassesIcon className="size-6" />
					</div>
					<span>Carregando Sistema Óptico...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <OpticalLoginView />;
	}

	return (
		<main className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
			{/* Top Bar - Visível exclusivamente após autenticação */}
			<header className="border-b bg-card px-6 py-3.5 flex items-center justify-between shrink-0 shadow-2xs">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
						<GlassesIcon className="size-5" />
					</div>
					<div>
						<h1 className="text-base font-semibold tracking-tight">Balcão Óptico & Ordens de Serviço</h1>
						<p className="text-xs text-muted-foreground">Fusão Comp AI CRM + App Lentes · Gestão de OS, Dioptrias e Laboratórios</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<OpticalThemeToggle showLabel />
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
	);
}
