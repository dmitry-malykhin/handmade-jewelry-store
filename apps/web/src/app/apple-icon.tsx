import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icon — shown when user adds site to iPhone home screen
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        borderRadius: '40px',
      }}
    >
      <div
        style={{
          fontSize: '90px',
          color: '#ffffff',
          lineHeight: 1,
        }}
      >
        ✦
      </div>
    </div>,
    { ...size },
  )
}
