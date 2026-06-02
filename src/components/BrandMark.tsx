/** Inline brand mark — a shield + assurance spark in the Engage Squared accent.
    No external asset so it stays crisp in light and dark. */

export function BrandGlyph({ size = 32 }: { size?: number }) {
  const id = 'aah-brand-grad';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Agent Assurance Hub">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#165AF1" />
          <stop offset="100%" stopColor="#13134C" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path
        d="M16 6.5l6 2.2v4.2c0 4.1-2.6 7.6-6 8.9-3.4-1.3-6-4.8-6-8.9V8.7l6-2.2z"
        fill="rgba(255,255,255,0.16)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.1"
      />
      <path
        d="M12.7 15.6l2.2 2.2 4.3-4.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <BrandGlyph size={size} />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
          Agent Assurance Hub
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.62,
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          by Engage&nbsp;Squared
        </div>
      </div>
    </div>
  );
}
