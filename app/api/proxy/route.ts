import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STRIP_HEADERS = ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'x-content-type-options'];

function injectBase(html: string, origin: string): string {
  const baseTag = `<base href="${origin}/">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
  }
  return baseTag + html;
}

function rewriteLinks(html: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  const origin = base.origin;
  const proxy = '/api/proxy?url=';

  return html
    .replace(/( href="|action=")(?!https?:\/\/|\/\/|#|javascript:|mailto:)(\/?[^"]*)/gi, (_, attr, path) => {
      const abs = path.startsWith('/') ? `${origin}${path}` : `${base.href.replace(/\/$/, '')}/${path}`;
      return `${attr}${proxy}${encodeURIComponent(abs)}`;
    })
    .replace(/( href="|action=")(https?:\/\/[^"]*)/gi, (_, attr, href) => `${attr}${proxy}${encodeURIComponent(href)}`);
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  let targetUrl: URL;
  try { targetUrl = new URL(url); } catch {
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
    const withBase = injectBase(html, targetUrl.origin);
    const rewritten = rewriteLinks(withBase, targetUrl.toString());

    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'no-store');
    // Remove headers that block iframe embedding
    for (const h of STRIP_HEADERS) {
      headers.delete(h);
    }

    return new NextResponse(rewritten, { status: response.status, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro';
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem">
        <h2>Falha ao carregar</h2><p>${msg}</p>
        <p>Tente o modo <strong>Render</strong> (screenshot).</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
