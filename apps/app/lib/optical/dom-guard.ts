/**
 * Proteção global contra exceções de remoção e inserção de nós no DOM
 * causadas por extensões de navegador (Google Translate, Grammarly, autofill, etc.)
 * ou desencaixes transitórios de nós em Portals do Radix UI / React.
 *
 * Previne o erro fatal:
 * "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 */
if (typeof window !== "undefined") {
	const originalRemoveChild = Node.prototype.removeChild;
	Node.prototype.removeChild = function <T extends Node>(child: T): T {
		if (child && child.parentNode !== this) {
			if (typeof console !== "undefined" && console.warn) {
				console.warn(
					"DOM Shield: Nó filho não pertence a este pai na remoção (preveniu queda do React).",
					child,
					this,
				);
			}
			return child;
		}
		return originalRemoveChild.apply(this, arguments as any) as T;
	};

	const originalInsertBefore = Node.prototype.insertBefore;
	Node.prototype.insertBefore = function <T extends Node>(
		newNode: T,
		referenceNode: Node | null,
	): T {
		if (referenceNode && referenceNode.parentNode !== this) {
			if (typeof console !== "undefined" && console.warn) {
				console.warn(
					"DOM Shield: Nó de referência não pertence a este pai na inserção (preveniu queda do React).",
					newNode,
					referenceNode,
					this,
				);
			}
			return newNode;
		}
		return originalInsertBefore.apply(this, arguments as any) as T;
	};
}

export function initDomProtection() {
	// Apenas para importação estática garantir execução imediata
}
