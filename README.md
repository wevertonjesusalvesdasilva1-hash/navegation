# Web Browser Proxy

Navegador proxy HTTP/HTTPS para acessar IAs (Claude, ChatGPT) via interface hospedada na Vercel.

## Stack
- Next.js 14 (App Router) + TypeScript
- TailwindCSS
- Puppeteer (fallback para sites com Cloudflare)

## Estrutura

```
app/
├── page.tsx              # UI: search bar + iframe
├── api/proxy/route.ts    # Proxy HTTP (Edge Runtime)
└── api/render/route.ts   # Puppeteer fallback (Node.js)
lib/
├── proxy-utils.ts        # Utilitários
└── cookie-jar.ts         # Gerenciamento de cookies
```

## Uso local

```bash
npm install
npm run dev
# Acesse http://localhost:3000
```

## Deploy Vercel

```bash
npx vercel deploy
```

## Modos

| Modo    | Como ativar        | Quando usar                          |
|---------|--------------------|--------------------------------------|
| Proxy   | padrão             | Sites simples, sem proteção          |
| Render  | checkbox "Render"  | Cloudflare, JS-heavy, SPAs           |

## Limitações

- Claude.ai e ChatGPT bloqueiam iframes por política CORS/CSP
- Vercel pode ser bloqueado por alguns sites
- Fallback: Railway ou servidor próprio para Puppeteer completo

## Capacidade Produtiva (`/capacidade`)

Aplicativo de gestão da capacidade da Caldeiraria e Usinagem, migrado do Excel do Gilmar (preserva a lógica de cálculo e os gráficos). Telas: Dashboard, Simulador, Usinagem, Células, Tempos padrão (edição direta + colar do Excel), Turnos e pessoas, Gráficos do Excel (G1–G8) e Importar/Exportar.

```bash
npm install
npm run dev        # http://localhost:3000/capacidade
npm test           # testes dos cálculos (valida contra o Excel)
npm run build
```

- Cálculos: `lib/capacidade.ts` (funções puras testadas em `tests/`). Estado: `lib/store.tsx`. Gráficos: `components/graficos.tsx` (Recharts).
- Sem configuração o app salva no navegador. Para login, papéis (leitor/editor/admin), histórico e dados compartilhados: crie um projeto no Supabase, rode `supabase/schema.sql`, copie `.env.example` para `.env.local` e preencha.
- Publicação na Vercel: importe o repositório, defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (opcional) e faça o deploy. `.npmrc` já define `legacy-peer-deps`.
- Excel equivalente: `Capacidade_Produtiva_Caldeiraria.xlsx` (gerado por `tools/gerar_capacidade.py`). Dados: `tools/dados_usinagem.json`, `tools/dados_graficos.json` (extraídos por `tools/extrair_usinagem.py`).
- Documentos: `docs/INVENTARIO_GRAFICOS.md`, `docs/VALIDACAO.md`.
