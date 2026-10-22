import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, JetBrains_Mono, Public_Sans } from "next/font/google";
import { SideNav } from "@/components/side-nav";
import "./globals.css";

const display = Barlow_Semi_Condensed({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});
const body = Public_Sans({ variable: "--font-body", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Painel PEE",
  description: "CRM para projetos do Programa de Eficiência Energética",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="app">
          <aside className="side">
            <div className="brand">
              <b>Painel PEE</b>
              <span>CRM da ESCO</span>
            </div>
            <SideNav />
            <div className="foot">Versão de teste</div>
          </aside>
          <main className="main">
            <div className="wrap">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
