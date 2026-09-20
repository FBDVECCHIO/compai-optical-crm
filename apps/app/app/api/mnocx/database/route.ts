import { type NextRequest, NextResponse } from "next/server";
import { appLentesShield } from "@/lib/optical/app-lentes-shield";

// Armazenamento em memória no servidor Next.js para persistência de sessão e testes
const serverStorage = new Map<string, any[]>();

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const collection = searchParams.get("collection") || "orders";

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
	return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { collection = "orders", payload } = body;

		if (!payload) {
			return NextResponse.json({ error: "Missing payload" }, { status: 400 });
		}

		const current = serverStorage.get(collection) || [];
		const updated = [payload, ...current.filter((item) => item.id !== payload.id)];
		serverStorage.set(collection, updated);

		return NextResponse.json({ success: true, count: updated.length });
	} catch (error) {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const collection = searchParams.get("collection") || "orders";
	const authKey = request.headers.get("x-manager-password");

	if (authKey !== "120212") {
		return NextResponse.json(
			{ error: "Acesso não autorizado. Senha gerencial necessária." },
			{ status: 401 },
		);
	}

	serverStorage.set(collection, []);
	return NextResponse.json({
		success: true,
		message: `Coleção ${collection} zerada com sucesso no banco dedicado MNOC-X.`,
	});
}
