/**
 * Speedometer Math Utilities
 * Cálculos trigonométricos e polares para renderização vetorial SVG de velocímetros estilo Power BI.
 */

export interface Point {
	x: number;
	y: number;
}

export type PaceStatus = "AHEAD" | "ON_TRACK" | "BEHIND";

export interface SpeedometerTick {
	value: number;
	angle: number;
	label: string;
	isMajor: boolean;
}

/**
 * Converte coordenadas polares (raio e ângulo em graus) para cartesianas (x, y) no espaço SVG.
 * Ângulo -180° = 9h (esquerda)
 * Ângulo -90°  = 12h (topo)
 * Ângulo 0°    = 3h (direita)
 */
export function polarToCartesian(
	cx: number,
	cy: number,
	r: number,
	angleDegrees: number
): Point {
	const radians = (angleDegrees * Math.PI) / 180;
	return {
		x: cx + r * Math.cos(radians),
		y: cy + r * Math.sin(radians),
	};
}

/**
 * Gera o comando de caminho SVG (path d) para um arco semicircular.
 */
export function describeArc(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number
): string {
	// Se os ângulos forem idênticos, não desenha arco nulo
	if (Math.abs(endAngle - startAngle) < 0.001) {
		const pt = polarToCartesian(cx, cy, r, startAngle);
		return `M ${pt.x} ${pt.y}`;
	}

	const start = polarToCartesian(cx, cy, r, startAngle);
	const end = polarToCartesian(cx, cy, r, endAngle);
	const angleDelta = endAngle - startAngle;
	const largeArcFlag = angleDelta > 180 ? "1" : "0";

	return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

/**
 * Mapeia um valor financeiro ou percentual para o ângulo correspondente no arco do velocímetro.
 * @param value Valor realizado atual
 * @param min Valor mínimo (normalmente 0)
 * @param max Meta total máxima (100%)
 * @param startAngle Ângulo inicial (padrão -180°)
 * @param endAngle Ângulo final para 100% (padrão 0°)
 * @param maxOverAngle Ângulo máximo adicional para superação de meta (padrão +15°)
 */
export function valueToAngle(
	value: number,
	min: number,
	max: number,
	startAngle = -180,
	endAngle = 0,
	maxOverAngle = 15
): number {
	if (max <= min) {
		return startAngle;
	}

	const safeValue = Math.max(min, value);
	const ratio = (safeValue - min) / (max - min);
	const angleRange = endAngle - startAngle;
	let angle = startAngle + ratio * angleRange;

	const maxAllowedAngle = endAngle + maxOverAngle;
	if (angle > maxAllowedAngle) {
		angle = maxAllowedAngle;
	}

	return angle;
}

/**
 * Determina a classificação de ritmo (pace) do vendedor ou equipe.
 * AHEAD: >= 105% do esperado
 * ON_TRACK: 95% a 104.9% do esperado
 * BEHIND: < 95% do esperado
 */
export function calculatePaceStatus(
	realizado: number,
	esperadoHoje: number
): PaceStatus {
	if (esperadoHoje <= 0) {
		return realizado > 0 ? "AHEAD" : "ON_TRACK";
	}

	const pacePct = (realizado / esperadoHoje) * 100;
	if (pacePct >= 105) {
		return "AHEAD";
	}
	if (pacePct >= 95) {
		return "ON_TRACK";
	}
	return "BEHIND";
}

/**
 * Gera graduações de escala (ticks) para o mostrador do velocímetro.
 */
export function generateTicks(
	min: number,
	max: number,
	includeOverAchievement = true
): SpeedometerTick[] {
	const percentages = includeOverAchievement
		? [0, 25, 50, 75, 100, 120]
		: [0, 25, 50, 75, 100];

	return percentages.map((pct) => {
		const val = min + ((max - min) * pct) / 100;
		const angle = valueToAngle(val, min, max);
		return {
			value: val,
			angle,
			label: `${pct}%`,
			isMajor: pct === 0 || pct === 50 || pct === 100,
		};
	});
}