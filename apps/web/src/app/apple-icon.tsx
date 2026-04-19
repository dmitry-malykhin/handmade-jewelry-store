import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icon — shown when user adds site to iPhone home screen.
// Bead "S" monogram on ivory background, matching the Senichka brand.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAE9E7',
        borderRadius: '40px',
      }}
    >
      {/* Simplified bead S — 7 beads for legibility at small sizes */}
      <svg width="100" height="100" viewBox="0 0 32 32">
        <g transform="translate(16,16)">
          <circle cx="0" cy="-9" r="2.4" fill="#D99B95" />
          <circle cx="6" cy="-8" r="2.2" fill="#C47E78" />
          <circle cx="9" cy="-3" r="2.2" fill="#B76E79" />
          <circle cx="3" cy="2" r="2.0" fill="#D99B95" />
          <circle cx="-4" cy="3" r="2.0" fill="#B76E79" />
          <circle cx="-6" cy="8" r="2.2" fill="#C47E78" />
          <circle cx="0" cy="11" r="2.4" fill="#D99B95" />
        </g>
      </svg>
    </div>,
    { ...size },
  )
}
