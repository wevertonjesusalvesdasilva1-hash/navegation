'use client';
import { ReactNode, useRef, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from 'recharts';
import graf from '@/tools/dados_graficos.json';
import { Btn, Card, cx } from '@/components/ui';
import type { App } from '@/lib/dados';
import type { calcular } from '@/lib/capacidade';

type R = ReturnType<typeof calcular>;
// Paleta do tema Office do Excel original (accent1..6) e cores explícitas das séries
const AC = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];
const COR: Record<string, string> = {
  'D51-22': AC[0], 'D51-24': '#7030A0', 'D61-23': '#002060', 'D61-24': '#5B9BD5', 'D71-24': AC[5], 'GD655-5': '#FFC000', PC130: '#9E480E', PC160: AC[2], PC200: AC[1],
  PC210F: AC[4], PC220F: AC[0], PC210: '#264478', PC210LC: '#9E480E', PC240: '#636363', PC360: '#997300', WA200: '#43682B', WA320: '#698ED0', WA380: '#F1975A', WA150: '#B7B7B7', PC500: AC[3], 'GD535-5': AC[4],
  'PC160-8': '#70AD47', 'PC200-8': '#FFC000', 'PC350LC-8': '#9E480E', 'PC200LC-8B': '#636363', 'PC130-8': '#F1975A', 'PC240-8': '#B7B7B7', 'PC200-FX': AC[2], A91: AC[3], GD535: AC[4],
};
export const cor = (n: string, i = 0) => COR[n] ?? AC[i % 6];

/** Moldura: id de rastreabilidade com o gráfico do Excel, tela cheia e exportação PNG. */
export function Quadro({ id, origem, titulo, children, alto = 340, nota, larg }: { id: string; origem: string; titulo: string; children: ReactNode; alto?: number; nota?: string; larg?: number }) {
  const [cheio, setCheio] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const png = () => {
    const svg = ref.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null; if (!svg) return;
    const w = svg.clientWidth, h = svg.clientHeight, s = new XMLSerializer().serializeToString(svg);
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = `${id}.png`; a.click(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  };
  return (
    <div className={cx(cheio && 'fixed inset-0 z-50 overflow-auto bg-white p-4')}>
      <Card className={cx(cheio && 'min-h-full')}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div><h3 className="font-semibold text-slate-800">{titulo}</h3><p className="text-[11px] text-slate-400"><b>{id}</b> · origem Excel: {origem}</p></div>
          <div className="flex gap-1.5"><Btn onClick={png}>PNG</Btn><Btn onClick={() => setCheio(!cheio)}>{cheio ? 'Sair' : 'Tela cheia'}</Btn></div>
        </div>
        <div ref={ref} className={larg ? 'overflow-x-auto' : ''}><div style={{ height: cheio ? '78vh' : alto, minWidth: larg }}>{children}</div></div>
        {nota && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{nota}</p>}
      </Card>
    </div>
  );
}

const eixo = (t: string) => ({ value: t, angle: -90, position: 'insideLeft' as const, style: { fontSize: 11 } });

/** G1 — 5.Load Graph: carga (h) por máquina empilhada por modelo + 4 linhas de capacidade. */
export function GCarga({ a, r, onDetalhe }: { a: App; r: R; onDetalhe?: (maq: string, modelo: string, h: number) => void }) {
  const modelos = a.plano.map((p) => p.modelo).filter((m) => r.maquinas.some((q) => (r.pilha[q.nome]?.[m] ?? 0) > 0));
  const dados = r.maquinas.map((q) => ({ maq: q.nome, ...Object.fromEntries(modelos.map((m) => [m, +(r.pilha[q.nome]?.[m] ?? 0).toFixed(2)])), ...r.capLinhas }));
  return (
    <Quadro id="G1" origem="5.Load Graph (gráfico de colunas empilhadas + linhas)" titulo="Carga de trabalho × capacidade das máquinas de usinagem" alto={380}>
      <ResponsiveContainer><ComposedChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="maq" /><YAxis label={eixo('[HRS]')} /><Tooltip formatter={(v: any) => Number(v).toFixed(1) + ' h'} /><Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        {modelos.map((m, i) => <Bar key={m} dataKey={m} stackId="c" fill={cor(m, i)} cursor="pointer" onClick={(d: any) => onDetalhe?.(d.maq ?? d.payload?.maq, m, d.payload?.[m] ?? 0)} />)}
        <Line dataKey="t1" name="1 turno" stroke="#0000FF" dot={false} strokeWidth={2} /><Line dataKey="t1he" name="1 turno (HE)" stroke="#0000FF" strokeDasharray="6 4" dot={false} strokeWidth={2} />
        <Line dataKey="t2" name="2 turnos" stroke="#FF0000" dot={false} strokeWidth={2} /><Line dataKey="t2he" name="2 turnos (HE)" stroke="#FF0000" strokeDasharray="6 4" dot={false} strokeWidth={2} />
      </ComposedChart></ResponsiveContainer>
    </Quadro>
  );
}

/** G2 — 3. Production Plan: plano mensal por família + total. */
export function GPlano({ a }: { a: App }) {
  const f = (pre: (m: string) => boolean, i: number) => a.plano.filter((p) => pre(p.modelo)).reduce((s, p) => s + (p.qtd[i] ?? 0), 0);
  const dados = a.meses.map((m, i) => ({ mes: m, HE: f((x) => x.startsWith('PC'), i), CT: f((x) => x.startsWith('D'), i), WL: f((x) => x.startsWith('WA'), i), MG: f((x) => x.startsWith('GD'), i), TTL: a.plano.reduce((s, p) => s + (p.qtd[i] ?? 0), 0) }));
  return (
    <Quadro id="G2" origem="3. Production Plan (gráfico de linhas)" titulo="Plano de produção por família" alto={300}
      nota="No Excel este gráfico aponta para as linhas 39–46, que estão zeradas; aqui as séries vêm do plano por modelo (linhas 5–25). Eixo: no original '[Qtd Maquinas/Dia]', mas os valores são mensais.">
      <ResponsiveContainer><LineChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" /><YAxis label={eixo('[Qtd Máquinas/Mês]')} /><Tooltip /><Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Line dataKey="HE" stroke={AC[0]} strokeWidth={2} /><Line dataKey="CT" stroke={AC[1]} strokeWidth={2} /><Line dataKey="WL" stroke={AC[2]} strokeWidth={2} /><Line dataKey="MG" stroke={AC[4]} strokeWidth={2} /><Line dataKey="TTL" stroke={AC[3]} strokeWidth={2.5} /></LineChart></ResponsiveContainer>
    </Quadro>
  );
}

function empilhado(d: { dias: string[]; series: { nome: string; valores: number[] }[] }) {
  const dados = d.dias.map((dia, i) => ({ dia, ...Object.fromEntries(d.series.map((s) => [s.nome, s.valores[i]])) }));
  return (
    <ResponsiveContainer><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="dia" tick={{ fontSize: 11 }} /><YAxis label={eixo('Hrs')} /><Tooltip formatter={(v: any) => Number(v).toFixed(1) + ' h'} /><Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
      {d.series.map((s, i) => <Bar key={s.nome} dataKey={s.nome} stackId="s" fill={AC[i % 6]} />)}</BarChart></ResponsiveContainer>
  );
}
export const GHoraExtraDia = () => <Quadro id="G3" origem="Planilha2 — 'Hora extra por dia'" titulo={`Hora extra por dia (${graf.hora_extra_dia.mes})`} alto={360} nota="Dados do Excel (resumo da aba HORA EXTRA REAL). Somente leitura nesta versão.">{empilhado(graf.hora_extra_dia)}</Quadro>;
export const GHoraExtraMes = () => <Quadro id="G4" origem="Planilha2 — célula BOOM HE por mês" titulo="Hora extra — BOOM HE por mês e dia da semana" alto={360} nota="Dados do Excel. Somente leitura nesta versão.">{empilhado(graf.hora_extra_boom_he)}</Quadro>;

/** G5/G6 — 7.Pitch-Time Graph: minutos por máquina de um modelo + linha de Pitch-Time. */
export function GPitch({ a, modelo, pitch }: { a: App; modelo: string; pitch: number }) {
  const maqs = a.est.maquinas.filter(Boolean);
  const dados = maqs.map((m) => ({ maq: m, [modelo]: +a.est.linhas.filter((l) => l.modelo === modelo && l.maquina === m).reduce((s, l) => s + l.tp, 0).toFixed(2), pitch }));
  return (
    <Quadro id="G5/G6" origem="7.Pitch-Time Graph (PC160-8 e PC200-8)" titulo={`HE ● PITCH-TIME STUDY (${modelo})`} alto={300}
      nota="No Excel o Pitch-Time está como #DIV/0! (aba 6.Pitch-Time) e os tempos do modelo estão zerados. Aqui o Pitch-Time é um valor editável (0 = não definido).">
      <ResponsiveContainer><ComposedChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="maq" /><YAxis label={eixo('[Min]')} /><Tooltip /><Legend />
        <Bar dataKey={modelo} stackId="p" fill="#002060" /><Line dataKey="pitch" name="PITCH-TIME (HE)" stroke={AC[0]} strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer>
    </Quadro>
  );
}

/** G7 — 10.Machine Load Graph (jigs/serras da Caldeiraria) — valores em cache do Excel. */
export function GMaqCaldeiraria() {
  const g = graf.maquinas_caldeiraria;
  const dados = g.cats.map((c, i) => ({ c, ...Object.fromEntries(g.series.map((s) => [s.nome, s.valores[i]])), ...Object.fromEntries(g.capacidade.map((k) => [k.nome, k.valor])) }));
  return (
    <Quadro id="G7" origem="10.Machine Load Graph (gráfico 1)" titulo="Carga dos postos (jigs/serras) da Caldeiraria × capacidade" alto={380} larg={1500}
      nota="Valores em cache do Excel (mês da aba 5). No Excel, a ligação com o plano é por posição da linha (HLOOKUP com índice), e os nomes de modelo divergem do plano: por isso não foi recalculado — pendente de confirmação do mapa de modelos.">
      <ResponsiveContainer><ComposedChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="c" tick={{ fontSize: 9 }} interval={0} angle={-60} textAnchor="end" height={60} /><YAxis label={eixo('[HRS]')} /><Tooltip /><Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        {g.series.map((s, i) => <Bar key={s.nome} dataKey={s.nome} stackId="m" fill={cor(s.nome, i)} />)}
        {g.capacidade.map((k, i) => <Line key={k.nome} dataKey={k.nome} stroke={i < 2 ? '#000' : '#002060'} strokeDasharray={i % 2 ? '6 4' : undefined} dot={false} />)}</ComposedChart></ResponsiveContainer>
    </Quadro>
  );
}
