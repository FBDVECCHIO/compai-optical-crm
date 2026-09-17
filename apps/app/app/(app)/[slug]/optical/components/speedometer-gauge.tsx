"use client";

import React from "react";
import {
	calculatePaceStatus,
	describeArc,
	generateTicks,
	polarToCartesian,
	valueToAngle,
	type PaceStatus,
} from "./speedometer-math";

export interface SpeedometerGaugeProps {
	/** Valor realizado atual */
	value: number;
	/** Meta total do período (100%) */
	max: number;
	/** Meta esperada até a data atual (Target estilo Power BI) */
	target?: number;
	/** Valor mínimo (padrão 0) */
	min?: number;
	/** Título do medidor (ex: Nome do vendedor ou "Geral da Loja") */
	title?: string;
	/** Subtítulo descritivo */
	subtitle?: string;
	/** Tamanho do componente: "sm" (compacto para cards de vendedor) ou "lg" (destaque no topo) */
	size?: "sm" | "md" | "lg";
	/** Formatar valor como moeda brasileira BRL (padrão true) */
	formatCurrency?: boolean;
	/** Mostrar ticks de graduação (padrão true) */
	showTicks?: boolean;
	/** Mostrar linha de corte / alvo estilo Power BI (padrão true) */
	showTargetMarker?: boolean;
	/** Classe CSS extra para o container */
	className?: string;
}

export function SpeedometerGauge({
	value,
	max,
	target,
	min = 0,
	title,
	subtitle,
	size = "md",
	formatCurrency = true,
	showTicks = true,
	showTargetMarker = true,
	className = "",
}: SpeedometerGaugeProps) {
	// Dimensões do SVG baseadas no tamanho
	const config = {
		sm: {
			width: 240,
			height: 155,
			cx: 120,
			cy: 118,
			r: 82,
			strokeWidth: 12,
			needleLength: 68,
			hubRadius: 10,
			fontSizeVal: "text-lg",
			fontSizePct: "text-xs",
		},
		md: {
			width: 280,
			height: 175,
			cx: 140,
			cy: 135,
			r: 96,
			strokeWidth: 14,
			needleLength: 80,
			hubRadius: 12,
			fontSizeVal: "text-xl",
			fontSizePct: "text-sm",
		},
		lg: {
			width: 360,
			height: 220,
			cx: 180,
			cy: 170,
			r: 125,
			strokeWidth: 18,
			needleLength: 105,
			hubRadius: 15,
			fontSizeVal: "text-2xl sm:text-3xl",
			fontSizePct: "text-sm sm:text-base",
		},
	}[size];

	const safeMax = max > min ? max : 1;
	const safeValue = Math.max(min, value);
	const pctAtingido = (safeValue / safeMax) * 100;

	// Meta esperada até hoje (Target)
	const safeTarget = target ?? (safeMax * 0.5);
	const targetPct = (safeTarget / safeMax) * 100;

	// Classificação de Ritmo (Pace Status)
	const paceStatus: PaceStatus = calculatePaceStatus(safeValue, safeTarget);

	// Cores dinâmicas baseadas no Pace
	const statusColors = {
		AHEAD: {
			primary: "#10b981", // Emerald 500
			glow: "rgba(16, 185, 129, 0.25)",
			badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
			label: "🚀 À Frente da Meta",
			accent: "text-emerald-600 dark:text-emerald-400",
		},
		ON_TRACK: {
			primary: "#3b82f6", // Blue 500
			glow: "rgba(59, 130, 246, 0.25)",
			badgeBg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
			label: "🎯 No Ritmo Previsto",
			accent: "text-blue-600 dark:text-blue-400",
		},
		BEHIND: {
			primary: "#ef4444", // Red 500
			glow: "rgba(239, 68, 68, 0.25)",
			badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
			label: "⚠️ Abaixo do Ritmo",
			accent: "text-rose-600 dark:text-rose-400",
		},
	}[paceStatus];

	// Ângulos do arco (-180° a 0° com tolerância até +12° se superou 100%)
	const startAngle = -180;
	const endAngle = 0;
	const currentAngle = valueToAngle(safeValue, min, safeMax, startAngle, endAngle, 12);
	const targetAngle = valueToAngle(safeTarget, min, safeMax, startAngle, endAngle, 12);

	// Arcos SVG
	const backgroundArc = describeArc(config.cx, config.cy, config.r, startAngle, endAngle);
	const activeArc = describeArc(config.cx, config.cy, config.r, startAngle, currentAngle);

	// Coordenadas da Linha de Alvo (Target Marker estilo Power BI)
	const targetOuterPt = polarToCartesian(
		config.cx,
		config.cy,
		config.r + config.strokeWidth / 2 + 5,
		targetAngle
	);
	const targetInnerPt = polarToCartesian(
		config.cx,
		config.cy,
		config.r - config.strokeWidth / 2 - 5,
		targetAngle
	);

	// Graduações (ticks)
	const ticks = generateTicks(min, safeMax, false);

	// Formatador de Moeda
	const formatBRL = (val: number) =>
		new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			maximumFractionDigits: 0,
		}).format(val);

	return (
		<div
			className={`flex flex-col items-center select-none ${className}`}
			role="meter"
			aria-valuenow={safeValue}
			aria-valuemin={min}
			aria-valuemax={safeMax}
			aria-label={`${title ?? "Acompanhamento de Meta"}: ${pctAtingido.toFixed(1)}% atingido`}
		>
			{/* Título opcional */}
			{title && (
				<div className="text-center mb-1 w-full">
					<h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
						{title}
					</h4>
					{subtitle && (
						<span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
							{subtitle}
						</span>
					)}
				</div>
			)}

			{/* SVG DO VELOCÍMETRO */}
			<div className="relative flex items-center justify-center">
				<svg
					width={config.width}
					height={config.height}
					viewBox={`0 0 ${config.width} ${config.height}`}
					className="overflow-visible"
				>
					<defs>
						{/* Filtro de Sombra para o Arco e Agulha */}
						<filter id={`needle-shadow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
							<feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
						</filter>

						{/* Gradiente Metálico para o Pivô da Agulha */}
						<radialGradient id={`hub-gradient-${size}`} cx="35%" cy="35%" r="65%">
							<stop offset="0%" stopColor="#f4f4f5" />
							<stop offset="50%" stopColor="#71717a" />
							<stop offset="100%" stopColor="#18181b" />
						</radialGradient>

						{/* Gradiente da Agulha Esportiva */}
						<linearGradient id={`needle-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#ef4444" />
							<stop offset="100%" stopColor="#dc2626" />
						</linearGradient>
					</defs>

					{/* 1. Trilho de Fundo (Background Track) */}
					<path
						d={backgroundArc}
						fill="none"
						stroke="currentColor"
						strokeWidth={config.strokeWidth}
						strokeLinecap="round"
						className="text-zinc-200 dark:text-zinc-800"
					/>

					{/* 2. Arco Realizado Ativo (Active Arc com cor dinâmica) */}
					{pctAtingido > 0.5 && (
						<path
							d={activeArc}
							fill="none"
							stroke={statusColors.primary}
							strokeWidth={config.strokeWidth}
							strokeLinecap="round"
							style={{
								filter: `drop-shadow(0 0 6px ${statusColors.glow})`,
								transition: "stroke 0.5s ease",
							}}
						/>
					)}

					{/* 3. Graduações de Escala (Ticks) */}
					{showTicks &&
						ticks.map((tick) => {
							const ptInner = polarToCartesian(
								config.cx,
								config.cy,
								config.r - config.strokeWidth / 2 - 3,
								tick.angle
							);
							const ptOuter = polarToCartesian(
								config.cx,
								config.cy,
								config.r + config.strokeWidth / 2 + 3,
								tick.angle
							);
							const ptLabel = polarToCartesian(
								config.cx,
								config.cy,
								config.r - config.strokeWidth / 2 - 14,
								tick.angle
							);

							return (
								<g key={tick.label}>
									<line
										x1={ptInner.x}
										y1={ptInner.y}
										x2={ptOuter.x}
										y2={ptOuter.y}
										stroke="currentColor"
										strokeWidth={tick.isMajor ? 1.5 : 1}
										className="text-zinc-400 dark:text-zinc-600 opacity-60"
									/>
									{tick.isMajor && (
										<text
											x={ptLabel.x}
											y={ptLabel.y}
											textAnchor="middle"
											dominantBaseline="central"
											className="text-[9px] font-mono fill-zinc-400 dark:fill-zinc-500 font-semibold"
										>
											{tick.label}
										</text>
									)}
								</g>
							);
						})}

					{/* 4. Marcador de Linha de Alvo (Target Marker estilo Power BI) */}
					{showTargetMarker && safeTarget > 0 && (
						<g className="cursor-help">
							<title>{`Alvo Esperado Hoje: ${formatBRL(safeTarget)} (${targetPct.toFixed(0)}%)`}</title>
							{/* Linha transversal de corte */}
							<line
								x1={targetInnerPt.x}
								y1={targetInnerPt.y}
								x2={targetOuterPt.x}
								y2={targetOuterPt.y}
								stroke="#09090b"
								strokeWidth={3}
								strokeLinecap="round"
								className="dark:stroke-white shadow-sm"
							/>
							{/* Ponteiro / Triângulo de Alvo no contorno externo */}
							<circle
								cx={targetOuterPt.x}
								cy={targetOuterPt.y}
								r={3.5}
								fill="#09090b"
								className="dark:fill-white"
							/>
						</g>
					)}

					{/* 5. Agulha Esportiva do Velocímetro (Needle) */}
					<g
						style={{
							transformOrigin: `${config.cx}px ${config.cy}px`,
							transform: `rotate(${currentAngle + 90}deg)`,
							transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
						}}
						filter={`url(#needle-shadow-${size})`}
					>
						{/* Ponteiro afunilado estilo velocímetro esportivo */}
						<polygon
							points={`
								${config.cx - 3.5},${config.cy}
								${config.cx},${config.cy - config.needleLength}
								${config.cx + 3.5},${config.cy}
								${config.cx},${config.cy + 12}
							`}
							fill={`url(#needle-gradient-${size})`}
						/>
						{/* Faixa branca de alto contraste no centro da agulha */}
						<line
							x1={config.cx}
							y1={config.cy}
							x2={config.cx}
							y2={config.cy - config.needleLength + 4}
							stroke="#ffffff"
							strokeWidth={1}
							opacity={0.85}
						/>
					</g>

					{/* 6. Pivô Central da Agulha com Acabamento Metálico Skeuomórfico */}
					<g>
						{/* Anel Externo Cromado */}
						<circle
							cx={config.cx}
							cy={config.cy}
							r={config.hubRadius}
							fill={`url(#hub-gradient-${size})`}
							stroke="#27272a"
							strokeWidth={1.5}
							filter={`url(#needle-shadow-${size})`}
						/>
						{/* Ponto Central Refletivo */}
						<circle
							cx={config.cx}
							cy={config.cy}
							r={config.hubRadius * 0.45}
							fill="#dc2626"
							stroke="#ffffff"
							strokeWidth={0.8}
						/>
					</g>
				</svg>
			</div>

			{/* 7. Mostrador Digital Central (Odometer / KPI Readout) */}
			<div className="-mt-5 text-center flex flex-col items-center">
				<div className="flex items-baseline justify-center gap-1.5">
					<span className={`font-mono font-extrabold text-zinc-900 dark:text-zinc-50 ${config.fontSizeVal} tracking-tight`}>
						{formatCurrency ? formatBRL(safeValue) : safeValue.toLocaleString("pt-BR")}
					</span>
					<span className={`font-mono font-bold ${statusColors.accent} ${config.fontSizePct}`}>
						({pctAtingido.toFixed(1)}%)
					</span>
				</div>

				{/* Meta e Target de Comparação */}
				<div className="flex items-center justify-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
					<span>
						Meta: <strong className="text-zinc-700 dark:text-zinc-300">{formatCurrency ? formatBRL(safeMax) : safeMax}</strong>
					</span>
					<span>•</span>
					<span title={`Esperado hoje: ${targetPct.toFixed(0)}%`}>
						Alvo hoje: <strong className="text-zinc-700 dark:text-zinc-300">{formatCurrency ? formatBRL(safeTarget) : safeTarget}</strong>
					</span>
				</div>

				{/* Badge de Status de Ritmo */}
				<div className="mt-2">
					<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColors.badgeBg}`}>
						{statusColors.label}
					</span>
				</div>
			</div>
		</div>
	);
}