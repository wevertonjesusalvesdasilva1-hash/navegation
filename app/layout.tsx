import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Web Browser Proxy',
  description: 'Navegador proxy para acessar IAs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
