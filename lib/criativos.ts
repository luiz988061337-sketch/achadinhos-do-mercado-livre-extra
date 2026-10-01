import type { Produto } from "@/lib/types";
import { brl } from "@/components/ProductCard";

// Gerador de criativos 100% local (canvas, sem API externa/paga).
// Usa SOMENTE dados reais do cadastro: nome, imagem, preço, preço antigo
// (se maior que o atual), desconto (calculado, nunca inventado), categoria.
// Arquitetura preparada para novos formatos (stories/pinterest/vídeo).

export const FORMATOS = [
  { id: "feed", rotulo: "Feed Instagram/Facebook (1080×1080)", w: 1080, h: 1080 },
  { id: "stories", rotulo: "Stories/Reels (1080×1920)", w: 1080, h: 1920 },
  { id: "whatsapp", rotulo: "WhatsApp (1080×1080)", w: 1080, h: 1080 },
  { id: "pinterest", rotulo: "Pinterest (1000×1500)", w: 1000, h: 1500 }
] as const;

export type FormatoId = (typeof FORMATOS)[number]["id"];

export const MODELOS = [
  { id: "A", nome: "Vitrine", desc: "Produto grande + preço + CTA" },
  { id: "B", nome: "Desconto", desc: "Produto + desconto + chamada curta" },
  { id: "C", nome: "Achadinho do dia", desc: "Estilo achadinho do dia" }
] as const;

export type ModeloId = (typeof MODELOS)[number]["id"];

export function formatoPorId(id: string) {
  return FORMATOS.find((f) => f.id === id) ?? FORMATOS[0];
}

// Valida se dá para gerar a arte. Impede e informa o problema exato.
export function validarParaArte(produto: Pick<Produto, "nome" | "imagem" | "preco">): string[] {
  const problemas: string[] = [];
  if (!produto.nome?.trim()) problemas.push("sem nome cadastrado");
  if (!produto.imagem?.trim()) {
    problemas.push("sem imagem cadastrada");
  } else {
    try {
      const u = new URL(produto.imagem);
      if (u.protocol !== "https:") problemas.push("imagem precisa ser https://");
    } catch {
      problemas.push("URL da imagem inválida");
    }
  }
  if (!Number(produto.preco) || Number(produto.preco) <= 0) problemas.push("sem preço válido cadastrado");
  return problemas;
}

export function descontoReal(produto: Pick<Produto, "preco" | "preco_antigo">): number {
  const preco = Number(produto.preco);
  const antigo = produto.preco_antigo !== null && produto.preco_antigo !== undefined ? Number(produto.preco_antigo) : null;
  if (antigo !== null && antigo > preco && preco > 0) return Math.round((1 - preco / antigo) * 100);
  return 0;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("A imagem do produto não permite uso externo (bloqueio CORS do servidor da imagem). Troque a URL da imagem."));
    img.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function linhas(ctx: CanvasRenderingContext2D, texto: string, maxW: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/);
  const out: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const t = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(t).width > maxW && atual) {
      out.push(atual);
      atual = p;
      if (out.length >= maxLinhas) break;
    } else {
      atual = t;
    }
  }
  if (atual && out.length < maxLinhas) out.push(atual);
  return out;
}

function desenharImagemContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const escala = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * escala;
  const dh = img.naturalHeight * escala;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export async function drawCreative(
  canvas: HTMLCanvasElement,
  produto: Produto,
  modelo: ModeloId,
  formatoId: string
): Promise<void> {
  const f = formatoPorId(formatoId);
  canvas.width = f.w;
  canvas.height = f.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador.");
  const W = f.w, H = f.h, u = W / 1080; // unidade de escala
  const vertical = H > W * 1.2;

  const img = await carregarImagem(produto.imagem);
  const preco = Number(produto.preco);
  const antigo = produto.preco_antigo !== null ? Number(produto.preco_antigo) : null;
  const temAntigo = antigo !== null && antigo > preco;
  const desc = descontoReal(produto);
  const nome = produto.nome.trim();

  ctx.textBaseline = "middle";

  if (modelo === "A") {
    // ---- MODELO A: vitrine clara ----
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFE600";
    ctx.fillRect(0, 0, W, 150 * u);
    ctx.fillStyle = "#111111";
    ctx.font = `900 ${64 * u}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("🛒 AchadinhosBR", W / 2, 78 * u);
    ctx.fillStyle = "#595959";
    ctx.font = `700 ${34 * u}px Arial`;
    ctx.fillText(produto.categoria.toUpperCase(), W / 2, (vertical ? 225 : 205) * u);

    const imgH = (vertical ? 640 : 470) * u;
    const imgY = (vertical ? 270 : 250) * u;
    ctx.fillStyle = "#f6f7f9";
    rr(ctx, 90 * u, imgY, W - 180 * u, imgH, 28 * u);
    ctx.fill();
    ctx.save();
    rr(ctx, 90 * u, imgY, W - 180 * u, imgH, 28 * u);
    ctx.clip();
    desenharImagemContain(ctx, img, 90 * u, imgY, W - 180 * u, imgH);
    ctx.restore();

    let y = imgY + imgH + 60 * u;
    ctx.fillStyle = "#111111";
    ctx.font = `800 ${52 * u}px Arial`;
    for (const l of linhas(ctx, nome, W - 180 * u, 2)) {
      ctx.fillText(l, W / 2, y);
      y += 62 * u;
    }
    if (temAntigo) {
      ctx.fillStyle = "#68717a";
      ctx.font = `700 ${40 * u}px Arial`;
      const t = `De ${brl(antigo)}`;
      ctx.fillText(t, W / 2, y + 10 * u);
      const tw = ctx.measureText(t).width;
      ctx.strokeStyle = "#68717a";
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(W / 2 - tw / 2, y + 10 * u);
      ctx.lineTo(W / 2 + tw / 2, y + 10 * u);
      ctx.stroke();
      y += 58 * u;
    }
    ctx.fillStyle = "#006b34";
    ctx.font = `900 ${84 * u}px Arial`;
    ctx.fillText(brl(preco), W / 2, y + 20 * u);
    y += 110 * u;
    const cta = "Confira a oferta";
    ctx.font = `900 ${52 * u}px Arial`;
    const cw = ctx.measureText(cta).width + 120 * u;
    ctx.fillStyle = "#006b34";
    rr(ctx, (W - cw) / 2, y, cw, 110 * u, 55 * u);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cta, W / 2, y + 56 * u);
  } else if (modelo === "B") {
    // ---- MODELO B: desconto em destaque ----
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#ff4e00");
    g.addColorStop(1, "#a30000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${58 * u}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("AchadinhosBR", W / 2, 80 * u);

    if (desc > 0) {
      ctx.fillStyle = "#FFE600";
      ctx.font = `900 ${120 * u}px Arial`;
      ctx.fillText(`-${desc}%`, W / 2, (vertical ? 250 : 230) * u);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${40 * u}px Arial`;
      ctx.fillText("DE DESCONTO", W / 2, (vertical ? 330 : 310) * u);
    }

    const imgY = (vertical ? 390 : 360) * u;
    const imgH = (vertical ? 560 : 420) * u;
    ctx.fillStyle = "#ffffff";
    rr(ctx, 110 * u, imgY, W - 220 * u, imgH, 32 * u);
    ctx.fill();
    ctx.save();
    rr(ctx, 110 * u, imgY, W - 220 * u, imgH, 32 * u);
    ctx.clip();
    desenharImagemContain(ctx, img, 110 * u, imgY, W - 220 * u, imgH);
    ctx.restore();

    let y = imgY + imgH + 55 * u;
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${50 * u}px Arial`;
    for (const l of linhas(ctx, nome, W - 200 * u, 2)) {
      ctx.fillText(l, W / 2, y);
      y += 60 * u;
    }
    ctx.fillStyle = "#FFE600";
    ctx.font = `900 ${88 * u}px Arial`;
    ctx.fillText(`Por ${brl(preco)}`, W / 2, y + 25 * u);
    y += 120 * u;
    const cta = "Ver produto";
    ctx.font = `900 ${52 * u}px Arial`;
    const cw = ctx.measureText(cta).width + 120 * u;
    ctx.fillStyle = "#ffffff";
    rr(ctx, (W - cw) / 2, y, cw, 110 * u, 55 * u);
    ctx.fill();
    ctx.fillStyle = "#a30000";
    ctx.fillText(cta, W / 2, y + 56 * u);
  } else {
    // ---- MODELO C: achadinho do dia ----
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFE600";
    ctx.font = `900 ${62 * u}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("🔥 ACHADINHO DO DIA", W / 2, 85 * u);

    const imgY = (vertical ? 160 : 150) * u;
    const imgH = (vertical ? 620 : 480) * u;
    ctx.save();
    rr(ctx, 90 * u, imgY, W - 180 * u, imgH, 28 * u);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(90 * u, imgY, W - 180 * u, imgH);
    desenharImagemContain(ctx, img, 90 * u, imgY, W - 180 * u, imgH);
    ctx.restore();

    let y = imgY + imgH + 55 * u;
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${52 * u}px Arial`;
    for (const l of linhas(ctx, nome, W - 180 * u, 2)) {
      ctx.fillText(l, W / 2, y);
      y += 62 * u;
    }
    if (temAntigo) {
      ctx.fillStyle = "#b9b9b9";
      ctx.font = `700 ${40 * u}px Arial`;
      ctx.fillText(`De ${brl(antigo)}`, W / 2, y + 8 * u);
      y += 56 * u;
    }
    ctx.fillStyle = "#FFE600";
    ctx.font = `900 ${86 * u}px Arial`;
    ctx.fillText(brl(preco), W / 2, y + 22 * u);
    y += 112 * u;
    const cta = "Veja o achadinho";
    ctx.font = `900 ${50 * u}px Arial`;
    const cw = ctx.measureText(cta).width + 120 * u;
    ctx.fillStyle = "#FFE600";
    rr(ctx, (W - cw) / 2, y, cw, 108 * u, 54 * u);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillText(cta, W / 2, y + 55 * u);
    y += 108 * u + 45 * u;
    ctx.fillStyle = "#8a8a8a";
    ctx.font = `700 ${32 * u}px Arial`;
    ctx.fillText("ACHADINHOSBR", W / 2, y);
  }
}

export function nomeArquivo(slug: string, indice?: number) {
  const base = `achadinhobr-${slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produto"}`;
  return typeof indice === "number" ? `${base}-${String(indice).padStart(2, "0")}.png` : `${base}.png`;
}
