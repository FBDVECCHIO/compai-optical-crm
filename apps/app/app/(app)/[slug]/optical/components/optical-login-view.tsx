"use client";

import { useState } from "react";
import View from "@carbon/icons-react/es/View";
import ViewOff from "@carbon/icons-react/es/ViewOff";
import Locked from "@carbon/icons-react/es/Locked";
import User from "@carbon/icons-react/es/User";
import { GlassesIcon } from "@crm/ui/components/icons/glasses";
import { Button } from "@crm/ui/components/button";
import { Icon } from "@crm/ui/components/icon";
import { Input } from "@crm/ui/components/input";
import { toast } from "sonner";
import { useOpticalAuth } from "@/lib/optical/optical-auth-context";
import { OpticalThemeToggle } from "./optical-theme-toggle";

export function OpticalLoginView() {
	const { login } = useOpticalAuth();
	const [usuario, setUsuario] = useState("");
	const [senha, setSenha] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!usuario.trim()) {
			setErrorMessage("Informe o usuário de acesso.");
			return;
		}
		if (!senha) {
			setErrorMessage("Informe a senha.");
			return;
		}

		setLoading(true);
		setErrorMessage("");

		try {
			const res = await login(usuario.trim(), senha);
			if (res.success) {
				toast.success(`Bem-vindo ao sistema! Login efetuado com sucesso.`);
			} else {
				setErrorMessage(res.error || "Usuário ou senha incorretos.");
				toast.error(res.error || "Falha na autenticação.");
			}
		} catch {
			setErrorMessage("Erro ao conectar com o servidor. Tente novamente.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
			{/* Botão de Tema Light / Dark no canto superior */}
			<div className="absolute top-4 right-4 z-20 flex items-center gap-2">
				<OpticalThemeToggle showLabel />
			</div>

			<div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-xl">
				{/* Brand & Title */}
				<div className="flex flex-col items-center text-center">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-4">
						<GlassesIcon className="size-8" />
					</div>
					<h2 className="text-2xl font-bold tracking-tight text-foreground">
						Comp AI Óptica
					</h2>
					<p className="mt-1 text-xs text-muted-foreground max-w-xs">
						Sistema Integrado de Balcão, Ordens de Serviço, Conferência de Laboratório e Gestão
					</p>
				</div>

				{/* Error Alert Box */}
				{errorMessage && (
					<div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
						{errorMessage}
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="login-usuario"
							className="block text-xs font-semibold text-foreground mb-1.5"
						>
							Usuário de Acesso
						</label>
						<div className="relative">
							<Icon
								icon={User}
								className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
							/>
							<Input
								id="login-usuario"
								type="text"
								value={usuario}
								onChange={(e) => {
									setUsuario(e.target.value);
									if (errorMessage) setErrorMessage("");
								}}
								placeholder="Ex: admin, Fabiano, Thelma..."
								autoFocus
								required
								disabled={loading}
								className="h-10 pl-9 text-xs font-medium"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="login-senha"
							className="block text-xs font-semibold text-foreground mb-1.5"
						>
							Senha
						</label>
						<div className="relative">
							<Icon
								icon={Locked}
								className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
							/>
							<Input
								id="login-senha"
								type={showPassword ? "text" : "password"}
								value={senha}
								onChange={(e) => {
									setSenha(e.target.value);
									if (errorMessage) setErrorMessage("");
								}}
								placeholder="Digite sua senha..."
								required
								disabled={loading}
								className="h-10 pl-9 pr-10 text-xs font-medium"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
								title={showPassword ? "Ocultar senha" : "Ver senha"}
							>
								<Icon icon={showPassword ? ViewOff : View} className="size-4" />
							</button>
						</div>
					</div>

					<Button
						type="submit"
						disabled={loading}
						className="w-full h-10 text-xs font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 mt-2 cursor-pointer"
					>
						{loading ? "Verificando credenciais..." : "Entrar no Sistema Óptico"}
					</Button>
				</form>

				{/* Security badge & hints */}
				<div className="pt-4 border-t text-center">
					<div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="size-2 rounded-full bg-emerald-500" />
						<span>Autenticação em tempo real via Supabase</span>
					</div>
					<p className="text-[10px] text-muted-foreground/70 mt-1">
						Acesso restrito a operadores e lojas homologadas.
					</p>
				</div>
			</div>
		</div>
	);
}
