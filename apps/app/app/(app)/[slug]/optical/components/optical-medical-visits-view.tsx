"use client";

import { useEffect, useMemo, useState } from "react";
import Add from "@carbon/icons-react/es/Add";
import Calendar from "@carbon/icons-react/es/Calendar";
import Checkmark from "@carbon/icons-react/es/Checkmark";
import Close from "@carbon/icons-react/es/Close";
import DocumentExport from "@carbon/icons-react/es/DocumentExport";
import Events from "@carbon/icons-react/es/Events";
import Search from "@carbon/icons-react/es/Search";
import TrashCan from "@carbon/icons-react/es/TrashCan";
import UserFollow from "@carbon/icons-react/es/UserFollow";
import UserSpeaker from "@carbon/icons-react/es/UserSpeaker";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
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
	type ClinicItem,
	type DoctorItem,
	type MedicalVisitItem,
	type RepItem,
	deleteSupabaseMedicalVisit,
	fetchAssuntosVisita,
	fetchSupabaseClinics,
	fetchSupabaseDoctors,
	fetchSupabaseMedicalVisits,
	fetchSupabaseReps,
	saveSupabaseMedicalVisit,
} from "@/lib/optical/supabase-optical";
import { printOpticalReport } from "@/lib/optical/optical-print-report";

export function OpticalMedicalVisitsView() {
	const [visits, setVisits] = useState<MedicalVisitItem[]>([]);
	const [doctors, setDoctors] = useState<DoctorItem[]>([]);
	const [clinics, setClinics] = useState<ClinicItem[]>([]);
	const [reps, setReps] = useState<RepItem[]>([]);
	const [topics, setTopics] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);

	// Filtros
	const [searchDoctor, setSearchDoctor] = useState("");
	const [selectedRep, setSelectedRep] = useState("TODOS");
	const [selectedTopic, setSelectedTopic] = useState("TODOS");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	// Modal Lançamento
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formDoctor, setFormDoctor] = useState("");
	const [formCrm, setFormCrm] = useState("");
	const [formClinic, setFormClinic] = useState("");
	const [formRep, setFormRep] = useState("");
	const [formData, setFormData] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [formHora, setFormHora] = useState("10:00");
	const [formAssunto, setFormAssunto] = useState("");
	const [formStatus, setFormStatus] = useState<"EFETIVA" | "AUSENTE" | "REAGENDADA">("EFETIVA");
	const [formObs, setFormObs] = useState("");
	const [saving, setSaving] = useState(false);

	async function loadAll() {
		setLoading(true);
		try {
			const [vList, dList, cList, rList, tList] = await Promise.all([
				fetchSupabaseMedicalVisits(),
				fetchSupabaseDoctors(),
				fetchSupabaseClinics(),
				fetchSupabaseReps(),
				fetchAssuntosVisita(),
			]);
			setVisits(vList);
			setDoctors(dList);
			setClinics(cList);
			setReps(rList);
			setTopics(tList);
			if (dList.length > 0 && !formDoctor) {
				setFormDoctor(dList[0]?.nome || "");
				setFormCrm(dList[0]?.crm || "");
			}
			if (rList.length > 0 && !formRep) {
				setFormRep(rList[0]?.nome || "");
			}
			if (tList.length > 0 && !formAssunto) {
				setFormAssunto(tList[0] || "Apresentação de Produto");
			}
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadAll();
	}, []);

	// Atualiza CRM automaticamente ao selecionar médico
	const handleDoctorSelect = (docName: string) => {
		setFormDoctor(docName);
		const found = doctors.find((d) => d.nome === docName);
		if (found) {
			setFormCrm(found.crm || "");
			if (found.representante) setFormRep(found.representante);
		}
	};

	// Visitas filtradas
	const filteredVisits = useMemo(() => {
		return visits.filter((v) => {
			if (searchDoctor) {
				const query = searchDoctor.toLowerCase();
				const matchName = v.medico.toLowerCase().includes(query);
				const matchCrm = v.crm?.toLowerCase().includes(query);
				const matchClinic = v.clinica?.toLowerCase().includes(query);
				if (!matchName && !matchCrm && !matchClinic) return false;
			}
			if (selectedRep !== "TODOS" && v.representante !== selectedRep) return false;
			if (selectedTopic !== "TODOS" && v.assunto !== selectedTopic) return false;
			if (startDate && v.data < startDate) return false;
			if (endDate && v.data > endDate) return false;
			return true;
		});
	}, [visits, searchDoctor, selectedRep, selectedTopic, startDate, endDate]);

	// KPIs de Visitas
	const totalVisits = visits.length;
	const efetivas = visits.filter((v) => v.status === "EFETIVA").length;
	const ausentes = visits.filter((v) => v.status === "AUSENTE").length;
	const medicosUnicos = new Set(visits.map((v) => v.medico.toLowerCase().trim())).size;

	const todayStr = new Date().toISOString().slice(0, 10);
	const visitasDia = visits.filter((v) => v.data === todayStr).length;

	// Salvar nova visita
	async function handleSaveVisit(e: React.FormEvent) {
		e.preventDefault();
		if (!formDoctor) {
			toast.error("Selecione o médico visitado.");
			return;
		}

		setSaving(true);
		const visitPayload: MedicalVisitItem = {
			data: formData,
			hora: formHora,
			medico: formDoctor,
			crm: formCrm,
			clinica: formClinic,
			representante: formRep,
			assunto: formAssunto || "Visita de Relacionamento",
			status: formStatus,
			observacoes: formObs,
		};

		const ok = await saveSupabaseMedicalVisit(visitPayload);
		setSaving(false);
		if (ok) {
			toast.success("Visita médica registrada com sucesso!");
			setIsModalOpen(false);
			setFormObs("");
			loadAll();
		} else {
			toast.error("Erro ao salvar visita.");
		}
	}

	// Excluir visita
	async function handleDeleteVisit(id?: number) {
		if (!id) return;
		if (!confirm("Deseja realmente remover o registro desta visita?")) return;
		const ok = await deleteSupabaseMedicalVisit(id);
		if (ok) {
			toast.success("Visita removida.");
			setVisits((prev) => prev.filter((v) => v.id !== id));
		} else {
			toast.error("Erro ao remover visita.");
		}
	}

	// Exportar PDF / Imprimir
	const handleExportPDF = () => {
		printOpticalReport({
			title: "Relatório de Visitas Médicas e Consultórios",
			subtitle: "Cobertura de Carteira, Relacionamento Médico e Desempenho de Representantes",
			period: startDate && endDate ? `${startDate} até ${endDate}` : "Período Geral",
			kpis: [
				{ label: "Total de Visitas", value: filteredVisits.length },
				{ label: "Visitas Efetivas", value: filteredVisits.filter((v) => v.status === "EFETIVA").length, highlight: true },
				{ label: "Médico Ausente", value: filteredVisits.filter((v) => v.status === "AUSENTE").length },
				{ label: "Médicos Únicos", value: new Set(filteredVisits.map((v) => v.medico)).size },
			],
			columns: [
				{ header: "Data e Hora", key: "dataHora", width: "110px" },
				{ header: "Representante", key: "representante", width: "140px" },
				{ header: "Médico / CRM", key: "medicoCrm", width: "180px" },
				{ header: "Clínica / Consultório", key: "clinica", width: "160px" },
				{ header: "Pauta / Assunto", key: "assunto", width: "180px" },
				{ header: "Status", key: "statusBadge", align: "center", width: "90px" },
				{ header: "Observações", key: "observacoes" },
			],
			data: filteredVisits.map((v) => ({
				dataHora: `${v.data} ${v.hora || ""}`,
				representante: v.representante,
				medicoCrm: `${v.medico} (${v.crm || "S/ CRM"})`,
				clinica: v.clinica || "Consultório Próprio",
				assunto: v.assunto,
				statusBadge: v.status,
				observacoes: v.observacoes || "-",
			})),
		});
	};

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Header Principal */}
			<div className="rounded-xl border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Icon icon={Events} className="size-4" />
						</div>
						<h2 className="text-lg font-bold tracking-tight">Controle de Visitas Médicas</h2>
						<Badge variant="secondary" className="font-mono text-xs">
							{filteredVisits.length} Registros
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">
						Gestão da cobertura de consultórios oftalmológicos, rotina dos representantes e pautas de relacionamento.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportPDF}
						className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-neutral-300 dark:border-neutral-700 shadow-2xs"
					>
						<Icon icon={DocumentExport} className="size-3.5" />
						Exportar PDF
					</Button>
					<Button
						size="sm"
						onClick={() => setIsModalOpen(true)}
						className="h-9 gap-1.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
					>
						<Icon icon={Add} className="size-3.5" />
						Lançar Visita
					</Button>
				</div>
			</div>

			{/* Mini-KPIs em Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
					<div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total de Visitas</div>
					<div className="text-2xl font-black mt-1 text-foreground">{totalVisits}</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">Lançamentos no circuito</div>
				</div>

				<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
					<div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Visitas Efetivas</div>
					<div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{efetivas}</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">Atendidas pelo médico</div>
				</div>

				<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
					<div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Médico Ausente</div>
					<div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">{ausentes}</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">Cirurgia ou ausência</div>
				</div>

				<div className="rounded-xl border bg-card p-3.5 shadow-2xs">
					<div className="text-[11px] font-medium text-primary uppercase tracking-wider">Médicos Visitados</div>
					<div className="text-2xl font-black mt-1 text-primary">{medicosUnicos}</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">Profissionais contactados</div>
				</div>
			</div>

			{/* Card de Histórico e Filtros */}
			<div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
					<h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
						<Icon icon={Events} className="size-4 text-primary" />
						Histórico de Visitas aos Consultórios
					</h3>
				</div>

				{/* Barra de Filtros */}
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
					<div className="md:col-span-2">
						<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Buscar Médico ou Clínica</label>
						<div className="relative">
							<Icon icon={Search} className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
							<Input
								value={searchDoctor}
								onChange={(e) => setSearchDoctor(e.target.value)}
								placeholder="Nome do médico, CRM ou clínica..."
								className="h-8 pl-8 text-xs font-medium"
							/>
						</div>
					</div>

					<div>
						<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Representante</label>
						<select
							value={selectedRep}
							onChange={(e) => setSelectedRep(e.target.value)}
							className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
						>
							<option value="TODOS">Todos Representantes</option>
							{reps.map((r) => (
								<option key={r.nome} value={r.nome}>{r.nome}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Assunto / Pauta</label>
						<select
							value={selectedTopic}
							onChange={(e) => setSelectedTopic(e.target.value)}
							className="h-8 w-full rounded-md border bg-background px-2.5 text-xs font-medium"
						>
							<option value="TODOS">Todos os Assuntos</option>
							{topics.map((t) => (
								<option key={t} value={t}>{t}</option>
							))}
						</select>
					</div>

					<div>
						<label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Data Inicial</label>
						<Input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="h-8 text-xs"
						/>
					</div>
				</div>

				{/* Tabela de Visitas */}
				<div className="rounded-lg border overflow-hidden">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
								<th className="py-2.5 px-3 text-left">Data e Hora</th>
								<th className="py-2.5 px-3 text-left">Representante</th>
								<th className="py-2.5 px-3 text-left">Médico & CRM</th>
								<th className="py-2.5 px-3 text-left">Clínica</th>
								<th className="py-2.5 px-3 text-left">Assunto / Pauta</th>
								<th className="py-2.5 px-3 text-center">Status</th>
								<th className="py-2.5 px-3 text-left">Observações</th>
								<th className="py-2.5 px-3 text-right">Ação</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filteredVisits.length === 0 ? (
								<tr>
									<td colSpan={8} className="py-10 text-center text-muted-foreground">
										Nenhuma visita registrada com os filtros selecionados.
									</td>
								</tr>
							) : (
								filteredVisits.map((v) => (
									<tr key={v.id} className="hover:bg-muted/20 transition-colors">
										<td className="py-2.5 px-3 whitespace-nowrap">
											<span className="font-semibold">{v.data}</span>
											{v.hora && <span className="text-[11px] text-muted-foreground ml-1">· {v.hora}</span>}
										</td>
										<td className="py-2.5 px-3 font-medium text-foreground">
											{v.representante}
										</td>
										<td className="py-2.5 px-3">
											<div className="font-semibold text-primary">{v.medico}</div>
											{v.crm && <div className="text-[10px] text-muted-foreground">CRM {v.crm}</div>}
										</td>
										<td className="py-2.5 px-3 text-muted-foreground">
											{v.clinica || "Consultório"}
										</td>
										<td className="py-2.5 px-3 font-medium">
											{v.assunto}
										</td>
										<td className="py-2.5 px-3 text-center">
											<span
												className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
													v.status === "EFETIVA"
														? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
														: v.status === "AUSENTE"
															? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
															: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
												}`}
											>
												{v.status}
											</span>
										</td>
										<td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-xs truncate" title={v.observacoes}>
											{v.observacoes || "-"}
										</td>
										<td className="py-2.5 px-3 text-right">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDeleteVisit(v.id)}
												className="size-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
												title="Remover registro"
											>
												<Icon icon={TrashCan} className="size-3.5" />
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal para Lançar Nova Visita Médica */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Icon icon={Events} className="size-4 text-primary" />
							Registrar Visita a Médico / Clínica
						</DialogTitle>
						<DialogDescription>
							Preencha os dados do encontro, temas abordados e devolutiva do oftalmologista.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSaveVisit} className="space-y-3.5 py-2">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Médico Oftalmologista *</label>
								<select
									value={formDoctor}
									onChange={(e) => handleDoctorSelect(e.target.value)}
									required
									className="h-9 w-full rounded-md border bg-background px-3 text-xs font-medium"
								>
									{doctors.map((d) => (
										<option key={d.crm} value={d.nome}>{d.nome} ({d.crm})</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">CRM do Médico</label>
								<Input
									value={formCrm}
									onChange={(e) => setFormCrm(e.target.value)}
									placeholder="Ex: 151798/SP"
									className="h-9 text-xs"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Clínica / Hospital</label>
								<select
									value={formClinic}
									onChange={(e) => setFormClinic(e.target.value)}
									className="h-9 w-full rounded-md border bg-background px-3 text-xs font-medium"
								>
									<option value="">Consultório Próprio</option>
									{clinics.map((c) => (
										<option key={c.nome} value={c.nome}>{c.nome} ({c.cidade || "Campinas"})</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Representante Responsável *</label>
								<select
									value={formRep}
									onChange={(e) => setFormRep(e.target.value)}
									required
									className="h-9 w-full rounded-md border bg-background px-3 text-xs font-medium"
								>
									{reps.map((r) => (
										<option key={r.nome} value={r.nome}>{r.nome}</option>
									))}
								</select>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Data da Visita *</label>
								<Input
									type="date"
									value={formData}
									onChange={(e) => setFormData(e.target.value)}
									required
									className="h-9 text-xs"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Horário</label>
								<Input
									type="time"
									value={formHora}
									onChange={(e) => setFormHora(e.target.value)}
									className="h-9 text-xs"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-foreground mb-1 block">Status da Visita *</label>
								<select
									value={formStatus}
									onChange={(e) => setFormStatus(e.target.value as any)}
									className="h-9 w-full rounded-md border bg-background px-2 text-xs font-medium"
								>
									<option value="EFETIVA">Efetiva</option>
									<option value="AUSENTE">Médico Ausente</option>
									<option value="REAGENDADA">Reagendada</option>
								</select>
							</div>
						</div>

						<div>
							<label className="text-xs font-semibold text-foreground mb-1 block">Pauta / Assunto Tratado *</label>
							<select
								value={formAssunto}
								onChange={(e) => setFormAssunto(e.target.value)}
								className="h-9 w-full rounded-md border bg-background px-3 text-xs font-medium"
							>
								{topics.map((t) => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</div>

						<div>
							<label className="text-xs font-semibold text-foreground mb-1 block">Observações / Feedback do Médico</label>
							<textarea
								value={formObs}
								onChange={(e) => setFormObs(e.target.value)}
								rows={3}
								placeholder="Descreva detalhes da conversa, interesse em materiais, dúvidas técnicas..."
								className="w-full rounded-md border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
							/>
						</div>

						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsModalOpen(false)}
								className="h-9 text-xs font-semibold"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={saving}
								className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
							>
								{saving ? "Salvando..." : "Salvar Visita Médica"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
