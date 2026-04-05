"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">Evestime</Link>
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="#" className="text-gray-700 hover:text-blue-600">Personal</Link>
          <Link href="#" className="text-gray-700 hover:text-blue-600">Business</Link>
          <Link href="#" className="text-gray-700 hover:text-blue-600">Support</Link>
          <button className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700">Log in</button>
        </nav>
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white border-t py-4 px-4 flex flex-col space-y-3">
          <Link href="#" className="text-gray-700 hover:text-blue-600">Personal</Link>
          <Link href="#" className="text-gray-700 hover:text-blue-600">Business</Link>
          <Link href="#" className="text-gray-700 hover:text-blue-600">Support</Link>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-full">Log in</button>
        </div>
      )}
    </header>
  );
}
