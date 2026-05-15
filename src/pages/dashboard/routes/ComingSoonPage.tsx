export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-[0_18px_32px_rgba(31,41,55,0.08)]">
      <h2 className="text-2xl font-bold text-black">{title}</h2>
      <p className="mt-2 text-base text-[#64748b]">Coming soon.</p>
    </section>
  )
}

