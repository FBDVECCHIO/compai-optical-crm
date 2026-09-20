"use client";

import Analytics from "@carbon/icons-react/es/Analytics";
import Catalog from "@carbon/icons-react/es/Catalog";
import CheckmarkOutline from "@carbon/icons-react/es/CheckmarkOutline";
import ChevronLeft from "@carbon/icons-react/es/ChevronLeft";
import ChevronRight from "@carbon/icons-react/es/ChevronRight";
import DeliveryTruck from "@carbon/icons-react/es/DeliveryTruck";
import Events from "@carbon/icons-react/es/Events";
import Logout from "@carbon/icons-react/es/Logout";
import Settings from "@carbon/icons-react/es/Settings";
import ShoppingCart from "@carbon/icons-react/es/ShoppingCart";
import UserAvatar from "@carbon/icons-react/es/UserAvatar";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import Chat from "@carbon/icons-react/es/Chat";
import Glasses from "@crm/ui/components/icons/glasses";
import { Badge } from "@crm/ui/components/badge";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import type { OpticalUserSession } from "@/lib/optical/supabase-optical";
import type { OpticalModuleTab } from "./optical-top-nav";

export interface OpticalSidebarProps {
	activeModule: OpticalModuleTab;
	onSelectModule: (tab: OpticalModuleTab) => void;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	userSession?: OpticalUserSession | null;
	onLogout?: () => void;
}

interface NavMenuItem {
	id: OpticalModuleTab;
	label: string;
	icon: any;
}

interface NavGroup {
	title: string;
	items: NavMenuItem[];
}

export function OpticalSidebar({
	activeModule,
	onSelectModule,
	isCollapsed,
	onToggleCollapsed,
	userSession,
	onLogout,
}: OpticalSidebarProps) {
	const groups: NavGroup[] = [
		{
			title: "Operação Comercial",
			items: [
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
					label: "WhatsApp",
					icon: Chat,
				},
				{
					id: "conferencia",
					label: "Conferência Lab",
					icon: CheckmarkOutline,
				},
			],
		},
		{
			title: "Técnico & Cadastros",
			items: [
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
			],
		},
		{
			title: "Gestão & Sistema",
			items: [
				{
					id: "resumo",
					label: "Resumo Gerencial",
					icon: Analytics,
				},
				{
					id: "config",
					label: "Configurações",
					icon: Settings,
				},
			],
		},
	];

	// Filtragem de permissões por usuário
	const isItemVisible = (id: OpticalModuleTab) => {
		if (!userSession) return true;
		if (userSession.isAdmin) return true;
		return userSession.permissions[id] !== false;
	};

	return (
		<aside
			aria-label="Menu Lateral do MNOC-X"
			className={cn(
				"h-full shrink-0 flex flex-col justify-between select-none z-30 transition-all duration-200 ease-in-out border-r",
				"bg-zinc-100/95 dark:bg-zinc-900/95 border-zinc-300 dark:border-zinc-800 backdrop-blur-xs",
				isCollapsed ? "w-16" : "w-56"
			)}
		>
			{/* Topo da Sidebar: Marca MNOC-X e Botão de Expandir/Contrair */}
			<div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 h-13">
				{!isCollapsed && (
					<div className="flex items-center gap-2 min-w-0 pl-1">
						<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs shrink-0">
							X
						</div>
						<div className="min-w-0">
							<span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono block leading-tight">
								MNOC-X
							</span>
							<span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block truncate">
								Óptico CRM
							</span>
						</div>
					</div>
				)}

				{isCollapsed && (
					<div className="w-full flex justify-center">
						<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs">
							X
						</div>
					</div>
				)}

				{!isCollapsed && (
					<button
						type="button"
						onClick={onToggleCollapsed}
						className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/70 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
						title="Contrair menu lateral (mostrar apenas ícones)"
						aria-label="Contrair menu lateral"
					>
						<Icon icon={ChevronLeft} className="size-4" />
					</button>
				)}
			</div>

			{/* Botão de expansão no modo recolhido no topo */}
			{isCollapsed && (
				<div className="p-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-center">
					<button
						type="button"
						onClick={onToggleCollapsed}
						className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/70 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
						title="Expandir menu lateral"
						aria-label="Expandir menu lateral"
					>
						<Icon icon={ChevronRight} className="size-4" />
					</button>
				</div>
			)}

			{/* Lista de Navegação com Grupos */}
			<div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
				{groups.map((group) => {
					const visibleItems = group.items.filter((item) => isItemVisible(item.id));
					if (visibleItems.length === 0) return null;

					return (
						<div key={group.title} className="space-y-1">
							{/* Título da Seção (apenas no modo expandido) */}
							{!isCollapsed && (
								<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
									{group.title}
								</div>
							)}

							{/* Linha separadora discreta no modo recolhido */}
							{isCollapsed && (
								<div className="h-px w-6 mx-auto my-2 bg-zinc-200 dark:bg-zinc-800" />
							)}

							{visibleItems.map((item) => {
								const isActive = activeModule === item.id;
								return (
									<button
										key={item.id}
										type="button"
										data-module={item.id}
										onClick={() => onSelectModule(item.id)}
										title={item.label}
										aria-label={item.label}
										aria-current={isActive ? "page" : undefined}
										className={cn(
											"w-full rounded-xl transition-all duration-150 cursor-pointer flex items-center select-none",
											isCollapsed
												? "justify-center h-10 px-0"
												: "justify-start h-9 px-2.5 gap-2.5 text-xs font-semibold",
											isActive
												? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900 font-bold"
												: "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
										)}
									>
										<Icon
											icon={item.icon}
											className={cn(
												"size-4.5 shrink-0",
												isActive
													? "text-white dark:text-zinc-900"
													: "text-zinc-500 dark:text-zinc-400"
											)}
										/>
										{!isCollapsed && (
											<span className="truncate text-left leading-none">
												{item.label}
											</span>
										)}
									</button>
								);
							})}
						</div>
					);
				})}
			</div>

			{/* Rodapé da Sidebar: Usuário + Logout */}
			<div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
				{!isCollapsed && userSession && (
					<div className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 mb-2">
						<div className="flex items-center gap-2 min-w-0">
							<div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-white font-bold text-xs shrink-0">
								<Icon icon={UserAvatar} className="size-3.5" />
							</div>
							<div className="min-w-0">
								<span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
									{userSession.nome || userSession.usuario}
								</span>
								<span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate font-mono">
									{userSession.loja}
								</span>
							</div>
						</div>
						{userSession.isAdmin && (
							<Badge
								variant="default"
								className="text-[8px] px-1 py-0 h-3.5 bg-zinc-800 text-white font-bold shrink-0"
							>
								ADMIN
							</Badge>
						)}
					</div>
				)}

				<div className={cn("flex items-center gap-1", isCollapsed ? "justify-center" : "justify-between")}>
					{/* Botão de Toggle de Recolhimento no Rodapé (quando expandido) */}
					{!isCollapsed && (
						<button
							type="button"
							onClick={onToggleCollapsed}
							className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/70 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
							title="Recolher menu lateral"
						>
							<Icon icon={ChevronLeft} className="size-3.5" />
							<span>Recolher</span>
						</button>
					)}

					{onLogout && (
						<button
							type="button"
							onClick={onLogout}
							className={cn(
								"p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 transition-colors cursor-pointer",
								!isCollapsed ? "flex items-center gap-1 text-xs font-semibold" : "flex justify-center"
							)}
							title="Encerrar sessão"
							aria-label="Sair do sistema"
						>
							<Icon icon={Logout} className="size-4" />
							{!isCollapsed && <span>Sair</span>}
						</button>
					)}
				</div>
			</div>
		</aside>
	);
}
