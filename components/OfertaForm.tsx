"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@/lib/v3-types";

type ProdutoOpcao = { id: string; title: string; price: number };

function paraInput(dataISO: string | null): string {
  if (!dataISO) return "";
  const d = new Date(dataISO);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function paraISO(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Formulário de oferta (nova + edição). Status sai por OfertasActions.
export default function OfertaForm({
  offer,
  produtos,
}: {
  offer?: Offer | null;
  produtos?: ProdutoOpcao[];
}) {
  const editando = Boolean(offer?.id);
  const [productId, setProductId] = useState(offer?.product_id ?? "");
  const [oldPrice, setOldPrice] = useState(offer?.old_price != null ? String(offer.old_price) : "");
  const [currentPrice, setCurrentPrice] = useState(offer ? String(offer.current_price) : "");
  const [couponCode, setCouponCode] = useState(offer?.coupon_code ?? "");
  const [couponValue, setCouponValue] = useState(offer?.coupon_value != null ? String(offer.coupon_value) : "");
  const [shipping, setShipping] = useState(offer?.shipping_price != null ? String(offer.shipping_price) : "");
  const [featured, setFeatured] = useState(Boolean(offer?.featured));
  const [publishedAt, setPublishedAt] = useState(paraInput(offer?.published_at ?? null));
  const [expiresAt, setExpiresAt] = useState(paraInput(offer?.expires_at ?? null));
  const [slug, setSlug] = useState(offer?.slug ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function salvar(enviar = false) {
    setBusy(true);
    setMsg("");
    try {
      const numOuNull = (v: string) => (v.trim() === "" ? null : Number(v));
      if (editando) {
        const r = await fetch("/api/v3/offers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: offer!.id,
            old_price: numOuNull(oldPrice),
            current_price: Number(currentPrice),
            coupon_code: couponCode.trim() || null,
            coupon_value: numOuNull(couponValue),
            shipping_price: numOuNull(shipping),
            featured,
            published_at: paraISO(publishedAt),
            expires_at: paraISO(expiresAt),
            slug: slug.trim() || null,
          }),
        });
        const j = await r.json();
        setMsg(j.ok ? "Salvo ✅ (score recalculado)" : j.error || "Falhou");
        if (j.ok) router.refresh();
      } else {
        if (!productId) {
          setMsg("Escolha o produto.");
          setBusy(false);
          return;
        }
        if (!(Number(currentPrice) >= 0)) {
          setMsg("Informe o preço atual.");
          setBusy(false);
          return;
        }
        const r = await fetch("/api/v3/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            old_price: numOuNull(oldPrice),
            current_price: Number(currentPrice),
            coupon_code: couponCode.trim() || undefined,
            coupon_value: numOuNull(couponValue),
            shipping_price: numOuNull(shipping),
            featured,
            published_at: paraISO(publishedAt),
            expires_at: paraISO(expiresAt),
            slug: slug.trim() || undefined,
            enviar,
          }),
        });
        const j = await r.json();
        if (j.ok) {
          router.push(`/admin/ofertas/${j.offer.id}`);
        } else {
          setMsg(j.error || "Falhou");
        }
      }
    } catch {
      setMsg("Erro de rede.");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
      {!editando && (
        <label>
          Produto (aprovado V4)
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— escolher —</option>
            {(produtos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </option>
            ))}
          </select>
        </label>
      )}
      <span style={{ display: "flex", gap: 10 }}>
        <label>
          Preço anterior (De)
          <input type="number" min="0" step="0.01" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="Opcional — sem inventar" />
        </label>
        <label>
          Preço atual (Por) *
          <input type="number" min="0" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} required />
        </label>
      </span>
      <span style={{ display: "flex", gap: 10 }}>
        <label>
          Cupom
          <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Ex. ACHAD10" />
        </label>
        <label>
          Valor do cupom (R$)
          <input type="number" min="0" step="0.01" value={couponValue} onChange={(e) => setCouponValue(e.target.value)} />
        </label>
        <label>
          Frete (R$, 0 = grátis)
          <input type="number" min="0" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </label>
      </span>
      <label>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Destaque
      </label>
      <span style={{ display: "flex", gap: 10 }}>
        <label>
          Publicar em
          <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
        </label>
        <label>
          Expira em
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
      </span>
      <label>
        Slug (URL amigável, opcional)
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Gerado sozinho se vazio" />
      </label>
      <span style={{ display: "flex", gap: 8 }}>
        {editando ? (
          <button type="button" disabled={busy} onClick={() => salvar(false)}>
            💾 Salvar
          </button>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => salvar(false)}>
              💾 Salvar rascunho
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => salvar(true)}>
              📤 Salvar e enviar p/ aprovação
            </button>
          </>
        )}
      </span>
      {msg ? <p style={{ fontSize: 13 }}>{msg}</p> : null}
    </div>
  );
}
