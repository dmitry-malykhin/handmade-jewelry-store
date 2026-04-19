import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Senichka — Handmade Beaded Jewelry'
export const size = { width: 1200, height: 628 }
export const contentType = 'image/png'

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
        background: 'linear-gradient(135deg, #FAF7F6 0%, #F4E7E3 50%, #FAF7F6 100%)',
        fontFamily: 'Georgia, serif',
        position: 'relative',
      }}
    >
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

      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '36px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#E8B7B1',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '36px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#D99B95',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '36px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#D99B95',
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          right: '36px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#E8B7B1',
          opacity: 0.4,
        }}
      />

      <div
        style={{
          fontSize: '68px',
          fontWeight: 300,
          color: '#2B2B2B',
          letterSpacing: '6px',
          marginBottom: '16px',
        }}
      >
        Senichka
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
        <div style={{ width: '100px', height: '1px', background: '#E8B7B1' }} />
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
      </div>

      <div
        style={{
          fontSize: '16px',
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
