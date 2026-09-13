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

export function CreateOpticalOrderSheet() {
	return (
		<Suspense
			fallback={
				<Button disabled size="sm">
					<Icon icon={Add} data-icon="inline-start" />
					Nova Venda de Balcão
				</Button>
			}
		>
			<CreateOpticalOrderSheetContent />
		</Suspense>
	);
}

function CreateOpticalOrderSheetContent() {
	const [isOpenParam, setIsOpenParam] = useQueryState(
		SEARCH_PARAM.dialog.create,
		parseAsBoolean.withDefault(false),
	);
	const [localOpen, setLocalOpen] = useState(false);

	const isOpen = isOpenParam || localOpen;
	const setOpen = (open: boolean) => {
		setLocalOpen(open);
		setIsOpenParam(open ? true : null);
	};

	return (
		<Sheet open={isOpen} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button size="sm" className="font-semibold shadow-xs">
					<Icon icon={Add} data-icon="inline-start" />
					Nova Venda de Balcão
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				size="2xl"
				className="w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-y-auto p-4 sm:p-8"
			>
				<SheetHeader className="mb-4 pb-2 border-b">
					<SheetTitle className="flex items-center gap-2 text-lg font-bold">
						<Icon icon={Glasses} className="size-5 text-primary" />
						Balcão de Venda e Ordem de Serviço Óptica
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
