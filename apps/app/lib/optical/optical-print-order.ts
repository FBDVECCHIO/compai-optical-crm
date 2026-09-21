"use client";

import type { OpticalOrder } from "./optical-types";

export interface PrintOrderOptions {
	mode?: "A4" | "THERMAL";
}

export function generateOrderPrintHtml(order: OpticalOrder, options: PrintOrderOptions = {}): string {
	const mode = options.mode || "A4";
	const fin = order.financials || {
		totalAmount: 0,
		paidAmount: 0,
		residualAmount: 0,
		paymentMode: "TOTAL",
	};

	const totalAmount = Number(fin.totalAmount) || 0;
	const paidAmount = Number(fin.paidAmount) || 0;
	const residualAmount = Number(fin.residualAmount) || 0;
	const aro1 = order.aro1;
	const aro2 = order.aro2;
	const hasAro2 = Boolean(order.hasAro2 && aro2);

	const formattedDate = (() => {
		try {
			const d = order.orderDate ? new Date(order.orderDate) : new Date();
			return d.toLocaleDateString("pt-BR", { dateStyle: "long" });
		} catch {
			return new Date().toLocaleDateString("pt-BR");
		}
	})();

	const deliveryPromise = (() => {
		try {
			const d = order.promisedDeliveryDate ? new Date(order.promisedDeliveryDate) : null;
			return d ? d.toLocaleDateString("pt-BR") : "A combinar";
		} catch {
			return "A combinar";
		}
	})();

	return `<!DOCTYPE html>
<html lang="pt-BR" translate="no" class="notranslate">
<head>
	<meta charset="utf-8">
	<meta name="google" content="notranslate">
	<title>Ordem de Serviço ${order.orderNumber} · MNOC-X</title>
	<style>
		@page {
			size: ${mode === "THERMAL" ? "80mm auto" : "A4 portrait"};
			margin: ${mode === "THERMAL" ? "4mm" : "10mm"};
		}
		* {
			box-sizing: border-box;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		body {
			margin: 0;
			padding: 12px;
			color: #18181b;
			background: #fff;
			font-size: 12px;
			line-height: 1.4;
		}
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			border-bottom: 2px solid #18181b;
			padding-bottom: 8px;
			margin-bottom: 12px;
		}
		.brand-title {
			font-size: 18px;
			font-weight: 800;
			letter-spacing: -0.5px;
			text-transform: uppercase;
		}
		.brand-sub {
			font-size: 10px;
			color: #71717a;
			font-weight: 500;
		}
		.os-badge {
			text-align: right;
		}
		.os-number {
			font-size: 20px;
			font-weight: 900;
			color: #09090b;
			font-family: monospace;
		}
		.section-title {
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			background: #f4f4f5;
			padding: 4px 8px;
			border-left: 3px solid #18181b;
			margin-top: 10px;
			margin-bottom: 6px;
		}
		.grid-2 {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}
		.grid-3 {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			gap: 8px;
		}
		.grid-4 {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 8px;
		}
		.field-group {
			margin-bottom: 4px;
		}
		.field-label {
			font-size: 9px;
			text-transform: uppercase;
			color: #71717a;
			font-weight: 700;
			display: block;
		}
		.field-value {
			font-size: 11px;
			font-weight: 600;
			color: #09090b;
		}
		table.diopters {
			width: 100%;
			border-collapse: collapse;
			margin: 6px 0 10px 0;
			font-size: 11px;
		}
		table.diopters th, table.diopters td {
			border: 1px solid #e4e4e7;
			padding: 5px 6px;
			text-align: center;
		}
		table.diopters th {
			background: #f4f4f5;
			font-weight: 700;
			font-size: 10px;
			color: #52525b;
		}
		table.diopters td.eye-header {
			font-weight: 800;
			background: #fafafa;
			text-align: left;
			padding-left: 8px;
		}
		.financial-box {
			background: #fafafa;
			border: 1px solid #e4e4e7;
			border-radius: 6px;
			padding: 8px 12px;
			margin-top: 8px;
		}
		.financial-row {
			display: flex;
			justify-content: space-between;
			padding: 2px 0;
		}
		.financial-total {
			font-size: 14px;
			font-weight: 800;
			border-top: 1px dashed #d4d4d8;
			padding-top: 4px;
			margin-top: 4px;
		}
		.residual-alert {
			color: #dc2626;
			font-weight: 700;
		}
		.signatures {
			margin-top: 24px;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 32px;
			text-align: center;
		}
		.sig-line {
			border-top: 1px solid #71717a;
			margin-top: 36px;
			padding-top: 4px;
			font-size: 10px;
			font-weight: 600;
		}
		.terms {
			font-size: 8.5px;
			color: #71717a;
			margin-top: 14px;
			text-align: justify;
			border-top: 1px solid #e4e4e7;
			padding-top: 6px;
		}
	</style>
</head>
<body>
	<div class="header">
		<div>
			<div class="brand-title">MNOC-X · Ficha de Ordem de Serviço</div>
			<div class="brand-sub">${order.store?.name || "Óptica Central"} · Emissão: ${formattedDate}</div>
		</div>
		<div class="os-badge">
			<div class="os-number">${order.orderNumber}</div>
			<div class="brand-sub">Promessa: ${deliveryPromise} · Status: ${order.status}</div>
		</div>
	</div>

	<!-- PACIENTE E ATENDIMENTO -->
	<div class="section-title">1. Identificação do Paciente & Atendimento</div>
	<div class="grid-3">
		<div class="field-group">
			<span class="field-label">Paciente</span>
			<span class="field-value">${order.patient?.name || "Cliente"}</span>
		</div>
		<div class="field-group">
			<span class="field-label">CPF</span>
			<span class="field-value">${order.patient?.cpf || "—"}</span>
		</div>
		<div class="field-group">
			<span class="field-label">WhatsApp / Telefone</span>
			<span class="field-value">${order.patient?.whatsapp || order.patient?.secondaryPhone || "—"}</span>
		</div>
	</div>
	<div class="grid-3" style="margin-top: 4px;">
		<div class="field-group">
			<span class="field-label">Endereço</span>
			<span class="field-value">${order.patient?.street || ""}, ${order.patient?.number || ""} ${order.patient?.neighborhood ? "— " + order.patient.neighborhood : ""}</span>
		</div>
		<div class="field-group">
			<span class="field-label">Cidade/UF / CEP</span>
			<span class="field-value">${order.patient?.city || ""}/${order.patient?.state || ""} ${order.patient?.cep ? "— " + order.patient.cep : ""}</span>
		</div>
		<div class="field-group">
			<span class="field-label">Vendedor(a) Responsável</span>
			<span class="field-value">${order.seller?.name || "Atendente"}</span>
		</div>
	</div>

	<!-- MÉDICO E CAPTADOR -->
	<div class="grid-2" style="margin-top: 6px;">
		<div class="field-group">
			<span class="field-label">Médico Oftalmologista Prescritor</span>
			<span class="field-value">${order.doctor?.name || "Não informado"} ${order.doctor?.crm ? "(" + order.doctor.crm + ")" : ""}</span>
		</div>
		<div class="field-group">
			<span class="field-label">Captador / Indicação Parceira</span>
			<span class="field-value">${order.captador?.name ? order.captador.name + " (" + (order.captador.commissionType === "PERCENTUAL" ? order.captador.commissionValue + "%" : "R$ " + order.captador.commissionValue) + ")" : "Venda Direta de Balcão"}</span>
		</div>
	</div>

	<!-- DIOPTRIAS CLÍNICAS ARO 1 -->
	<div class="section-title">2. Prescrição Óptica & Dioptrias Clínicas (Aro 1)</div>
	<table class="diopters">
		<thead>
			<tr>
				<th style="width: 15%;">Olho</th>
				<th style="width: 17%;">Esférico</th>
				<th style="width: 17%;">Cilíndrico</th>
				<th style="width: 17%;">Eixo (°)</th>
				<th style="width: 17%;">DNP (mm)</th>
				<th style="width: 17%;">Altura (mm)</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="eye-header">OD (Direito)</td>
				<td>${aro1?.diopters?.od?.esf || "0.00"}</td>
				<td>${aro1?.diopters?.od?.cil || "0.00"}</td>
				<td>${aro1?.diopters?.od?.eixo ? aro1.diopters.od.eixo + "°" : "—"}</td>
				<td>${aro1?.diopters?.od?.dnp || "—"}</td>
				<td>${aro1?.diopters?.od?.alt || "—"}</td>
			</tr>
			<tr>
				<td class="eye-header">OE (Esquerdo)</td>
				<td>${aro1?.diopters?.oe?.esf || "0.00"}</td>
				<td>${aro1?.diopters?.oe?.cil || "0.00"}</td>
				<td>${aro1?.diopters?.oe?.eixo ? aro1.diopters.oe.eixo + "°" : "—"}</td>
				<td>${aro1?.diopters?.oe?.dnp || "—"}</td>
				<td>${aro1?.diopters?.oe?.alt || "—"}</td>
			</tr>
		</tbody>
	</table>
	<div style="font-size: 11px; margin-bottom: 8px;">
		<strong>Adição Presbiopia:</strong> ${aro1?.diopters?.adicao ? "+" + aro1.diopters.adicao : "Não aplicável (Visão Simples)"}
	</div>

	<!-- ARO 1 ESPECIFICAÇÕES -->
	<div class="section-title">3. Especificações Técnicas de Laboratório (Aro 1)</div>
	<div class="grid-4">
		<div class="field-group">
			<span class="field-label">Armação / Peça</span>
			<span class="field-value">${aro1?.frameBrand || "Armação"} ${aro1?.frameModel || ""}</span>
		</div>
		<div class="field-group">
			<span class="field-label">Cód. Peça / Tam.</span>
			<span class="field-value">${aro1?.frameCode ? `<strong>[${aro1.frameCode}]</strong>` : "—"} (Aro ${aro1?.frameAro || "—"}/Ponte ${aro1?.framePonte || "—"})</span>
		</div>
		<div class="field-group">
			<span class="field-label">Lente / Laboratório</span>
			<span class="field-value">${aro1?.lensCode ? `[${aro1.lensCode}] ` : ""}${aro1?.lensName || "—"} (${aro1?.lab || "—"})</span>
		</div>
		<div class="field-group">
			<span class="field-label">Tratamento</span>
			<span class="field-value">${aro1?.treatmentCode ? `[${aro1.treatmentCode}] ` : ""}${aro1?.noTreatment ? "Sem Tratamento" : aro1?.treatment || "Padrão"}</span>
		</div>
	</div>

	${hasAro2 ? `
	<!-- ARO 2 ESPECIFICAÇÕES -->
	<div class="section-title">4. Segundo Par / Aro 2 (${order.orderNumber}-B)</div>
	<div class="grid-4">
		<div class="field-group">
			<span class="field-label">Armação Aro 2</span>
			<span class="field-value">${aro2?.frameBrand || "Armação"} ${aro2?.frameModel || ""}</span>
		</div>
		<div class="field-group">
			<span class="field-label">Cód. Peça Aro 2</span>
			<span class="field-value">${aro2?.frameCode ? `<strong>[${aro2.frameCode}]</strong>` : "—"} (Aro ${aro2?.frameAro || "—"}/Ponte ${aro2?.framePonte || "—"})</span>
		</div>
		<div class="field-group">
			<span class="field-label">Lente Aro 2</span>
			<span class="field-value">${aro2?.lensCode ? `[${aro2.lensCode}] ` : ""}${aro2?.lensName || "—"} (${aro2?.lab || "—"})</span>
		</div>
		<div class="field-group">
			<span class="field-label">Tratamento Aro 2</span>
			<span class="field-value">${aro2?.treatmentCode ? `[${aro2.treatmentCode}] ` : ""}${aro2?.noTreatment ? "Sem Tratamento" : aro2?.treatment || "Padrão"}</span>
		</div>
	</div>
	<div style="font-size: 10px; color: #52525b; margin-top: 4px;">
		* Medidas de Centro Óptico Aro 2: DNP OD: ${aro2?.diopters?.od?.dnp || aro1?.diopters?.od?.dnp || "—"}mm | Alt OD: ${aro2?.diopters?.od?.alt || aro1?.diopters?.od?.alt || "—"}mm · DNP OE: ${aro2?.diopters?.oe?.dnp || aro1?.diopters?.oe?.dnp || "—"}mm | Alt OE: ${aro2?.diopters?.oe?.alt || aro1?.diopters?.oe?.alt || "—"}mm
	</div>
	` : ""}

	<!-- FECHAMENTO FINANCEIRO -->
	<div class="section-title">${hasAro2 ? "5" : "4"}. Resumo Financeiro & Forma de Pagamento</div>
	<div class="financial-box">
		<div class="financial-row">
			<span>Valor Total dos Produtos / Serviços:</span>
			<span>R$ ${totalAmount.toFixed(2)}</span>
		</div>
		<div class="financial-row">
			<span>Valor Pago no Ato (Sinal / Entrada):</span>
			<span style="color: #16a34a; font-weight: 700;">R$ ${paidAmount.toFixed(2)}</span>
		</div>
		${residualAmount > 0 ? `
		<div class="financial-row residual-alert">
			<span>Saldo Residual a Pagar na Retirada:</span>
			<span>R$ ${residualAmount.toFixed(2)}</span>
		</div>
		` : `
		<div class="financial-row" style="color: #16a34a; font-weight: 700;">
			<span>Status Financeiro:</span>
			<span>100% QUITADO NO ATO</span>
		</div>
		`}
		<div class="financial-row financial-total">
			<span>Forma de Pagamento:</span>
			<span>${order.financials?.paymentMethod1 || "Não especificado"}</span>
		</div>
	</div>

	<div class="signatures">
		<div>
			<div class="sig-line">Assinatura do Paciente / Responsável</div>
		</div>
		<div>
			<div class="sig-line">Responsável Técnico / Óptica</div>
		</div>
	</div>

	<div class="terms">
		Declaro para os devidos fins que conferi os dados da receita e especificações desta Ordem de Serviço. A confecção das lentes obedece rigorosamente aos parâmetros médicos e às tolerâncias técnicas da ABNT NBR ISO 21987. A retirada do produto está condicionada à quitação de eventuais saldos residuais pendentes. Garantia de adaptação conforme código de defesa do consumidor.
	</div>

	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>`;
}

export function printOpticalOrder(order: OpticalOrder, options: PrintOrderOptions = {}) {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		alert("A janela de impressão foi bloqueada pelo navegador. Permita popups para imprimir a OS.");
		return;
	}

	const html = generateOrderPrintHtml(order, options);
	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
}
