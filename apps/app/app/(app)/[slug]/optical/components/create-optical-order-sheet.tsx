"use client";

import Add from "@carbon/icons-react/es/Add";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import Glasses from "@crm/ui/components/icons/glasses";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@crm/ui/components/sheet";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Suspense, useState } from "react";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { OpticalOrderForm } from "./optical-order-form";

export interface CreateOpticalOrderSheetProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

export function CreateOpticalOrderSheet({
	open,
	onOpenChange,
	hideTrigger = false,
}: CreateOpticalOrderSheetProps = {}) {
	return (
		<Suspense
			fallback={
				!hideTrigger ? (
					<Button disabled size="sm" data-action="nova-venda">
						<Icon icon={Add} data-icon="inline-start" />
						Lançar OS (Nova Venda)
					</Button>
				) : null
			}
		>
			<CreateOpticalOrderSheetContent
				externalOpen={open}
				externalOnOpenChange={onOpenChange}
				hideTrigger={hideTrigger}
			/>
		</Suspense>
	);
}

function CreateOpticalOrderSheetContent({
	externalOpen,
	externalOnOpenChange,
	hideTrigger,
}: {
	externalOpen?: boolean;
	externalOnOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}) {
	const [isOpenParam, setIsOpenParam] = useQueryState(
		SEARCH_PARAM.dialog.create,
		parseAsBoolean.withDefault(false),
	);
	const [localOpen, setLocalOpen] = useState(false);

	const isControlled = typeof externalOpen === "boolean";
	const isOpen = isControlled ? externalOpen : isOpenParam || localOpen;

	const setOpen = (open: boolean) => {
		if (isControlled && externalOnOpenChange) {
			externalOnOpenChange(open);
		} else {
			setLocalOpen(open);
			setIsOpenParam(open ? true : null);
		}
	};

	return (
		<Sheet open={isOpen} onOpenChange={setOpen}>
			{!hideTrigger && (
				<SheetTrigger asChild>
					<Button
						size="sm"
						className="font-bold shadow-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 gap-2 h-9 px-3.5 rounded-xl cursor-pointer"
						data-action="nova-venda"
					>
						<Icon icon={Add} className="size-4" />
						<span>Lançar Ordem de Serviço</span>
						<kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/20 dark:bg-zinc-900/20 text-[10px] font-mono font-bold">
							F2
						</kbd>
					</Button>
				</SheetTrigger>
			)}
			<SheetContent
				side="right"
				size="2xl"
				className="w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-y-auto p-4 sm:p-8"
			>
				<SheetHeader className="mb-4 pb-2 border-b">
					<SheetTitle className="flex items-center gap-2 text-lg font-bold">
						<Icon icon={Glasses} className="size-5 text-primary" />
						Lançar OS — Balcão de Venda e Ordem de Serviço Óptica
					</SheetTitle>
					<SheetDescription>
						Cadastre pacientes, configure armações e lentes para Aro 1 e Aro 2
						(Dobro), e processe o faturamento com cálculo em tempo real de sinal
						e saldo residual.
					</SheetDescription>
				</SheetHeader>

				<OpticalOrderForm
					onSuccess={() => setOpen(false)}
					onCancel={() => setOpen(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}
