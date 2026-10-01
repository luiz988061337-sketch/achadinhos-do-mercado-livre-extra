import type { Metadata, Viewport } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidCookie from "@/components/SidCookie";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://achadinhos-nine.vercel.app"),
  title: "AchadinhosBR 🔥 Ofertas do Mercado Livre que valem a pena",
  description: "Garimpamos as melhores ofertas e descontos reais do Mercado Livre. Aproveite antes que o preço mude!",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "AchadinhosBR 🔥 Ofertas que valem a pena",
    description: "Ofertas e descontos reais do Mercado Livre, garimpados todos os dias.",
    type: "website",
    locale: "pt_BR"
  }
};

export const viewport: Viewport = {
  themeColor: "#111111"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a><SidCookie /><Header /><main id="conteudo">{children}</main><Footer /></body></html>;
}
