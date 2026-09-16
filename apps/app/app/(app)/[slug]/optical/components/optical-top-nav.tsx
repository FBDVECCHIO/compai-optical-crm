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
import Events from "@carbon/icons-react/es/Events";
import DeliveryTruck from "@carbon/icons-react/es/DeliveryTruck";
import Chat from "@carbon/icons-react/es/Chat";
import Glasses from "@crm/ui/components/icons/glasses";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import type { OpticalUserSession } from "@/lib/optical/supabase-optical";
import { OpticalThemeToggle } from "./optical-theme-toggle";

export type OpticalModuleTab =
	| "balcao"
	| "jornada_os"
	| "pos_venda"
	| "lentes"
	| "pecas"
	| "mensagens"
	| "conferencia"
	| "garantias"
	| "log_vendas"
	| "resumo"
	| "visita_medica"
	| "medicos"
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
	userSession,
	onLogout,
}: OpticalTopNavProps) {
	// Menus principais oficiais - Estritamente apenas o nome, sem contadores ou badges extras
	const navItems: {
		id: OpticalModuleTab;
		label: string;
		icon: any;
	}[] = [
		{
			id: "balcao",
			label: "Balcão & Vendas",
			icon: ShoppingCart,
		},
		{
			id: "jornada_os",
			label: "Jornada da OS",
			icon: DeliveryTruck,
		},
		{
			id: "pos_venda",
			label: "Pós-Venda",
			icon: UserFollow,
		},
		{
			id: "lentes",
			label: "Lentes",
			icon: Catalog,
		},
		{
			id: "pecas",
			label: "Peças & Solares",
			icon: Glasses,
		},
		{
			id: "mensagens",
			label: "Mensagens WhatsApp",
			icon: Chat,
		},
		{
			id: "conferencia",
			label: "Conferência Lab",
			icon: CheckmarkOutline,
		},
		{
			id: "garantias",
			label: "Garantias",
			icon: WarningAlt,
		},
		{
			id: "resumo",
			label: "Resumo Gerencial",
			icon: Analytics,
		},
		{
			id: "medicos",
			label: "Médicos & Clínicas",
			icon: UserFollow,
		},
		{
			id: "visita_medica",
			label: "Visita Médica",
			icon: Events,
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
		<div className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-3 shadow-xs">
			{/* Linha de topo dentro do card: Logo/Status + Usuário & Logout */}
			<div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs">
						X
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
							MNOC-X
						</span>
						<span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
							• Sistema Óptico de Alta Performance
						</span>
					</div>
				</div>

				{/* Perfil do Usuário e Ações */}
				<div className="flex items-center gap-2">
					{userSession && (
						<div className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs">
							<Icon icon={UserAvatar} className="size-3.5 text-zinc-700 dark:text-zinc-300" />
							<span className="font-semibold text-zinc-900 dark:text-zinc-100">
								{userSession.nome || userSession.usuario}
							</span>
							<span className="text-[10px] text-zinc-500 dark:text-zinc-400">
								• {userSession.loja}
							</span>
							{userSession.isAdmin && (
								<Badge
									variant="default"
									className="text-[9px] px-1.5 py-0 h-4 bg-zinc-800 text-white font-bold"
								>
									ADMIN
								</Badge>
							)}
						</div>
					)}

					<OpticalThemeToggle size="sm" />

					{onLogout && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onLogout}
							className="h-7 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 gap-1 cursor-pointer border border-rose-200 dark:border-rose-900/40"
							title="Encerrar sessão"
						>
							<Icon icon={Logout} className="size-3.5" />
							<span className="hidden sm:inline">Sair</span>
						</Button>
					)}
				</div>
			</div>

			{/* Grade de Navegação: Delimitação bem visível SEMPRE, ocupando 100% do card */}
			<nav
				aria-label="Menus Principais do Sistema"
				className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-1.5 w-full"
			>
				{visibleNavItems.map((item) => {
					const isActive = activeModule === item.id;
					return (
						<button
							type="button"
							key={item.id}
							onClick={() => onSelectModule(item.id)}
							className={cn(
								// Delimitação obrigatória e visível sem o mouse para usuários menos experientes
								"w-full h-11 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
								"flex items-center justify-center gap-1.5 text-center select-none",
								// Estado Ativo: Alto contraste Apple (Preto/Carvão vs Branco)
								isActive
									? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900 dark:border-white font-bold"
									: "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-2 border-zinc-300 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
							)}
						>
							<Icon
								icon={item.icon}
								className={cn(
									"size-3.5 shrink-0",
									isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"
								)}
							/>
							<span className="truncate">{item.label}</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}
