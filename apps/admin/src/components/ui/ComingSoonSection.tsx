export interface ComingSoonSectionProps {
  title: string;
  description?: string;
}

export function ComingSoonSection({
  title,
  description = "Coming soon.",
}: ComingSoonSectionProps) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 sm:p-5">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/40">{description}</p>
    </section>
  );
}
