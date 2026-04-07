"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

type CoinAssetDetail = {
  id: string;
  symbol: string;
  slug: string;
  name: string;
  chain_name: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean;
  market_data_source: string | null;
  created_at: string;
  updated_at: string;
};

type RelatedOffer = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  offer_type: string;
  product_track: string;
  risk_level: string | null;
  min_investment_amount: number | string | null;
  currency: string;
  expected_return_text: string | null;
  term_text: string | null;
  featured: boolean;
  hero_image_url: string | null;
  suitability_required: boolean;
  available_from: string | null;
  available_until: string | null;
};

type CoinAssetDetailResponse = {
  asset: CoinAssetDetail;
  offers: RelatedOffer[];
};

function formatAmount(value: number | string | null, currency: string) {
  if (value == null || value === "") return "Flexible minimum";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "Amount on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CoinAssetDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [data, setData] = useState<CoinAssetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    async function loadAsset() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/coin-assets/${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json()) as CoinAssetDetailResponse | { error?: string };

        if (!response.ok) {
          setError(json && "error" in json ? json.error ?? "Coin asset not found." : "Coin asset not found.");
          setData(null);
          return;
        }

        setData(json as CoinAssetDetailResponse);
      } catch {
        if (controller.signal.aborted) return;
        setError("Unable to load coin asset.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAsset();
    return () => controller.abort();
  }, [slug]);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="px-4 pb-16 pt-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/coin-assets" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Back to coin assets
          </Link>

          {loading && (
            <div className="mt-6 rounded-2xl border border-primary/10 bg-surface p-8 text-sm text-primary/70">
              Loading coin asset...
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <article className="mt-6 rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">{data.asset.symbol}</p>
                    <h1 className="mt-2 text-3xl font-black text-primary md:text-4xl">{data.asset.name}</h1>
                  </div>
                  {data.asset.chain_name && (
                    <span className="rounded-full bg-muted px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary/75">
                      {data.asset.chain_name}
                    </span>
                  )}
                </div>

                <div className="mt-6 grid gap-4 text-sm text-primary/75 md:grid-cols-3">
                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Market Data Source</p>
                    <p className="mt-1 font-semibold text-primary">{data.asset.market_data_source ?? "Internal source"}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Catalog Status</p>
                    <p className="mt-1 font-semibold text-primary">{data.asset.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Official Link</p>
                    <p className="mt-1 font-semibold text-primary">
                      {data.asset.website_url ? (
                        <a href={data.asset.website_url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                          Visit website
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  </div>
                </div>
              </article>

              <section className="mt-8 rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                <h2 className="text-xl font-bold text-primary">Published Offers Using This Asset</h2>
                {data.offers.length === 0 ? (
                  <p className="mt-3 text-sm text-primary/70">
                    No published offers currently include this asset.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {data.offers.map((offer) => (
                      <li key={offer.id} className="rounded-xl border border-primary/10 bg-background p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                            {offer.product_track.replaceAll("_", " ")}
                          </span>
                          {offer.suitability_required && (
                            <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-ink">
                              Suitability Required
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-primary">{offer.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-primary/75">{offer.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider text-primary/65">
                          <span>{offer.offer_type.replaceAll("_", " ")}</span>
                          <span>{offer.risk_level ?? "risk not specified"}</span>
                          <span>{formatAmount(offer.min_investment_amount, offer.currency)}</span>
                        </div>
                        <Link
                          href={`/offers/${offer.slug}`}
                          className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary/90"
                        >
                          View offer
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
