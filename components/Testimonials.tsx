"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    name: "Nadine Cole",
    role: "Growth Founder",
    text: "The advisor handoff was fast, and they had my full Telegram answers before the first call.",
    rating: 5,
  },
  {
    name: "Marcus Silva",
    role: "Retail Investor",
    text: "I appreciated the risk disclosures on Pro Opportunities before any next step happened.",
    rating: 5,
  },
  {
    name: "Amaka Okoye",
    role: "Portfolio Allocator",
    text: "I found Core Investing offers quickly and got routed to WhatsApp without repeating details.",
    rating: 5,
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const next = () => setIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="bg-background px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-black text-primary md:text-4xl">What users say after routing</h2>
        <div className="relative mt-10 rounded-3xl border border-primary/10 bg-surface p-8 shadow-sm">
          <div className="flex justify-center mb-4">
            {[...Array(testimonials[index].rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="mb-6 text-center text-lg italic text-primary/80 md:text-xl">&ldquo;{testimonials[index].text}&rdquo;</p>
          <p className="text-center font-semibold text-primary">{testimonials[index].name}</p>
          <p className="text-center text-sm text-primary/60">{testimonials[index].role}</p>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={prev} className="rounded-full border border-primary/15 bg-background p-2 text-primary hover:bg-muted"><ChevronLeft /></button>
            <button onClick={next} className="rounded-full border border-primary/15 bg-background p-2 text-primary hover:bg-muted"><ChevronRight /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
