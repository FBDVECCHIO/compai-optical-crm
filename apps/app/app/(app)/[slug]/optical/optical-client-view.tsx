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
import { useState } from "react";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { CreateOpticalOrderSheet } from "./components/create-optical-order-sheet";
import { OpticalAgentSidecar } from "./components/optical-agent-sidecar";
import { OpticalAuditView } from "./components/optical-audit-view";
import { OpticalCatalogView } from "./components/optical-catalog-view";
import { OpticalConferenceView } from "./components/optical-conference-view";
import { OpticalKanban } from "./components/optical-kanban";
import { OpticalManagementSummaryView } from "./components/optical-management-summary-view";
import { OpticalOrderDetailSheet } from "./components/optical-order-detail-sheet";
import { OpticalOrdersTable } from "./components/optical-orders-table";
import { OpticalSalesLogView } from "./components/optical-sales-log-view";
import { OpticalSummaryCards } from "./components/optical-summary-cards";
import { OpticalTopNav, type OpticalModuleTab } from "./components/optical-top-nav";
import type { OpticalOrder } from "@/lib/optical/optical-types";
import {
	type OpticalTab,
	type OpticalViewMode,
	opticalSearchParams,
} from "./optical-search-params";

export function OpticalClientView() {
	const [{ q, tab, view }, setParams] = useQueryStates(opticalSearchParams);
	const { orders, resetToDefaults } = useOpticalOrders();
	const [activeModule, setActiveModule] = useState<OpticalModuleTab>("balcao");
	const [localSearch, setLocalSearch] = useState(q);
	const [selectedOrder, setSelectedOrder] = useState<OpticalOrder | null>(null);

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

	{/* Comp AI: Auditoria de Receitas e Agente IA */}
	{activeModule === "auditoria" && <OpticalAuditView />}

	{/* App Lentes: Catálogo de Lentes & Estoque de Laboratório */}
	{activeModule === "catalogo" && <OpticalCatalogView />}

	{/* Configurações do Módulo Óptico */}
	{activeModule === "config" && (
		<div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col gap-4">
			<div>
				<h3 className="text-base font-bold tracking-tight">Configurações de Óptica & Laboratórios</h3>
				<p className="text-xs text-muted-foreground">
					Parâmetros de tolerância ABNT NBR ISO, laboratórios credenciados e regras de SLA.
				</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				<div className="rounded-lg border p-4 flex flex-col gap-2">
					<span className="font-semibold text-foreground">Tolerâncias Dióptricas (ABNT ISO 8980-1/2)</span>
					<ul className="list-disc pl-4 text-muted-foreground space-y-1">
						<li>Esférico: ±0.12 D (até 6.00 D)</li>
						<li>Cilíndrico: ±0.12 D (cilindros comuns)</li>
						<li>Eixo: ±2° para cil &gt; 1.50, ±5° para cil &lt; 0.75</li>
						<li>DNP horizontal: ±1.0 mm por olho</li>
						<li>Altura vertical de montagem: ±1.0 mm</li>
					</ul>
				</div>
				<div className="rounded-lg border p-4 flex flex-col gap-2">
					<span className="font-semibold text-foreground">Laboratórios Parceiros Ativos</span>
					<ul className="list-disc pl-4 text-muted-foreground space-y-1">
						<li>Essilor (Varilux, Crizal, Transitions) - SLA 5 dias</li>
						<li>Zeiss (SmartLife, DuraVision) - SLA 6 dias</li>
						<li>Hoya (Hoyalux iD, LongLife) - SLA 5 dias</li>
						<li>Personality (Digital Freeform) - SLA 3 dias</li>
					</ul>
				</div>
			</div>
		</div>
	)}
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
