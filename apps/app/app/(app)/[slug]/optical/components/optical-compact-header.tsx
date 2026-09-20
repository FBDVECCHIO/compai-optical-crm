"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Catalog from "@carbon/icons-react/es/Catalog";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import DeliveryTruck from "@carbon/icons-react/es/DeliveryTruck";
import Events from "@carbon/icons-react/es/Events";
import Logout from "@carbon/icons-react/es/Logout";
import Settings from "@carbon/icons-react/es/Settings";
import ShoppingCart from "@carbon/icons-react/es/ShoppingCart";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import Chat from "@carbon/icons-react/es/Chat";
import Add from "@carbon/icons-react/es/Add";
import Glasses from "@crm/ui/components/icons/glasses";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import type { OpticalUserSession } from "@/lib/optical/supabase-optical";
import type { OpticalModuleTab } from "./optical-top-nav";
import { OpticalThemeToggle } from "./optical-theme-toggle";

export interface OpticalCompactHeaderProps {
	activeModule: OpticalModuleTab;
	isSyncingSupabase?: boolean;
	userSession?: OpticalUserSession | null;
	onLogout?: () => void;
	onNewOrder?: () => void;
}

const moduleLabels: Record<OpticalModuleTab, { label: string; icon: any }> = {
	balcao: { label: "Balcão & Vendas", icon: ShoppingCart },
	jornada_os: { label: "Jornada da OS", icon: DeliveryTruck },
	pos_venda: { label: "Pós-Venda", icon: UserFollow },
	mensagens: { label: "Mensagens WhatsApp", icon: Chat },
	conferencia: { label: "Conferência Lab", icon: CheckmarkOutline },
	lentes: { label: "Catálogo de Lentes", icon: Catalog },
	pecas: { label: "Peças & Solares", icon: Glasses },
	medicos: { label: "Médicos & Clínicas", icon: UserFollow },
	visita_medica: { label: "Visita Médica", icon: Events },
	resumo: { label: "Resumo Gerencial", icon: Analytics },
	garantias: { label: "Garantias & Ocorrências", icon: Glasses },
	log_vendas: { label: "Log de Vendas", icon: Analytics },
	auditoria: { label: "Auditoria IA", icon: Analytics },
	catalogo: { label: "Catálogo Geral", icon: Catalog },
	config: { label: "Configurações do Sistema", icon: Settings },
};

export function OpticalCompactHeader({
	activeModule,
	isSyncingSupabase = false,
	userSession,
	onLogout,
	onNewOrder,
}: OpticalCompactHeaderProps) {
	const current = moduleLabels[activeModule] || {
		label: "MNOC-X Óptica",
		icon: Glasses,
	};

	return (
		<header
			aria-label="Barra Superior do Sistema"
			className="h-12 w-full shrink-0 flex items-center justify-between px-4 border-b bg-white/95 dark:bg-zinc-900/95 border-zinc-300 dark:border-zinc-800 backdrop-blur-xs z-20 shadow-2xs"
		>
			{/* Lado Esquerdo: Breadcrumb do Módulo Ativo + Botão Nova OS */}
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex items-center gap-2">
					<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shrink-0">
						<Icon icon={current.icon} className="size-4" />
					</div>
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="text-xs font-semibold text-zinc-400 hidden sm:inline">
							MNOC-X /
						</span>
						<h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
							{current.label}
						</h1>
					</div>
				</div>

				{onNewOrder && (
					<Button
						size="sm"
						onClick={onNewOrder}
						className="h-7 px-2.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 gap-1 rounded-lg cursor-pointer shadow-2xs"
					>
						<Icon icon={Add} className="size-3.5" />
						<span className="hidden md:inline">Nova OS</span>
					</Button>
				)}
			</div>

			{/* Lado Direito: Sincronização + Usuário + Tema + Logout */}
			<div className="flex items-center gap-2 shrink-0">
				{isSyncingSupabase ? (
					<div
						className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20"
						role="status"
						aria-live="polite"
						title="Sincronizando com o Supabase..."
					>
						<span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
						<span className="hidden sm:inline">Sincronizando</span>
					</div>
				) : (
					<div
						className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20"
						title="Conectado ao Supabase • Seguro"
					>
						<span className="size-1.5 rounded-full bg-emerald-500" />
						<span>Online</span>
					</div>
				)}

				{userSession && (
					<div className="hidden sm:flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 px-2 py-0.5 text-xs">
						<Icon icon={UserAvatar} className="size-3 text-zinc-600 dark:text-zinc-400" />
						<span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px] truncate max-w-[120px]">
							{userSession.nome || userSession.usuario}
						</span>
						<span className="text-[10px] text-zinc-400 hidden xl:inline">
							• {userSession.loja}
						</span>
						{userSession.isAdmin && (
							<Badge
								variant="default"
								className="text-[8px] px-1 py-0 h-3.5 bg-zinc-800 text-white font-bold"
							>
								ADM
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
						className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 gap-1 cursor-pointer border border-rose-200 dark:border-rose-900/40 rounded-lg"
						title="Sair do sistema"
						aria-label="Encerrar sessão"
					>
						<Icon icon={Logout} className="size-3.5" />
						<span className="hidden md:inline">Sair</span>
					</Button>
				)}
			</div>
		</header>
	);
}
