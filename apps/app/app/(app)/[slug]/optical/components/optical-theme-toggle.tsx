"use client";

import Asleep from "@carbon/icons-react/es/Asleep";
import Light from "@carbon/icons-react/es/Light";
import { Button } from "@crm/ui/components/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface OpticalThemeToggleProps {
	variant?: "outline" | "ghost" | "secondary";
	size?: "sm" | "default" | "icon";
	showLabel?: boolean;
	className?: string;
}

export function OpticalThemeToggle({
	variant = "outline",
	size = "sm",
	showLabel = false,
	className = "",
}: OpticalThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button
				variant={variant}
				size={size}
				disabled
				className={`h-8 gap-1.5 font-medium text-xs ${className}`}
			>
				<span className="size-4 rounded-full bg-muted-foreground/20 animate-pulse" />
				{showLabel && <span>Tema</span>}
			</Button>
		);
	}

	const isDark = resolvedTheme === "dark";

	const toggleTheme = () => {
		setTheme(isDark ? "light" : "dark");
	};

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={toggleTheme}
			title={isDark ? "Mudar para Modo Claro (Branco & Cinza)" : "Mudar para Modo Escuro"}
			className={`h-8 gap-1.5 font-medium text-xs transition-colors cursor-pointer ${
				isDark
					? "text-neutral-300 hover:text-white hover:bg-neutral-800 border-neutral-700"
					: "text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border-neutral-300 shadow-2xs"
			} ${className}`}
		>
			{isDark ? (
				<>
					<Light className="size-4 text-amber-400" />
					{showLabel && <span>Modo Claro</span>}
				</>
			) : (
				<>
					<Asleep className="size-4 text-neutral-600" />
					{showLabel && <span>Modo Escuro</span>}
				</>
			)}
		</Button>
	);
}
