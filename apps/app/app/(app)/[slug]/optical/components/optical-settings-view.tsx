"use client";

import { useEffect, useState } from "react";
import Add from "@carbon/icons-react/es/Add";
import Building from "@carbon/icons-react/es/Building";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Chemistry from "@carbon/icons-react/es/Chemistry";
import Close from "@carbon/icons-react/es/Close";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Edit from "@carbon/icons-react/es/Edit";
import Events from "@carbon/icons-react/es/Events";
import Money from "@carbon/icons-react/es/Money";
import Phone from "@carbon/icons-react/es/Phone";
import RulerAlt from "@carbon/icons-react/es/RulerAlt";
import Settings from "@carbon/icons-react/es/Settings";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import UserSpeaker from "@carbon/icons-react/es/UserSpeaker";
import UserMultiple from "@carbon/icons-react/es/UserMultiple";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import { toast } from "sonner";
import {
	type ClinicItem,
	type CommissionSettings,
	DEFAULT_COMMISSIONS,
	DEFAULT_TOLERANCES,
	type DoctorItem,
	fetchCommissionSettings,
	fetchConfigSetting,
	fetchOpticalTolerances,
	fetchPaymentMethods,
	fetchSupabaseClinics,
	fetchSupabaseDoctors,
	fetchSupabaseLabs,
	fetchSupabaseReps,
	fetchSupabaseSellers,
	fetchSupabaseStores,
	fetchSupabaseTechnicians,
	createSupabaseLab,
	createSupabaseRep,
	createSupabaseSeller,
	createSupabaseStore,
	deleteSupabaseLab,
	deleteSupabaseRep,
	deleteSupabaseSeller,
	deleteSupabaseStore,
	type LabItem,
	type OpticalTolerances,
	type RepItem,
	saveCommissionSettings,
	saveConfigSetting,
	saveOpticalTolerances,
	savePaymentMethods,
	saveSupabaseClinics,
	saveSupabaseDoctors,
	saveSupabaseTechnicians,
	type SellerItem,
	type StoreItem,
	type TechnicianItem,
} from "@/lib/optical/supabase-optical";

type SettingsSubTab =
	| "lojas"
	| "labs"
	| "vendedores"
	| "medicos"
	| "comissoes"
	| "tecnicos"
	| "apoio"
	| "tolerancias";

export function OpticalSettingsView() {
	const [activeTab, setActiveTab] = useState<SettingsSubTab>("lojas");
	const [loading, setLoading] = useState(true);

	// Dados Supabase
	const [stores, setStores] = useState<StoreItem[]>([]);
	const [labs, setLabs] = useState<LabItem[]>([]);
	const [sellers, setSellers] = useState<SellerItem[]>([]);
	const [reps, setReps] = useState<RepItem[]>([]);
	const [doctors, setDoctors] = useState<DoctorItem[]>([]);
	const [clinics, setClinics] = useState<ClinicItem[]>([]);
	const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
	const [commissions, setCommissions] = useState<CommissionSettings>(DEFAULT_COMMISSIONS);
	const [tolerances, setTolerances] = useState<OpticalTolerances>(DEFAULT_TOLERANCES);
	const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
	const [lossReasons, setLossReasons] = useState<string[]>([]);
	const [incidentReasons, setIncidentReasons] = useState<string[]>([]);
	const [visitTopics, setVisitTopics] = useState<string[]>([]);
	const [leadCapturers, setLeadCapturers] = useState<Array<{ nome: string }>>([]);

	// Templates WhatsApp
	const [templateTecnico, setTemplateTecnico] = useState("");
	const [templateClienteConf, setTemplateClienteConf] = useState("");

	// Formulários de cadastro rápido
	const [newStoreName, setNewStoreName] = useState("");
	const [newLabName, setNewLabName] = useState("");
	const [newLabSla, setNewLabSla] = useState(5);
	const [newSellerName, setNewSellerName] = useState("");
	const [newSellerStore, setNewSellerStore] = useState("");
	const [newRepName, setNewRepName] = useState("");
	const [newDocName, setNewDocName] = useState("");
	const [newDocCrm, setNewDocCrm] = useState("");
	const [newDocRep, setNewDocRep] = useState("");
	const [newClinicName, setNewClinicName] = useState("");
	const [newClinicCity, setNewClinicCity] = useState("Campinas");
	const [newClinicRep, setNewClinicRep] = useState("");
	const [newTechName, setNewTechName] = useState("");
	const [newTechPhone, setNewTechPhone] = useState("");
	const [newTechCalendly, setNewTechCalendly] = useState("");
	const [newGenericItem, setNewGenericItem] = useState("");

	// Vinculação em Massa de Médicos
	const [bulkRepSelected, setBulkRepSelected] = useState("");
	const [selectedDoctorIndexes, setSelectedDoctorIndexes] = useState<number[]>([]);

	useEffect(() => {
		async function loadAll() {
			setLoading(true);
			try {
				const [
					s,
					l,
					v,
					r,
					d,
					c,
					t,
					com,
					tol,
					pay,
					loss,
					inc,
					vis,
					cap,
					tTec,
					tConf,
				] = await Promise.all([
					fetchSupabaseStores(),
					fetchSupabaseLabs(),
					fetchSupabaseSellers(),
					fetchSupabaseReps(),
					fetchSupabaseDoctors(),
					fetchSupabaseClinics(),
					fetchSupabaseTechnicians(),
					fetchCommissionSettings(),
					fetchOpticalTolerances(),
					fetchPaymentMethods(),
					fetchConfigSetting<string[]>("motivosPerda", [
						"Preço alto",
						"Prazo longo",
						"Falta do produto",
						"Garantia/Insatisfação",
					]),
					fetchConfigSetting<string[]>("motivosOcorrencia", [
						"Erro de Digitação",
						"Quebra de Laboratório",
						"Adaptação Visual",
						"Troca de Modelo de Armação",
					]),
					fetchConfigSetting<string[]>("assuntosVisita", [
						"Lançamento de Produto",
						"Café na Clínica",
						"Retorno de Receita",
						"Entrega de Retorno",
						"Entrega de Voucher",
					]),
					fetchConfigSetting<Array<{ nome: string }>>("captadores", [
						{ nome: "Mari" },
						{ nome: "Lucas" },
					]),
					fetchConfigSetting<string>(
						"assistTemplateTecnico",
						"Olá {tecnico}, a loja {loja} solicitou assistência para a OS {os} no dia {data} às {hora}.\n\nCliente: {cliente}\nMotivo: {motivo}\nLentes: {lente}.",
					),
					fetchConfigSetting<string>(
						"assistTemplateClienteConfirmado",
						"Olá {cliente}! Seu atendimento de assistência técnica foi CONFIRMADO por nosso técnico para o dia {data} às {hora}. Esperamos você!",
					),
				]);

				setStores(s);
				setLabs(l);
				setSellers(v);
				setReps(r);
				setDoctors(d);
				setClinics(c);
				setTechnicians(t);
				setCommissions(com);
				setTolerances(tol);
				setPaymentMethods(pay);
				setLossReasons(loss);
				setIncidentReasons(inc);
				setVisitTopics(vis);
				setLeadCapturers(cap);
				setTemplateTecnico(tTec);
				setTemplateClienteConf(tConf);
				if (s.length > 0) setNewSellerStore(s[0]?.nome || "");
			} catch (e) {
				console.warn("Erro ao carregar configurações:", e);
			} finally {
				setLoading(false);
			}
		}
		loadAll();
	}, []);

	// Handlers de Ações
	const handleAddStore = async () => {
		if (!newStoreName.trim()) return;
		const name = newStoreName.trim();
		setStores((prev) => [...prev, { id: Date.now(), nome: name }]);
		setNewStoreName("");
		toast.success(`Filial "${name}" adicionada com sucesso!`);
		await createSupabaseStore(name);
	};

	const handleDeleteStore = async (id: number, name: string) => {
		setStores((prev) => prev.filter((s) => s.id !== id));
		toast.info(`Filial "${name}" removida.`);
		await deleteSupabaseStore(id);
	};

	const handleAddLab = async () => {
		if (!newLabName.trim()) return;
		const name = newLabName.trim();
		setLabs((prev) => [...prev, { id: Date.now(), nome: name, slaDias: newLabSla }]);
		setNewLabName("");
		toast.success(`Laboratório "${name}" cadastrado com SLA de ${newLabSla} dias.`);
		await createSupabaseLab(name, newLabSla);
	};

	const handleDeleteLab = async (id: number, name: string) => {
		setLabs((prev) => prev.filter((l) => l.id !== id));
		toast.info(`Laboratório "${name}" removido.`);
		await deleteSupabaseLab(id);
	};

	const handleAddSeller = async () => {
		if (!newSellerName.trim()) return;
		const name = newSellerName.trim();
		setSellers((prev) => [...prev, { id: Date.now(), nome: name, loja: newSellerStore }]);
		setNewSellerName("");
		toast.success(`Vendedor(a) "${name}" vinculado à loja "${newSellerStore}".`);
		await createSupabaseSeller(name, newSellerStore);
	};

	const handleDeleteSeller = async (id: number) => {
		setSellers((prev) => prev.filter((s) => s.id !== id));
		toast.info("Vendedor removido.");
		await deleteSupabaseSeller(id);
	};

	const handleAddRep = async () => {
		if (!newRepName.trim()) return;
		const name = newRepName.trim();
		setReps((prev) => [...prev, { id: Date.now(), nome: name }]);
		setNewRepName("");
		toast.success(`Representante "${name}" cadastrado.`);
		await createSupabaseRep(name);
	};

	const handleDeleteRep = async (id: number) => {
		setReps((prev) => prev.filter((r) => r.id !== id));
		toast.info("Representante removido.");
		await deleteSupabaseRep(id);
	};

	const handleAddDoctor = async () => {
		if (!newDocName.trim() || !newDocCrm.trim()) return;
		const newDoc: DoctorItem = {
			nome: newDocName.trim(),
			crm: newDocCrm.trim(),
			representante: newDocRep || undefined,
		};
		const updated = [...doctors, newDoc];
		setDoctors(updated);
		setNewDocName("");
		setNewDocCrm("");
		toast.success(`Médico(a) "${newDoc.nome}" cadastrado com sucesso.`);
		await saveSupabaseDoctors(updated);
	};

	const handleDeleteDoctor = async (index: number) => {
		const updated = doctors.filter((_, i) => i !== index);
		setDoctors(updated);
		toast.info("Médico removido.");
		await saveSupabaseDoctors(updated);
	};

	const handleAddClinic = async () => {
		if (!newClinicName.trim()) return;
		const newCln: ClinicItem = {
			nome: newClinicName.trim(),
			cidade: newClinicCity.trim(),
			representante: newClinicRep || undefined,
		};
		const updated = [...clinics, newCln];
		setClinics(updated);
		setNewClinicName("");
		toast.success(`Clínica "${newCln.nome}" cadastrada.`);
		await saveSupabaseClinics(updated);
	};

	const handleDeleteClinic = async (index: number) => {
		const updated = clinics.filter((_, i) => i !== index);
		setClinics(updated);
		toast.info("Clínica removida.");
		await saveSupabaseClinics(updated);
	};

	const handleAddTechnician = async () => {
		if (!newTechName.trim()) return;
		const tech: TechnicianItem = {
			nome: newTechName.trim(),
			whatsapp: newTechPhone.trim(),
			calendlyUrl: newTechCalendly.trim() || "https://calendly.com",
		};
		const updated = [...technicians, tech];
		setTechnicians(updated);
		setNewTechName("");
		setNewTechPhone("");
		setNewTechCalendly("");
		toast.success(`Técnico "${tech.nome}" cadastrado.`);
		await saveSupabaseTechnicians(updated);
	};

	const handleDeleteTechnician = async (index: number) => {
		const updated = technicians.filter((_, i) => i !== index);
		setTechnicians(updated);
		toast.info("Técnico removido.");
		await saveSupabaseTechnicians(updated);
	};

	const handleSaveCommissions = async () => {
		toast.loading("Gravando parâmetros de comissão...");
		const ok = await saveCommissionSettings(commissions);
		if (ok) {
			toast.dismiss();
			toast.success("Parâmetros de comissão e estornos gravados no Supabase!");
		} else {
			toast.dismiss();
			toast.error("Erro ao salvar comissões.");
		}
	};

	const handleSaveTolerances = async () => {
		toast.loading("Atualizando tolerâncias ópticas ABNT ISO...");
		const ok = await saveOpticalTolerances(tolerances);
		if (ok) {
			toast.dismiss();
			toast.success("Tolerâncias ABNT ISO salvas e integradas ao motor de auditoria!");
		} else {
			toast.dismiss();
			toast.error("Erro ao salvar tolerâncias.");
		}
	};

	const handleSaveTemplates = async () => {
		await Promise.all([
			saveConfigSetting("assistTemplateTecnico", templateTecnico),
			saveConfigSetting("assistTemplateClienteConfirmado", templateClienteConf),
		]);
		toast.success("Templates de WhatsApp salvos com sucesso!");
	};

	// Vinculação em Massa
	const handleApplyBulkLink = async () => {
		if (!bulkRepSelected) {
			toast.error("Selecione um Representante Médico primeiro!");
			return;
		}
		if (selectedDoctorIndexes.length === 0) {
			toast.error("Selecione ao menos um médico na lista!");
			return;
		}
		const updated = doctors.map((doc, idx) => {
			if (selectedDoctorIndexes.includes(idx)) {
				return { ...doc, representante: bulkRepSelected };
			}
			return doc;
		});
		setDoctors(updated);
		setSelectedDoctorIndexes([]);
		toast.success(
			`${selectedDoctorIndexes.length} médico(s) vinculados a "${bulkRepSelected}"!`,
		);
		await saveSupabaseDoctors(updated);
	};

	return (
		<div className="flex flex-col gap-6 p-4 sm:p-6 min-h-0 flex-1 overflow-y-auto">
			{/* Header */}
			<div className="flex flex-col gap-1 border-b pb-4">
				<div className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Icon icon={Settings} className="size-4" />
					</div>
					<div>
						<h2 className="text-lg font-bold tracking-tight">
							Configurações & Parâmetros do Sistema Óptico
						</h2>
						<p className="text-xs text-muted-foreground">
							Tabelas de apoio, filiais, laboratórios, médicos prescritores, comissões e
							tolerâncias ABNT integrados ao Supabase.
						</p>
					</div>
				</div>
			</div>

			{/* Sub Tabs Navigation */}
			<div className="flex items-center border-b pb-1">
				<Tabs
					value={activeTab}
					onValueChange={(val) => setActiveTab(val as SettingsSubTab)}
					className="w-full"
				>
					<TabsList className="h-9 gap-1 bg-muted/60 p-1 flex-wrap w-full justify-start">
						<TabsTrigger value="lojas" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={Building} className="size-3.5" />
							Lojas ({stores.length})
						</TabsTrigger>
						<TabsTrigger value="labs" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={Chemistry} className="size-3.5" />
							Laboratórios ({labs.length})
						</TabsTrigger>
						<TabsTrigger value="vendedores" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={UserMultiple} className="size-3.5" />
							Vendedores ({sellers.length})
						</TabsTrigger>
						<TabsTrigger value="medicos" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={UserFollow} className="size-3.5" />
							Médicos & Clínicas
						</TabsTrigger>
						<TabsTrigger value="comissoes" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={Money} className="size-3.5" />
							Comissões & Estornos
						</TabsTrigger>
						<TabsTrigger value="tecnicos" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={Phone} className="size-3.5" />
							Técnicos & WhatsApp
						</TabsTrigger>
						<TabsTrigger value="tolerancias" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={RulerAlt} className="size-3.5" />
							Tolerâncias ABNT ISO
						</TabsTrigger>
						<TabsTrigger value="apoio" className="text-xs font-semibold px-3 gap-1.5">
							<Icon icon={Events} className="size-3.5" />
							Tabelas de Apoio
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* CONTEÚDO DA ABA: LOJAS */}
			{activeTab === "lojas" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={Building} className="size-4 text-primary" />
							Cadastrar Nova Filial
						</h3>
						<p className="text-xs text-muted-foreground">
							Adicione lojas físicas ou franqueadas para divisão de faturamento e vendedores.
						</p>
						<div className="flex flex-col gap-3">
							<Input
								placeholder="Nome da Loja (ex: Shopping Dom Pedro)"
								value={newStoreName}
								onChange={(e) => setNewStoreName(e.target.value)}
								className="text-xs h-9"
							/>
							<Button size="sm" onClick={handleAddStore} className="gap-1.5 font-semibold">
								<Icon icon={Add} className="size-4" />
								Adicionar Filial
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<span className="text-xs font-bold text-foreground">
								Filiais Cadastradas no Banco ({stores.length})
							</span>
							<Badge variant="outline" className="text-[10px]">
								Sincronizado Supabase
							</Badge>
						</div>
						<div className="divide-y">
							{stores.map((store) => (
								<div
									key={store.id}
									className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/40 transition-colors"
								>
									<div className="flex items-center gap-2.5">
										<div className="size-2 rounded-full bg-primary" />
										<span className="font-semibold text-foreground">{store.nome}</span>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground hover:text-destructive"
										onClick={() => handleDeleteStore(store.id, store.nome)}
										title="Excluir Loja"
									>
										<Icon icon={TrashCan} className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: LABORATÓRIOS */}
			{activeTab === "labs" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={Chemistry} className="size-4 text-primary" />
							Novo Laboratório Parceiro
						</h3>
						<p className="text-xs text-muted-foreground">
							Cadastre laboratórios e seus prazos padrão (SLA) para cálculo automático de alertas de atraso.
						</p>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">
									Nome do Laboratório
								</label>
								<Input
									placeholder="Ex: Hoya, Zeiss, Essilor"
									value={newLabName}
									onChange={(e) => setNewLabName(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">
									SLA Padrão de Entrega (Dias Úteis)
								</label>
								<Input
									type="number"
									min={1}
									max={30}
									value={newLabSla}
									onChange={(e) => setNewLabSla(Number(e.target.value))}
									className="text-xs h-9 mt-1 font-mono"
								/>
							</div>
							<Button size="sm" onClick={handleAddLab} className="gap-1.5 font-semibold mt-1">
								<Icon icon={Add} className="size-4" />
								Cadastrar Laboratório
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<span className="text-xs font-bold text-foreground">
								Laboratórios Credenciados ({labs.length})
							</span>
							<span className="text-[11px] text-muted-foreground">
								Monitoramento de SLA Ativo
							</span>
						</div>
						<div className="divide-y">
							{labs.map((lab) => (
								<div
									key={lab.id}
									className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/40 transition-colors"
								>
									<div className="flex items-center gap-3">
										<span className="font-semibold text-foreground">{lab.nome}</span>
										<Badge variant="secondary" className="text-[10px] font-mono">
											SLA: {lab.slaDias || 5} dias úteis
										</Badge>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground hover:text-destructive"
										onClick={() => handleDeleteLab(lab.id, lab.nome)}
										title="Excluir Laboratório"
									>
										<Icon icon={TrashCan} className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: VENDEDORES */}
			{activeTab === "vendedores" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={UserMultiple} className="size-4 text-primary" />
							Cadastrar Vendedor(a)
						</h3>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">
									Nome Completo
								</label>
								<Input
									placeholder="Nome do(a) Vendedor(a)"
									value={newSellerName}
									onChange={(e) => setNewSellerName(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">
									Loja de Lotação
								</label>
								<select
									className="w-full h-9 mt-1 rounded-md border bg-background px-3 py-1 text-xs outline-none"
									value={newSellerStore}
									onChange={(e) => setNewSellerStore(e.target.value)}
								>
									<option value="Todas as Lojas (Admin)">Todas as Lojas (Admin)</option>
									{stores.map((s) => (
										<option key={s.id} value={s.nome}>
											{s.nome}
										</option>
									))}
								</select>
							</div>
							<Button size="sm" onClick={handleAddSeller} className="gap-1.5 font-semibold mt-1">
								<Icon icon={Add} className="size-4" />
								Salvar Vendedor
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<span className="text-xs font-bold text-foreground">
								Equipe de Vendas ({sellers.length})
							</span>
						</div>
						<div className="divide-y">
							{sellers.map((seller) => (
								<div
									key={seller.id}
									className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/40 transition-colors"
								>
									<div className="flex flex-col">
										<span className="font-semibold text-foreground">{seller.nome}</span>
										<span className="text-[11px] text-muted-foreground">
											Loja: {seller.loja || "Conceição (Matriz)"}
										</span>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-muted-foreground hover:text-destructive"
										onClick={() => handleDeleteSeller(seller.id)}
									>
										<Icon icon={TrashCan} className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: MÉDICOS & CLÍNICAS */}
			{activeTab === "medicos" && (
				<div className="flex flex-col gap-6">
					{/* Cadastro e Tabela de Médicos */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
							<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
								<Icon icon={UserFollow} className="size-4 text-primary" />
								Cadastrar Oftalmologista
							</h3>
							<div className="flex flex-col gap-3">
								<Input
									placeholder="Nome do Médico (ex: Dr. Carlos)"
									value={newDocName}
									onChange={(e) => setNewDocName(e.target.value)}
									className="text-xs h-9"
								/>
								<Input
									placeholder="CRM (ex: 151798/SP)"
									value={newDocCrm}
									onChange={(e) => setNewDocCrm(e.target.value)}
									className="text-xs h-9"
								/>
								<select
									className="w-full h-9 rounded-md border bg-background px-3 py-1 text-xs outline-none"
									value={newDocRep}
									onChange={(e) => setNewDocRep(e.target.value)}
								>
									<option value="">Selecione o Representante...</option>
									{reps.map((r) => (
										<option key={r.id} value={r.nome}>
											{r.nome}
										</option>
									))}
								</select>
								<Button size="sm" onClick={handleAddDoctor} className="gap-1.5 font-semibold">
									<Icon icon={Add} className="size-4" />
									Gravar Médico
								</Button>
							</div>
						</div>

						<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden">
							<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
								<span className="text-xs font-bold text-foreground">
									Médicos Prescritores Cadastrados ({doctors.length})
								</span>
							</div>
							<div className="divide-y max-h-72 overflow-y-auto">
								{doctors.map((doc, idx) => (
									<div
										key={idx}
										className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/40 transition-colors"
									>
										<div className="flex flex-col">
											<span className="font-semibold text-foreground">{doc.nome}</span>
											<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
												<span className="font-mono">CRM: {doc.crm}</span>
												{doc.representante && (
													<Badge variant="outline" className="text-[10px] py-0 h-4">
														Rep: {doc.representante}
													</Badge>
												)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-muted-foreground hover:text-destructive"
											onClick={() => handleDeleteDoctor(idx)}
										>
											<Icon icon={TrashCan} className="size-3.5" />
										</Button>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Vinculação em Massa (Seletor Dual do App Lentes) */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<div className="flex items-center justify-between border-b pb-3">
							<div className="flex items-center gap-2">
								<Icon icon={UserSpeaker} className="size-4 text-primary" />
								<h3 className="text-sm font-bold tracking-tight">
									Vinculação em Massa de Médicos para Representante
								</h3>
							</div>
							<div className="flex items-center gap-3">
								<select
									className="h-8 rounded-md border bg-background px-3 py-1 text-xs outline-none font-semibold"
									value={bulkRepSelected}
									onChange={(e) => setBulkRepSelected(e.target.value)}
								>
									<option value="">Selecione o Representante Destino...</option>
									{reps.map((r) => (
										<option key={r.id} value={r.nome}>
											{r.nome}
										</option>
									))}
								</select>
								<Button
									size="sm"
									variant="default"
									onClick={handleApplyBulkLink}
									className="h-8 text-xs font-semibold gap-1.5"
								>
									<Icon icon={Checkmark} className="size-3.5" />
									Vincular Selecionados
								</Button>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Selecione os médicos abaixo que deseja atrelar em lote à carteira do representante selecionado:
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
							{doctors.map((doc, idx) => {
								const isSelected = selectedDoctorIndexes.includes(idx);
								return (
									<label
										key={idx}
										className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
											isSelected ? "bg-primary/10 border-primary font-semibold" : "hover:bg-muted/40"
										}`}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedDoctorIndexes([...selectedDoctorIndexes, idx]);
												} else {
													setSelectedDoctorIndexes(
														selectedDoctorIndexes.filter((i) => i !== idx),
													);
												}
											}}
											className="rounded border-input text-primary size-3.5"
										/>
										<div className="truncate">
											<div className="truncate">{doc.nome}</div>
											<div className="text-[10px] text-muted-foreground font-mono">
												CRM: {doc.crm} · {doc.representante || "Sem Rep"}
											</div>
										</div>
									</label>
								);
							})}
						</div>
					</div>

					{/* Clínicas & Representantes */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Representantes */}
						<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
							<h3 className="text-sm font-bold tracking-tight">Representantes Médicos</h3>
							<div className="flex gap-2">
								<Input
									placeholder="Nome do Representante"
									value={newRepName}
									onChange={(e) => setNewRepName(e.target.value)}
									className="text-xs h-9"
								/>
								<Button size="sm" onClick={handleAddRep} className="shrink-0">
									Adicionar
								</Button>
							</div>
							<div className="divide-y max-h-48 overflow-y-auto border rounded-lg">
								{reps.map((r) => (
									<div
										key={r.id}
										className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30"
									>
										<span>{r.nome}</span>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleDeleteRep(r.id)}
										>
											<Icon icon={TrashCan} className="size-3" />
										</Button>
									</div>
								))}
							</div>
						</div>

						{/* Clínicas */}
						<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
							<h3 className="text-sm font-bold tracking-tight">Clínicas Oftalmológicas</h3>
							<div className="grid grid-cols-2 gap-2">
								<Input
									placeholder="Nome da Clínica"
									value={newClinicName}
									onChange={(e) => setNewClinicName(e.target.value)}
									className="text-xs h-9"
								/>
								<Input
									placeholder="Cidade"
									value={newClinicCity}
									onChange={(e) => setNewClinicCity(e.target.value)}
									className="text-xs h-9"
								/>
							</div>
							<Button size="sm" onClick={handleAddClinic}>
								Cadastrar Clínica
							</Button>
							<div className="divide-y max-h-48 overflow-y-auto border rounded-lg">
								{clinics.map((c, idx) => (
									<div
										key={idx}
										className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30"
									>
										<div>
											<span className="font-semibold">{c.nome}</span>
											<span className="text-[10px] text-muted-foreground ml-2">
												({c.cidade || "Campinas"})
											</span>
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleDeleteClinic(idx)}
										>
											<Icon icon={TrashCan} className="size-3" />
										</Button>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: COMISSÕES & FINANCEIRO */}
			{activeTab === "comissoes" && (
				<div className="flex flex-col gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-5">
						<div className="flex items-center justify-between border-b pb-3">
							<div>
								<h3 className="text-sm font-bold tracking-tight">
									Parâmetros de Comissões, Metas e Estornos de Devolução
								</h3>
								<p className="text-xs text-muted-foreground">
									Percentuais utilizados no cálculo de relatórios de Resultado Médico e Estornos.
								</p>
							</div>
							<Button onClick={handleSaveCommissions} size="sm" className="gap-1.5 font-bold">
								<Icon icon={Checkmark} className="size-4" />
								Salvar Comissões
							</Button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Bloco Médico e Representante */}
							<div className="rounded-lg border p-4 flex flex-col gap-3 bg-muted/20">
								<span className="text-xs font-bold text-primary">
									Comissão Médica e Representantes
								</span>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Comissão Padrão do Médico Prescritor (%)
									</label>
									<Input
										type="number"
										step="0.1"
										value={commissions.medicoPerc}
										onChange={(e) =>
											setCommissions({ ...commissions, medicoPerc: Number(e.target.value) })
										}
										className="h-8 text-xs font-mono mt-1"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Meta Mensal de Volume do Representante (R$)
									</label>
									<Input
										type="number"
										step="1000"
										value={commissions.repMetaVolume}
										onChange={(e) =>
											setCommissions({ ...commissions, repMetaVolume: Number(e.target.value) })
										}
										className="h-8 text-xs font-mono mt-1"
									/>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="text-[11px] font-medium text-muted-foreground">
											Rep. Abaixo da Meta (%)
										</label>
										<Input
											type="number"
											step="0.1"
											value={commissions.repPercAbaixo}
											onChange={(e) =>
												setCommissions({
													...commissions,
													repPercAbaixo: Number(e.target.value),
												})
											}
											className="h-8 text-xs font-mono mt-1"
										/>
									</div>
									<div>
										<label className="text-[11px] font-medium text-muted-foreground">
											Rep. Acima da Meta (%)
										</label>
										<Input
											type="number"
											step="0.1"
											value={commissions.repPercAcima}
											onChange={(e) =>
												setCommissions({
													...commissions,
													repPercAcima: Number(e.target.value),
												})
											}
											className="h-8 text-xs font-mono mt-1"
										/>
									</div>
								</div>
							</div>

							{/* Bloco Estornos de Devolução */}
							<div className="rounded-lg border p-4 flex flex-col gap-3 bg-muted/20">
								<span className="text-xs font-bold text-primary">
									Estornos em Caso de Devolução / Cancelamento
								</span>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Comissão Estornada do Vendedor (%)
									</label>
									<Input
										type="number"
										step="0.1"
										value={commissions.vendedorPerc}
										onChange={(e) =>
											setCommissions({
												...commissions,
												vendedorPerc: Number(e.target.value),
											})
										}
										className="h-8 text-xs font-mono mt-1"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Comissão Estornada do Gerente da Loja (%)
									</label>
									<Input
										type="number"
										step="0.1"
										value={commissions.gerentePerc}
										onChange={(e) =>
											setCommissions({
												...commissions,
												gerentePerc: Number(e.target.value),
											})
										}
										className="h-8 text-xs font-mono mt-1"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Retenção / Taxa da Loja (%)
									</label>
									<Input
										type="number"
										step="0.1"
										value={commissions.lojaPerc}
										onChange={(e) =>
											setCommissions({ ...commissions, lojaPerc: Number(e.target.value) })
										}
										className="h-8 text-xs font-mono mt-1"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Formas de Pagamento */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight">
							Formas de Pagamento Habilitadas no Balcão
						</h3>
						<div className="flex flex-wrap gap-2">
							{paymentMethods.map((pm, idx) => (
								<Badge key={idx} variant="secondary" className="text-xs py-1 px-2.5 gap-1.5">
									{pm}
									<button
										type="button"
										className="hover:text-destructive cursor-pointer"
										onClick={async () => {
											const up = paymentMethods.filter((_, i) => i !== idx);
											setPaymentMethods(up);
											await savePaymentMethods(up);
										}}
									>
										<Icon icon={Close} className="size-3" />
									</button>
								</Badge>
							))}
						</div>
						<div className="flex gap-2 max-w-sm mt-2">
							<Input
								placeholder="Nova Forma (ex: Boleto Faturado)"
								value={newGenericItem}
								onChange={(e) => setNewGenericItem(e.target.value)}
								className="text-xs h-8"
							/>
							<Button
								size="sm"
								className="h-8"
								onClick={async () => {
									if (!newGenericItem.trim()) return;
									const up = [...paymentMethods, newGenericItem.trim()];
									setPaymentMethods(up);
									setNewGenericItem("");
									await savePaymentMethods(up);
								}}
							>
								Adicionar
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: TÉCNICOS & WHATSAPP */}
			{activeTab === "tecnicos" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Técnicos Credenciados */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={Phone} className="size-4 text-primary" />
							Técnicos de Montagem & Assistência
						</h3>
						<div className="flex flex-col gap-2.5 border p-3 rounded-lg bg-muted/20">
							<Input
								placeholder="Nome do Técnico"
								value={newTechName}
								onChange={(e) => setNewTechName(e.target.value)}
								className="text-xs h-8"
							/>
							<Input
								placeholder="WhatsApp (ex: 5519999999999)"
								value={newTechPhone}
								onChange={(e) => setNewTechPhone(e.target.value)}
								className="text-xs h-8"
							/>
							<Input
								placeholder="Link Calendly (ex: https://calendly.com/tecnico)"
								value={newTechCalendly}
								onChange={(e) => setNewTechCalendly(e.target.value)}
								className="text-xs h-8"
							/>
							<Button size="sm" onClick={handleAddTechnician} className="h-8 text-xs font-semibold">
								Adicionar Técnico
							</Button>
						</div>

						<div className="divide-y border rounded-lg max-h-64 overflow-y-auto">
							{technicians.map((t, idx) => (
								<div key={idx} className="flex items-center justify-between p-3 text-xs">
									<div>
										<div className="font-semibold text-foreground">{t.nome}</div>
										<div className="text-[11px] text-muted-foreground font-mono">
											WhatsApp: {t.whatsapp} · Calendly: {t.calendlyUrl}
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleDeleteTechnician(idx)}
									>
										<Icon icon={TrashCan} className="size-3.5" />
									</Button>
								</div>
							))}
						</div>
					</div>

					{/* Templates de WhatsApp */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold tracking-tight">Templates Dinâmicos de WhatsApp</h3>
							<Button size="sm" onClick={handleSaveTemplates} className="h-7 text-xs font-semibold">
								Salvar Templates
							</Button>
						</div>
						<p className="text-[11px] text-muted-foreground">
							Tags automáticas disponíveis: <code>{"{cliente}"}</code>, <code>{"{os}"}</code>,{" "}
							<code>{"{data}"}</code>, <code>{"{hora}"}</code>, <code>{"{motivo}"}</code>,{" "}
							<code>{"{lente}"}</code>, <code>{"{tecnico}"}</code>, <code>{"{loja}"}</code>.
						</p>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-semibold text-foreground">
									Mensagem para o Técnico (Abertura de Chamado)
								</label>
								<textarea
									rows={3}
									value={templateTecnico}
									onChange={(e) => setTemplateTecnico(e.target.value)}
									className="w-full mt-1 p-2 text-xs rounded-md border bg-background font-mono"
								/>
							</div>
							<div>
								<label className="text-[11px] font-semibold text-foreground">
									Mensagem para o Cliente (Confirmação de Agendamento)
								</label>
								<textarea
									rows={3}
									value={templateClienteConf}
									onChange={(e) => setTemplateClienteConf(e.target.value)}
									className="w-full mt-1 p-2 text-xs rounded-md border bg-background font-mono"
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: TOLERÂNCIAS ABNT ISO */}
			{activeTab === "tolerancias" && (
				<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-5">
					<div className="flex items-center justify-between border-b pb-3">
						<div>
							<h3 className="text-sm font-bold tracking-tight">
								Normas Técnicas e Tolerâncias Ópticas (ABNT NBR ISO 8980 & 21987)
							</h3>
							<p className="text-xs text-muted-foreground">
								Bandas aceitáveis de desvio dióptrico utilizadas na Conferência de Lensômetro e na Auditoria IA.
							</p>
						</div>
						<Button onClick={handleSaveTolerances} size="sm" className="font-bold gap-1.5">
							<Icon icon={Checkmark} className="size-4" />
							Salvar Normas
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
						<div className="border p-4 rounded-lg flex flex-col gap-3 bg-muted/20">
							<span className="font-bold text-foreground">Poder Dióptrico</span>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância Esférico (± Dioptrias)
								</label>
								<Input
									type="number"
									step="0.01"
									value={tolerances.sphericalTolerance}
									onChange={(e) =>
										setTolerances({
											...tolerances,
											sphericalTolerance: Number(e.target.value),
										})
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância Cilíndrico (± Dioptrias)
								</label>
								<Input
									type="number"
									step="0.01"
									value={tolerances.cylindricalTolerance}
									onChange={(e) =>
										setTolerances({
											...tolerances,
											cylindricalTolerance: Number(e.target.value),
										})
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
						</div>

						<div className="border p-4 rounded-lg flex flex-col gap-3 bg-muted/20">
							<span className="font-bold text-foreground">Eixo Astigmático</span>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância de Eixo Alto (&gt; 1.50 D)
								</label>
								<Input
									type="number"
									step="1"
									value={tolerances.axisToleranceHigh}
									onChange={(e) =>
										setTolerances({
											...tolerances,
											axisToleranceHigh: Number(e.target.value),
										})
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância de Eixo Baixo (&lt; 0.75 D)
								</label>
								<Input
									type="number"
									step="1"
									value={tolerances.axisToleranceLow}
									onChange={(e) =>
										setTolerances({
											...tolerances,
											axisToleranceLow: Number(e.target.value),
										})
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
						</div>

						<div className="border p-4 rounded-lg flex flex-col gap-3 bg-muted/20">
							<span className="font-bold text-foreground">Posicionamento de Pupila</span>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância DNP Horizontal (± mm)
								</label>
								<Input
									type="number"
									step="0.5"
									value={tolerances.dnpTolerance}
									onChange={(e) =>
										setTolerances({ ...tolerances, dnpTolerance: Number(e.target.value) })
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] text-muted-foreground">
									Tolerância Altura Vertical (± mm)
								</label>
								<Input
									type="number"
									step="0.5"
									value={tolerances.heightTolerance}
									onChange={(e) =>
										setTolerances({ ...tolerances, heightTolerance: Number(e.target.value) })
									}
									className="h-8 font-mono mt-1"
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: TABELAS DE APOIO */}
			{activeTab === "apoio" && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* Motivos de Perda */}
					<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
						<span className="text-xs font-bold text-foreground">Motivos de Perda de Venda</span>
						<div className="divide-y border rounded-md max-h-40 overflow-y-auto">
							{lossReasons.map((m, idx) => (
								<div key={idx} className="p-2 text-xs flex justify-between">
									<span>{m}</span>
								</div>
							))}
						</div>
					</div>

					{/* Motivos de Ocorrência */}
					<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
						<span className="text-xs font-bold text-foreground">Motivos de Ocorrência Técnica</span>
						<div className="divide-y border rounded-md max-h-40 overflow-y-auto">
							{incidentReasons.map((m, idx) => (
								<div key={idx} className="p-2 text-xs flex justify-between">
									<span>{m}</span>
								</div>
							))}
						</div>
					</div>

					{/* Assuntos de Visita Médica */}
					<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
						<span className="text-xs font-bold text-foreground">Pautas de Visita Médica</span>
						<div className="divide-y border rounded-md max-h-40 overflow-y-auto">
							{visitTopics.map((m, idx) => (
								<div key={idx} className="p-2 text-xs flex justify-between">
									<span>{m}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
