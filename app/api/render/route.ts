import { NextRequest, NextResponse } from 'next/server';

// Puppeteer fallback — runs in Node.js serverless (not edge)
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    // Dynamic import to avoid bundling issues on edge
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = await Promise.resolve().then(() => require('puppeteer-core')).catch(() => null);

    if (!puppeteer) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem">
          <h2>Render indisponível</h2>
          <p>puppeteer-core não instalado. Execute: <code>npm i puppeteer-core</code></p>
        </body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const browser = await puppeteer.default.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const html = await page.content();
    await browser.close();

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem">
        <h2>Render falhou</h2><p>${msg}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
