"use client";

export interface PrintReportKpi {
	label: string;
	value: string | number;
	highlight?: boolean;
}

export interface PrintReportColumn {
	header: string;
	key: string;
	align?: "left" | "center" | "right";
	width?: string;
}

export interface PrintReportOptions {
	title: string;
	subtitle?: string;
	companyName?: string;
	unitName?: string;
	period?: string;
	kpis?: PrintReportKpi[];
	columns: PrintReportColumn[];
	data: Record<string, any>[];
	totalLabel?: string;
	totals?: Record<string, string | number>;
	userName?: string;
}

export function printOpticalReport(options: PrintReportOptions) {
	const {
		title,
		subtitle,
		companyName = "Comp AI Óptica · CRM & Controle",
		unitName = "Rede Integrada",
		period = "Geral",
		kpis = [],
		columns,
		data,
		totals,
		userName = "Operador do Sistema",
	} = options;

	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		alert("A janela de impressão foi bloqueada pelo navegador. Permita popups para emitir o relatório.");
		return;
	}

	const nowFormatted = new Date().toLocaleString("pt-BR", {
		dateStyle: "short",
		timeStyle: "short",
	});

	const kpisHtml =
		kpis.length > 0
			? `
		<div class="kpi-grid">
			${kpis
				.map(
					(kpi) => `
				<div class="kpi-card ${kpi.highlight ? "highlight" : ""}">
					<div class="kpi-label">${kpi.label}</div>
					<div class="kpi-value">${kpi.value}</div>
				</div>
			`,
				)
				.join("")}
		</div>
	`
			: "";

	const tableHeaderHtml = columns
		.map(
			(col) =>
				`<th style="text-align: ${col.align || "left"}; width: ${col.width || "auto"};">${col.header}</th>`,
		)
		.join("");

	const tableRowsHtml =
		data.length === 0
			? `<tr><td colspan="${columns.length}" style="text-align: center; padding: 20px; color: #888;">Nenhum registro encontrado para este período.</td></tr>`
			: data
					.map(
						(row) => `
			<tr>
				${columns
					.map(
						(col) => `
					<td style="text-align: ${col.align || "left"};">
						${row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "-"}
					</td>
				`,
					)
					.join("")}
			</tr>
		`,
					)
					.join("");

	const tableTotalsHtml = totals
		? `
		<tr class="totals-row">
			${columns
				.map((col, idx) => {
					if (idx === 0) {
						return `<td style="font-weight: bold; text-align: left;">TOTALIZADOR</td>`;
					}
					return `<td style="font-weight: bold; text-align: ${col.align || "left"};">${totals[col.key] || ""}</td>`;
				})
				.join("")}
		</tr>
	`
		: "";

	const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
	<meta charset="utf-8">
	<title>${title} - ${companyName}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 12mm 15mm 12mm;
		}
		* {
			box-sizing: border-box;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			font-size: 11px;
			line-height: 1.4;
			color: #1a1a1a;
			background: #ffffff;
			margin: 0;
			padding: 10px;
		}
		.header {
			border-bottom: 2px solid #006b4f;
			padding-bottom: 8px;
			margin-bottom: 12px;
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
		}
		.header-title {
			font-size: 18px;
			font-weight: 800;
			color: #006b4f;
			margin: 0 0 2px 0;
		}
		.header-sub {
			font-size: 11px;
			color: #555;
			margin: 0;
		}
		.header-meta {
			text-align: right;
			font-size: 10px;
			color: #666;
		}
		.kpi-grid {
			display: flex;
			gap: 10px;
			margin-bottom: 14px;
		}
		.kpi-card {
			flex: 1;
			background: #f8f9fa;
			border: 1px solid #e2e8f0;
			border-radius: 6px;
			padding: 8px 12px;
		}
		.kpi-card.highlight {
			background: #e6f4ea;
			border-color: #006b4f;
		}
		.kpi-label {
			font-size: 9px;
			text-transform: uppercase;
			font-weight: 700;
			color: #64748b;
			margin-bottom: 2px;
		}
		.kpi-value {
			font-size: 14px;
			font-weight: 800;
			color: #0f172a;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 15px;
			font-size: 10px;
		}
		th {
			background-color: #f1f5f9;
			color: #334155;
			font-weight: 700;
			border-top: 1px solid #cbd5e1;
			border-bottom: 2px solid #cbd5e1;
			padding: 6px 8px;
			text-transform: uppercase;
			font-size: 9px;
			letter-spacing: 0.3px;
		}
		td {
			padding: 5px 8px;
			border-bottom: 1px solid #e2e8f0;
			color: #1e293b;
		}
		tr:nth-child(even) td {
			background-color: #fafafa;
		}
		.totals-row td {
			background-color: #e2e8f0 !important;
			border-top: 2px solid #94a3b8;
			border-bottom: 2px solid #94a3b8;
		}
		.footer {
			margin-top: 20px;
			border-top: 1px solid #e2e8f0;
			padding-top: 8px;
			font-size: 9px;
			color: #94a3b8;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		@media print {
			body {
				padding: 0;
			}
			.no-print {
				display: none !important;
			}
		}
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h1 class="header-title">${title}</h1>
			<p class="header-sub">${subtitle || companyName} · Unidade: <strong>${unitName}</strong></p>
		</div>
		<div class="header-meta">
			<div>Período: <strong>${period}</strong></div>
			<div>Emissão: <strong>${nowFormatted}</strong></div>
			<div>Operador: <strong>${userName}</strong></div>
		</div>
	</div>

	${kpisHtml}

	<table>
		<thead>
			<tr>
				${tableHeaderHtml}
			</tr>
		</thead>
		<tbody>
			${tableRowsHtml}
			${tableTotalsHtml}
		</tbody>
	</table>

	<div class="footer">
		<div>Comp AI Óptica · Gestão Unificada de Balcão e Laboratórios</div>
		<div>Página 1 de 1</div>
	</div>

	<script>
		window.onload = function() {
			window.focus();
			setTimeout(function() {
				window.print();
			}, 300);
		};
	</script>
</body>
</html>
	`;

	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
}
