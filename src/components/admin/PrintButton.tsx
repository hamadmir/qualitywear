"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn bg-ink px-4 py-2 text-sm text-white">
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
