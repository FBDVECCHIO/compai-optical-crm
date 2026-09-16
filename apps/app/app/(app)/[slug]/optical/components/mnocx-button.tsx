"use client";

import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { cn } from "@crm/ui/lib/utils";

export interface MnocxButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
	size?: "sm" | "md" | "lg";
	icon?: any;
}

export const MnocxButton = forwardRef<HTMLButtonElement, MnocxButtonProps>(
	({ children, className, variant = "primary", size = "md", icon: IconComponent, disabled, ...props }, ref) => {
		const baseStyles =
			"inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

		const variants = {
			// Botão Apple cinza escuro com texto branco - alto contraste elegante com cards brancos
			primary:
				"bg-zinc-800 text-white hover:bg-zinc-900 active:bg-zinc-950 border border-zinc-700/60 shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.12)] dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white dark:border-white/20",
			secondary:
				"bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
			outline:
				"bg-transparent text-zinc-800 dark:text-zinc-200 border border-zinc-300/90 dark:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60",
			ghost:
				"bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
			danger:
				"bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs",
		};

		const sizes = {
			sm: "h-8 px-3 text-xs gap-1.5",
			md: "h-9 px-4 text-xs font-semibold gap-2",
			lg: "h-10 px-5 text-sm font-semibold gap-2.5",
		};

		return (
			<button
				ref={ref}
				disabled={disabled}
				className={cn(baseStyles, variants[variant], sizes[size], className)}
				{...props}
			>
				{IconComponent && <IconComponent className="size-4 shrink-0" />}
				<span>{children}</span>
			</button>
		);
	}
);

MnocxButton.displayName = "MnocxButton";
