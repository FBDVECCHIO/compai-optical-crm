"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import {
	authenticateOpticalUser,
	type OpticalUserSession,
} from "./supabase-optical";
import type { OpticalModuleTab } from "@/app/(app)/[slug]/optical/components/optical-top-nav";

const STORAGE_KEY = "compai_optical_user_session";

interface OpticalAuthContextType {
	session: OpticalUserSession | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (usuario: string, senha: string) => Promise<{ success: boolean; error?: string }>;
	logout: () => void;
	hasPermission: (tab: OpticalModuleTab) => boolean;
}

const OpticalAuthContext = createContext<OpticalAuthContextType | null>(null);

export function OpticalAuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<OpticalUserSession | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed: OpticalUserSession = JSON.parse(saved);
				if (parsed && parsed.usuario) {
					setSession(parsed);
				}
			}
		} catch (e) {
			console.warn("Erro ao restaurar sessão óptica:", e);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const login = useCallback(async (usuario: string, senha: string) => {
		const result = await authenticateOpticalUser(usuario, senha);
		if (result.success && result.session) {
			setSession(result.session);
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(result.session));
			} catch (e) {
				console.warn("Erro ao persistir sessão óptica:", e);
			}
			return { success: true };
		}
		return { success: false, error: result.error || "Credenciais inválidas." };
	}, []);

	const logout = useCallback(() => {
		setSession(null);
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (e) {
			console.warn("Erro ao remover sessão óptica:", e);
		}
	}, []);

	const hasPermission = useCallback(
		(tab: OpticalModuleTab): boolean => {
			if (!session) return false;
			if (session.isAdmin) return true;

			switch (tab) {
				case "balcao":
					return session.permissions.balcao;
				case "conferencia":
					return session.permissions.conferencia;
				case "log_vendas":
					return session.permissions.log_vendas;
				case "resumo":
					return session.permissions.resumo;
				case "medicos":
					return session.permissions.medicos;
				case "garantias":
					return session.permissions.garantias;
				case "auditoria":
					return session.permissions.auditoria;
				case "catalogo":
					return session.permissions.catalogo;
				case "config":
					return session.permissions.config;
				default:
					return false;
			}
		},
		[session],
	);

	return (
		<OpticalAuthContext.Provider
			value={{
				session,
				isAuthenticated: Boolean(session),
				isLoading,
				login,
				logout,
				hasPermission,
			}}
		>
			{children}
		</OpticalAuthContext.Provider>
	);
}

export function useOpticalAuth() {
	const context = useContext(OpticalAuthContext);
	if (!context) {
		throw new Error("useOpticalAuth deve ser usado dentro de OpticalAuthProvider");
	}
	return context;
}
