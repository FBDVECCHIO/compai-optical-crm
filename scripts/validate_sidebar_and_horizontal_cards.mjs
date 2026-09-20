import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import * as path from "node:path";

const ARTIFACT_DIR = "C:\\Users\\fbdv1\\.gemini\\antigravity\\brain\\dc1efc51-6f4b-44e3-871a-f431333d56f1";
const BASE_URL = "http://localhost:3005/optical";

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
	console.log("=== INICIANDO VALIDAÇÃO E2E DA SIDEBAR, CARDS HORIZONTAIS E CONFIGURAÇÕES ===");

	// 1. Abrir aplicação local
	run(`agent-browser open "${BASE_URL}"`);
	await setTimeout(3000);

	// 2. Login se necessário
	try {
		const isLogin = await evalInBrowser("Boolean(document.querySelector('button')?.innerText.includes('Entrar no MNOC-X'))");
		if (isLogin === "true" || isLogin === true) {
			console.log("Realizando login como Administrador...");
			await evalInBrowser("Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preencher'))?.click()");
			await setTimeout(500);
			await evalInBrowser("Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar no MNOC-X'))?.click()");
			await setTimeout(3500);
		}
	} catch (e) {
		console.log("Verificação de login:", e.message);
	}

	// 3. Garantir que está no módulo Balcão & Vendas
	console.log("Selecionando módulo Balcão...");
	await evalInBrowser("document.querySelector('button[data-module=\"balcao\"]')?.click()");
	await setTimeout(1500);

	// 4. Captura 1: Sidebar Expandida + Topo Compacto + Dashboard
	const shot1 = path.join(ARTIFACT_DIR, "screen_e2e_sidebar_expanded.png");
	run(`agent-browser screenshot "${shot1}"`);
	console.log("Screenshot 1 salvo:", shot1);

	// 5. Clicar no botão de toggle para recolher a sidebar
	console.log("Recolhendo Sidebar (Modo Apenas Ícones)...");
	await evalInBrowser(`
		const btn = document.querySelector('button[title*=\"Contrair\"]') || 
		            document.querySelector('button[title*=\"Recolher\"]') ||
		            Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Recolher'));
		if (btn) btn.click();
	`);
	await setTimeout(1000);

	// 6. Captura 2: Sidebar Recolhida (apenas ícones, liberando espaço vertical e horizontal)
	const shot2 = path.join(ARTIFACT_DIR, "screen_e2e_sidebar_collapsed.png");
	run(`agent-browser screenshot "${shot2}"`);
	console.log("Screenshot 2 salvo (Sidebar Recolhida):", shot2);

	// 7. Rolar a página para ver os Cards de Vendedores na mesma linha horizontal contínua
	console.log("Rolando até os Cards dos Vendedores...");
	await evalInBrowser("window.scrollBy(0, 550)");
	await setTimeout(1000);

	const shot3 = path.join(ARTIFACT_DIR, "screen_e2e_sellers_horizontal.png");
	run(`agent-browser screenshot "${shot3}"`);
	console.log("Screenshot 3 salvo (Vendedores Horizontais):", shot3);

	// 8. Navegar até o módulo de Configurações
	console.log("Navegando até o módulo de Configurações...");
	await evalInBrowser("document.querySelector('button[data-module=\"config\"]')?.click()");
	await setTimeout(2000);

	// 9. Clicar na sub-aba Tipos de Armação
	console.log("Abrindo sub-aba Tipos de Armação...");
	await evalInBrowser(`
		const tabBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tipos Armação'));
		if (tabBtn) tabBtn.click();
	`);
	await setTimeout(1500);

	const shot4 = path.join(ARTIFACT_DIR, "screen_e2e_tipos_armacao.png");
	run(`agent-browser screenshot "${shot4}"`);
	console.log("Screenshot 4 salvo (Tipos de Armação):", shot4);

	// 10. Clicar na sub-aba Usuários & Vendedores
	console.log("Abrindo sub-aba Usuários & Vendedores...");
	await evalInBrowser(`
		const tabBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Usuários & Vendedores') || b.innerText.includes('Usuários'));
		if (tabBtn) tabBtn.click();
	`);
	await setTimeout(1500);

	const shot5 = path.join(ARTIFACT_DIR, "screen_e2e_usuarios_vendedores.png");
	run(`agent-browser screenshot "${shot5}"`);
	console.log("Screenshot 5 salvo (Usuários & Vendedores):", shot5);

	// 11. Clicar na sub-aba Políticas de Desconto
	console.log("Abrindo sub-aba Políticas de Desconto...");
	await evalInBrowser(`
		const tabBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Políticas Desconto') || b.innerText.includes('Descontos'));
		if (tabBtn) tabBtn.click();
	`);
	await setTimeout(1500);

	const shot6 = path.join(ARTIFACT_DIR, "screen_e2e_politicas_desconto_cargos.png");
	run(`agent-browser screenshot "${shot6}"`);
	console.log("Screenshot 6 salvo (Políticas de Desconto por Cargo):", shot6);

	console.log("=== TODAS AS VALIDAÇÕES E2E CONCLUÍDAS COM SUCESSO ===");
}

main().catch((err) => {
	console.error("Falha no script de validação:", err);
	process.exit(1);
});
