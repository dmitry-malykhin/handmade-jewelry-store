import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Handmade Jewelry Store — Unique handmade jewelry crafted with love'
export const size = { width: 1200, height: 628 }
export const contentType = 'image/png'

// Reuses the same design as opengraph-image but with Twitter-optimised dimensions
export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '628px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        fontFamily: 'serif',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          width: '50px',
          height: '50px',
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '50px',
          height: '50px',
          borderTop: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          width: '50px',
          height: '50px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderLeft: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          width: '50px',
          height: '50px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          borderRight: '2px solid rgba(255,255,255,0.2)',
        }}
      />

      <div style={{ fontSize: '64px', color: '#ffffff', marginBottom: '20px' }}>✦</div>

      <div
        style={{
          fontSize: '60px',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}
      >
        Jewelry
      </div>

      <div
        style={{
          width: '70px',
          height: '1px',
          background: 'rgba(255,255,255,0.4)',
          marginBottom: '20px',
        }}
      />

      <div
        style={{
          fontSize: '20px',
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
