"use client";

import "@/lib/optical/dom-guard";
import Column from "@carbon/icons-react/es/Column";
import Reset from "@carbon/icons-react/es/Reset";
import Search from "@carbon/icons-react/es/Search";
import TableIcon from "@carbon/icons-react/es/Table";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { useQueryStates } from "nuqs";
import { useState, useEffect } from "react";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { useOpticalAuth } from "@/lib/optical/optical-auth-context";
import { CreateOpticalOrderSheet } from "./components/create-optical-order-sheet";
import { OpticalAgentSidecar } from "./components/optical-agent-sidecar";
import { OpticalAuditView } from "./components/optical-audit-view";
import { OpticalCatalogView } from "./components/optical-catalog-view";
import { OpticalConferenceView } from "./components/optical-conference-view";
import { OpticalKanban } from "./components/optical-kanban";
import { OpticalLoginView } from "./components/optical-login-view";
import { OpticalManagementSummaryView } from "./components/optical-management-summary-view";
import { OpticalMedicalView } from "./components/optical-medical-view";
import { OpticalMedicalVisitsView } from "./components/optical-medical-visits-view";
import { OpticalOrderDetailSheet } from "./components/optical-order-detail-sheet";
import { OpticalOrdersTable } from "./components/optical-orders-table";
import { OpticalSalesLogView } from "./components/optical-sales-log-view";
import { OpticalSettingsView } from "./components/optical-settings-view";
import { OpticalSummaryCards } from "./components/optical-summary-cards";
import { OpticalTopNav, type OpticalModuleTab } from "./components/optical-top-nav";
import { OpticalSidebar } from "./components/optical-sidebar";
import { OpticalCompactHeader } from "./components/optical-compact-header";
import { OpticalWarrantiesView } from "./components/optical-warranties-view";
import { OpticalOsJourneyView } from "./components/optical-os-journey-view";
import { OpticalPostSalesView } from "./components/optical-post-sales-view";
import { OpticalLensCatalogView } from "./components/optical-lens-catalog-view";
import { OpticalFramesCatalogView } from "./components/optical-frames-catalog-view";
import { OpticalBulkMessagingView } from "./components/optical-bulk-messaging-view";
import { OpticalSalesPerformanceView } from "./components/optical-sales-performance-view";
import type { OpticalOrder } from "@/lib/optical/optical-types";
import {
	type OpticalTab,
	type OpticalViewMode,
	opticalSearchParams,
} from "./optical-search-params";

export function OpticalClientView() {
	const { session, isAuthenticated, isLoading, logout, hasPermission } = useOpticalAuth();
	const [{ q, tab, view }, setParams] = useQueryStates(opticalSearchParams);
	const { orders, isSyncingSupabase, resetToDefaults } = useOpticalOrders();
	const [activeModule, setActiveModule] = useState<OpticalModuleTab>("balcao");
	const [localSearch, setLocalSearch] = useState(q);
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);
	const [isNewOrderSheetOpen, setIsNewOrderSheetOpen] = useState(false);

	// Estado da barra lateral retrátil (com persistência no localStorage)
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			try {
				return localStorage.getItem("mnocx_sidebar_collapsed") === "true";
			} catch {
				return false;
			}
		}
		return false;
	});

	const toggleSidebar = () => {
		setIsSidebarCollapsed((prev) => {
			const next = !prev;
			if (typeof window !== "undefined") {
				try {
					localStorage.setItem("mnocx_sidebar_collapsed", String(next));
				} catch {}
			}
			return next;
		});
	};

	// Atalho F2 para abrir Nova OS rapidamente
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "F2") {
				e.preventDefault();
				setIsNewOrderSheetOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Redireciona caso o módulo atual não seja permitido para o usuário
	useEffect(() => {
		if (session && !session.isAdmin && !hasPermission(activeModule)) {
			if (hasPermission("balcao")) setActiveModule("balcao");
			else if (hasPermission("conferencia")) setActiveModule("conferencia");
			else if (hasPermission("log_vendas")) setActiveModule("log_vendas");
			else if (hasPermission("resumo")) setActiveModule("resumo");
			else if (hasPermission("catalogo")) setActiveModule("catalogo");
		}
	}, [session, activeModule, hasPermission]);

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center min-h-screen bg-background">
				<div className="flex flex-col items-center gap-3 text-muted-foreground text-xs font-semibold">
					<span className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
					<span>Carregando autenticação óptica...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <OpticalLoginView />;
	}

	const pendingConferenceCount = orders.filter(
		(o) =>
			o.status === "EM_LABORATORIO" ||
			o.status === "EM_MONTAGEM" ||
			o.status === "CONFERIDA",
	).length;

	const pendingResidualCount = orders.filter(
		(o) => o.financials.residualAmount > 0,
	).length;

	const handleSearchChange = (val: string) => {
		setLocalSearch(val);
		setParams({ q: val || null });
	};

	const handleTabChange = (nextTab: string) => {
		setParams({ tab: nextTab as OpticalTab });
	};

	const handleViewChange = (nextView: OpticalViewMode) => {
		setParams({ view: nextView });
	};

	return (
		<div
			className="flex flex-1 min-h-0 w-full h-full overflow-hidden bg-zinc-200 dark:bg-zinc-950 notranslate"
			translate="no"
		>
			{/* 1. Menu Lateral Retrátil à Esquerda (Expandir/Contrair apenas ícones) */}
			<OpticalSidebar
				activeModule={activeModule}
				onSelectModule={setActiveModule}
				isCollapsed={isSidebarCollapsed}
				onToggleCollapsed={toggleSidebar}
				userSession={session}
				onLogout={logout}
			/>

			{/* 2. Área Central de Trabalho com Barra de Topo Compacta (48px) subindo todo o conteúdo */}
			<div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden">
				{/* Barra Superior Compacta (48px) */}
				<OpticalCompactHeader
					activeModule={activeModule}
					isSyncingSupabase={isSyncingSupabase}
					userSession={session}
					onLogout={logout}
					onNewOrder={() => setIsNewOrderSheetOpen(true)}
				/>

				{/* Área Rolável Independente que sobe até o topo */}
				<div className="flex flex-col gap-5 p-3.5 sm:p-5 min-h-0 flex-1 overflow-y-auto">
					{/* Balcão & Vendas: Dashboard de Performance, Metas por Dias Úteis (Salesforce) e Lista de OSs */}
					{activeModule === "balcao" && <OpticalSalesPerformanceView />}

					{/* MNOC-X: Jornada da OS (6 Etapas + Painel de Pedidos Lab) */}
					{activeModule === "jornada_os" && <OpticalOsJourneyView />}

					{/* MNOC-X: Gestão de Pós-Venda (Pós 7, Pós 30, Pós 90, Ativo Promo) */}
					{activeModule === "pos_venda" && <OpticalPostSalesView />}

					{/* MNOC-X: Catálogo Técnico de Lentes (Variação por olho OD/OE, Inserção em Lote) */}
					{activeModule === "lentes" && <OpticalLensCatalogView />}

					{/* MNOC-X: Catálogo de Peças (Armações e Solares, Aro, Ponte, Estoque) */}
					{activeModule === "pecas" && <OpticalFramesCatalogView />}

					{/* MNOC-X: Mensagens Padrão & Envio em Massa (WhatsApp) */}
					{activeModule === "mensagens" && <OpticalBulkMessagingView />}

					{/* MNOC-X: Garantias & Ocorrências */}
					{activeModule === "garantias" && <OpticalWarrantiesView />}

					{/* App Lentes: Conferência de Laboratório */}
					{activeModule === "conferencia" && <OpticalConferenceView />}

					{/* App Lentes: Log de Vendas e Cobrança de Resíduos */}
					{activeModule === "log_vendas" && <OpticalSalesLogView />}

					{/* App Lentes: Resumo Gerencial de Lojas e Faturamento */}
					{activeModule === "resumo" && <OpticalManagementSummaryView />}

					{/* App Lentes: Controle de Visitas Médicas */}
					{activeModule === "visita_medica" && <OpticalMedicalVisitsView />}

					{/* App Lentes: Resultado Médico & Comissões */}
					{activeModule === "medicos" && <OpticalMedicalView />}

					{/* Comp AI: Auditoria de Receitas e Agente IA */}
					{activeModule === "auditoria" && <OpticalAuditView />}

					{/* App Lentes: Catálogo de Lentes Legado & Estoque de Laboratório */}
					{activeModule === "catalogo" && <OpticalCatalogView />}

					{/* App Lentes: Centro Avançado de Configurações */}
					{activeModule === "config" && <OpticalSettingsView />}
				</div>
			</div>

			{/* 3. Copiloto Vertical IA (Sidecar à Direita) */}
			<OpticalAgentSidecar onSelectOrder={(ord) => setSelectedOrder(ord)} />

			{/* Modal de Nova OS Rápida */}
			{isNewOrderSheetOpen && (
				<CreateOpticalOrderSheet
					open={isNewOrderSheetOpen}
					onOpenChange={setIsNewOrderSheetOpen}
					hideTrigger={true}
				/>
			)}

			{/* Order Detail Sheet (Modal se selecionada) */}
			{selectedOrder && (
				<OpticalOrderDetailSheet
					order={selectedOrder}
					open={Boolean(selectedOrder)}
					onOpenChange={(open) => {
						if (!open) setSelectedOrder(null);
					}}
				/>
			)}
		</div>
	);
}
