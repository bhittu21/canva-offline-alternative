/** The app's logo: an original mark (a page with a spark), drawn inline. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="3.5" width="13" height="17" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M18.5 3l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" />
        <path d="M7 15.5l2.6-3.2 2 2.2 1.4-1.6 2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
