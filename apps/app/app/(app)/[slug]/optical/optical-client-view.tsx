"use client";

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
import { OpticalWarrantiesView } from "./components/optical-warranties-view";
import type { OpticalOrder } from "@/lib/optical/optical-types";
import {
	type OpticalTab,
	type OpticalViewMode,
	opticalSearchParams,
} from "./optical-search-params";

export function OpticalClientView() {
	const { session, isAuthenticated, isLoading, logout, hasPermission } = useOpticalAuth();
	const [{ q, tab, view }, setParams] = useQueryStates(opticalSearchParams);
	const { orders, resetToDefaults } = useOpticalOrders();
	const [activeModule, setActiveModule] = useState<OpticalModuleTab>("balcao");
	const [localSearch, setLocalSearch] = useState(q);
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);

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
		<div className="flex flex-1 min-h-0 w-full h-full overflow-hidden">
			{/* Main Workspace (Left, scrollable) */}
			<div className="flex flex-col gap-6 p-4 sm:p-6 min-h-0 flex-1 overflow-y-auto">
				{/* Top Navigation Hub: App Lentes + CRM Modules */}
			<OpticalTopNav
				activeModule={activeModule}
				onSelectModule={setActiveModule}
				pendingConferenceCount={pendingConferenceCount}
				pendingResidualCount={pendingResidualCount}
				userSession={session}
				onLogout={logout}
			/>

			{/* Render active module view */}
			{activeModule === "balcao" && (
				<>
					{/* Top KPI Cards */}
					<OpticalSummaryCards />

			{/* Filter & View Toolbar */}
			<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
				<div className="flex flex-wrap items-center justify-between gap-3">
					{/* Status Tabs */}
					<Tabs
						value={tab}
						onValueChange={handleTabChange}
						className="w-full sm:w-auto"
					>
						<TabsList className="h-8 gap-1 bg-muted/60 p-0.5">
							<TabsTrigger value="ALL" className="text-xs font-semibold px-2.5">
								Todas as OSs
							</TabsTrigger>
							<TabsTrigger
								value="EM_LABORATORIO"
								className="text-xs font-semibold px-2.5"
							>
								No Lab
							</TabsTrigger>
							<TabsTrigger
								value="EM_MONTAGEM"
								className="text-xs font-semibold px-2.5"
							>
								Em Montagem
							</TabsTrigger>
							<TabsTrigger
								value="CONFERIDA"
								className="text-xs font-semibold px-2.5"
							>
								Conferidas
							</TabsTrigger>
							<TabsTrigger
								value="PRONTA_LOJA"
								className="text-xs font-semibold px-2.5"
							>
								Prontas na Loja
							</TabsTrigger>
							<TabsTrigger
								value="RESIDUAL"
								className="text-xs font-semibold px-2.5 text-rose-600 dark:text-rose-400"
							>
								Com Saldo Residual
							</TabsTrigger>
							<TabsTrigger
								value="ENTREGUE"
								className="text-xs font-semibold px-2.5"
							>
								Entregues
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* View Mode Toggle (Table vs Kanban) */}
					<div className="flex items-center gap-2">
						<div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
							<Button
								variant={view === "table" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2.5 text-xs font-semibold"
								onClick={() => handleViewChange("table")}
							>
								<Icon icon={TableIcon} className="mr-1.5 size-3.5" />
								Tabela
							</Button>
							<Button
								variant={view === "kanban" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2.5 text-xs font-semibold"
								onClick={() => handleViewChange("kanban")}
							>
								<Icon icon={Column} className="mr-1.5 size-3.5" />
								Kanban
							</Button>
						</div>

						<CreateOpticalOrderSheet />
					</div>
				</div>

				{/* Search Input Bar */}
				<div className="flex items-center justify-between gap-3 pt-1 border-t">
					<div className="relative flex-1 max-w-md">
						<Icon
							icon={Search}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
						/>
						<Input
							value={localSearch}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Buscar por OS, Paciente, CPF, Laboratório ou Armação..."
							className="h-8 pl-8 text-xs font-medium"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-[11px] text-muted-foreground hover:text-foreground gap-1"
							onClick={resetToDefaults}
							title="Recarregar dados de demonstração da óptica"
						>
							<Icon icon={Reset} className="size-3" />
							Restaurar Demo
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content: Table or Kanban */}
			<div className="min-h-0 flex-1">
				{view === "table" ? (
					<OpticalOrdersTable searchQuery={q} statusFilter={tab} />
				) : (
					<OpticalKanban searchQuery={q} />
				)}
			</div>
		</>
	)}

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

	{/* App Lentes: Catálogo de Lentes & Estoque de Laboratório */}
	{activeModule === "catalogo" && <OpticalCatalogView />}

	{/* App Lentes: Centro Avançado de Configurações (Lojas, Labs, Médicos, Técnicos, Comissões, ABNT) */}
	{activeModule === "config" && <OpticalSettingsView />}
			</div>

			{/* Vertical Optical AI Copilot Sidecar (Right - Occupying full vertical height) */}
			<OpticalAgentSidecar onSelectOrder={(ord) => setSelectedOrder(ord)} />

			{/* Order Detail Sheet (Modal if selected) */}
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
