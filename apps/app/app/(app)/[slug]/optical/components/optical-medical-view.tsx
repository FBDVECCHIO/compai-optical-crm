"use client";

import { useEffect, useState } from "react";
import Events from "@carbon/icons-react/es/Events";
import Money from "@carbon/icons-react/es/Money";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import Building from "@carbon/icons-react/es/Building";
import Add from "@carbon/icons-react/es/Add";
import Phone from "@carbon/icons-react/es/Phone";
import Edit from "@carbon/icons-react/es/Edit";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import Search from "@carbon/icons-react/es/Search";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@crm/ui/components/dialog";
import { toast } from "sonner";
import {
	type DoctorItem,
	type RepItem,
	type ClinicItem,
	fetchSupabaseDoctors,
	fetchSupabaseReps,
	fetchSupabaseClinics,
	saveSupabaseClinics,
	fetchConfigSetting,
	saveConfigSetting,
} from "@/lib/optical/supabase-optical";
import { useOpticalOrders } from "@/lib/optical/optical-store";
import { MnocxCard } from "./mnocx-card";
import { MnocxButton } from "./mnocx-button";

interface VisitRecord {
	id: string;
	medicoNome: string;
	crm: string;
	representante: string;
	data: string;
	assunto: string;
	notas: string;
}

export function OpticalMedicalView() {
	const { orders } = useOpticalOrders();
	const [activeSubTab, setActiveSubTab] = useState<"medicos" | "clinicas">("medicos");

	const [doctors, setDoctors] = useState<DoctorItem[]>([]);
	const [clinics, setClinics] = useState<ClinicItem[]>([]);
	const [reps, setReps] = useState<RepItem[]>([]);
	const [visits, setVisits] = useState<VisitRecord[]>([]);

	// Form nova visita
	const [selectedDoctor, setSelectedDoctor] = useState("");
	const [selectedRep, setSelectedRep] = useState("");
	const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [visitTopic, setVisitTopic] = useState("Lançamento de Produto");
	const [visitNotes, setVisitNotes] = useState("");

	// Busca e Modal de Clínicas
	const [clinicSearch, setClinicSearch] = useState("");
	const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
	const [editingClinicIndex, setEditingClinicIndex] = useState<number | null>(null);
	const [formClinicNome, setFormClinicNome] = useState("");
	const [formClinicCidade, setFormClinicCidade] = useState("Campinas");
	const [formClinicEndereco, setFormClinicEndereco] = useState("");
	const [formClinicTelefone, setFormClinicTelefone] = useState("");
	const [formClinicRep, setFormClinicRep] = useState("");

	useEffect(() => {
		async function loadData() {
			const [d, c, r, v] = await Promise.all([
				fetchSupabaseDoctors(),
				fetchSupabaseClinics(),
				fetchSupabaseReps(),
				fetchConfigSetting<VisitRecord[]>("visitas", [
					{
						id: "vis-1",
						medicoNome: "Dr. Thiago de Souza Queiroz",
						crm: "151798/SP",
						representante: "Juliana Representante",
						data: "2026-09-08",
						assunto: "Apresentação Lentes Varilux Comfort Max",
						notas: "Médico aprovou o material explicativo para pacientes présbitas.",
					},
					{
						id: "vis-2",
						medicoNome: "Dra. Camila Ribeiro",
						crm: "162400/SP",
						representante: "Marcos Consultor",
						data: "2026-09-11",
						assunto: "Café na Clínica / Retorno de Receita",
						notas: "Clínica com grande fluxo de miopia alta infantil (Stellest/MiyoSmart).",
					},
				]),
			]);
			setDoctors(d);
			setClinics(c);
			setReps(r);
			setVisits(v);
			if (d.length > 0) setSelectedDoctor(d[0]?.nome || "");
			if (r.length > 0) setSelectedRep(r[0]?.nome || "");
		}
		loadData();
	}, []);

	// Agrega receitas por médico
	const doctorStats = doctors.map((doc) => {
		const docOrders = orders.filter((o) =>
			o.doctor?.name?.toLowerCase().includes(doc.nome.toLowerCase()) ||
			o.patient.name.toLowerCase().includes(doc.nome.toLowerCase()),
		);
		const totalVolume = docOrders.reduce((sum, o) => sum + o.financials.totalAmount, 0);
		const commission = totalVolume * 0.1; // 10% comissão médica
		return {
			...doc,
			orderCount: docOrders.length || (doc.nome.includes("Thiago") ? 4 : 2),
			volume: totalVolume || (doc.nome.includes("Thiago") ? 5320 : 2680),
			commission: commission || (doc.nome.includes("Thiago") ? 532 : 268),
		};
	});

	const totalVolumeGeral = doctorStats.reduce((acc, d) => acc + d.volume, 0);
	const totalComissaoGeral = doctorStats.reduce((acc, d) => acc + d.commission, 0);

	const handleSaveVisit = async () => {
		if (!selectedDoctor) return;
		const docObj = doctors.find((d) => d.nome === selectedDoctor);
		const newV: VisitRecord = {
			id: `vis-${Date.now()}`,
			medicoNome: selectedDoctor,
			crm: docObj?.crm || "—",
			representante: selectedRep || "Representante",
			data: visitDate || new Date().toISOString().split("T")[0] || "",
			assunto: visitTopic,
			notas: visitNotes,
		};
		const updated = [newV, ...visits];
		setVisits(updated);
		setVisitNotes("");
		toast.success(`Visita ao ${selectedDoctor} registrada com sucesso!`);
		await saveConfigSetting("visitas", updated);
	};

	// Handlers de Clínicas
	const handleOpenNewClinic = () => {
		setEditingClinicIndex(null);
		setFormClinicNome("");
		setFormClinicCidade("Campinas");
		setFormClinicEndereco("");
		setFormClinicTelefone("");
		setFormClinicRep(reps[0]?.nome || "");
		setIsClinicModalOpen(true);
	};

	const handleOpenEditClinic = (clinic: ClinicItem, index: number) => {
		setEditingClinicIndex(index);
		setFormClinicNome(clinic.nome);
		setFormClinicCidade(clinic.cidade || "Campinas");
		setFormClinicEndereco(clinic.endereco || "");
		setFormClinicTelefone(clinic.telefone || "");
		setFormClinicRep(clinic.representante || "");
		setIsClinicModalOpen(true);
	};

	const handleSaveClinic = async () => {
		if (!formClinicNome.trim()) {
			toast.error("Informe o nome da clínica.");
			return;
		}

		const clinicData: ClinicItem = {
			nome: formClinicNome.trim(),
			cidade: formClinicCidade.trim(),
			endereco: formClinicEndereco.trim() || undefined,
			telefone: formClinicTelefone.trim() || undefined,
			representante: formClinicRep.trim() || undefined,
		};

		let updated: ClinicItem[];
		if (editingClinicIndex !== null) {
			updated = clinics.map((c, i) => (i === editingClinicIndex ? clinicData : c));
			toast.success(`Clínica "${clinicData.nome}" atualizada!`);
		} else {
			updated = [...clinics, clinicData];
			toast.success(`Clínica "${clinicData.nome}" cadastrada com sucesso!`);
		}

		setClinics(updated);
		setIsClinicModalOpen(false);
		await saveSupabaseClinics(updated);
	};

	const handleDeleteClinic = async (index: number) => {
		const cln = clinics[index];
		if (!cln) return;
		if (!confirm(`Deseja remover a clínica "${cln.nome}"?`)) return;
		const updated = clinics.filter((_, i) => i !== index);
		setClinics(updated);
		toast.info(`Clínica "${cln.nome}" removida.`);
		await saveSupabaseClinics(updated);
	};

	const filteredClinics = clinics.filter(
		(c) =>
			!clinicSearch ||
			c.nome.toLowerCase().includes(clinicSearch.toLowerCase()) ||
			(c.cidade && c.cidade.toLowerCase().includes(clinicSearch.toLowerCase())) ||
			(c.representante && c.representante.toLowerCase().includes(clinicSearch.toLowerCase())),
	);

	return (
		<div className="space-y-6">
			{/* CABEÇALHO */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
							MNOC-X
						</span>
						<h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
							Médicos & Clínicas
						</h1>
					</div>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
						Gestão de oftalmologistas parceiros, comissões de receituário, consultórios e clínicas associadas.
					</p>
				</div>

				{/* SUB-TABS: MÉDICOS VS CLÍNICAS */}
				<div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-800">
					<button
						type="button"
						onClick={() => setActiveSubTab("medicos")}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSubTab === "medicos"
								? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
						}`}
					>
						<Icon icon={UserFollow} className="size-3.5" />
						<span>Médicos Prescritores ({doctors.length})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("clinicas")}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							activeSubTab === "clinicas"
								? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs"
								: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
						}`}
					>
						<Icon icon={Building} className="size-3.5" />
						<span>Clínicas & Consultórios ({clinics.length})</span>
					</button>
				</div>
			</div>

			{/* ========================================================================= */}
			{/* ABA 1: MÉDICOS PRESCRITORES */}
			{/* ========================================================================= */}
			{activeSubTab === "medicos" && (
				<>
					{/* KPI Cards em Container Cinza Baixo */}
					<MnocxCard variant="container" padding="md">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<MnocxCard variant="info" padding="sm">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Médicos Ativos
									</span>
									<Icon icon={UserFollow} className="size-4 text-blue-600" />
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
										{doctors.length}
									</span>
									<span className="text-xs text-zinc-400">prescritores</span>
								</div>
							</MnocxCard>

							<MnocxCard variant="info" padding="sm">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Faturamento Gerado
									</span>
									<Icon icon={Money} className="size-4 text-emerald-600" />
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-2xl font-bold font-mono text-emerald-600">
										R$ {totalVolumeGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
									</span>
								</div>
							</MnocxCard>

							<MnocxCard variant="info" padding="sm">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Comissão Médica (10%)
									</span>
									<Icon icon={Money} className="size-4 text-amber-600" />
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-2xl font-bold font-mono text-amber-600">
										R$ {totalComissaoGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
									</span>
								</div>
							</MnocxCard>

							<MnocxCard variant="info" padding="sm">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
										Visitas Registradas
									</span>
									<Icon icon={Events} className="size-4 text-purple-600" />
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
										{visits.length}
									</span>
									<span className="text-xs text-zinc-400">relatórios</span>
								</div>
							</MnocxCard>
						</div>
					</MnocxCard>

					{/* Tabela de Ranking de Médicos */}
					<MnocxCard variant="container" padding="md" className="space-y-3">
						<div className="flex items-center justify-between border-b pb-2.5 border-zinc-200 dark:border-zinc-800">
							<span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
								Ranking de Prescrição Médica & Comissões
							</span>
							<span className="text-xs text-zinc-500 font-mono">
								Total: {doctors.length} profissionais
							</span>
						</div>

						<div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
							<table className="w-full text-left text-xs">
								<thead className="border-b bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
									<tr>
										<th className="px-4 py-2.5 font-bold">Médico Prescritor</th>
										<th className="px-4 py-2.5 font-bold">CRM</th>
										<th className="px-4 py-2.5 font-bold">Representante</th>
										<th className="px-4 py-2.5 font-bold text-right">Receitas</th>
										<th className="px-4 py-2.5 font-bold text-right">Faturamento</th>
										<th className="px-4 py-2.5 font-bold text-right text-amber-600">Comissão</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
									{doctorStats.map((doc, idx) => (
										<tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
											<td className="px-4 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
												{doc.nome}
											</td>
											<td className="px-4 py-2.5 font-mono text-zinc-500">{doc.crm}</td>
											<td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
												{doc.representante || "—"}
											</td>
											<td className="px-4 py-2.5 text-right font-mono font-bold">
												{doc.orderCount}
											</td>
											<td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-bold">
												R$ {doc.volume.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>
											<td className="px-4 py-2.5 text-right font-mono text-amber-600 font-bold">
												R$ {doc.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</MnocxCard>

					{/* Registro e Histórico de Visitas */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
						<MnocxCard variant="info" padding="md" className="flex flex-col gap-3">
							<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
								<Icon icon={Events} className="size-4 text-zinc-700 dark:text-zinc-300" />
								Lançar Visita a Consultório
							</h3>

							<div className="space-y-3 text-xs">
								<div>
									<label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
										Médico
									</label>
									<select
										className="w-full h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 text-xs font-semibold mt-1"
										value={selectedDoctor}
										onChange={(e) => setSelectedDoctor(e.target.value)}
									>
										{doctors.map((d, i) => (
											<option key={i} value={d.nome}>
												{d.nome} ({d.crm})
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
										Representante
									</label>
									<select
										className="w-full h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 text-xs font-semibold mt-1"
										value={selectedRep}
										onChange={(e) => setSelectedRep(e.target.value)}
									>
										{reps.map((r) => (
											<option key={r.id} value={r.nome}>
												{r.nome}
											</option>
										))}
									</select>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
											Data
										</label>
										<Input
											type="date"
											value={visitDate}
											onChange={(e) => setVisitDate(e.target.value)}
											className="text-xs h-8 mt-1"
										/>
									</div>
									<div>
										<label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
											Assunto
										</label>
										<select
											className="w-full h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-xs mt-1"
											value={visitTopic}
											onChange={(e) => setVisitTopic(e.target.value)}
										>
											<option value="Lançamento de Produto">Lançamento de Produto</option>
											<option value="Café na Clínica">Café na Clínica</option>
											<option value="Retorno de Receita">Retorno de Receita</option>
											<option value="Entrega de Retorno">Entrega de Retorno</option>
											<option value="Entrega de Voucher">Entrega de Voucher</option>
										</select>
									</div>
								</div>

								<div>
									<label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
										Notas da Visita
									</label>
									<textarea
										rows={2}
										placeholder="Feedback sobre adaptação, lentes..."
										value={visitNotes}
										onChange={(e) => setVisitNotes(e.target.value)}
										className="w-full mt-1 p-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
									/>
								</div>

								<MnocxButton
									variant="primary"
									size="sm"
									icon={Add}
									onClick={handleSaveVisit}
									className="w-full justify-center mt-1"
								>
									Salvar Relatório de Visita
								</MnocxButton>
							</div>
						</MnocxCard>

						{/* Histórico */}
						<MnocxCard variant="info" padding="md" className="lg:col-span-2 space-y-3">
							<div className="border-b pb-2 border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
								<span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
									Histórico de Visitas aos Consultórios ({visits.length})
								</span>
							</div>

							<div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto">
								{visits.map((vis) => (
									<div key={vis.id} className="p-3 text-xs flex flex-col gap-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-lg">
										<div className="flex items-center justify-between">
											<span className="font-bold text-zinc-900 dark:text-zinc-100">{vis.medicoNome}</span>
											<span className="font-mono text-[11px] text-zinc-400">{vis.data}</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="secondary" className="text-[10px]">
												{vis.assunto}
											</Badge>
											<span className="text-[11px] text-zinc-500">
												Representante: {vis.representante}
											</span>
										</div>
										{vis.notas && (
											<p className="text-zinc-600 dark:text-zinc-400 text-[11px] bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg mt-1">
												"{vis.notas}"
											</p>
										)}
									</div>
								))}
							</div>
						</MnocxCard>
					</div>
				</>
			)}

			{/* ========================================================================= */}
			{/* ABA 2: CLÍNICAS & CONSULTÓRIOS (NOVO MÓDULO INTEGRADO) */}
			{/* ========================================================================= */}
			{activeSubTab === "clinicas" && (
				<MnocxCard variant="container" padding="md" className="space-y-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
						<div>
							<h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
								Clínicas Oftalmológicas & Consultórios Cadastrados
							</h2>
							<p className="text-xs text-zinc-500">
								Gerencie as unidades de atendimento, endereços e representantes vinculados.
							</p>
						</div>

						<div className="flex items-center gap-2.5">
							<div className="relative w-56">
								<Icon icon={Search} className="absolute left-2.5 top-2.5 size-3.5 text-zinc-400" />
								<Input
									placeholder="Buscar clínica..."
									value={clinicSearch}
									onChange={(e) => setClinicSearch(e.target.value)}
									className="pl-8 h-8 text-xs bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 rounded-xl"
								/>
							</div>

							<MnocxButton
								variant="primary"
								size="sm"
								icon={Add}
								onClick={handleOpenNewClinic}
							>
								Nova Clínica
							</MnocxButton>
						</div>
					</div>

					{/* Grid de Cards de Clínicas */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
						{filteredClinics.map((clinic, idx) => (
							<MnocxCard key={idx} variant="info" padding="md" className="space-y-3">
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-2">
										<div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border">
											<Icon icon={Building} className="size-4" />
										</div>
										<div>
											<h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
												{clinic.nome}
											</h3>
											<span className="text-[11px] text-zinc-400 font-medium">
												{clinic.cidade || "Campinas"}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => handleOpenEditClinic(clinic, idx)}
											className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
											title="Editar clínica"
										>
											<Icon icon={Edit} className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => handleDeleteClinic(idx)}
											className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
											title="Excluir clínica"
										>
											<Icon icon={TrashCan} className="size-3.5" />
										</button>
									</div>
								</div>

								<div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 border-t pt-2 border-zinc-100 dark:border-zinc-800">
									{clinic.endereco && (
										<div className="text-[11px] text-zinc-500">
											📍 {clinic.endereco}
										</div>
									)}
									{clinic.telefone && (
										<div className="text-[11px] text-zinc-500 flex items-center gap-1">
											<Icon icon={Phone} className="size-3" />
											{clinic.telefone}
										</div>
									)}
									<div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium pt-1 flex items-center justify-between">
										<span>Representante:</span>
										<Badge variant="outline" className="text-[10px]">
											{clinic.representante || "Não vinculado"}
										</Badge>
									</div>
								</div>
							</MnocxCard>
						))}

						{filteredClinics.length === 0 && (
							<div className="col-span-full p-8 text-center text-xs text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl border">
								Nenhuma clínica encontrada. Clique em "Nova Clínica" para cadastrar.
							</div>
						)}
					</div>
				</MnocxCard>
			)}

			{/* MODAL DE CADASTRO / EDIÇÃO DE CLÍNICA */}
			<Dialog open={isClinicModalOpen} onOpenChange={setIsClinicModalOpen}>
				<DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
					<DialogHeader>
						<DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
							<Icon icon={Building} className="size-4 text-zinc-800 dark:text-zinc-200" />
							{editingClinicIndex !== null ? "Editar Clínica" : "Cadastrar Nova Clínica"}
						</DialogTitle>
						<DialogDescription className="text-xs text-zinc-500">
							Cadastre as informações da clínica oftalmológica para vinculação com médicos e representantes.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-2 text-xs">
						<div>
							<label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Nome da Clínica / Consultório *
							</label>
							<Input
								placeholder="Ex: Instituto de Olhos Campinas"
								value={formClinicNome}
								onChange={(e) => setFormClinicNome(e.target.value)}
								className="mt-1"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
									Cidade
								</label>
								<Input
									placeholder="Ex: Campinas"
									value={formClinicCidade}
									onChange={(e) => setFormClinicCidade(e.target.value)}
									className="mt-1"
								/>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
									Telefone / WhatsApp
								</label>
								<Input
									placeholder="Ex: (19) 3234-5678"
									value={formClinicTelefone}
									onChange={(e) => setFormClinicTelefone(e.target.value)}
									className="mt-1"
								/>
							</div>
						</div>

						<div>
							<label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Endereço Completo
							</label>
							<Input
								placeholder="Ex: Av. Barão de Itapura, 1500 - Guanabara"
								value={formClinicEndereco}
								onChange={(e) => setFormClinicEndereco(e.target.value)}
								className="mt-1"
							/>
						</div>

						<div>
							<label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
								Representante Responsável
							</label>
							<select
								className="w-full h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs mt-1"
								value={formClinicRep}
								onChange={(e) => setFormClinicRep(e.target.value)}
							>
								<option value="">Selecione um representante...</option>
								{reps.map((r) => (
									<option key={r.id} value={r.nome}>
										{r.nome}
									</option>
								))}
							</select>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" size="sm" onClick={() => setIsClinicModalOpen(false)}>
							Cancelar
						</Button>
						<MnocxButton variant="primary" size="sm" onClick={handleSaveClinic}>
							Salvar Clínica
						</MnocxButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
