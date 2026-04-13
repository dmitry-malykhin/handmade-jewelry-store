import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Serves /logo.png — used by Organization JSON-LD schema.
// Schema.org requires logo to be a static-looking URL; this edge route satisfies that.
export async function GET() {
  const imageResponse = new ImageResponse(
    <div
      style={{
        width: '512px',
        height: '512px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
      }}
    >
      <div
        style={{
          fontSize: '260px',
          color: '#ffffff',
          lineHeight: 1,
          fontFamily: 'serif',
        }}
      >
        ✦
      </div>
    </div>,
    { width: 512, height: 512 },
  )

  return new Response(imageResponse.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
