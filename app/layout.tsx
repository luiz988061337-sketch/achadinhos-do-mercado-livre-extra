import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "AchadinhosBR 🔥 Ofertas do Mercado Livre que valem a pena",
  description: "Garimpamos as melhores ofertas e descontos reais do Mercado Livre. Aproveite antes que o preço mude!"
};

export const viewport: Viewport = {
  themeColor: "#111111"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo">{children}</main><Footer /></body></html>;
}
