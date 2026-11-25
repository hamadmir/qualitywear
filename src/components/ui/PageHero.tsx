import Eyebrow from "./Eyebrow";

/** Premium dark rounded header used at the top of inner pages. */
export default function PageHero({
  eyebrow,
  title,
  accent,
  subtitle,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle?: string;
  image?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative mx-auto -mt-[76px] max-w-7xl overflow-hidden rounded-[28px] bg-ink text-white">
      {image && (
        <img src={image} alt="" className="animate-slow-zoom absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber/15 blur-3xl" />
      <div className="relative px-6 pb-12 pt-32 sm:px-12 sm:pb-16 sm:pt-36">
        <div className="animate-fade-up">
          <Eyebrow light>{eyebrow}</Eyebrow>
        </div>
        <h1 className="animate-fade-up delay-100 mt-5 max-w-4xl font-display text-[40px] font-bold leading-[1.03] sm:text-6xl">
          {title} {accent && <span className="font-accent text-amber">{accent}</span>}
        </h1>
        {subtitle && (
          <p className="animate-fade-up delay-200 mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">{subtitle}</p>
        )}
        {children && <div className="animate-fade-up delay-300 mt-8">{children}</div>}
      </div>
    </section>
  );
}
