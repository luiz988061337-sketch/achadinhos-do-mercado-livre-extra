import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "AchadinhosBR | Ofertas e produtos",
  description: "Ofertas e produtos selecionados do Mercado Livre."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><Header /><main>{children}</main><Footer /></body></html>;
}