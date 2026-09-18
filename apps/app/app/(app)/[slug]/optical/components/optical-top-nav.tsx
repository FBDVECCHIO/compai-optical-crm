"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Catalog from "@carbon/icons-react/es/Catalog";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
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
	isSyncingSupabase?: boolean;
	userSession?: OpticalUserSession | null;
	onLogout?: () => void;
}

export function OpticalTopNav({
	activeModule,
	onSelectModule,
	isSyncingSupabase = false,
	userSession,
	onLogout,
}: OpticalTopNavProps) {
	// Menus principais oficiais distribuídos em 2 fileiras inteligentes e equilibradas
	// Fileira 1: Operação Comercial & Balcão (5 módulos principais)
	// Fileira 2: Cadastros Técnicos, Relações Médicas & Gestão (6 módulos)
	const row1Items: {
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
			id: "mensagens",
			label: "Mensagens WhatsApp",
			icon: Chat,
		},
		{
			id: "conferencia",
			label: "Conferência Lab",
			icon: CheckmarkOutline,
		},
	];

	const row2Items: {
		id: OpticalModuleTab;
		label: string;
		icon: any;
	}[] = [
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
			id: "resumo",
			label: "Resumo Gerencial",
			icon: Analytics,
		},
	];

	const configItem = {
		id: "config" as OpticalModuleTab,
		label: "Configurações",
		icon: Settings,
	};

	const filterVisible = (items: typeof row1Items) =>
		items.filter((item) => {
			if (!userSession) return true;
			if (userSession.isAdmin) return true;
			return userSession.permissions[item.id] !== false;
		});

	const visibleRow1 = filterVisible(row1Items);
	const visibleRow2 = filterVisible(row2Items);
	const isConfigVisible =
		!userSession || userSession.isAdmin || userSession.permissions.config !== false;

	const renderNavButton = (item: (typeof row1Items)[0]) => {
		const isActive = activeModule === item.id;
		return (
			<button
				type="button"
				key={item.id}
				data-module={item.id}
				onClick={() => onSelectModule(item.id)}
				aria-label={`Acessar módulo de ${item.label}`}
				aria-current={isActive ? "page" : undefined}
				title={`Ir para ${item.label}`}
				className={cn(
					"w-full h-11 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
					"flex items-center justify-center gap-2 text-center select-none",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white focus-visible:ring-offset-2",
					isActive
						? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900 dark:border-white font-bold"
						: "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-300 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
				)}
			>
				<Icon
					icon={item.icon}
					className={cn(
						"size-4 shrink-0",
						isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"
					)}
				/>
				<span className="whitespace-nowrap font-semibold text-xs leading-none">
					{item.label}
				</span>
			</button>
		);
	};

	const renderConfigButton = (item: typeof configItem) => {
		const isActive = activeModule === item.id;
		return (
			<button
				type="button"
				key={item.id}
				data-module={item.id}
				onClick={() => onSelectModule(item.id)}
				aria-label={`Acessar módulo de ${item.label}`}
				aria-current={isActive ? "page" : undefined}
				title={`Ir para ${item.label}`}
				className={cn(
					"w-full h-full min-h-[96px] px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
					"flex flex-col items-center justify-center gap-1.5 text-center select-none",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white focus-visible:ring-offset-2",
					isActive
						? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900 dark:border-white font-bold"
						: "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-300 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
				)}
			>
				<Icon
					icon={item.icon}
					className={cn(
						"size-5 shrink-0 transition-transform duration-300 hover:rotate-45",
						isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"
					)}
				/>
				<span className="font-semibold text-xs leading-tight whitespace-nowrap">
					{item.label}
				</span>
			</button>
		);
	};

	return (
		<div className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-3 shadow-xs">
			{/* Linha de topo dentro do card: Logo/Status + Sincronização + Usuário & Logout */}
			<div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs">
						X
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
							MNOC-X
						</span>
						<span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
							• Sistema Óptico de Alta Performance
						</span>
					</div>
				</div>

				{/* Perfil do Usuário, Sincronização e Ações */}
				<div className="flex items-center gap-2">
					{isSyncingSupabase ? (
						<div
							className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium border border-amber-500/20"
							role="status"
							aria-live="polite"
							title="Sincronizando dados em segundo plano com o banco de dados Supabase"
						>
							<span className="size-2 rounded-full bg-amber-500 animate-ping" />
							<span>Sincronizando...</span>
						</div>
					) : (
						<div
							className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20"
							title="Conexão com a nuvem ativa e dados sincronizados"
						>
							<span className="size-2 rounded-full bg-emerald-500" />
							<span>Online • Seguro</span>
						</div>
					)}

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
							title="Encerrar sessão no MNOC-X"
							aria-label="Sair do sistema óptico"
						>
							<Icon icon={Logout} className="size-3.5" />
							<span className="hidden sm:inline">Sair</span>
						</Button>
					)}
				</div>
			</div>

			{/* Grade de Navegação: 5 botões em cima, 5 embaixo (mesma largura) + Configurações à direita ocupando as duas linhas */}
			<nav
				aria-label="Navegação Principal do MNOC-X"
				className="w-full"
			>
				<div className="flex flex-col md:flex-row items-stretch gap-2 w-full">
					{/* Bloco Esquerda/Central: 2 fileiras perfeitamente simétricas com 5 botões de largura rigorosamente idêntica */}
					<div className="flex-1 flex flex-col gap-2 min-w-0">
						{/* Linha 1: Operação Comercial & Balcão (5 colunas) */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
							{visibleRow1.map(renderNavButton)}
						</div>
						{/* Linha 2: Cadastros Técnicos, Relações Médicas & Gestão (5 colunas) */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
							{visibleRow2.map(renderNavButton)}
						</div>
					</div>

					{/* Bloco da Direita: Configurações ocupando a altura das 2 linhas no desktop */}
					{isConfigVisible && (
						<div className="hidden md:flex w-36 shrink-0">
							{renderConfigButton(configItem)}
						</div>
					)}
				</div>

				{/* Fallback Mobile para Configurações em telas menores que md */}
				{isConfigVisible && (
					<div className="md:hidden mt-2">
						{renderNavButton(configItem)}
					</div>
				)}
			</nav>
		</div>
	);
}
