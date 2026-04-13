import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface OgImageProps {
  params: Promise<{ locale: string }>
}

export async function generateAlt({ params }: OgImageProps): Promise<string> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return t('title')
}

export default async function LocaleOgImage({ params }: OgImageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  const siteTitle = t('title')
  const siteDescription = t('description')

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
        padding: '60px',
      }}
    >
      {/* Corner accents */}
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

      {/* Sparkle + brand */}
      <div style={{ fontSize: '64px', color: '#ffffff', marginBottom: '20px' }}>✦</div>

      <div
        style={{
          fontSize: '56px',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '2px',
          textAlign: 'center',
          marginBottom: '16px',
          maxWidth: '900px',
        }}
      >
        {siteTitle}
      </div>

      <div
        style={{
          width: '80px',
          height: '1px',
          background: 'rgba(255,255,255,0.35)',
          marginBottom: '20px',
        }}
      />

      <div
        style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          maxWidth: '800px',
          lineHeight: 1.5,
        }}
      >
        {siteDescription}
      </div>
    </div>,
    { ...size },
  )
}
