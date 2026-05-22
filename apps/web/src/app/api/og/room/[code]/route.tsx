import { APP_DISPLAY_URL } from '@/lib/app-url';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

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
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '64px' }}>🔊</div>
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

      {/* Room code */}
      <div
        style={{
          fontSize: '80px',
          fontWeight: 800,
          color: '#00f0ff',
          fontFamily: 'monospace',
          letterSpacing: '8px',
          marginBottom: '16px',
        }}
      >
        {code.toUpperCase()}
      </div>

      {/* CTA */}
      <div
        style={{
          fontSize: '32px',
          color: '#ff00aa',
          fontWeight: 600,
        }}
      >
        Junte-se à sala!
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
        {APP_DISPLAY_URL}/room/{code.toUpperCase()}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        // Room codes live <1 hour server-side; short cache to avoid hammering
        // edge compute on every social-platform crawler hit.
        'Cache-Control': 'public, max-age=600, s-maxage=600',
      },
    },
  );
}
