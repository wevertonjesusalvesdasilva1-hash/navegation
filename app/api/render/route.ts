import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try { new URL(url); } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() =>
      page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    );

    // Wait a bit for JS to render
    await new Promise((r) => setTimeout(r, 1500));

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: false });
    await browser.close();

    return new NextResponse(new Uint8Array(screenshot as Buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem">
        <h2>Screenshot falhou</h2><p>${msg}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
