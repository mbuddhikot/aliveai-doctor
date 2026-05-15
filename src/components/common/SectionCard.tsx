import type { ReactNode } from 'react'

type SectionCardProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
