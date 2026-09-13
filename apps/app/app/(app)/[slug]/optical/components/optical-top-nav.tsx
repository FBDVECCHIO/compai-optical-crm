"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Catalog from "@carbon/icons-react/es/Catalog";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import ListChecked from "@carbon/icons-react/es/ListChecked";
import Bot from "@carbon/icons-react/es/Bot";
import Logout from "@carbon/icons-react/es/Logout";
import Settings from "@carbon/icons-react/es/Settings";
import ShoppingCart from "@carbon/icons-react/es/ShoppingCart";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import type { OpticalUserSession } from "@/lib/optical/supabase-optical";

export type OpticalModuleTab =
	| "balcao"
	| "conferencia"
	| "log_vendas"
	| "resumo"
	| "medicos"
	| "garantias"
	| "auditoria"
	| "catalogo"
	| "config";

interface OpticalTopNavProps {
	activeModule: OpticalModuleTab;
	onSelectModule: (tab: OpticalModuleTab) => void;
	pendingConferenceCount?: number;
	pendingResidualCount?: number;
	userSession?: OpticalUserSession | null;
	onLogout?: () => void;
}

export function OpticalTopNav({
	activeModule,
	onSelectModule,
	pendingConferenceCount = 2,
	pendingResidualCount = 4,
	userSession,
	onLogout,
}: OpticalTopNavProps) {
	const navItems: {
		id: OpticalModuleTab;
		label: string;
		icon: any;
		badge?: number | string;
		badgeVariant?: "default" | "secondary" | "destructive" | "outline";
	}[] = [
		{
			id: "balcao",
			label: "Balcão e Vendas",
			icon: ShoppingCart,
		},
		{
			id: "conferencia",
			label: "Conferência Lab",
			icon: CheckmarkOutline,
			badge: pendingConferenceCount > 0 ? pendingConferenceCount : undefined,
			badgeVariant: "destructive",
		},
		{
			id: "log_vendas",
			label: "Log de Vendas",
			icon: ListChecked,
			badge: pendingResidualCount > 0 ? `${pendingResidualCount} resid.` : undefined,
			badgeVariant: "secondary",
		},
		{
			id: "resumo",
			label: "Resumo Gerencial",
			icon: Analytics,
		},
		{
			id: "medicos",
			label: "Resultado Médico",
			icon: UserFollow,
		},
		{
			id: "garantias",
			label: "Garantias & Ocorrências",
			icon: WarningAlt,
		},
		{
			id: "auditoria",
			label: "Auditoria e Agente IA",
			icon: Bot,
			badge: "IA Ativa",
			badgeVariant: "outline",
		},
		{
			id: "catalogo",
			label: "Catálogo e Estoque",
			icon: Catalog,
		},
		{
			id: "config",
			label: "Configurações",
			icon: Settings,
		},
	];

	const visibleNavItems = navItems.filter((item) => {
		if (!userSession) return true;
		if (userSession.isAdmin) return true;
		return userSession.permissions[item.id] !== false;
	});

	return (
		<nav
			aria-label="Módulos do Sistema Óptico"
			className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border bg-card/90 p-1.5 shadow-xs backdrop-blur-xs w-full"
		>
			<div className="flex flex-wrap items-center gap-1.5">
				{visibleNavItems.map((item) => {
					const isActive = activeModule === item.id;
					return (
						<button
							type="button"
							key={item.id}
							onClick={() => onSelectModule(item.id)}
							className={cn(
								"flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
								isActive
									? "bg-primary text-primary-foreground shadow-xs font-bold"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							<Icon icon={item.icon} className="size-4 shrink-0" />
							<span>{item.label}</span>
							{item.badge && (
								<span
									className={cn(
										"ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-tight",
										isActive
											? "bg-primary-foreground/20 text-primary-foreground"
											: item.badgeVariant === "destructive"
												? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
												: "bg-muted text-muted-foreground border",
									)}
								>
									{item.badge}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* User Profile & Logout (Right) */}
			{userSession && (
				<div className="flex items-center gap-2 ml-auto pr-1">
					<div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 text-xs">
						<Icon icon={UserAvatar} className="size-3.5 text-primary" />
						<span className="font-semibold text-foreground">
							{userSession.nome || userSession.usuario}
						</span>
						<span className="text-[10px] text-muted-foreground">
							• {userSession.loja}
						</span>
						{userSession.isAdmin && (
							<Badge
								variant="default"
								className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold"
							>
								ADMIN
							</Badge>
						)}
					</div>

					{onLogout && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onLogout}
							className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 gap-1 cursor-pointer"
							title="Encerrar sessão"
						>
							<Icon icon={Logout} className="size-3.5" />
							<span className="hidden sm:inline">Sair</span>
						</Button>
					)}
				</div>
			)}
		</nav>
	);
}
