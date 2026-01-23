import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'PaddleUp - Find Courts, Book Games, Level Up';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 50%, #065F73 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* Logo Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="10" y="6" width="20" height="26" rx="8" fill="white" />
            <rect x="17" y="30" width="6" height="12" rx="2" fill="white" />
            <circle cx="36" cy="12" r="8" fill="#F97316" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-2px',
            }}
          >
            Paddle
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#F97316',
              letterSpacing: '-2px',
            }}
          >
            Up
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            marginBottom: '30px',
            fontWeight: 600,
          }}
        >
          Find Courts, Book Games, Level Up
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255, 255, 255, 0.75)',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.4,
          }}
        >
          The ultimate pickleball companion app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
