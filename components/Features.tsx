import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles, Headset } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Core Investing",
    desc: "Structured offers built for steady entry with clear terms, risk language, and advisor follow-up.",
    href: "/offers?productTrack=core_investing",
    accent: "bg-success/15 text-success",
  },
  {
    icon: Sparkles,
    title: "Pro Opportunities",
    desc: "Higher-complexity products with strict suitability acknowledgement and qualification gating.",
    href: "/offers?productTrack=pro_opportunities",
    accent: "bg-accent/20 text-accent-ink",
  },
  {
    icon: Headset,
    title: "Support Hub Routing",
    desc: "Telegram qualification flows into WhatsApp or email handoff with full lead context attached.",
    href: "/offers",
    accent: "bg-primary/10 text-primary",
  },
];

export default function Features() {
  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">Platform tracks</p>
            <h2 className="mt-2 text-3xl font-black text-primary md:text-4xl">
              Choose the path that matches your intent.
            </h2>
          </div>
          <Link href="/offers" className="text-sm font-bold text-primary underline-offset-4 hover:underline">
            See all offers
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
              <div className={`mb-4 inline-flex rounded-full p-3 ${f.accent}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-primary">{f.title}</h3>
              <p className="mt-3 text-sm leading-6 text-primary/75">{f.desc}</p>
              <Link
                href={f.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:text-accent-ink"
              >
                Explore track
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
