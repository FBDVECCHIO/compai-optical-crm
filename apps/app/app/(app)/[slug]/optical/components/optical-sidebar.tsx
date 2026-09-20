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
import { OpticalThemeToggle } from "./optical-theme-toggle";

export interface OpticalSidebarProps {
	activeModule: OpticalModuleTab;
	onSelectModule: (tab: OpticalModuleTab) => void;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	userSession?: OpticalUserSession | null;
	onLogout?: () => void;
	isSyncingSupabase?: boolean;
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
	isSyncingSupabase = false,
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
				isCollapsed ? "w-14" : "w-52"
			)}
		>
			{/* Topo da Sidebar: Marca MNOC-X e Botão de Expandir/Contrair */}
			<div className="flex items-center justify-between px-2.5 h-11 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
				{!isCollapsed ? (
					<>
						<div className="flex items-center gap-2 min-w-0">
							<div className="flex size-6 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs shrink-0">
								X
							</div>
							<div className="min-w-0">
								<span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono block leading-none">
									MNOC-X
								</span>
								<span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium block truncate leading-none mt-0.5">
									Óptico CRM
								</span>
							</div>
						</div>

						<button
							type="button"
							onClick={onToggleCollapsed}
							className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/70 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
							title="Contrair menu lateral (mostrar apenas ícones)"
							aria-label="Contrair menu lateral"
						>
							<Icon icon={ChevronLeft} className="size-3.5" />
						</button>
					</>
				) : (
					<div className="w-full flex justify-center">
						<button
							type="button"
							onClick={onToggleCollapsed}
							className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs shadow-2xs hover:scale-105 transition-transform cursor-pointer"
							title="Expandir menu lateral"
							aria-label="Expandir menu lateral"
						>
							X
						</button>
					</div>
				)}
			</div>

			{/* Lista de Navegação com Grupos: Compacta para eliminar necessidade de scroll */}
			<div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-2">
				{groups.map((group) => {
					const visibleItems = group.items.filter((item) => isItemVisible(item.id));
					if (visibleItems.length === 0) return null;

					return (
						<div key={group.title} className="space-y-0.5">
							{/* Título da Seção (apenas no modo expandido) */}
							{!isCollapsed && (
								<div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
									{group.title}
								</div>
							)}

							{/* Linha separadora discreta no modo recolhido */}
							{isCollapsed && (
								<div className="h-px w-5 mx-auto my-1 bg-zinc-200 dark:bg-zinc-800" />
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
											"w-full rounded-lg transition-all duration-150 cursor-pointer flex items-center select-none",
											isCollapsed
												? "justify-center h-8 px-0"
												: "justify-start h-8 px-2 gap-2 text-xs font-semibold",
											isActive
												? "bg-zinc-900 text-white shadow-2xs dark:bg-white dark:text-zinc-900 font-bold"
												: "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
										)}
									>
										<Icon
											icon={item.icon}
											className={cn(
												"size-4 shrink-0",
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

			{/* Rodapé da Sidebar: Status Supabase, Perfil, Tema e Logout */}
			<div className="p-1.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
				{!isCollapsed ? (
					<div className="space-y-1.5">
						{/* Card do Usuário */}
						{userSession && (
							<div className="flex items-center justify-between gap-1.5 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 shadow-2xs">
								<div className="flex items-center gap-1.5 min-w-0">
									<div className="flex size-6 items-center justify-center rounded-md bg-zinc-800 text-white font-bold text-xs shrink-0">
										<Icon icon={UserAvatar} className="size-3" />
									</div>
									<div className="min-w-0">
										<span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block truncate leading-tight">
											{userSession.nome || userSession.usuario}
										</span>
										<span className="text-[9px] text-zinc-500 dark:text-zinc-400 block truncate font-mono leading-tight">
											{userSession.cargo || userSession.loja}
										</span>
									</div>
								</div>
								{userSession.isAdmin && (
									<Badge
										variant="default"
										className="text-[8px] px-1 py-0 h-3.5 bg-zinc-800 text-white font-bold shrink-0"
									>
										ADM
									</Badge>
								)}
							</div>
						)}

						{/* Linha de Ferramentas: Status + Tema + Toggle + Logout */}
						<div className="flex items-center justify-between gap-1 pt-0.5">
							{/* Indicador de Status Supabase / Cofre */}
							<div
								className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono px-1 py-0.5 rounded"
								title={isSyncingSupabase ? "Sincronizando com Supabase..." : "Supabase & Cofre Dedicado Ativos"}
							>
								<span
									className={cn(
										"size-2 rounded-full shrink-0",
										isSyncingSupabase
											? "bg-amber-500 animate-ping"
											: "bg-emerald-500 animate-pulse"
									)}
								/>
								<span className="truncate text-[9px] font-semibold">
									{isSyncingSupabase ? "Sync..." : "Supabase"}
								</span>
							</div>

							<div className="flex items-center gap-1 shrink-0">
								{/* Alternador de Tema */}
								<OpticalThemeToggle
									variant="ghost"
									size="icon"
									className="size-7 p-0 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
								/>

								{/* Botão de Logout */}
								{onLogout && (
									<button
										type="button"
										onClick={onLogout}
										className="p-1 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 transition-colors cursor-pointer"
										title="Encerrar sessão"
										aria-label="Sair do sistema"
									>
										<Icon icon={Logout} className="size-3.5" />
									</button>
								)}
							</div>
						</div>
					</div>
				) : (
					/* Rodapé no Modo Contraído (Centralizado) */
					<div className="flex flex-col items-center gap-1 py-0.5">
						{/* Indicador de Status */}
						<div
							className="p-1 flex items-center justify-center cursor-default"
							title={isSyncingSupabase ? "Sincronizando com Supabase..." : "Supabase Online & Cofre Dedicado Ativo"}
						>
							<span
								className={cn(
									"size-2 rounded-full",
									isSyncingSupabase
										? "bg-amber-500 animate-ping"
										: "bg-emerald-500 animate-pulse"
								)}
							/>
						</div>

						{/* Tema */}
						<OpticalThemeToggle
							variant="ghost"
							size="icon"
							className="size-7 p-0 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
						/>

						{/* Expandir */}
						<button
							type="button"
							onClick={onToggleCollapsed}
							className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/70 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
							title="Expandir menu lateral"
							aria-label="Expandir menu lateral"
						>
							<Icon icon={ChevronRight} className="size-3.5" />
						</button>

						{/* Logout */}
						{onLogout && (
							<button
								type="button"
								onClick={onLogout}
								className="p-1.5 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400 transition-colors cursor-pointer"
								title="Encerrar sessão"
								aria-label="Sair do sistema"
							>
								<Icon icon={Logout} className="size-3.5" />
							</button>
						)}
					</div>
				)}
			</div>
		</aside>
	);
}
