"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary px-4 pb-16 pt-14 text-white md:px-8 md:pb-24 md:pt-20">
      <div className="absolute -right-20 top-8 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-4 inline-flex rounded-full bg-white/12 px-4 py-1 text-xs font-semibold tracking-wide text-white/90"
          >
            Discovery-first crypto investing platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="max-w-3xl text-4xl font-black leading-tight md:text-6xl"
          >
            Core investing access, pro opportunities, and real advisor routing.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-6 max-w-2xl text-base text-white/80 md:text-lg"
          >
            Browse offers and asset pages, submit your interest, complete Telegram qualification,
            and get routed to WhatsApp or email with your full context attached.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/offers"
              className="rounded-full bg-accent px-7 py-3 text-sm font-bold text-accent-ink transition hover:bg-accent/90"
            >
              Explore offers
            </Link>
            <Link
              href="/coin-assets"
              className="rounded-full border border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View coin catalog
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
            className="mt-8 flex flex-wrap gap-5 text-xs font-semibold uppercase tracking-wide text-white/70"
          >
            <span>Core Investing</span>
            <span>Pro Opportunities</span>
            <span>Support Hub Routing</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-3xl border border-white/15 bg-white/8 p-6 backdrop-blur"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl bg-white px-5 py-4 text-primary">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/55">Lead flow</p>
              <p className="mt-1 text-lg font-bold">Interest → Telegram qualification → advisor handoff</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Pro controls</p>
              <p className="mt-1 text-lg font-bold">Suitability acknowledgment required before final routing</p>
            </div>
            <div className="rounded-2xl border border-white/20 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Ops visibility</p>
              <p className="mt-1 text-lg font-bold">Admin tracking with notes, assignment, and timeline history</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
