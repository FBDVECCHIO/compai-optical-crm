import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

function run(cmd) {
	console.log(`> ${cmd}`);
	return execSync(cmd, { encoding: "utf8" });
}

async function main() {
	console.log("Iniciando validacao com agent-browser...");
	run("agent-browser open https://compai-optical-crm-taupe.vercel.app/optical");
	await setTimeout(4000);

	// Clica em Preencher dados do Administrador
	run(`agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preencher'))?.click()"`);
	await setTimeout(1000);

	// Clica em Entrar no MNOC-X
	run(`agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar no MNOC-X'))?.click()"`);
	await setTimeout(4000);

	// Salva screenshot do Dashboard
	run(`agent-browser screenshot "C:\\Users\\fbdv1\\.gemini\\antigravity\\brain\\dc1efc51-6f4b-44e3-871a-f431333d56f1\\screen_live_isolated_dashboard.png"`);

	// Clica no modulo Configurações
	run(`agent-browser eval "document.querySelector('button[data-module=\\"config\\"]')?.click()"`);
	await setTimeout(2000);

	// Clica na subaba integridade
	run(`agent-browser eval "document.querySelector('button[data-subtab=\\"integridade\\"]')?.click()"`);
	await setTimeout(2000);

	// Salva screenshot do Painel de Integridade e Banco Dedicado
	run(`agent-browser screenshot "C:\\Users\\fbdv1\\.gemini\\antigravity\\brain\\dc1efc51-6f4b-44e3-871a-f431333d56f1\\screen_live_isolated_integridade.png"`);

	// Clica em Auditar Blindagem
	run(`agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Auditar Blindagem'))?.click()"`);
	await setTimeout(1500);

	// Salva screenshot do Modal de Auditoria de Blindagem do App Lentes
	run(`agent-browser screenshot "C:\\Users\\fbdv1\\.gemini\\antigravity\\brain\\dc1efc51-6f4b-44e3-871a-f431333d56f1\\screen_live_isolation_modal.png"`);

	// Fecha o modal
	run(`agent-browser eval "Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entendido'))?.click()"`);
	await setTimeout(1000);

	console.log("Validacao concluida com sucesso!");
}

main().catch((err) => {
	console.error("Erro na execucao:", err);
	process.exit(1);
});
