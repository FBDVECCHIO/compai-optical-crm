import { parseAsString, parseAsStringLiteral } from "nuqs";

export const OPTICAL_VIEW_MODES = ["table", "kanban"] as const;
export type OpticalViewMode = (typeof OPTICAL_VIEW_MODES)[number];

export const OPTICAL_TABS = [
	"ALL",
	"DIGITADA",
	"EM_LABORATORIO",
	"EM_MONTAGEM",
	"CONFERIDA",
	"PRONTA_LOJA",
	"RESIDUAL",
	"ENTREGUE",
] as const;
export type OpticalTab = (typeof OPTICAL_TABS)[number];

export const opticalSearchParams = {
	q: parseAsString.withDefault(""),
	tab: parseAsStringLiteral(OPTICAL_TABS).withDefault("ALL"),
	view: parseAsStringLiteral(OPTICAL_VIEW_MODES).withDefault("table"),
};
