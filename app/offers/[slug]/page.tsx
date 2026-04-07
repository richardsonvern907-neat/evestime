"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

type OfferRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  offer_type: string;
  product_track: string;
  risk_level: string | null;
  min_investment_amount: number | string | null;
  currency: string;
  expected_return_text: string | null;
  term_text: string | null;
  suitability_required: boolean;
  hero_image_url: string | null;
  available_from: string | null;
  available_until: string | null;
};

type OfferAsset = {
  id: string;
  coin_asset_id: string;
  symbol?: string;
  slug?: string;
  name?: string;
  allocation_percent: number | string | null;
  display_order: number;
};

type ComplianceTemplateRef = {
  id: string;
  acknowledgement_key: string;
  title: string;
};

type OfferDetailResponse = {
  offer: OfferRecord;
  assets: OfferAsset[];
  complianceTemplates: ComplianceTemplateRef[];
};

function formatAmount(value: number | string | null, currency: string) {
  if (value == null || value === "") {
    return "Flexible minimum";
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "Amount on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number | string | null) {
  if (value == null || value === "") return "N/A";
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? `${num}%` : "N/A";
}

export default function OfferDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [data, setData] = useState<OfferDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();

    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/offers/${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json()) as OfferDetailResponse | { error?: string };

        if (!response.ok) {
          setError(json && "error" in json ? json.error ?? "Offer not available." : "Offer not available.");
          setData(null);
          return;
        }
        setData(json as OfferDetailResponse);
      } catch {
        if (controller.signal.aborted) return;
        setError("Unable to load offer details.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDetail();
    return () => controller.abort();
  }, [slug]);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="px-4 pb-16 pt-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/offers" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Back to offers
          </Link>

          {loading && (
            <div className="mt-6 rounded-2xl border border-primary/10 bg-surface p-8 text-sm text-primary/70">
              Loading offer details...
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <article className="mt-6 rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm md:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    {data.offer.product_track.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary/80">
                    {data.offer.offer_type.replaceAll("_", " ")}
                  </span>
                  {data.offer.suitability_required && (
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-ink">
                      Suitability Required
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-3xl font-black text-primary md:text-4xl">{data.offer.title}</h1>
                <p className="mt-4 max-w-4xl text-base leading-7 text-primary/75">{data.offer.summary}</p>

                {data.offer.description && (
                  <p className="mt-5 whitespace-pre-line text-sm leading-7 text-primary/80">{data.offer.description}</p>
                )}

                <dl className="mt-8 grid gap-4 rounded-2xl bg-muted p-6 text-sm text-primary/80 md:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-primary/60">Minimum Investment</dt>
                    <dd className="mt-1 font-semibold text-primary">
                      {formatAmount(data.offer.min_investment_amount, data.offer.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-primary/60">Risk Level</dt>
                    <dd className="mt-1 font-semibold uppercase text-primary">
                      {data.offer.risk_level ?? "not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-primary/60">Expected Return</dt>
                    <dd className="mt-1 font-semibold text-primary">{data.offer.expected_return_text ?? "See advisor"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-primary/60">Term</dt>
                    <dd className="mt-1 font-semibold text-primary">{data.offer.term_text ?? "Flexible"}</dd>
                  </div>
                </dl>
              </article>

              <section className="mt-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-primary">Associated Assets</h2>
                  {data.assets.length === 0 ? (
                    <p className="mt-3 text-sm text-primary/70">No mapped assets on this offer yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {data.assets.map((asset) => (
                        <li key={asset.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              {asset.name ?? asset.symbol ?? "Asset"}
                            </p>
                            {asset.slug && (
                              <Link
                                href={`/coin-assets/${asset.slug}`}
                                className="text-xs font-semibold text-primary/70 underline-offset-4 hover:underline"
                              >
                                View asset
                              </Link>
                            )}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-primary/70">
                            {formatPercent(asset.allocation_percent)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-primary">Compliance References</h2>
                  {data.complianceTemplates.length === 0 ? (
                    <p className="mt-3 text-sm text-primary/70">
                      No active acknowledgement templates are mapped for this offer.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {data.complianceTemplates.map((template) => (
                        <li key={template.id} className="rounded-xl bg-muted px-4 py-3">
                          <p className="text-sm font-semibold text-primary">{template.title}</p>
                          <p className="mt-1 text-xs font-mono text-primary/70">{template.acknowledgement_key}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
