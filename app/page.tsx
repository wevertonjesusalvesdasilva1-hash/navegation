'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useRender, setUseRender] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    setLoading(true);
    setError('');

    try {
      const encoded = encodeURIComponent(fullUrl);
      const endpoint = useRender ? `/api/render?url=${encoded}` : `/api/proxy?url=${encoded}`;
      setIframeUrl(endpoint);
    } catch {
      setError('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { label: 'Claude', url: 'https://claude.ai' },
    { label: 'ChatGPT', url: 'https://chatgpt.com' },
    { label: 'Gemini', url: 'https://gemini.google.com' },
    { label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 p-4 sticky top-0 z-50 border-b border-gray-800">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Digite URL (ex: claude.ai)"
            className="flex-1 px-4 py-2 rounded bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none"
          />
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={useRender}
              onChange={(e) => setUseRender(e.target.checked)}
              className="accent-blue-500"
            />
            Render
          </label>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50 transition"
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-2 max-w-4xl mx-auto">{error}</p>}
      </div>

      {iframeUrl ? (
        <iframe
          key={iframeUrl}
          src={iframeUrl}
          className="w-full border-0"
          style={{ height: 'calc(100vh - 72px)' }}
          title="Browser"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Web Browser Proxy</h1>
            <p className="text-gray-400 text-sm mt-1">Acesse IAs e sites bloqueados</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setUrl(link.url);
                  const encoded = encodeURIComponent(link.url);
                  setIframeUrl(`/api/proxy?url=${encoded}`);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-sm transition"
              >
                {link.label}
              </button>
            ))}
          </div>
          <p className="text-gray-600 text-xs">
            Ative <strong className="text-gray-500">Render</strong> para sites com Cloudflare
          </p>
        </div>
      )}
    </div>
  );
}
