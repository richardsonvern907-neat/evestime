"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

type PublicOfferCard = {
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

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PublicOffersResponse = {
  items: PublicOfferCard[];
  pagination: Pagination;
  filters: Record<string, unknown>;
};

function formatAmount(value: number | string | null, currency: string) {
  if (value == null || value === "") {
    return "Flexible minimum";
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "Amount on request";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeTrack(track: string) {
  return track === "pro_opportunities" ? "Pro Opportunities" : "Core Investing";
}

export default function OffersPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PublicOffersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = searchParams.toString();

    async function loadOffers() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/offers${query ? `?${query}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json()) as PublicOffersResponse | { error?: string };

        if (!response.ok) {
          setError(json && "error" in json ? json.error ?? "Unable to load offers." : "Unable to load offers.");
          setData(null);
          return;
        }

        setData(json as PublicOffersResponse);
      } catch {
        if (controller.signal.aborted) return;
        setError("Unable to load offers right now.");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOffers();
    return () => controller.abort();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <section className="px-4 pb-16 pt-12 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Public catalog</p>
              <h1 className="mt-2 text-3xl font-black text-primary md:text-4xl">Investment Offers</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary/70 md:text-base">
                Explore Core Investing and Pro Opportunities. Published offers only, with suitability flags visible up front.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/offers" className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-primary">
                All
              </Link>
              <Link
                href="/offers?productTrack=core_investing"
                className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-primary"
              >
                Core Investing
              </Link>
              <Link
                href="/offers?productTrack=pro_opportunities"
                className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-primary"
              >
                Pro Opportunities
              </Link>
              <Link href="/offers?featured=true" className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-primary">
                Featured
              </Link>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-primary/10 bg-surface p-8 text-sm text-primary/70">
              Loading offers...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary/60">
                {data.pagination.total} offers found
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((offer) => (
                  <article key={offer.id} className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                        {normalizeTrack(offer.product_track)}
                      </span>
                      {offer.suitability_required && (
                        <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-ink">
                          Suitability Required
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-primary">{offer.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-primary/75">{offer.summary}</p>
                    <dl className="mt-5 space-y-2 text-sm text-primary/75">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-semibold">Minimum</dt>
                        <dd>{formatAmount(offer.min_investment_amount, offer.currency)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-semibold">Risk</dt>
                        <dd className="uppercase tracking-wide">{offer.risk_level ?? "not specified"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="font-semibold">Type</dt>
                        <dd className="uppercase tracking-wide">{offer.offer_type.replaceAll("_", " ")}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/offers/${offer.slug}`}
                      className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                    >
                      View offer
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
