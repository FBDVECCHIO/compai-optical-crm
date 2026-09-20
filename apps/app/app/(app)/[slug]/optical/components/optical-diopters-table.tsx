"use client";

import MagicWand from "@carbon/icons-react/es/MagicWand";
import Upload from "@carbon/icons-react/es/Upload";
import Warning from "@carbon/icons-react/es/Warning";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { Spinner } from "@crm/ui/components/spinner";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { EyePrescription } from "@/lib/optical/optical-types";
import { processPrescriptionOCR } from "@/lib/optical/prescription-ocr";
import { cn } from "@crm/ui/lib/utils";

interface OpticalDioptersTableProps {
	idPrefix: string;
	title: string;
	value: EyePrescription;
	onChange: (next: EyePrescription) => void;
	onOcrCompleted?: (doctor?: string, patient?: string) => void;
	readOnly?: boolean;
	allowOnlyDnpAndAlt?: boolean;
	lockAddition?: boolean;
}

export function OpticalDioptersTable({
	idPrefix,
	title,
	value,
	onChange,
	onOcrCompleted,
	readOnly = false,
	allowOnlyDnpAndAlt = false,
	lockAddition = false,
}: OpticalDioptersTableProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [scanning, setScanning] = useState(false);
	const [ocrBadge, setOcrBadge] = useState<string | null>(null);

	const updateEye = (
		eye: "od" | "oe",
		field: "esf" | "cil" | "eixo" | "dnp" | "alt",
		val: string,
	) => {
		onChange({
			...value,
			[eye]: {
				...value[eye],
				[field]: val,
			},
		});
	};

	const updateAdicao = (val: string) => {
		onChange({
			...value,
			adicao: val,
		});
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await runOcr(file);
	};

	const runOcr = async (file?: File) => {
		setScanning(true);
		try {
			const res = await processPrescriptionOCR(file);
			onChange(res.prescription);
			setOcrBadge(`IA OCR: ${(res.confidence * 100).toFixed(0)}% confiança`);
			toast.success("Receita analisada com sucesso via IA Vision OCR!", {
				description: res.doctorDetected
					? `${res.doctorDetected} - Prescrição importada.`
					: "Graus ópticos preenchidos na tabela.",
			});
			if (onOcrCompleted) {
				onOcrCompleted(res.doctorDetected, res.patientDetected);
			}
		} catch (_err) {
			toast.error("Não foi possível realizar o OCR da receita.");
		} finally {
			setScanning(false);
		}
	};

	// Warnings for common optical typing errors
	const odHasCilNoEixo =
		value.od.cil &&
		value.od.cil !== "0" &&
		value.od.cil !== "0.00" &&
		!value.od.eixo;
	const oeHasCilNoEixo =
		value.oe.cil &&
		value.oe.cil !== "0" &&
		value.oe.cil !== "0.00" &&
		!value.oe.eixo;

	return (
		<div className="rounded-lg border bg-card p-4 shadow-xs">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-sm tracking-tight text-foreground">
						{title}
					</span>
					{ocrBadge && (
						<Badge
							variant="secondary"
							className="text-[10px] text-emerald-600 dark:text-emerald-400"
						>
							<Icon icon={MagicWand} className="size-3 text-emerald-500" />
							{ocrBadge}
						</Badge>
					)}
				</div>

				{!readOnly && (
					<div className="flex items-center gap-2">
						<input
							type="file"
							ref={fileInputRef}
							className="hidden"
							accept="image/*,.pdf"
							onChange={handleFileSelect}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs font-medium"
							disabled={scanning}
							onClick={() => fileInputRef.current?.click()}
						>
							{scanning ? (
								<>
									<Spinner className="mr-1.5 size-3 text-primary" />
									Escaneando IA...
								</>
							) : (
								<>
									<Icon icon={Upload} className="mr-1.5 size-3" />
									Upload / IA OCR de Receita
								</>
							)}
						</Button>
					</div>
				)}
			</div>

			{/* Optical Diopter Table */}
			<div className="overflow-x-auto rounded-md border">
				<table className="w-full min-w-[580px] text-center text-xs">
					<thead>
						<tr className="border-b bg-muted/40 font-medium text-muted-foreground">
							<th className="py-2.5 px-3 text-left font-semibold w-28">Olho</th>
							<th className="py-2.5 px-2 min-w-[90px]">Esférico (Esf)</th>
							<th className="py-2.5 px-2 min-w-[90px]">Cilíndrico (Cil)</th>
							<th className="py-2.5 px-2 min-w-[85px]">Eixo (Graus)</th>
							<th className="py-2.5 px-2 min-w-[85px]">DNP (mm)</th>
							<th className="py-2.5 px-2 min-w-[85px]">Altura (mm)</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{/* Olho Direito (OD) */}
						<tr className="hover:bg-muted/20">
							<td className="py-2 px-2 text-left font-bold text-primary">
								OD{" "}
								<span className="text-[10px] font-normal text-muted-foreground">
									(Direito)
								</span>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-od-esf`}
									value={value.od.esf}
									onChange={(e) => updateEye("od", "esf", e.target.value)}
									placeholder="-1.75"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau esférico blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono font-medium", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-od-cil`}
									value={value.od.cil}
									onChange={(e) => updateEye("od", "cil", e.target.value)}
									placeholder="-0.75"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau cilíndrico blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono font-medium", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-od-eixo`}
									value={value.od.eixo}
									onChange={(e) => updateEye("od", "eixo", e.target.value)}
									placeholder="180°"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau de eixo blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-od-dnp`}
									value={value.od.dnp ?? ""}
									onChange={(e) => updateEye("od", "dnp", e.target.value)}
									placeholder="31.5"
									disabled={readOnly}
									className="h-8 text-center text-xs font-mono"
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-od-alt`}
									value={value.od.alt ?? ""}
									onChange={(e) => updateEye("od", "alt", e.target.value)}
									placeholder="19.0"
									disabled={readOnly}
									className="h-8 text-center text-xs font-mono"
								/>
							</td>
						</tr>

						{/* Olho Esquerdo (OE) */}
						<tr className="hover:bg-muted/20">
							<td className="py-2 px-2 text-left font-bold text-primary">
								OE{" "}
								<span className="text-[10px] font-normal text-muted-foreground">
									(Esquerdo)
								</span>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-oe-esf`}
									value={value.oe.esf}
									onChange={(e) => updateEye("oe", "esf", e.target.value)}
									placeholder="-1.50"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau esférico blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono font-medium", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-oe-cil`}
									value={value.oe.cil}
									onChange={(e) => updateEye("oe", "cil", e.target.value)}
									placeholder="-0.50"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau cilíndrico blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono font-medium", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-oe-eixo`}
									value={value.oe.eixo}
									onChange={(e) => updateEye("oe", "eixo", e.target.value)}
									placeholder="10°"
									disabled={readOnly || allowOnlyDnpAndAlt}
									title={allowOnlyDnpAndAlt ? "Grau de eixo blindado (cópia do Aro 1)" : undefined}
									className={cn("h-8 text-center text-xs font-mono", allowOnlyDnpAndAlt && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-oe-dnp`}
									value={value.oe.dnp ?? ""}
									onChange={(e) => updateEye("oe", "dnp", e.target.value)}
									placeholder="32.0"
									disabled={readOnly}
									className="h-8 text-center text-xs font-mono"
								/>
							</td>
							<td className="p-1">
								<Input
									id={`${idPrefix}-oe-alt`}
									value={value.oe.alt ?? ""}
									onChange={(e) => updateEye("oe", "alt", e.target.value)}
									placeholder="19.0"
									disabled={readOnly}
									className="h-8 text-center text-xs font-mono"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			{/* Adição e Alertas */}
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-2.5">
				<div className="flex items-center gap-2">
					<label
						htmlFor={`${idPrefix}-adicao`}
						className="font-medium text-xs text-muted-foreground whitespace-nowrap"
					>
						Adição (Perto):
					</label>
					<Input
						id={`${idPrefix}-adicao`}
						value={lockAddition ? "" : (value.adicao ?? "")}
						onChange={(e) => updateAdicao(e.target.value)}
						placeholder={lockAddition ? "n/a" : "+2.00"}
						disabled={readOnly || lockAddition}
						title={lockAddition ? "Grau Monofocal: Adição não aplicável (grau total em OD/OE)" : undefined}
						className={cn("h-8 w-24 text-center font-mono text-xs font-semibold", lockAddition && "bg-muted/50 text-muted-foreground cursor-not-allowed")}
					/>
					{lockAddition ? (
						<Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
							🔒 Grau Monofocal: Adição n/a
						</Badge>
					) : (
						<span className="text-[11px] text-muted-foreground">
							(Multifocais / Perto)
						</span>
					)}
					{allowOnlyDnpAndAlt && (
						<Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-medium">
							🔒 Esf/Cil/Eixo blindados do Aro 1 (DNP e Altura livres)
						</Badge>
					)}
				</div>

				{(odHasCilNoEixo || oeHasCilNoEixo) && (
					<div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
						<Icon icon={Warning} className="size-3.5 shrink-0" />
						<span>Atenção: Cilíndrico sem ângulo de eixo informado.</span>
					</div>
				)}
			</div>
		</div>
	);
}
