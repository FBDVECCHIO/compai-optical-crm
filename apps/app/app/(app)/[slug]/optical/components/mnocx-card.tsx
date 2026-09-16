"use client";

import { ReactNode } from "react";
import { cn } from "@crm/ui/lib/utils";

interface MnocxCardProps {
	children: ReactNode;
	className?: string;
	title?: ReactNode;
	subtitle?: ReactNode;
	action?: ReactNode;
	badge?: ReactNode;
	padding?: "none" | "sm" | "md" | "lg";
}

export function MnocxCard({
	children,
	className,
	title,
	subtitle,
	action,
	badge,
	padding = "md",
}: MnocxCardProps) {
	const paddingClasses = {
		none: "p-0",
		sm: "p-3",
		md: "p-4 sm:p-5",
		lg: "p-6 sm:p-8",
	};

	return (
		<div
			className={cn(
				"bg-white dark:bg-zinc-900",
				"border border-zinc-200/90 dark:border-zinc-800",
				"rounded-2xl",
				"shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_20px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.95)]",
				"dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]",
				"transition-all duration-200",
				paddingClasses[padding],
				className
			)}
		>
			{(title || subtitle || action || badge) && (
				<div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800/80">
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							{typeof title === "string" ? (
								<h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
									{title}
								</h3>
							) : (
								title
							)}
							{badge}
						</div>
						{subtitle && (
							<p className="text-xs text-zinc-500 dark:text-zinc-400">
								{subtitle}
							</p>
						)}
					</div>
					{action && <div className="shrink-0">{action}</div>}
				</div>
			)}
			{children}
		</div>
	);
}
