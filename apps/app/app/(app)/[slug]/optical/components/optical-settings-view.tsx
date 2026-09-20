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
import User from "@carbon/icons-react/es/User";
import ListChecked from "@carbon/icons-react/es/ListChecked";
import Locked from "@carbon/icons-react/es/Locked";
import Password from "@carbon/icons-react/es/Password";
import Security from "@carbon/icons-react/es/Security";
import Purchase from "@carbon/icons-react/es/Purchase";
import Glasses from "@crm/ui/components/icons/glasses";
import { OpticalSalesLogView } from "./optical-sales-log-view";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { cn } from "@crm/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@crm/ui/components/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { toast } from "sonner";
import { useOpticalAuth } from "@/lib/optical/optical-auth-context";
import {
	getDiscountPolicies,
	saveDiscountPolicies,
	addOrUpdateDiscountPolicy,
	deleteDiscountPolicy,
	clearOpticalStorage,
	isDatabaseZeroed,
	getOpticalOrders,
} from "@/lib/optical/optical-store";
import { fetchLensCatalog, fetchFrameCatalog } from "@/lib/optical/supabase-optical";
import { appLentesShield } from "@/lib/optical/app-lentes-shield";
import { mnocxDatabaseClient } from "@/lib/optical/mnocx-database-client";
import type { DiscountPolicy } from "@/lib/optical/optical-types";
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
	fetchSupabaseUsers,
	saveSupabaseUser,
	deleteSupabaseUser,
	decodeUserPermissions,
	type OpticalUserRecord,
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
	fetchSupabaseCaptadores,
	saveSupabaseCaptadores,
	fetchSupabaseFrameShapes,
	saveSupabaseFrameShapes,
	fetchSupabaseFrameTypes,
	saveSupabaseFrameTypes,
	type OpticalCaptador,
	type OpticalFrameShape,
	type OpticalFrameType,
	DEFAULT_FRAME_TYPES,
	fetchRoleDiscountTiers,
	saveRoleDiscountTiers,
	type RoleDiscountTier,
	DEFAULT_ROLE_DISCOUNT_TIERS,
	type SellerItem,
	type StoreItem,
	type TechnicianItem,
	runDatabaseDiagnostic,
	type DatabaseDiagnosticResult,
} from "@/lib/optical/supabase-optical";

type SettingsSubTab =
	| "lojas"
	| "labs"
	| "vendedores"
	| "medicos"
	| "captadores"
	| "comissoes"
	| "tipos_armacao"
	| "formatos_aro"
	| "tecnicos"
	| "apoio"
	| "tolerancias"
	| "usuarios"
	| "descontos"
	| "log_vendas"
	| "integridade";

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

	// Políticas de Desconto
	const [discountPolicies, setDiscountPolicies] = useState<DiscountPolicy[]>([]);
	const [newPolicyRole, setNewPolicyRole] = useState<"VENDEDOR" | "GERENTE" | "ADMIN">("VENDEDOR");
	const [newPolicyMaxPct, setNewPolicyMaxPct] = useState<number>(10);
	const [newPolicyBrand, setNewPolicyBrand] = useState<string>("TODOS");
	const [newPolicyCategory, setNewPolicyCategory] = useState<"GLOBAL" | "ARMAÇÃO" | "LENTE">("GLOBAL");
	const [newPolicyDesc, setNewPolicyDesc] = useState<string>("");

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
	const [newLossReason, setNewLossReason] = useState("");
	const [newIncidentReason, setNewIncidentReason] = useState("");
	const [newVisitTopic, setNewVisitTopic] = useState("");
	const [newCaptador, setNewCaptador] = useState("");

	// Captadores & Comissões
	const [captadores, setCaptadores] = useState<OpticalCaptador[]>([]);
	const [newCapName, setNewCapName] = useState("");
	const [newCapPhone, setNewCapPhone] = useState("");
	const [newCapPix, setNewCapPix] = useState("");
	const [newCapCommissionType, setNewCapCommissionType] = useState<"PERCENTUAL" | "FIXO">("PERCENTUAL");
	const [newCapCommissionValue, setNewCapCommissionValue] = useState<number>(5);
	const [newCapNotes, setNewCapNotes] = useState("");

	// Formatos de Armação (2D)
	const [frameShapes, setFrameShapes] = useState<OpticalFrameShape[]>([]);
	const [newShapeName, setNewShapeName] = useState("");
	const [newShapeCategory, setNewShapeCategory] = useState("Clássico");
	const [newShapeDesc, setNewShapeDesc] = useState("");

	// Vinculação em Massa de Médicos
	const [bulkRepSelected, setBulkRepSelected] = useState("");
	const [selectedDoctorIndexes, setSelectedDoctorIndexes] = useState<number[]>([]);

	// Usuários & Acessos
	const { session } = useOpticalAuth();
	const [usersList, setUsersList] = useState<OpticalUserRecord[]>([]);
	const [isUserModalOpen, setIsUserModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<OpticalUserRecord | null>(null);

	// Form Usuário
	const [uUsuario, setUUsuario] = useState("");
	const [uSenha, setUSenha] = useState("");
	const [uNome, setUNome] = useState("");
	const [uStatus, setUStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");
	const [uLoja, setULoja] = useState("Todos");
	const [uPermBalcao, setUPermBalcao] = useState(true);
	const [uPermConferencia, setUPermConferencia] = useState(false);
	const [uPermLogVendas, setUPermLogVendas] = useState(true);
	const [uPermResumo, setUPermResumo] = useState(false);
	const [uPermMedicos, setUPermMedicos] = useState(false);
	const [uPermGarantias, setUPermGarantias] = useState(false);
	const [uPermAuditoria, setUPermAuditoria] = useState(false);
	const [uPermConfig, setUPermConfig] = useState(false);
	const [uCargo, setUCargo] = useState("Vendedor Pleno");
	const [uDescontoMax, setUDescontoMax] = useState(10);
	const [uIsVendedor, setUIsVendedor] = useState(true);

	// Tipos de Armação Parametrizáveis
	const [frameTypes, setFrameTypes] = useState<OpticalFrameType[]>(DEFAULT_FRAME_TYPES);
	const [newFrameTypeName, setNewFrameTypeName] = useState("");
	const [newFrameTypeDesc, setNewFrameTypeDesc] = useState("");

	// Níveis de Desconto por Perfil / Cargo
	const [roleDiscountTiers, setRoleDiscountTiers] = useState<RoleDiscountTier[]>(DEFAULT_ROLE_DISCOUNT_TIERS);
	const [editingTierId, setEditingTierId] = useState<string | null>(null);
	const [editingTierPct, setEditingTierPct] = useState<number>(10);

	// Diagnóstico de Banco & Integridade
	const [diagnosticResult, setDiagnosticResult] = useState<DatabaseDiagnosticResult | null>(null);
	const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

	// Gestão de Dados & Inicialização de Testes
	const [ordersCount, setOrdersCount] = useState<number>(() => getOpticalOrders().length);
	const [lensCount, setLensCount] = useState<number>(0);
	const [frameCount, setFrameCount] = useState<number>(0);
	const [zeroModalOpen, setZeroModalOpen] = useState(false);
	const [zeroPassword, setZeroPassword] = useState("");
	const [zeroPasswordError, setZeroPasswordError] = useState("");
	const [isZeroing, setIsZeroing] = useState(false);

	const refreshDataCounts = async () => {
		setOrdersCount(getOpticalOrders().length);
		try {
			const [lenses, frames] = await Promise.all([fetchLensCatalog(), fetchFrameCatalog()]);
			setLensCount(lenses.length);
			setFrameCount(frames.length);
		} catch {}
	};

	const handleZeroDatabase = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (zeroPassword.trim() !== "120212") {
			setZeroPasswordError("Senha incorreta. Apenas o Gerente ou Administrador pode zerar o banco.");
			toast.error("Senha gerencial incorreta! Ação de limpeza bloqueada.");
			return;
		}

		setIsZeroing(true);
		try {
			clearOpticalStorage("ORDERS_ONLY");
			setOrdersCount(0);
			setZeroModalOpen(false);
			setZeroPassword("");
			setZeroPasswordError("");
			toast.success("Banco de Ordens & Vendas zerado com sucesso!", {
				description: "O sistema agora está com 0 OSs ativas, pronto para testes operacionais limpos.",
			});
		} catch (err) {
			toast.error("Erro ao zerar o banco de dados.");
		} finally {
			setIsZeroing(false);
		}
	};

	const handleRestoreDemo = () => {
		clearOpticalStorage("DEMO");
		setOrdersCount(getOpticalOrders().length);
		toast.success("Dados de demonstração restaurados com sucesso!", {
			description: "As ordens de serviço de teste foram recarregadas no sistema.",
		});
	};

	// Auditoria de Isolamento e Blindagem do App Lentes
	const [isolationModalOpen, setIsolationModalOpen] = useState(false);
	const [shieldAudit, setShieldAudit] = useState(() => appLentesShield.getAuditReport());
	const [dbStatus, setDbStatus] = useState(() => mnocxDatabaseClient.getStatus());

	const handleOpenIsolationModal = () => {
		setShieldAudit(appLentesShield.getAuditReport());
		setDbStatus(mnocxDatabaseClient.getStatus());
		setIsolationModalOpen(true);
	};

	const handleRunDiagnostic = async () => {
		setIsRunningDiagnostic(true);
		try {
			const res = await runDatabaseDiagnostic();
			setDiagnosticResult(res);
			toast.success(`Diagnóstico de banco concluído em ${res.latencyMs}ms!`);
		} catch (e) {
			toast.error("Erro ao executar rotina de diagnóstico.");
		} finally {
			setIsRunningDiagnostic(false);
		}
	};

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
					uList,
					capList,
					shapeList,
					fTypeList,
					tierList,
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
					fetchSupabaseUsers(),
					fetchSupabaseCaptadores(),
					fetchSupabaseFrameShapes(),
					fetchSupabaseFrameTypes(),
					fetchRoleDiscountTiers(),
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
				setUsersList(uList);
				setCaptadores(capList);
				setFrameShapes(shapeList);
				setFrameTypes(fTypeList);
				setRoleDiscountTiers(tierList);
				setDiscountPolicies(getDiscountPolicies());
				refreshDataCounts();
				if (s.length > 0) setNewSellerStore(s[0]?.nome || "");
			} catch (e) {
				console.warn("Erro ao carregar configurações:", e);
			} finally {
				setLoading(false);
			}
		}
		loadAll();
	}, []);

	useEffect(() => {
		if (activeTab === "integridade") {
			refreshDataCounts();
		}
	}, [activeTab]);

	// Handlers de Usuários
	const handleSelectCargo = (cargo: string) => {
		setUCargo(cargo);
		const tier = roleDiscountTiers.find((t) => t.cargo.toLowerCase() === cargo.toLowerCase());
		if (tier) {
			setUDescontoMax(tier.maxDiscountPct);
		}
		if (cargo.toLowerCase().includes("vendedor")) {
			setUIsVendedor(true);
			setUPermBalcao(true);
		} else if (cargo.toLowerCase().includes("admin") || cargo.toLowerCase().includes("gerente")) {
			setUIsVendedor(true);
		}
	};

	const handleOpenCreateUser = () => {
		setEditingUser(null);
		setUUsuario("");
		setUSenha("12345");
		setUNome("");
		setUStatus("ATIVO");
		setULoja(stores[0]?.nome || "Todos");
		setUCargo("Vendedor Pleno");
		setUDescontoMax(10);
		setUIsVendedor(true);
		setUPermBalcao(true);
		setUPermConferencia(false);
		setUPermLogVendas(true);
		setUPermResumo(false);
		setUPermMedicos(false);
		setUPermGarantias(false);
		setUPermAuditoria(false);
		setUPermConfig(false);
		setIsUserModalOpen(true);
	};

	const handleOpenEditUser = (user: OpticalUserRecord) => {
		setEditingUser(user);
		setUUsuario(user.usuario);
		setUSenha(user.senha);
		setUNome(user.nome);
		setUStatus(user.status);
		setULoja(user.loja || "Todos");
		setUCargo(user.cargo || (user.usuario === "admin" ? "Diretoria / Admin" : "Vendedor Pleno"));
		setUDescontoMax(user.perfilDescontoMaxPct !== undefined ? user.perfilDescontoMaxPct : (user.usuario === "admin" ? 100 : 10));
		setUIsVendedor(user.isVendedor !== undefined ? user.isVendedor : (user.venda === "ATIVO" && user.usuario !== "admin"));
		const perms = decodeUserPermissions(user);
		setUPermBalcao(perms.balcao);
		setUPermConferencia(perms.conferencia);
		setUPermLogVendas(perms.log_vendas);
		setUPermResumo(perms.resumo);
		setUPermMedicos(perms.medicos);
		setUPermGarantias(perms.garantias);
		setUPermAuditoria(perms.auditoria);
		setUPermConfig(perms.config);
		setIsUserModalOpen(true);
	};

	const handleSaveUser = async () => {
		if (!uUsuario.trim() || !uSenha.trim() || !uNome.trim()) {
			toast.error("Preencha usuário, senha e nome.");
			return;
		}

		const extraParts: string[] = [];
		if (uPermMedicos) extraParts.push("med", "vis");
		if (uPermGarantias) extraParts.push("gar", "dev", "oco", "ast");
		extraParts.push("orc", "osl");
		const medicosStr = uUsuario.toLowerCase().trim() === "admin" ? "ATIVO" : extraParts.join(",");

		const record: Partial<OpticalUserRecord> = {
			id: editingUser?.id,
			usuario: uUsuario.trim(),
			senha: uSenha.trim(),
			nome: uNome.trim(),
			status: uStatus,
			loja: uLoja,
			cargo: uCargo,
			perfilDescontoMaxPct: uDescontoMax,
			isVendedor: uIsVendedor,
			venda: uPermBalcao ? "ATIVO" : "INATIVO",
			conferencia: uPermConferencia ? "ATIVO" : "INATIVO",
			log_vendas: uPermLogVendas ? "ATIVO" : "INATIVO",
			dashboard: uPermResumo ? "ATIVO" : "INATIVO",
			resumo_vendas: uPermResumo ? "ATIVO" : "INATIVO",
			auditoria: uPermAuditoria ? "ATIVO" : "INATIVO",
			configuracoes: uPermConfig ? "ATIVO" : "INATIVO",
			medicos: medicosStr,
		};

		const ok = await saveSupabaseUser(record);
		if (ok) {
			toast.success(
				editingUser
					? `Usuário "${record.usuario}" atualizado!`
					: `Usuário "${record.usuario}" criado com sucesso!`,
			);
			setIsUserModalOpen(false);
			const [refreshedUsers, refreshedSellers] = await Promise.all([
				fetchSupabaseUsers(),
				fetchSupabaseSellers(),
			]);
			setUsersList(refreshedUsers);
			setSellers(refreshedSellers);
		} else {
			toast.error("Erro ao salvar usuário no Supabase.");
		}
	};

	// Handlers de Tipos de Armação
	const handleAddFrameType = async () => {
		if (!newFrameTypeName.trim()) return;
		const name = newFrameTypeName.trim();
		const id = `tipo_${Date.now()}`;
		const newType: OpticalFrameType = {
			id,
			nome: name,
			descricao: newFrameTypeDesc.trim() || undefined,
			ativo: true,
			ordem: frameTypes.length + 1,
		};
		const updated = [...frameTypes, newType];
		setFrameTypes(updated);
		setNewFrameTypeName("");
		setNewFrameTypeDesc("");
		toast.success(`Tipo de armação "${name}" cadastrado com sucesso!`);
		await saveSupabaseFrameTypes(updated);
	};

	const handleToggleFrameType = async (id: string) => {
		const updated = frameTypes.map((t) =>
			t.id === id ? { ...t, ativo: !t.ativo } : t
		);
		setFrameTypes(updated);
		toast.info("Status do tipo de armação alterado.");
		await saveSupabaseFrameTypes(updated);
	};

	const handleDeleteFrameType = async (id: string, name: string) => {
		const updated = frameTypes.filter((t) => t.id !== id);
		setFrameTypes(updated);
		toast.info(`Tipo de armação "${name}" removido.`);
		await saveSupabaseFrameTypes(updated);
	};

	// Handlers de Níveis de Desconto por Cargo
	const handleSaveRoleDiscountTier = async (tierId: string, maxPct: number) => {
		const updated = roleDiscountTiers.map((t) =>
			t.id === tierId ? { ...t, maxDiscountPct: maxPct } : t
		);
		setRoleDiscountTiers(updated);
		setEditingTierId(null);
		toast.success("Nível de desconto por cargo atualizado!");
		await saveRoleDiscountTiers(updated);
	};

	const handleToggleUserStatus = async (user: OpticalUserRecord) => {
		const nextStatus = user.status === "ATIVO" ? "INATIVO" : "ATIVO";
		const ok = await saveSupabaseUser({ id: user.id, status: nextStatus });
		if (ok) {
			toast.success(`Usuário ${user.usuario} agora está ${nextStatus}.`);
			setUsersList((prev) =>
				prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)),
			);
		}
	};

	const handleDeleteUserAction = async (user: OpticalUserRecord) => {
		if (user.usuario.toLowerCase() === "admin") {
			toast.error("O usuário administrador não pode ser excluído.");
			return;
		}
		if (!confirm(`Deseja excluir o usuário "${user.usuario}"?`)) return;
		if (user.id) {
			const ok = await deleteSupabaseUser(user.id);
			if (ok) {
				toast.success("Usuário removido.");
				setUsersList((prev) => prev.filter((u) => u.id !== user.id));
			}
		}
	};

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

	const handleAddLossReason = async () => {
		if (!newLossReason.trim()) return;
		const up = [...lossReasons, newLossReason.trim()];
		setLossReasons(up);
		setNewLossReason("");
		toast.success(`Motivo de perda "${newLossReason.trim()}" adicionado.`);
		await saveConfigSetting("motivos_perda", up);
	};

	const handleDeleteLossReason = async (idx: number) => {
		const up = lossReasons.filter((_, i) => i !== idx);
		setLossReasons(up);
		toast.info("Motivo de perda removido.");
		await saveConfigSetting("motivos_perda", up);
	};

	const handleAddIncidentReason = async () => {
		if (!newIncidentReason.trim()) return;
		const up = [...incidentReasons, newIncidentReason.trim()];
		setIncidentReasons(up);
		setNewIncidentReason("");
		toast.success(`Motivo de ocorrência "${newIncidentReason.trim()}" adicionado.`);
		await saveConfigSetting("motivos_ocorrencia", up);
	};

	const handleDeleteIncidentReason = async (idx: number) => {
		const up = incidentReasons.filter((_, i) => i !== idx);
		setIncidentReasons(up);
		toast.info("Motivo de ocorrência removido.");
		await saveConfigSetting("motivos_ocorrencia", up);
	};

	const handleAddVisitTopic = async () => {
		if (!newVisitTopic.trim()) return;
		const up = [...visitTopics, newVisitTopic.trim()];
		setVisitTopics(up);
		setNewVisitTopic("");
		toast.success(`Pauta de visita "${newVisitTopic.trim()}" adicionada.`);
		await saveConfigSetting("assuntos_visita", up);
	};

	const handleDeleteVisitTopic = async (idx: number) => {
		const up = visitTopics.filter((_, i) => i !== idx);
		setVisitTopics(up);
		toast.info("Pauta de visita removida.");
		await saveConfigSetting("assuntos_visita", up);
	};

	const handleAddCaptador = async () => {
		if (!newCaptador.trim()) return;
		const up = [...leadCapturers, { nome: newCaptador.trim() }];
		setLeadCapturers(up);
		setNewCaptador("");
		toast.success(`Captador "${newCaptador.trim()}" cadastrado.`);
		await saveConfigSetting("captadores", up);
	};

	const handleDeleteCaptador = async (idx: number) => {
		const up = leadCapturers.filter((_, i) => i !== idx);
		setLeadCapturers(up);
		toast.info("Captador removido.");
		await saveConfigSetting("captadores", up);
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

	// Handlers de Políticas de Desconto
	const handleAddPolicy = () => {
		const pol: DiscountPolicy = {
			id: `pol-${Date.now()}`,
			role: newPolicyRole,
			maxDiscountPct: Number(newPolicyMaxPct) || 0,
			brandOrLab: newPolicyBrand || "TODOS",
			category: newPolicyCategory,
			description: newPolicyDesc.trim() || `Teto de ${newPolicyMaxPct}% para ${newPolicyRole}`,
		};
		addOrUpdateDiscountPolicy(pol);
		setDiscountPolicies(getDiscountPolicies());
		setNewPolicyDesc("");
		toast.success(`Política de desconto para ${newPolicyRole} cadastrada com sucesso!`);
	};

	const handleDeletePolicy = (id: string) => {
		deleteDiscountPolicy(id);
		setDiscountPolicies(getDiscountPolicies());
		toast.info("Política de desconto removida.");
	};

	// Handlers de Captadores
	const handleAddFullCaptador = async () => {
		if (!newCapName.trim()) {
			toast.error("Informe o nome do captador.");
			return;
		}
		const newCap: OpticalCaptador = {
			id: `cap-${Date.now()}`,
			name: newCapName.trim(),
			phone: newCapPhone.trim(),
			pixKey: newCapPix.trim(),
			commissionType: newCapCommissionType,
			commissionValue: Number(newCapCommissionValue) || 0,
			notes: newCapNotes.trim(),
			active: true,
		};
		const updated = [newCap, ...captadores];
		setCaptadores(updated);
		setNewCapName("");
		setNewCapPhone("");
		setNewCapPix("");
		setNewCapCommissionValue(5);
		setNewCapNotes("");
		toast.success(`Captador "${newCap.name}" cadastrado com sucesso!`);
		await saveSupabaseCaptadores(updated);
	};

	const handleToggleCaptador = async (id: string) => {
		const updated = captadores.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
		setCaptadores(updated);
		toast.info("Status do captador alterado.");
		await saveSupabaseCaptadores(updated);
	};

	const handleDeleteFullCaptador = async (id: string, name: string) => {
		const updated = captadores.filter((c) => c.id !== id);
		setCaptadores(updated);
		toast.info(`Captador "${name}" removido.`);
		await saveSupabaseCaptadores(updated);
	};

	// Handlers de Formatos de Aro (2D)
	const handleAddFullFrameShape = async () => {
		if (!newShapeName.trim()) {
			toast.error("Informe o nome do formato (ex: Redondo, Retangular, Aviador).");
			return;
		}
		const newShape: OpticalFrameShape = {
			id: `shape-${Date.now()}`,
			name: newShapeName.trim(),
			slug: newShapeName.trim().toLowerCase().replace(/\s+/g, "_"),
			category: newShapeCategory.trim() || "Clássico",
			description: newShapeDesc.trim(),
			active: true,
		};
		const updated = [...frameShapes, newShape];
		setFrameShapes(updated);
		setNewShapeName("");
		setNewShapeDesc("");
		toast.success(`Formato de aro "${newShape.name}" cadastrado!`);
		await saveSupabaseFrameShapes(updated);
	};

	const handleToggleFrameShape = async (id: string) => {
		const updated = frameShapes.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
		setFrameShapes(updated);
		toast.info("Status do formato de aro alterado.");
		await saveSupabaseFrameShapes(updated);
	};

	const handleDeleteFullFrameShape = async (id: string, name: string) => {
		const updated = frameShapes.filter((s) => s.id !== id);
		setFrameShapes(updated);
		toast.info(`Formato "${name}" removido.`);
		await saveSupabaseFrameShapes(updated);
	};

	const renderSubTabButton = (item: { id: SettingsSubTab; label: string; icon: any }) => {
		const isActive = activeTab === item.id;
		return (
			<button
				type="button"
				key={item.id}
				data-subtab={item.id}
				onClick={() => setActiveTab(item.id)}
				aria-label={`Acessar configurações de ${item.label}`}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"w-full h-11 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
					"flex items-center justify-center gap-2 text-center select-none min-w-0",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white focus-visible:ring-offset-2",
					isActive
						? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900 dark:border-white font-bold"
						: "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-300 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
				)}
				title={item.label}
			>
				<Icon
					icon={item.icon}
					className={cn(
						"size-4 shrink-0",
						isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"
					)}
				/>
				<span className="font-semibold text-xs leading-none truncate">{item.label}</span>
			</button>
		);
	};

	const renderIntegrityButton = () => {
		const isActive = activeTab === "integridade";
		return (
			<button
				type="button"
				data-subtab="integridade"
				onClick={() => setActiveTab("integridade")}
				aria-label="Acessar Banco & Integridade"
				aria-current={isActive ? "page" : undefined}
				title="Acessar Banco & Integridade"
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
					icon={Security}
					className={cn(
						"size-5 shrink-0 transition-transform duration-300 hover:scale-110",
						isActive ? "text-white dark:text-zinc-900" : "text-zinc-500 dark:text-zinc-400"
					)}
				/>
				<span className="font-semibold text-xs leading-tight text-center">
					Banco & Integridade
				</span>
			</button>
		);
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

			{/* Sub Tabs Navigation: 6 em cima, 6 embaixo e Banco & Integridade à direita ocupando as duas linhas */}
			<div className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-3 shadow-xs">
				<div className="flex flex-col md:flex-row items-stretch gap-2 w-full">
					{/* Bloco Esquerda/Central: 2 fileiras perfeitamente simétricas com 6 botões de largura rigorosamente idêntica */}
					<div className="flex-1 flex flex-col gap-2 min-w-0">
						{/* Linha 1: 6 botões */}
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
							{[
								{ id: "lojas" as SettingsSubTab, label: `Lojas (${stores.length})`, icon: Building },
								{ id: "labs" as SettingsSubTab, label: `Labs (${labs.length})`, icon: Chemistry },
								{ id: "usuarios" as SettingsSubTab, label: `Usuários & Vendedores (${usersList.length})`, icon: UserMultiple },
								{ id: "medicos" as SettingsSubTab, label: "Médicos & Clínicas", icon: UserFollow },
								{ id: "captadores" as SettingsSubTab, label: `Captadores (${captadores.length})`, icon: UserSpeaker },
								{ id: "comissoes" as SettingsSubTab, label: "Comissões", icon: Money },
							].map(renderSubTabButton)}
						</div>

						{/* Linha 2: 6 botões */}
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
							{[
								{ id: "tipos_armacao" as SettingsSubTab, label: `Tipos Armação (${frameTypes.length})`, icon: Glasses },
								{ id: "formatos_aro" as SettingsSubTab, label: `Formatos Aro (${frameShapes.length})`, icon: RulerAlt },
								{ id: "tecnicos" as SettingsSubTab, label: "Técnicos & Zap", icon: Phone },
								{ id: "apoio" as SettingsSubTab, label: "Tabelas Apoio", icon: Events },
								{ id: "tolerancias" as SettingsSubTab, label: "Tolerâncias ISO", icon: Checkmark },
								{ id: "descontos" as SettingsSubTab, label: "Políticas Desconto", icon: Purchase },
							].map(renderSubTabButton)}
						</div>
					</div>

					{/* Bloco da Direita: Banco & Integridade ocupando a altura das 2 linhas no desktop */}
					<div className="hidden md:flex w-36 shrink-0">
						{renderIntegrityButton()}
					</div>
				</div>

				{/* Fallback Mobile para Banco & Integridade em telas menores que md */}
				<div className="md:hidden mt-2">
					{renderSubTabButton({ id: "integridade", label: "Banco & Integridade", icon: Security })}
				</div>
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

			{/* CONTEÚDO DA ABA: CAPTADORES & COMISSÕES */}
			{activeTab === "captadores" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={UserSpeaker} className="size-4 text-primary" />
							Cadastrar Novo Captador
						</h3>
						<p className="text-xs text-muted-foreground">
							Cadastre captadores e promotores parceiros. Eles podem ser vinculados diretamente à OS na etapa de atendimento para cálculo automático de comissões.
						</p>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Nome Completo / Parceiro *</label>
								<Input
									placeholder="Ex: Roberto Silva"
									value={newCapName}
									onChange={(e) => setNewCapName(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">WhatsApp / Fone</label>
									<Input
										placeholder="(19) 99999-9999"
										value={newCapPhone}
										onChange={(e) => setNewCapPhone(e.target.value)}
										className="text-xs h-9 mt-1"
									/>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Chave PIX</label>
									<Input
										placeholder="CPF, Telefone ou E-mail"
										value={newCapPix}
										onChange={(e) => setNewCapPix(e.target.value)}
										className="text-xs h-9 mt-1"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">Tipo de Comissão</label>
									<select
										value={newCapCommissionType}
										onChange={(e) => setNewCapCommissionType(e.target.value as "PERCENTUAL" | "FIXO")}
										className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
									>
										<option value="PERCENTUAL">Percentual (%)</option>
										<option value="FIXO">Valor Fixo (R$)</option>
									</select>
								</div>
								<div>
									<label className="text-[11px] font-medium text-muted-foreground">
										Valor ({newCapCommissionType === "PERCENTUAL" ? "%" : "R$"})
									</label>
									<Input
										type="number"
										step={newCapCommissionType === "PERCENTUAL" ? "0.5" : "5"}
										value={newCapCommissionValue}
										onChange={(e) => setNewCapCommissionValue(Number(e.target.value))}
										className="text-xs h-9 mt-1 font-mono font-bold"
									/>
								</div>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Observações / Acordo</label>
								<Input
									placeholder="Ex: Parceria via clínica conveniada"
									value={newCapNotes}
									onChange={(e) => setNewCapNotes(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<Button size="sm" onClick={handleAddFullCaptador} className="gap-1.5 font-semibold mt-1">
								<Icon icon={Add} className="size-4" />
								Cadastrar Captador
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden flex flex-col">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<div>
								<span className="text-xs font-bold text-foreground">
									Captadores Cadastrados ({captadores.length})
								</span>
								<p className="text-[11px] text-muted-foreground">
									Disponíveis para seleção imediata no lançamento de Novas OSs
								</p>
							</div>
							<Badge variant="outline" className="text-[10px]">
								Sincronizado Supabase
							</Badge>
						</div>
						<div className="divide-y flex-1 overflow-y-auto max-h-[500px]">
							{captadores.length === 0 ? (
								<div className="p-8 text-center text-xs text-muted-foreground">
									Nenhum captador cadastrado ainda. Cadastre o primeiro captador no formulário ao lado.
								</div>
							) : (
								captadores.map((cap) => (
									<div
										key={cap.id}
										className={cn(
											"flex items-center justify-between p-4 text-xs transition-colors hover:bg-muted/40",
											!cap.active && "opacity-60 bg-muted/20"
										)}
									>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-2">
												<span className="font-bold text-sm text-foreground">{cap.name}</span>
												<Badge
													variant={cap.active ? "default" : "secondary"}
													className="text-[10px] cursor-pointer"
													onClick={() => handleToggleCaptador(cap.id)}
												>
													{cap.active ? "Ativo" : "Inativo"}
												</Badge>
												<Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
													{cap.commissionType === "PERCENTUAL"
														? `${cap.commissionValue}% do Total`
														: `R$ ${cap.commissionValue.toFixed(2)} fixo`}
												</Badge>
											</div>
											<div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
												{cap.phone && <span>📱 {cap.phone}</span>}
												{cap.pixKey && <span>🔑 PIX: <code className="font-mono text-[10px]">{cap.pixKey}</code></span>}
												{cap.notes && <span>📝 {cap.notes}</span>}
											</div>
										</div>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleToggleCaptador(cap.id)}
												className="text-xs h-8"
											>
												{cap.active ? "Desativar" : "Ativar"}
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-muted-foreground hover:text-destructive"
												onClick={() => handleDeleteFullCaptador(cap.id, cap.name)}
											>
												<Icon icon={TrashCan} className="size-4" />
											</Button>
										</div>
									</div>
								))
							)}
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

			{/* CONTEÚDO DA ABA: TIPOS DE ARMAÇÃO (PARAMETRIZÁVEIS) */}
			{activeTab === "tipos_armacao" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={Glasses} className="size-4 text-primary" />
							Cadastrar Tipo de Armação
						</h3>
						<p className="text-xs text-muted-foreground">
							Defina os tipos e materiais de armação que alimentam dinamicamente os formulários de OS (Aro 1 e Aro 2), Catálogo de Peças e filtros de balcão.
						</p>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Nome do Tipo *</label>
								<Input
									placeholder="Ex: Titânio, Madeira, Grilamid..."
									value={newFrameTypeName}
									onChange={(e) => setNewFrameTypeName(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Descrição / Aplicação</label>
								<Input
									placeholder="Ex: Armação ultraleve e hipoalergênica"
									value={newFrameTypeDesc}
									onChange={(e) => setNewFrameTypeDesc(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<Button size="sm" onClick={handleAddFrameType} className="gap-1.5 font-semibold mt-2 cursor-pointer">
								<Icon icon={Add} className="size-4" />
								Cadastrar Tipo
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden flex flex-col">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<div>
								<span className="text-xs font-bold text-foreground">
									Tipos de Armação Parametrizados ({frameTypes.length})
								</span>
								<p className="text-[11px] text-muted-foreground">
									Opções ativas refletem imediatamente em todas as áreas do sistema (Nova OS, Aro 1, Aro 2 e Peças).
								</p>
							</div>
							<Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
								Sincronizado Cofre MNOC-X
							</Badge>
						</div>

						<div className="divide-y max-h-[600px] overflow-y-auto">
							{frameTypes.map((ft) => {
								const isDefault = ["Nylon", "Metal", "Acetato", "Parafusado", "Fio de Aço"].includes(ft.nome);
								return (
									<div
										key={ft.id}
										className="flex items-center justify-between p-4 text-xs hover:bg-muted/40 transition-colors"
									>
										<div className="flex items-center gap-3">
											<div className={`flex size-9 items-center justify-center rounded-lg border font-bold text-xs ${
												ft.ativo ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
											}`}>
												<Icon icon={Glasses} className="size-4" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-bold text-sm text-foreground">{ft.nome}</span>
													{isDefault && (
														<Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
															Padrão MNOC-X
														</Badge>
													)}
													<Badge
														variant={ft.ativo ? "default" : "secondary"}
														className={`text-[9px] px-1.5 py-0 h-4 font-bold ${
															ft.ativo
																? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
																: "bg-muted text-muted-foreground"
														}`}
													>
														{ft.ativo ? "ATIVO" : "INATIVO"}
													</Badge>
												</div>
												<span className="text-[11px] text-muted-foreground block mt-0.5">
													{ft.descricao || "Tipo padrão de armação oftálmica"}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
												onClick={() => handleToggleFrameType(ft.id)}
												title={ft.ativo ? "Desativar opção nos formulários" : "Ativar opção nos formulários"}
											>
												{ft.ativo ? "Desativar" : "Ativar"}
											</Button>
											{!isDefault && (
												<Button
													variant="ghost"
													size="sm"
													className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
													onClick={() => handleDeleteFrameType(ft.id, ft.nome)}
													title="Excluir tipo de armação"
												>
													<Icon icon={TrashCan} className="size-3.5" />
												</Button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: FORMATOS DE ARO (2D) */}
			{activeTab === "formatos_aro" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
						<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
							<Icon icon={Glasses} className="size-4 text-primary" />
							Cadastrar Formato de Aro
						</h3>
						<p className="text-xs text-muted-foreground">
							Defina os perfis de aro geométricos 2D que aparecem como opção rápida de seleção quando o cliente traz a própria armação no balcão da ótica.
						</p>
						<div className="flex flex-col gap-3">
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Nome do Formato *</label>
								<Input
									placeholder="Ex: Borboleta, Clubmaster, Retangular Esportivo"
									value={newShapeName}
									onChange={(e) => setNewShapeName(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Categoria do Estilo</label>
								<select
									value={newShapeCategory}
									onChange={(e) => setNewShapeCategory(e.target.value)}
									className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
								>
									<option value="Clássico">Clássico</option>
									<option value="Moderno">Moderno</option>
									<option value="Vintage / Retrô">Vintage / Retrô</option>
									<option value="Esportivo">Esportivo</option>
									<option value="Geométrico">Geométrico</option>
									<option value="Outro">Outro</option>
								</select>
							</div>
							<div>
								<label className="text-[11px] font-medium text-muted-foreground">Descrição / Dica Visual</label>
								<Input
									placeholder="Ex: Aro fino, cantos arredondados, indicado p/ míopes"
									value={newShapeDesc}
									onChange={(e) => setNewShapeDesc(e.target.value)}
									className="text-xs h-9 mt-1"
								/>
							</div>
							<Button size="sm" onClick={handleAddFullFrameShape} className="gap-1.5 font-semibold mt-1">
								<Icon icon={Add} className="size-4" />
								Adicionar Formato 2D
							</Button>
						</div>
					</div>

					<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden flex flex-col">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<div>
								<span className="text-xs font-bold text-foreground">
									Formatos de Aro Homologados ({frameShapes.length})
								</span>
								<p className="text-[11px] text-muted-foreground">
									Exibidos no catálogo interativo do Aro 1 (Armação Trazida pelo Cliente)
								</p>
							</div>
							<Badge variant="outline" className="text-[10px]">
								Sincronizado Supabase
							</Badge>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 overflow-y-auto max-h-[500px]">
							{frameShapes.length === 0 ? (
								<div className="col-span-2 p-8 text-center text-xs text-muted-foreground">
									Nenhum formato cadastrado. Cadastre o primeiro formato geométrico ao lado.
								</div>
							) : (
								frameShapes.map((shape) => (
									<div
										key={shape.id}
										className={cn(
											"flex items-center justify-between p-3.5 rounded-xl border bg-background shadow-2xs hover:border-primary/50 transition-all",
											!shape.active && "opacity-60 bg-muted/20"
										)}
									>
										<div className="flex items-center gap-3">
											<div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
												<Icon icon={Glasses} className="size-5 text-primary" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-bold text-xs text-foreground">{shape.name}</span>
													<Badge variant="secondary" className="text-[9px] py-0 px-1.5">
														{shape.category || "Clássico"}
													</Badge>
												</div>
												{shape.description && (
													<p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
														{shape.description}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => handleToggleFrameShape(shape.id)}
												title={shape.active ? "Desativar" : "Ativar"}
												className={shape.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}
											>
												<Icon icon={Checkmark} className="size-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-muted-foreground hover:text-destructive"
												onClick={() => handleDeleteFullFrameShape(shape.id, shape.name)}
											>
												<Icon icon={TrashCan} className="size-3.5" />
											</Button>
										</div>
									</div>
								))
							)}
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

			{/* CONTEÚDO DA ABA: TABELAS DE APOIO & TEMPLATES */}
			{activeTab === "apoio" && (
				<div className="flex flex-col gap-6">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{/* 1. Captadores de Leads */}
						<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-xs font-bold text-foreground">Captadores de Leads</span>
								<Badge variant="secondary" className="text-[10px]">{leadCapturers.length}</Badge>
							</div>
							<div className="flex gap-1.5">
								<Input
									placeholder="Novo Captador..."
									value={newCaptador}
									onChange={(e) => setNewCaptador(e.target.value)}
									className="text-xs h-8"
								/>
								<Button size="sm" onClick={handleAddCaptador} className="h-8 px-2.5">
									<Icon icon={Add} className="size-3.5" />
								</Button>
							</div>
							<div className="divide-y border rounded-md max-h-48 overflow-y-auto">
								{leadCapturers.length === 0 ? (
									<div className="p-3 text-[11px] text-muted-foreground text-center">Nenhum captador.</div>
								) : (
									leadCapturers.map((c, idx) => (
										<div key={idx} className="p-2 text-xs flex items-center justify-between hover:bg-muted/30">
											<span className="font-medium">{c.nome}</span>
											<button
												type="button"
												onClick={() => handleDeleteCaptador(idx)}
												className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
												title="Remover"
											>
												<Icon icon={TrashCan} className="size-3" />
											</button>
										</div>
									))
								)}
							</div>
						</div>

						{/* 2. Motivos de Perda */}
						<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-xs font-bold text-foreground">Motivos de Perda de Venda</span>
								<Badge variant="secondary" className="text-[10px]">{lossReasons.length}</Badge>
							</div>
							<div className="flex gap-1.5">
								<Input
									placeholder="Ex: Achou caro..."
									value={newLossReason}
									onChange={(e) => setNewLossReason(e.target.value)}
									className="text-xs h-8"
								/>
								<Button size="sm" onClick={handleAddLossReason} className="h-8 px-2.5">
									<Icon icon={Add} className="size-3.5" />
								</Button>
							</div>
							<div className="divide-y border rounded-md max-h-48 overflow-y-auto">
								{lossReasons.length === 0 ? (
									<div className="p-3 text-[11px] text-muted-foreground text-center">Nenhum motivo.</div>
								) : (
									lossReasons.map((m, idx) => (
										<div key={idx} className="p-2 text-xs flex items-center justify-between hover:bg-muted/30">
											<span className="font-medium">{m}</span>
											<button
												type="button"
												onClick={() => handleDeleteLossReason(idx)}
												className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
												title="Remover"
											>
												<Icon icon={TrashCan} className="size-3" />
											</button>
										</div>
									))
								)}
							</div>
						</div>

						{/* 3. Motivos de Ocorrência Técnica */}
						<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-xs font-bold text-foreground">Motivos de Ocorrência Lab</span>
								<Badge variant="secondary" className="text-[10px]">{incidentReasons.length}</Badge>
							</div>
							<div className="flex gap-1.5">
								<Input
									placeholder="Ex: Erro de montagem..."
									value={newIncidentReason}
									onChange={(e) => setNewIncidentReason(e.target.value)}
									className="text-xs h-8"
								/>
								<Button size="sm" onClick={handleAddIncidentReason} className="h-8 px-2.5">
									<Icon icon={Add} className="size-3.5" />
								</Button>
							</div>
							<div className="divide-y border rounded-md max-h-48 overflow-y-auto">
								{incidentReasons.length === 0 ? (
									<div className="p-3 text-[11px] text-muted-foreground text-center">Nenhum motivo.</div>
								) : (
									incidentReasons.map((m, idx) => (
										<div key={idx} className="p-2 text-xs flex items-center justify-between hover:bg-muted/30">
											<span className="font-medium">{m}</span>
											<button
												type="button"
												onClick={() => handleDeleteIncidentReason(idx)}
												className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
												title="Remover"
											>
												<Icon icon={TrashCan} className="size-3" />
											</button>
										</div>
									))
								)}
							</div>
						</div>

						{/* 4. Pautas de Visita Médica */}
						<div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col gap-3">
							<div className="flex items-center justify-between border-b pb-2">
								<span className="text-xs font-bold text-foreground">Pautas de Visita Médica</span>
								<Badge variant="secondary" className="text-[10px]">{visitTopics.length}</Badge>
							</div>
							<div className="flex gap-1.5">
								<Input
									placeholder="Ex: Novo catálogo..."
									value={newVisitTopic}
									onChange={(e) => setNewVisitTopic(e.target.value)}
									className="text-xs h-8"
								/>
								<Button size="sm" onClick={handleAddVisitTopic} className="h-8 px-2.5">
									<Icon icon={Add} className="size-3.5" />
								</Button>
							</div>
							<div className="divide-y border rounded-md max-h-48 overflow-y-auto">
								{visitTopics.length === 0 ? (
									<div className="p-3 text-[11px] text-muted-foreground text-center">Nenhuma pauta.</div>
								) : (
									visitTopics.map((m, idx) => (
										<div key={idx} className="p-2 text-xs flex items-center justify-between hover:bg-muted/30">
											<span className="font-medium">{m}</span>
											<button
												type="button"
												onClick={() => handleDeleteVisitTopic(idx)}
												className="text-muted-foreground hover:text-rose-600 p-1 cursor-pointer"
												title="Remover"
											>
												<Icon icon={TrashCan} className="size-3" />
											</button>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					{/* 5. Templates de Mensagens WhatsApp */}
					<div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
						<div className="flex items-center justify-between border-b pb-3">
							<div>
								<h3 className="text-sm font-bold text-foreground flex items-center gap-2">
									<Icon icon={Phone} className="size-4 text-emerald-600" />
									Templates de Mensagens (WhatsApp)
								</h3>
								<p className="text-xs text-muted-foreground mt-0.5">
									Configure as mensagens padrão enviadas via WhatsApp. Use as tags dinâmicas: <strong>{'{cliente}'}</strong>, <strong>{'{os}'}</strong>, <strong>{'{data}'}</strong>, <strong>{'{hora}'}</strong>, <strong>{'{motivo}'}</strong>, <strong>{'{lente}'}</strong>, <strong>{'{tecnico}'}</strong>, <strong>{'{loja}'}</strong>.
								</p>
							</div>
							<Button
								size="sm"
								onClick={handleSaveTemplates}
								className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer gap-1.5"
							>
								<Icon icon={Checkmark} className="size-3.5" />
								Salvar Templates
							</Button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-foreground">
									Mensagem para o Técnico (Abertura de Assistência)
								</label>
								<textarea
									value={templateTecnico}
									onChange={(e) => setTemplateTecnico(e.target.value)}
									rows={4}
									className="w-full rounded-md border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-foreground">
									Mensagem para o Cliente (Agendamento Confirmado)
								</label>
								<textarea
									value={templateClienteConf}
									onChange={(e) => setTemplateClienteConf(e.target.value)}
									rows={4}
									className="w-full rounded-md border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{(activeTab === "usuarios" || activeTab === "vendedores") && (
				<div className="flex flex-col gap-5">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
								<Icon icon={User} className="size-4 text-primary" />
								Gestão Unificada de Usuários, Vendedores & Alçadas de Desconto
							</h3>
							<p className="text-xs text-muted-foreground">
								Base unificada de operadores e vendedores do Supabase ({usersList.length} cadastrados). Atribua cargos, tetos de desconto comercial e permissões de tela.
							</p>
						</div>
						<Button
							size="sm"
							onClick={handleOpenCreateUser}
							className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
						>
							<Icon icon={Add} className="size-3.5" />
							Novo Usuário / Vendedor
						</Button>
					</div>

					<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
										<th className="p-3">Usuário</th>
										<th className="p-3">Nome</th>
										<th className="p-3">Perfil / Cargo</th>
										<th className="p-3">Loja Vinculada</th>
										<th className="p-3 text-center">Status</th>
										<th className="p-3 text-center">Alçada Desconto</th>
										<th className="p-3 text-center">Vendedor Balcão</th>
										<th className="p-3">Módulos Autorizados</th>
										<th className="p-3 text-center">Ações</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{usersList.length === 0 ? (
										<tr>
											<td colSpan={9} className="p-8 text-center text-muted-foreground">
												Nenhum usuário ou vendedor encontrado na base do Supabase.
											</td>
										</tr>
									) : (
										usersList.map((usr) => {
											const isAdm = usr.usuario.toLowerCase().trim() === "admin";
											const perms = decodeUserPermissions(usr);

											return (
												<tr key={usr.id || usr.usuario} className="hover:bg-muted/30 transition-colors">
													<td className="p-3 font-bold text-foreground">
														<div className="flex items-center gap-2">
															<span>{usr.usuario}</span>
															{isAdm && (
																<Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold">
																	ADMIN
																</Badge>
															)}
														</div>
													</td>
													<td className="p-3 font-medium text-foreground">
														{usr.nome || "—"}
													</td>
													<td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
														<Badge variant="outline" className="text-[10px] font-semibold border-zinc-300 dark:border-zinc-700">
															{usr.cargo || (isAdm ? "Diretoria / Admin" : "Vendedor Pleno")}
														</Badge>
													</td>
													<td className="p-3 text-muted-foreground font-medium whitespace-nowrap">
														{usr.loja || "Todos"}
													</td>
													<td className="p-3 text-center whitespace-nowrap">
														<Badge
															variant={usr.status === "ATIVO" ? "default" : "secondary"}
															className={`text-[10px] font-bold ${
																usr.status === "ATIVO"
																	? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
																	: "bg-muted text-muted-foreground"
															}`}
														>
															{usr.status}
														</Badge>
													</td>
													<td className="p-3 text-center whitespace-nowrap">
														<Badge variant="secondary" className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
															Até {usr.perfilDescontoMaxPct ?? (isAdm ? 100 : 10)}%
														</Badge>
													</td>
													<td className="p-3 text-center whitespace-nowrap">
														{usr.isVendedor !== false ? (
															<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
																Sim (Balcão)
															</Badge>
														) : (
															<span className="text-zinc-400 text-[11px]">Não</span>
														)}
													</td>
													<td className="p-3">
														<div className="flex flex-wrap items-center gap-1">
															{isAdm ? (
																<Badge variant="outline" className="text-[10px] font-semibold text-primary">
																	Acesso Irrestrito (Todos os Módulos)
																</Badge>
															) : (
																<>
																	{perms.balcao && <Badge variant="outline" className="text-[9px]">Balcão</Badge>}
																	{perms.conferencia && <Badge variant="outline" className="text-[9px]">Conferência</Badge>}
																	{perms.log_vendas && <Badge variant="outline" className="text-[9px]">Log Vendas</Badge>}
																	{perms.resumo && <Badge variant="outline" className="text-[9px]">Resumo</Badge>}
																	{perms.medicos && <Badge variant="outline" className="text-[9px]">Médicos</Badge>}
																	{perms.garantias && <Badge variant="outline" className="text-[9px]">Garantias</Badge>}
																	{perms.auditoria && <Badge variant="outline" className="text-[9px]">Auditoria</Badge>}
																	{perms.config && <Badge variant="outline" className="text-[9px] text-amber-500">Config</Badge>}
																</>
															)}
														</div>
													</td>
													<td className="p-3 text-center whitespace-nowrap">
														<div className="flex items-center justify-center gap-1">
															<Button
																variant="outline"
																size="sm"
																className="h-7 px-2.5 text-xs font-semibold gap-1"
																onClick={() => handleOpenEditUser(usr)}
																title="Editar permissões ou alterar senha"
															>
																<Icon icon={Edit} className="size-3" />
																Editar / Senha
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
																onClick={() => handleToggleUserStatus(usr)}
																title={usr.status === "ATIVO" ? "Desativar operador" : "Ativar operador"}
															>
																{usr.status === "ATIVO" ? "Desativar" : "Ativar"}
															</Button>
															{!isAdm && usr.id && (
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
																	onClick={() => handleDeleteUserAction(usr)}
																	title="Excluir usuário"
																>
																	<Icon icon={TrashCan} className="size-3" />
																</Button>
															)}
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: POLÍTICAS DE DESCONTO & GOVERNANÇA COMERCIAL */}
			{activeTab === "descontos" && (
				<div className="flex flex-col gap-6">
					{/* Header de Governança */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-base font-bold tracking-tight flex items-center gap-2">
								<Icon icon={Purchase} className="size-5 text-primary" />
								Políticas de Desconto & Alçadas Comerciais
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">
								Definição de alçadas máximas de desconto por perfil e laboratório/marca. Descontos acima do teto do vendedor requerem autorização do gerente.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-mono">
								{discountPolicies.length} Políticas Ativas
							</Badge>
						</div>
					</div>

					{/* 3 Cards de Alçadas Padrão */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{/* Vendedor */}
						<div className="rounded-xl border bg-card p-4 shadow-2xs space-y-2 border-l-4 border-l-blue-500">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
									Vendedor de Balcão
								</span>
								<Badge variant="secondary" className="font-mono text-xs font-bold">
									Até 10%
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Descontos em armações ou lentes até 10% são aplicados imediatamente. Acima de 10%, o sistema bloqueia e solicita validação do gerente.
							</p>
						</div>

						{/* Gerente */}
						<div className="rounded-xl border bg-card p-4 shadow-2xs space-y-2 border-l-4 border-l-amber-500">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
									Gerente de Loja
								</span>
								<Badge variant="secondary" className="font-mono text-xs font-bold">
									Até 20%
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Descontos até 20% mediante senha gerencial (120212). Registro de auditoria gravado no log de vendas da ordem de serviço.
							</p>
						</div>

						{/* Admin */}
						<div className="rounded-xl border bg-card p-4 shadow-2xs space-y-2 border-l-4 border-l-purple-500">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
									Diretoria / Admin
								</span>
								<Badge variant="secondary" className="font-mono text-xs font-bold">
									Até 100%
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Alçada irrestrita para cortesias, vouchers, garantias da rede e parcerias institucionais sem bloqueio de margem.
							</p>
						</div>
					</div>

					{/* NÍVEIS DE ACESSO A DESCONTOS POR PERFIL / CARGO (PARAMETRIZÁVEIS) */}
					<div className="rounded-xl border bg-card shadow-xs overflow-hidden">
						<div className="border-b px-4 py-3 bg-muted/30 flex items-center justify-between">
							<div>
								<span className="text-xs font-bold text-foreground">
									Níveis de Acesso a Descontos por Perfil / Cargo ({roleDiscountTiers.length})
								</span>
								<p className="text-[11px] text-muted-foreground">
									Parâmetros oficiais que definem automaticamente a alçada de desconto no cadastro de usuários e vendedores.
								</p>
							</div>
							<Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
								Governança de Alçadas
							</Badge>
						</div>

						<div className="divide-y text-xs">
							{roleDiscountTiers.map((tier) => (
								<div key={tier.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
									<div className="flex items-center gap-3">
										<div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold">
											<Icon icon={Purchase} className="size-4" />
										</div>
										<div>
											<span className="font-bold text-sm text-foreground block">{tier.cargo}</span>
											<span className="text-[11px] text-muted-foreground">{tier.descricao || "Alçada padrão de desconto"}</span>
										</div>
									</div>

									<div className="flex items-center gap-3">
										{editingTierId === tier.id ? (
											<div className="flex items-center gap-2">
												<Input
													type="number"
													min={1}
													max={100}
													value={editingTierPct}
													onChange={(e) => setEditingTierPct(Number(e.target.value) || 0)}
													className="h-8 w-20 text-xs font-mono"
												/>
												<span className="text-xs font-bold font-mono">%</span>
												<Button
													size="sm"
													onClick={() => handleSaveRoleDiscountTier(tier.id, editingTierPct)}
													className="h-8 text-xs font-bold cursor-pointer"
												>
													Salvar
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setEditingTierId(null)}
													className="h-8 text-xs cursor-pointer"
												>
													Cancelar
												</Button>
											</div>
										) : (
											<div className="flex items-center gap-2">
												<Badge variant="secondary" className="font-mono text-xs font-bold px-2.5 py-0.5 text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
													Teto: {tier.maxDiscountPct}%
												</Badge>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setEditingTierId(tier.id);
														setEditingTierPct(tier.maxDiscountPct);
													}}
													className="h-7 px-2 text-xs font-medium cursor-pointer"
												>
													<Icon icon={Edit} className="size-3 mr-1" />
													Ajustar Teto
												</Button>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Formulário de Nova Política e Tabela de Regras */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Card Formulário */}
						<div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
							<h4 className="text-sm font-bold flex items-center gap-2">
								<Icon icon={Add} className="size-4 text-primary" />
								Nova Regra de Desconto
							</h4>
							<p className="text-xs text-muted-foreground">
								Crie regras personalizadas para marcas específicas ou tetos customizados por cargo.
							</p>

							<div className="space-y-3">
								<div>
									<label className="text-xs font-semibold text-foreground mb-1 block">Perfil / Cargo</label>
									<select
										value={newPolicyRole}
										onChange={(e) => setNewPolicyRole(e.target.value as any)}
										className="h-8 w-full rounded-md border bg-background px-2 text-xs"
									>
										<option value="VENDEDOR">Vendedor</option>
										<option value="GERENTE">Gerente</option>
										<option value="ADMIN">Administrador</option>
									</select>
								</div>

								<div>
									<label className="text-xs font-semibold text-foreground mb-1 block">Teto Máximo de Desconto (%)</label>
									<Input
										type="number"
										min={1}
										max={100}
										value={newPolicyMaxPct}
										onChange={(e) => setNewPolicyMaxPct(Number(e.target.value) || 0)}
										className="h-8 text-xs font-mono"
									/>
								</div>

								<div>
									<label className="text-xs font-semibold text-foreground mb-1 block">Marca / Laboratório</label>
									<select
										value={newPolicyBrand}
										onChange={(e) => setNewPolicyBrand(e.target.value)}
										className="h-8 w-full rounded-md border bg-background px-2 text-xs"
									>
										<option value="TODOS">Todas as Marcas / Labs</option>
										<option value="Hoya">Hoya</option>
										<option value="Zeiss">Zeiss</option>
										<option value="Essilor">Essilor</option>
										<option value="Personality">Personality</option>
										<option value="Ray-Ban">Ray-Ban</option>
										<option value="Oakley">Oakley</option>
									</select>
								</div>

								<div>
									<label className="text-xs font-semibold text-foreground mb-1 block">Categoria de Produto</label>
									<select
										value={newPolicyCategory}
										onChange={(e) => setNewPolicyCategory(e.target.value as any)}
										className="h-8 w-full rounded-md border bg-background px-2 text-xs"
									>
										<option value="GLOBAL">Global (Armação & Lentes)</option>
										<option value="ARMAÇÃO">Apenas Armações</option>
										<option value="LENTE">Apenas Lentes</option>
									</select>
								</div>

								<div>
									<label className="text-xs font-semibold text-foreground mb-1 block">Descrição / Observação</label>
									<Input
										placeholder="Ex: Campanha Ray-Ban Vendedor 15%"
										value={newPolicyDesc}
										onChange={(e) => setNewPolicyDesc(e.target.value)}
										className="h-8 text-xs"
									/>
								</div>

								<Button
									size="sm"
									onClick={handleAddPolicy}
									className="w-full gap-1.5 font-semibold mt-2 cursor-pointer"
								>
									<Icon icon={Add} className="size-3.5" />
									Cadastrar Política
								</Button>
							</div>
						</div>

						{/* Tabela de Políticas Cadastradas */}
						<div className="lg:col-span-2 rounded-xl border bg-card shadow-xs overflow-hidden flex flex-col">
							<div className="p-4 border-b bg-muted/20">
								<h4 className="text-sm font-bold">Matriz de Políticas e Alçadas Ativas</h4>
								<p className="text-xs text-muted-foreground">
									Regras vigentes aplicadas em tempo real durante a digitação e fechamento da OS.
								</p>
							</div>

							<div className="overflow-x-auto flex-1">
								<table className="w-full text-xs">
									<thead>
										<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
											<th className="py-2.5 px-3 text-left">Perfil</th>
											<th className="py-2.5 px-3 text-left">Categoria</th>
											<th className="py-2.5 px-3 text-left">Marca / Lab</th>
											<th className="py-2.5 px-3 text-right">Teto Máx</th>
											<th className="py-2.5 px-3 text-left">Descrição</th>
											<th className="py-2.5 px-3 text-right">Ação</th>
										</tr>
									</thead>
									<tbody className="divide-y">
										{discountPolicies.map((pol) => (
											<tr key={pol.id} className="hover:bg-muted/20 transition-colors">
												<td className="py-2.5 px-3 font-bold">
													<span
														className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
															pol.role === "ADMIN"
																? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
																: pol.role === "GERENTE"
																	? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
																	: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
														}`}
													>
														{pol.role}
													</span>
												</td>
												<td className="py-2.5 px-3 text-muted-foreground">{pol.category || "GLOBAL"}</td>
												<td className="py-2.5 px-3 font-medium">{pol.brandOrLab || "TODOS"}</td>
												<td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
													{pol.maxDiscountPct}%
												</td>
												<td className="py-2.5 px-3 text-muted-foreground">{pol.description || "—"}</td>
												<td className="py-2.5 px-3 text-right">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDeletePolicy(pol.id)}
														className="size-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
														title="Excluir política"
													>
														<Icon icon={TrashCan} className="size-3.5" />
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* CONTEÚDO DA ABA: LOG DE VENDAS */}
			{activeTab === "log_vendas" && (
				<div className="flex flex-col gap-4">
					<OpticalSalesLogView />
				</div>
			)}

			{/* CONTEÚDO DA ABA: BANCO & INTEGRIDADE RELACIONAL */}
			{activeTab === "integridade" && (
				<div className="flex flex-col gap-6">
					{/* CARD DE GESTÃO DE DADOS & INICIALIZAÇÃO DE TESTES */}
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5 shadow-xs flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<h3 className="text-base font-bold tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
									<Icon icon={TrashCan} className="size-5 text-amber-500" />
									Gestão de Dados & Inicialização de Testes Operacionais
								</h3>
								<p className="text-xs text-muted-foreground mt-0.5">
									Zere o banco de dados de vendas para iniciar testes limpos com 0 OSs, ou restaure o conjunto completo de demonstração.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2 shrink-0">
								<Button
									variant="destructive"
									onClick={() => {
										setZeroPassword("");
										setZeroPasswordError("");
										setZeroModalOpen(true);
									}}
									className="h-9 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
								>
									<Icon icon={TrashCan} className="size-4" />
									Zerar Ordens & Vendas (Testes Limpos)
								</Button>
								<Button
									variant="outline"
									onClick={handleRestoreDemo}
									className="h-9 px-3.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-card"
								>
									<Icon icon={Checkmark} className="size-4 text-emerald-500" />
									Restaurar Demonstração
								</Button>
							</div>
						</div>

						{/* Métricas dos dados do sistema */}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">OSs Ativas</span>
								<div className="flex items-baseline gap-1.5 mt-0.5">
									<span className={cn("text-xl font-mono font-extrabold", ordersCount === 0 ? "text-emerald-500" : "text-foreground")}>
										{ordersCount}
									</span>
									{ordersCount === 0 && (
										<span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1 rounded">
											Limpo
										</span>
									)}
								</div>
							</div>
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">Lentes Cadastradas</span>
								<span className="text-xl font-mono font-extrabold text-foreground mt-0.5 block">{lensCount}</span>
							</div>
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">Peças / Armações</span>
								<span className="text-xl font-mono font-extrabold text-foreground mt-0.5 block">{frameCount}</span>
							</div>
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">Médicos Prescritores</span>
								<span className="text-xl font-mono font-extrabold text-foreground mt-0.5 block">{doctors.length}</span>
							</div>
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">Lojas Físicas</span>
								<span className="text-xl font-mono font-extrabold text-foreground mt-0.5 block">{stores.length}</span>
							</div>
							<div className="rounded-lg bg-card p-3 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
								<span className="text-[10px] text-muted-foreground uppercase font-bold block">Vendedores</span>
								<span className="text-xl font-mono font-extrabold text-foreground mt-0.5 block">{sellers.length}</span>
							</div>
						</div>
					</div>

					{/* Card de Controle e Status */}
					<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h3 className="text-base font-bold tracking-tight flex items-center gap-2">
								<Icon icon={Security} className="size-5 text-primary" />
								Auditoria de Banco de Dados & Relacionamentos
							</h3>
							<p className="text-xs text-muted-foreground mt-0.5">
								Rotina de checagem em tempo real de latência, contagem de registros e integridade das chaves relacionais.
							</p>
							<div className="flex flex-wrap items-center gap-2 mt-2.5">
								<Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-mono">
									🟢 Banco MNOC-X: Dedicado & Ativo
								</Badge>
								<Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[11px] font-mono">
									🛡️ App Lentes: 100% Protegido & Intacto
								</Badge>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleOpenIsolationModal}
									className="h-6 px-2 text-[11px] text-primary hover:underline cursor-pointer"
								>
									Auditar Blindagem
								</Button>
								<Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[11px]">
									DOM Shield: Ativo (Anti-removeChild)
								</Badge>
								{diagnosticResult && (
									<Badge variant="secondary" className="text-[11px] font-mono">
										Latência: {diagnosticResult.latencyMs}ms
									</Badge>
								)}
							</div>
						</div>

						<Button
							onClick={handleRunDiagnostic}
							disabled={isRunningDiagnostic}
							className="h-10 px-4 font-semibold text-xs gap-2 shrink-0 cursor-pointer shadow-xs"
							aria-label="Executar rotina de diagnóstico do banco de dados e relacionamentos"
						>
							<Icon icon={Chemistry} className={cn("size-4", isRunningDiagnostic && "animate-spin")} />
							{isRunningDiagnostic ? "Auditando Banco..." : "Executar Diagnóstico Agora"}
						</Button>
					</div>

					{/* Resultados do Diagnóstico */}
					{diagnosticResult ? (
						<div className="flex flex-col gap-6">
							{/* Grade de Tabelas */}
							<div className="flex flex-col gap-2">
								<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									Tabelas Centrais Auditadas ({diagnosticResult.tables.length})
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
									{diagnosticResult.tables.map((t) => (
										<div
											key={t.name}
											className="rounded-xl border bg-card p-3 shadow-2xs flex flex-col justify-between gap-2"
										>
											<div className="flex items-center justify-between">
												<span className="font-mono text-xs font-bold text-primary">
													{t.name}
												</span>
												<Badge
													variant={t.status === "OK" ? "outline" : "destructive"}
													className={cn(
														"text-[10px] font-mono",
														t.status === "OK" && "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
													)}
												>
													{t.status}
												</Badge>
											</div>
											<div>
												<div className="text-xl font-extrabold font-mono tracking-tight text-foreground">
													{t.count.toLocaleString("pt-BR")}
												</div>
												<div className="text-[10px] text-muted-foreground truncate">
													{t.description}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Auditoria Relacional */}
							<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-col gap-4">
								<div>
									<h4 className="text-sm font-bold tracking-tight flex items-center gap-2">
										<Icon icon={ListChecked} className="size-4 text-primary" />
										Integridade dos Relacionamentos & Chaves Estrangeiras
									</h4>
									<p className="text-xs text-muted-foreground mt-0.5">
										Validação de consistência entre ordens de serviço, lojas, vendedores, prescritores e garantias.
									</p>
								</div>

								<div className="divide-y text-xs">
									{diagnosticResult.relationships.map((rel) => (
										<div
											key={rel.name}
											className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
										>
											<div className="flex flex-col gap-0.5">
												<span className="font-semibold text-foreground text-xs flex items-center gap-2">
													{rel.name}
													{rel.status === "PERFECT" && (
														<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
															100% Coerente
														</span>
													)}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{rel.notes}
												</span>
											</div>

											<div className="flex items-center gap-3">
												<div className="text-right">
													<div className="font-mono font-bold text-foreground">
														{rel.matched} de {rel.total}
													</div>
													<div className="text-[10px] text-muted-foreground">
														{rel.percentage}% de correspondência
													</div>
												</div>
												<div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
													<div
														className={cn(
															"h-full rounded-full transition-all",
															rel.percentage === 100
																? "bg-emerald-500"
																: rel.percentage >= 80
																? "bg-blue-500"
																: "bg-amber-500"
														)}
														style={{ width: `${rel.percentage}%` }}
													/>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					) : (
						<div className="rounded-xl border border-dashed bg-card/50 p-12 text-center flex flex-col items-center justify-center gap-3">
							<Icon icon={Security} className="size-8 text-muted-foreground/50" />
							<p className="text-xs text-muted-foreground max-w-md">
								Clique no botão acima para iniciar a varredura completa do banco de dados Supabase e checar todas as relações entre tabelas.
							</p>
						</div>
					)}
				</div>
			)}

			{/* Modal de Criação / Edição de Usuário & Senha */}
			<Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-base font-bold flex items-center gap-2">
							<Icon icon={Locked} className="size-4 text-primary" />
							{editingUser ? `Editar Usuário: ${editingUser.usuario}` : "Cadastrar Novo Operador"}
						</DialogTitle>
						<DialogDescription className="text-xs">
							Defina os dados de acesso, senha e permissões de telas para este operador.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 py-2 text-xs">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-semibold text-foreground">Usuário (Login)</label>
								<Input
									value={uUsuario}
									onChange={(e) => setUUsuario(e.target.value)}
									disabled={Boolean(editingUser)}
									placeholder="Ex: vendedor1"
									className="h-8 text-xs font-bold mt-1"
								/>
							</div>
							<div>
								<label className="text-[11px] font-semibold text-foreground">Senha de Acesso</label>
								<Input
									value={uSenha}
									onChange={(e) => setUSenha(e.target.value)}
									placeholder="Defina a senha..."
									className="h-8 text-xs font-mono mt-1"
								/>
							</div>
						</div>

						<div>
							<label className="text-[11px] font-semibold text-foreground">Nome Completo</label>
							<Input
								value={uNome}
								onChange={(e) => setUNome(e.target.value)}
								placeholder="Nome de exibição no balcão"
								className="h-8 text-xs mt-1"
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-semibold text-foreground">Perfil / Cargo</label>
								<select
									value={uCargo}
									onChange={(e) => handleSelectCargo(e.target.value)}
									className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs font-semibold mt-1"
								>
									{roleDiscountTiers.map((t) => (
										<option key={t.id} value={t.cargo}>
											{t.cargo} (Teto: {t.maxDiscountPct}%)
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-foreground">Alçada Máx. Desconto (%)</label>
								<Input
									type="number"
									min={1}
									max={100}
									value={uDescontoMax}
									onChange={(e) => setUDescontoMax(Number(e.target.value) || 0)}
									className="h-8 text-xs font-mono mt-1"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="text-[11px] font-semibold text-foreground">Loja de Atendimento</label>
								<select
									value={uLoja}
									onChange={(e) => setULoja(e.target.value)}
									className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs mt-1"
								>
									<option value="Todos">Todas as Lojas</option>
									{stores.map((s) => (
										<option key={s.id} value={s.nome}>
											{s.nome}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-foreground">Status do Usuário</label>
								<select
									value={uStatus}
									onChange={(e) => setUStatus(e.target.value as "ATIVO" | "INATIVO")}
									className="h-8 w-full rounded-lg border bg-background px-2.5 text-xs font-semibold mt-1"
								>
									<option value="ATIVO">ATIVO</option>
									<option value="INATIVO">INATIVO</option>
								</select>
							</div>
						</div>

						{/* Atuação como Vendedor de Balcão */}
						<div className="rounded-lg border bg-muted/20 p-2.5 flex items-center justify-between">
							<div>
								<span className="text-xs font-bold text-foreground block">
									Atua como Vendedor(a) de Balcão
								</span>
								<span className="text-[10px] text-muted-foreground">
									Exibe o profissional na lista de vendedores da emissão de OS, Metas e Balcão.
								</span>
							</div>
							<input
								type="checkbox"
								checked={uIsVendedor}
								onChange={(e) => setUIsVendedor(e.target.checked)}
								className="size-4 rounded text-primary"
							/>
						</div>

						{/* Permissões de Módulos */}
						<div className="rounded-xl border bg-muted/20 p-3 flex flex-col gap-2">
							<span className="text-[11px] font-bold text-foreground">
								Permissões de Módulos (Telas Autorizadas)
							</span>
							<div className="grid grid-cols-2 gap-2 text-xs">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermBalcao}
										onChange={(e) => setUPermBalcao(e.target.checked)}
										className="rounded"
									/>
									<span>Balcão & Vendas</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermConferencia}
										onChange={(e) => setUPermConferencia(e.target.checked)}
										className="rounded"
									/>
									<span>Conferência Lab</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermLogVendas}
										onChange={(e) => setUPermLogVendas(e.target.checked)}
										className="rounded"
									/>
									<span>Log de Vendas & Resíduos</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermResumo}
										onChange={(e) => setUPermResumo(e.target.checked)}
										className="rounded"
									/>
									<span>Resumo Gerencial</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermMedicos}
										onChange={(e) => setUPermMedicos(e.target.checked)}
										className="rounded"
									/>
									<span>Resultado Médico</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermGarantias}
										onChange={(e) => setUPermGarantias(e.target.checked)}
										className="rounded"
									/>
									<span>Garantias & Ocorrências</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={uPermAuditoria}
										onChange={(e) => setUPermAuditoria(e.target.checked)}
										className="rounded"
									/>
									<span>Auditoria & Agente IA</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer text-amber-500 font-semibold">
									<input
										type="checkbox"
										checked={uPermConfig}
										onChange={(e) => setUPermConfig(e.target.checked)}
										className="rounded"
									/>
									<span>Configurações do Sistema</span>
								</label>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setIsUserModalOpen(false)}>
							Cancelar
						</Button>
						<Button size="sm" onClick={handleSaveUser} className="font-bold">
							Salvar Usuário
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* MODAL DE AUTENTICAÇÃO GERENCIAL PARA ZERAR BANCO */}
			<Dialog open={zeroModalOpen} onOpenChange={setZeroModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
							<Icon icon={TrashCan} className="size-5" />
							Zerar Ordens & Vendas (Testes Limpos)
						</DialogTitle>
						<DialogDescription>
							Esta ação removerá todas as ordens de serviço, registros de pós-venda e conferências de laboratório do sistema para que você possa iniciar testes operacionais a partir do zero (0 OSs). Os cadastros de peças, lentes, lojas e vendedores serão preservados.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleZeroDatabase} className="space-y-4 py-2">
						<div className="space-y-2">
							<label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
								<Icon icon={Password} className="size-3.5 text-amber-500" />
								Senha de Gerente ou Administrador Requerida
							</label>
							<Input
								type="password"
								placeholder="Digite a senha (padrão: 120212)"
								value={zeroPassword}
								onChange={(e) => {
									setZeroPassword(e.target.value);
									if (zeroPasswordError) setZeroPasswordError("");
								}}
								autoFocus
								className="text-sm font-mono tracking-widest"
							/>
							{zeroPasswordError ? (
								<p className="text-[11px] text-rose-600 font-semibold">{zeroPasswordError}</p>
							) : (
								<p className="text-[10px] text-muted-foreground">
									Ação crítica monitorada com registro de auditoria.
								</p>
							)}
						</div>

						<DialogFooter className="gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setZeroModalOpen(false);
									setZeroPassword("");
									setZeroPasswordError("");
								}}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								disabled={isZeroing || !zeroPassword.trim()}
								className="font-bold gap-1.5"
							>
								<Icon icon={TrashCan} className="size-4" />
								{isZeroing ? "Zerando..." : "Confirmar e Zerar Ordens"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* MODAL DE AUDITORIA DE ISOLAMENTO E BLINDAGEM DO APP LENTES */}
			<Dialog open={isolationModalOpen} onOpenChange={setIsolationModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
							<Icon icon={Security} className="size-5 text-indigo-600 dark:text-indigo-400" />
							Auditoria de Isolamento & Blindagem
						</DialogTitle>
						<DialogDescription className="text-xs">
							Relatório em tempo real da separação física e lógica entre o banco do CRM MNOC-X e o banco legado do App Lentes.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 py-2 text-xs">
						<div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-3 flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-zinc-900 dark:text-zinc-100">Escudo do App Lentes:</span>
								<Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold text-[10px]">
									ATIVO & BLINDADO
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								O banco legado do App Lentes (<code className="bg-muted px-1 rounded font-mono text-[10px]">{shieldAudit.legacyUrl}</code>) possui bloqueio estrito contra qualquer mutação (INSERT, UPDATE, DELETE) vinda do CRM. Suas mais de 520 vendas estão preservadas e intactas.
							</p>
						</div>

						<div className="rounded-lg border bg-zinc-50 dark:bg-zinc-900/50 p-3 flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-zinc-900 dark:text-zinc-100">Banco Dedicado MNOC-X:</span>
								<Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold text-[10px]">
									{dbStatus.provider}
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground leading-relaxed">
								Todas as ordens de serviço, cadastros de peças, estoques e fechamentos comerciais do CRM residem no cofre dedicado exclusivo do MNOC-X.
							</p>
						</div>

						<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col gap-1">
							<span className="font-bold text-emerald-700 dark:text-emerald-400 block">Status de Garantia:</span>
							<div className="text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5 font-medium">
								<div>✓ 100% de autonomia e agilidade operacional</div>
								<div>✓ 0% de risco para a planilha e banco do App Lentes</div>
								<div>✓ Zeramento e testes limpos sem efeitos colaterais</div>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button onClick={() => setIsolationModalOpen(false)} className="w-full h-9 text-xs font-semibold">
							Entendido e Confirmado
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
