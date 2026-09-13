import { OpticalAuthProvider } from "@/lib/optical/optical-auth-context";
import { OpticalStandaloneContainer } from "./optical-standalone-container";

export const metadata = {
	title: "Balcão Óptico & Ordens de Serviço | Comp AI CRM",
	description: "Módulo de vendas rápidas de armações, lentes oftálmicas e gestão de ordens de serviço.",
};

export default function StandaloneOpticalPage() {
	return (
		<OpticalAuthProvider>
			<OpticalStandaloneContainer />
		</OpticalAuthProvider>
	);
}
