"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Catalog from "@carbon/icons-react/es/Catalog";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import ListChecked from "@carbon/icons-react/es/ListChecked";
import Bot from "@carbon/icons-react/es/Bot";
import Settings from "@carbon/icons-react/es/Settings";
import ShoppingCart from "@carbon/icons-react/es/ShoppingCart";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";

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
}

export function OpticalTopNav({
	activeModule,
	onSelectModule,
	pendingConferenceCount = 2,
	pendingResidualCount = 4,
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

	return (
		<nav
			aria-label="Módulos do Sistema Óptico"
			className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card/90 p-1.5 shadow-xs backdrop-blur-xs w-full"
		>
			{navItems.map((item) => {
				const isActive = activeModule === item.id;
				return (
					<button
						type="button"
						key={item.id}
						onClick={() => onSelectModule(item.id)}
						className={cn(
							"flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
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
		</nav>
	);
}
