import type { ReactNode } from 'react'

/** Gold-hairline card with stepped deco corners. The basic building block of every room. */
export function DecoCard({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`deco-card ${className}`}>
      <span className="deco-corner tl" />
      <span className="deco-corner tr" />
      <span className="deco-corner bl" />
      <span className="deco-corner br" />
      {title && (
        <h2 className="deco-title">
          <span className="chev">◆</span> {title} <span className="chev">◆</span>
        </h2>
      )}
      {children}
    </section>
  )
}
