export default function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${
        light ? "text-white/70" : "text-neutral-500"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
      {children}
    </p>
  );
}
