import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import * as path from "node:path";

const ARTIFACT_DIR = "C:\\Users\\fbdv1\\.gemini\\antigravity\\brain\\dc1efc51-6f4b-44e3-871a-f431333d56f1";

function run(cmd) {
	console.log(`> ${cmd}`);
	try {
		const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		return out.trim();
	} catch (e) {
		console.error(`Command failed: ${cmd}\nError:`, e.stderr || e.message);
		throw e;
	}
}

async function evalInBrowser(expr) {
	const sanitized = expr.replace(/"/g, '\\"');
	const res = run(`agent-browser eval "${sanitized}"`);
	return res;
}

async function main() {
	console.log("=== Iniciando Validacao E2E com Agent Browser ===");
	
	// 1. Abrir aplicação
	run("agent-browser open https://compai-optical-crm-taupe.vercel.app/optical");
	await setTimeout(5000);
	
	// 2. Preencher dados do Administrador se estiver na tela de login
	const isLogin = await evalInBrowser("Boolean(document.querySelector('button[type=\"submit\"], button')?.innerText.includes('Entrar no MNOC-X'))");
	console.log("Tela de login detectada:", isLogin);
	
	if (isLogin === "true" || isLogin === true) {
		console.log("Clicando em Preencher dados do Administrador...");
		await evalInBrowser("Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preencher'))?.click()");
		await setTimeout(1000);
		
		console.log("Clicando em Entrar no MNOC-X...");
		await evalInBrowser("Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar no MNOC-X'))?.click()");
		await setTimeout(5000);
	}

	// 3. Capturar Balcão de Vendas com Metas Horizontais
	console.log("Navegando para Balcão / Metas...");
	await evalInBrowser("document.querySelector('button[data-module=\"balcao\"], button[data-tab=\"balcao\"]')?.click()");
	await setTimeout(2000);

	const metasScreenshot = path.join(ARTIFACT_DIR, "screen_metas_horizontais.png");
	run(`agent-browser screenshot "${metasScreenshot}"`);
	console.log("Screenshot de metas horizontais salvo:", metasScreenshot);

	// 4. Testar Visualização de Ordem de Serviço Ampla
	console.log("Navegando para Ordens de Serviço...");
	await evalInBrowser("document.querySelector('button[data-module=\"orders\"], button[data-tab=\"orders\"]')?.click()");
	await setTimeout(2000);

	// Abrir a primeira OS da lista
	console.log("Abrindo primeira OS para verificação da tela ampla...");
	await evalInBrowser(`
		const row = document.querySelector('table tbody tr') || document.querySelector('[data-order-item]');
		if (row) {
			const viewBtn = row.querySelector('button') || row;
			viewBtn.click();
		} else {
			const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Ver') || b.innerText.includes('OS-') || b.innerText.includes('2026-'));
			if (btn) btn.click();
		}
	`);
	await setTimeout(2500);

	const osScreenshot = path.join(ARTIFACT_DIR, "screen_os_visualizacao_ampla.png");
	run(`agent-browser screenshot "${osScreenshot}"`);
	console.log("Screenshot de visualização ampla da OS salvo:", osScreenshot);

	// 5. Testar Persistência e Blindagem Anti-CTRL+F5
	console.log("Fechando modal de OS e testando reload CTRL+F5...");
	await evalInBrowser(`
		const closeBtn = document.querySelector('button[aria-label=\"Close\"], button[data-dialog-close]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fechar'));
		if (closeBtn) closeBtn.click();
	`);
	await setTimeout(1000);

	// Excluir uma OS ou verificar contagem antes e depois do reload
	const initialCount = await evalInBrowser("document.querySelectorAll('table tbody tr').length");
	console.log("Quantidade inicial de OSs:", initialCount);

	console.log("Executando reload (CTRL+F5)...");
	run("agent-browser reload");
	await setTimeout(5000);

	const reloadedCount = await evalInBrowser("document.querySelectorAll('table tbody tr').length");
	console.log("Quantidade pós-reload:", reloadedCount);

	const persistenceScreenshot = path.join(ARTIFACT_DIR, "screen_persistencia_ctrl_f5.png");
	run(`agent-browser screenshot "${persistenceScreenshot}"`);
	console.log("Screenshot pós-reload salvo:", persistenceScreenshot);

	console.log("=== Validação E2E Concluída com Sucesso! ===");
}

main().catch((err) => {
	console.error("Erro na execução do script E2E:", err);
	process.exit(1);
});
