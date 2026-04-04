"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  { name: "Sarah Johnson", role: "Business Owner", text: "Evestime saved me thousands.", rating: 5 },
  { name: "Michael Chen", role: "Freelancer", text: "Instant transfers, great support.", rating: 5 },
  { name: "Emily Rodriguez", role: "Student", text: "No fees, sleek card.", rating: 5 },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const next = () => setIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-16 md:py-24 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">What our customers say</h2>
        <div className="relative bg-gray-50 p-8 rounded-2xl shadow-md">
          <div className="flex justify-center mb-4">
            {[...Array(testimonials[index].rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-lg md:text-xl text-gray-700 italic text-center mb-6">"{testimonials[index].text}"</p>
          <p className="text-center font-semibold">{testimonials[index].name}</p>
          <p className="text-center text-gray-500 text-sm">{testimonials[index].role}</p>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={prev} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><ChevronLeft /></button>
            <button onClick={next} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><ChevronRight /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
