import { APP_DISPLAY_URL } from '@/lib/app-url';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const dayNumber = Number(number) || 0;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Logo area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            fontSize: '64px',
          }}
        >
          🔊
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-1px',
          }}
        >
          What&apos;s the Sound?
        </div>
      </div>

      {/* Day number */}
      <div
        style={{
          fontSize: '72px',
          fontWeight: 800,
          background: 'linear-gradient(90deg, #00f0ff, #ff00aa)',
          backgroundClip: 'text',
          color: 'transparent',
          marginBottom: '16px',
        }}
      >
        Daily Sound #{dayNumber}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: '28px',
          color: '#a0a0b0',
        }}
      >
        Ouça. Adivinhe. Compartilhe.
      </div>

      {/* URL */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          fontSize: '22px',
          color: '#00f0ff',
        }}
      >
        {APP_DISPLAY_URL}/daily
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
