import { ImageResponse } from 'next/og'

// Next.js static OG image — generated once at build time
export const runtime = 'edge'
export const alt = 'Handmade Jewelry Store — Unique handmade jewelry crafted with love'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        fontFamily: 'serif',
        position: 'relative',
      }}
    >
      {/* Decorative corner accents */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          width: '60px',
          height: '60px',
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '60px',
          height: '60px',
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          width: '60px',
          height: '60px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '60px',
          height: '60px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
        }}
      />

      {/* Sparkle symbol */}
      <div
        style={{
          fontSize: '72px',
          color: '#ffffff',
          marginBottom: '24px',
          letterSpacing: '-2px',
        }}
      >
        ✦
      </div>

      {/* Brand name */}
      <div
        style={{
          fontSize: '64px',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}
      >
        Jewelry
      </div>

      {/* Divider */}
      <div
        style={{
          width: '80px',
          height: '1px',
          background: 'rgba(255,255,255,0.4)',
          marginBottom: '24px',
        }}
      />

      {/* Tagline */}
      <div
        style={{
          fontSize: '22px',
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          fontWeight: 300,
        }}
      >
        Handmade with love
      </div>
    </div>,
    { ...size },
  )
}
