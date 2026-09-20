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
		<main
			translate="no"
			className="notranslate h-screen bg-zinc-200 dark:bg-zinc-950 text-foreground flex flex-col overflow-hidden"
		>
			{/* Main Optical Client View com Top Nav Engessado */}
			<div className="flex-1 flex min-h-0 overflow-hidden">
				<Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Carregando MNOC-X...</div>}>
					<OpticalClientView />
				</Suspense>
			</div>
		</main>
	);
}
