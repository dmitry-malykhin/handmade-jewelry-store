import { ImageResponse } from 'next/og'

// Next.js static OG image — generated once at build time
export const runtime = 'edge'
export const alt = 'Senichka — Handmade Beaded Jewelry'
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
        background: 'linear-gradient(135deg, #FAF7F6 0%, #F4E7E3 50%, #FAF7F6 100%)',
        fontFamily: 'Georgia, serif',
        position: 'relative',
      }}
    >
      {/* Decorative corner beads */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#E8B7B1',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#D99B95',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#D99B95',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#E8B7B1',
          opacity: 0.4,
        }}
      />

      {/* Decorative border */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '28px',
          right: '28px',
          bottom: '28px',
          border: '1px solid rgba(232,183,177,0.3)',
          borderRadius: '8px',
        }}
      />

      {/* Brand name */}
      <div
        style={{
          fontSize: '72px',
          fontWeight: 300,
          color: '#2B2B2B',
          letterSpacing: '6px',
          marginBottom: '16px',
        }}
      >
        Senichka
      </div>

      {/* Divider with bead endpoints */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
        <div style={{ width: '120px', height: '1px', background: '#E8B7B1' }} />
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: '18px',
          color: '#9A8A86',
          letterSpacing: '6px',
          textTransform: 'uppercase',
          fontWeight: 300,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        HANDMADE BEADED JEWELRY
      </div>
    </div>,
    { ...size },
  )
}
