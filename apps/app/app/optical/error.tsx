"use client";

import { useEffect } from "react";
import Rotate from "@carbon/icons-react/es/Rotate";
import Reset from "@carbon/icons-react/es/Reset";
import WarningAlt from "@carbon/icons-react/es/WarningAlt";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import { clearOpticalStorage } from "@/lib/optical/optical-store";

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function StandaloneOpticalErrorBoundary({
	error,
	reset,
}: ErrorProps) {
	useEffect(() => {
		console.error("MNOC-X Standalone Optical Error Caught by Boundary:", error);
	}, [error]);

	const handleClearAndReload = () => {
		clearOpticalStorage();
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	};

	return (
		<div className="h-screen w-screen flex items-center justify-center p-6 bg-zinc-200 dark:bg-zinc-950 overflow-y-auto">
			<div className="max-w-lg w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-xl p-6 sm:p-8 space-y-6">
				{/* Header */}
				<div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
					<div className="flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm">
						<Icon icon={Glasses} className="size-6" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-mono">
								MNOC-X
							</span>
							<h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
								Recuperação do Sistema Óptico
							</h3>
						</div>
						<p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
							Identificamos uma oscilação na renderização dos dados da sessão.
						</p>
					</div>
				</div>

				{/* Error description box */}
				<div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-950 p-4 space-y-2 shadow-xs">
					<div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
						<Icon icon={WarningAlt} className="size-4 shrink-0" />
						<span>Detalhes técnicos da ocorrência</span>
					</div>
					<p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-lg break-all border border-zinc-200/70 dark:border-zinc-800">
						{error?.message || "Erro inesperado ao processar dioptrias ou dados de OS."}
					</p>
					{error?.digest && (
						<span className="text-[10px] font-mono text-zinc-400 block">
							Digest ID: {error.digest}
						</span>
					)}
				</div>

				{/* Guidance notice */}
				<div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
					<p className="font-medium text-zinc-800 dark:text-zinc-200">
						Como prosseguir:
					</p>
					<ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-500">
						<li>Clique em <strong>Recarregar Página</strong> para tentar reestabelecer o estado.</li>
						<li>Se o erro persistir por inconsistência de cache local, use <strong>Limpar Cache & Restaurar</strong>.</li>
					</ul>
				</div>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
					<button
						type="button"
						onClick={() => reset()}
						className="w-full sm:flex-1 h-10 px-4 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
					>
						<Icon icon={Rotate} className="size-3.5" />
						Recarregar Página
					</button>

					<button
						type="button"
						onClick={handleClearAndReload}
						className="w-full sm:flex-1 h-10 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
					>
						<Icon icon={Reset} className="size-3.5 text-amber-600" />
						Limpar Cache & Restaurar
					</button>
				</div>
			</div>
		</div>
	);
}
