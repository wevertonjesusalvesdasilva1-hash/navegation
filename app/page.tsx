'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'proxy' | 'render'>('proxy');
  const [loading, setLoading] = useState(false);
  const [imgKey, setImgKey] = useState(0);

  const buildSrc = (u: string, m: typeof mode) =>
    m === 'render'
      ? `/api/render?url=${encodeURIComponent(u)}`
      : `/api/proxy?url=${encodeURIComponent(u)}`;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let full = url.trim();
    if (!full.startsWith('http://') && !full.startsWith('https://')) full = `https://${full}`;
    setLoading(true);
    setTarget(full);
    setImgKey((k) => k + 1);
  };

  const quickLinks = [
    { label: 'Claude', url: 'https://claude.ai' },
    { label: 'ChatGPT', url: 'https://chatgpt.com' },
    { label: 'Gemini', url: 'https://gemini.google.com' },
    { label: 'WhatsApp', url: 'https://web.whatsapp.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Google', url: 'https://www.google.com' },
  ];

  const src = target ? buildSrc(target, mode) : '';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 sticky top-0 z-50">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-5xl mx-auto items-center">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (ex: claude.ai)"
            className="flex-1 px-4 py-2 rounded bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none text-sm"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <button
              type="button"
              onClick={() => setMode('proxy')}
              className={`px-3 py-2 rounded text-xs font-medium transition ${mode === 'proxy' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              Proxy
            </button>
            <button
              type="button"
              onClick={() => setMode('render')}
              className={`px-3 py-2 rounded text-xs font-medium transition ${mode === 'render' ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              Screenshot
            </button>
          </div>
          <button
            type="submit"
            disabled={loading && !!target}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 transition text-sm shrink-0"
          >
            Ir
          </button>
        </form>
        {mode === 'render' && target && (
          <p className="text-purple-400 text-xs mt-1 max-w-5xl mx-auto">
            Modo Screenshot: captura visual da página (não interativo). Clique em &quot;Ir&quot; para atualizar.
          </p>
        )}
      </div>

      {/* Content */}
      {!target ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Web Browser Proxy</h1>
            <p className="text-gray-400 text-sm mt-1">
              <strong className="text-blue-400">Proxy</strong>: sites simples &nbsp;|&nbsp;
              <strong className="text-purple-400">Screenshot</strong>: qualquer site (Claude, ChatGPT...)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setUrl(link.url);
                  setTarget(link.url);
                  setImgKey((k) => k + 1);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm transition"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      ) : mode === 'render' ? (
        <div className="flex-1 overflow-auto bg-gray-900 flex flex-col items-center p-4">
          {loading && (
            <div className="text-gray-400 text-sm mb-3 animate-pulse">Capturando screenshot...</div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imgKey}
            src={src}
            alt="Screenshot"
            className="max-w-full rounded shadow-lg"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{ display: loading ? 'none' : 'block' }}
          />
        </div>
      ) : (
        <iframe
          key={src}
          src={src}
          className="flex-1 w-full border-0"
          title="Browser"
          onLoad={() => setLoading(false)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
        />
      )}
    </div>
  );
}
