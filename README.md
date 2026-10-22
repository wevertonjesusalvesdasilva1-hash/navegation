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
App web de capacidade da usinagem (UMC01, UMC02, NCBZ, HMC-16), com dados do Excel do Gilmar.
- Edite cenários, turnos, plano, tempos e veja o impacto na hora. O estado fica salvo no navegador (Exportar/Importar JSON).
- Motor de cálculo: `lib/capacidade.ts`. Dados: `tools/dados_usinagem.json`.
- Excel equivalente: `Capacidade_Produtiva_Caldeiraria.xlsx`, gerado por `python3 tools/gerar_capacidade.py <saida.xlsx>`.
- Reextrair dados: `python3 -I tools/extrair_usinagem.py <arquivo_original.xlsx>`.
