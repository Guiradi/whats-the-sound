import { WifiOff } from 'lucide-react';

// This page is rendered by the Serwist fallback when a navigation request fails
// while offline. It lives OUTSIDE the [locale] group on purpose — we don't have
// messages available when the network is gone, so the copy is hardcoded + bilingual.
export default function OfflinePage() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a1a] text-[#f0f0ff]">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
          <WifiOff className="h-16 w-16 text-[#00f0ff]" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight">You're offline</h1>
          <p className="text-base text-[#a0a0cc]">
            Seems like the internet dropped. Reconnect to play new rounds. Previously visited pages
            may still be available.
          </p>
          <p className="text-sm text-[#606080]">
            Sem conexão. Reconecte para jogar. Páginas já visitadas podem continuar disponíveis.
          </p>
        </main>
      </body>
    </html>
  );
}
