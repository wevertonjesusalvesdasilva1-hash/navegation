import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function rewriteUrls(html: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  const origin = base.origin;
  const proxyBase = '/api/proxy?url=';

  return html
    .replace(/(<(?:a|link)[^>]+(?:href|action)=")(?!https?:\/\/|\/\/|#|javascript|mailto)(\/?[^"]*)/gi,
      (_, before, path) => {
        const abs = path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
        return `${before}${proxyBase}${encodeURIComponent(abs)}`;
      })
    .replace(/(<(?:a|link)[^>]+(?:href|action)=")(https?:\/\/[^"]*)/gi,
      (_, before, href) => `${before}${proxyBase}${encodeURIComponent(href)}`)
    .replace(/(<(?:img|script)[^>]+src=")(?!https?:\/\/|\/\/|data:)(\/?[^"]*)/gi,
      (_, before, path) => {
        const abs = path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
        return `${before}${abs}`;
      });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
      const body = await response.arrayBuffer();
      return new NextResponse(body, {
        status: response.status,
        headers: { 'Content-Type': contentType },
      });
    }

    const html = await response.text();
    const rewritten = rewriteUrls(html, targetUrl.toString());

    return new NextResponse(rewritten, {
      status: response.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem">
        <h2>Falha ao carregar</h2><p>${msg}</p>
        <p>Tente ativar o modo <strong>Render</strong> para este site.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
