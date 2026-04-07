"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

type CoinAsset = {
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

type CoinAssetsResponse = {
  items: CoinAsset[];
};

export default function CoinAssetsPage() {
  const [items, setItems] = useState<CoinAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssets() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/coin-assets", {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json()) as CoinAssetsResponse | { error?: string };

        if (!response.ok) {
          setError(json && "error" in json ? json.error ?? "Unable to load coin assets." : "Unable to load coin assets.");
          setItems([]);
          return;
        }

        const payload = json as CoinAssetsResponse;
        setItems(payload.items ?? []);
      } catch {
        if (controller.signal.aborted) return;
        setError("Unable to load coin assets right now.");
        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAssets();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="px-4 pb-16 pt-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Asset catalog</p>
          <h1 className="mt-2 text-3xl font-black text-primary md:text-4xl">Active Coin Assets</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-primary/70 md:text-base">
            Public view of active assets currently linked to published offers and portfolio compositions.
          </p>

          {loading && (
            <div className="mt-8 rounded-2xl border border-primary/10 bg-surface p-8 text-sm text-primary/70">
              Loading assets...
            </div>
          )}

          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((asset) => (
                <article key={asset.id} className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-primary">{asset.name}</h2>
                      <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-primary/65">{asset.symbol}</p>
                    </div>
                    {asset.chain_name && (
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary/70">
                        {asset.chain_name}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    {asset.website_url && (
                      <a
                        href={asset.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Website
                      </a>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary/60">
                      {asset.market_data_source ?? "Internal source"}
                    </span>
                  </div>
                  <Link
                    href={`/coin-assets/${asset.slug}`}
                    className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                  >
                    View details
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
