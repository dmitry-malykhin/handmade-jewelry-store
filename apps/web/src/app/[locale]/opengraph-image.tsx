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
        background: 'linear-gradient(135deg, #FAF7F6 0%, #F4E7E3 50%, #FAF7F6 100%)',
        fontFamily: 'Georgia, serif',
        position: 'relative',
        padding: '60px',
      }}
    >
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

      {/* Corner beads */}
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

      {/* Locale-specific title */}
      <div
        style={{
          fontSize: '52px',
          fontWeight: 300,
          color: '#2B2B2B',
          letterSpacing: '2px',
          textAlign: 'center',
          marginBottom: '16px',
          maxWidth: '900px',
        }}
      >
        {siteTitle}
      </div>

      {/* Bead divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
        <div style={{ width: '100px', height: '1px', background: '#E8B7B1' }} />
        <div
          style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B7B1' }}
        />
      </div>

      {/* Locale-specific description */}
      <div
        style={{
          fontSize: '20px',
          color: '#9A8A86',
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
