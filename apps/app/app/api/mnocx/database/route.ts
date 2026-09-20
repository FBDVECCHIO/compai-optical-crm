import { type NextRequest, NextResponse } from "next/server";
import { appLentesShield } from "@/lib/optical/app-lentes-shield";

// Armazenamento em memória no servidor Next.js para persistência de sessão e testes de API
const serverStorage = new Map<string, any[]>();

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const collection = searchParams.get("collection") || "orders";
	const id = searchParams.get("id");

	if (collection === "status") {
		return NextResponse.json({
			status: "ONLINE",
			dedicatedDatabase: "MNOC-X CRM",
			legacyAppLentesProtected: true,
			timestamp: new Date().toISOString(),
			audit: appLentesShield.getAuditReport(),
		});
	}

	const items = serverStorage.get(collection) || [];
	if (id) {
		const item = items.find((it) => it.id === id || it.orderNumber === id);
		if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
		return NextResponse.json(item);
	}

	return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { collection = "orders", payload, items } = body;

		if (Array.isArray(items)) {
			serverStorage.set(collection, items);
			return NextResponse.json({ success: true, count: items.length });
		}

		if (!payload) {
			return NextResponse.json({ error: "Missing payload" }, { status: 400 });
		}

		const current = serverStorage.get(collection) || [];
		const payloadId = payload.id || payload.orderNumber;
		const updated = [
			payload,
			...current.filter((item) => (item.id || item.orderNumber) !== payloadId),
		];
		serverStorage.set(collection, updated);

		return NextResponse.json({ success: true, count: updated.length });
	} catch (error) {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const collection = searchParams.get("collection") || "orders";
	const id = searchParams.get("id");
	const authKey = request.headers.get("x-manager-password");

	// Se for exclusão de um item específico por ID
	if (id) {
		const current = serverStorage.get(collection) || [];
		const updated = current.filter((item) => (item.id || item.orderNumber) !== id);
		serverStorage.set(collection, updated);
		return NextResponse.json({
			success: true,
			message: `Item ${id} removido da coleção ${collection}.`,
			remainingCount: updated.length,
		});
	}

	// Se for zerar a coleção inteira, exige senha gerencial
	if (authKey !== "120212") {
		return NextResponse.json(
			{ error: "Acesso não autorizado. Senha gerencial necessária para zeramento em lote." },
			{ status: 401 },
		);
	}

	serverStorage.set(collection, []);
	return NextResponse.json({
		success: true,
		message: `Coleção ${collection} zerada com sucesso no banco dedicado MNOC-X.`,
	});
}
