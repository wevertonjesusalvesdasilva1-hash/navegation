'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, Sel, Titulo } from '@/components/ui';
import { GCarga, GHoraExtraDia, GHoraExtraMes, GMaqCaldeiraria, GPitch, GPlano } from '@/components/graficos';

const MATRIZ: [string, string, string, string, string][] = [
  ['G1', "5.Load Graph (gráfico 2)", 'Colunas empilhadas por modelo + 4 linhas (1/2 turnos, com e sem HE)', 'Reproduzido e recalculado', 'Tela Dashboard e Usinagem'],
  ['G2', "3. Production Plan (gráfico 1)", 'Linhas: HE, CT, WL, MG e TTL por mês', 'Reproduzido; original aponta p/ linhas zeradas (corrigido)', 'Dashboard'],
  ['G3', "Planilha2 (gráfico 3)", "'Hora extra por dia' — colunas empilhadas por processo", 'Reproduzido (valores do Excel, somente leitura)', 'Gráficos do Excel'],
  ['G4', "Planilha2 (gráfico 4)", 'Colunas empilhadas por mês, BOOM HE', 'Reproduzido (valores do Excel, somente leitura)', 'Gráficos do Excel'],
  ['G5', "7.Pitch-Time Graph (gráfico 5)", 'PITCH-TIME STUDY PC200-8', 'Reproduzido; original #DIV/0! / zerado', 'Gráficos do Excel'],
  ['G6', "7.Pitch-Time Graph (gráfico 6)", 'PITCH-TIME STUDY PC160-8', 'Reproduzido; original #DIV/0! / zerado', 'Gráficos do Excel'],
  ['G7', "10.Machine Load Graph (gráfico 7)", 'Carga dos postos (jigs/serras) + 4 linhas de capacidade', 'Reproduzido com valores em cache; recálculo pendente do mapa de modelos', 'Gráficos do Excel'],
  ['G8', "10.Machine Load Graph (gráfico 8)", 'Carga em horas/dia dos postos', 'Não reproduzido: 100% das séries estão #N/A no Excel', '—'],
];

export default function Graficos() {
  const { a, r } = useStore();
  const [mod, setMod] = useState('PC200');
  return (
    <>
      <Titulo t="Gráficos do Excel" sub="Reprodução dos 8 gráficos do arquivo original, com a mesma finalidade, séries, cores e eixos." />
      <GCarga a={a} r={r} />
      <GPlano a={a} />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0"><GHoraExtraDia /><GHoraExtraMes /></div>
      <Card className="!p-3"><label className="flex items-center gap-2 text-xs">Modelo do Pitch-Time:<Sel value={mod} onChange={(e) => setMod(e.target.value)}>{a.plano.map((p) => <option key={p.modelo}>{p.modelo}</option>)}</Sel></label></Card>
      <GPitch a={a} modelo={mod} pitch={a.pitch} />
      <GMaqCaldeiraria />
      <Card>
        <Titulo t="Matriz de correspondência Excel → App" />
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th>ID</th><th>Aba / gráfico original</th><th>Conteúdo</th><th>Situação</th><th>Tela</th></tr></thead><tbody>{MATRIZ.map((m) => <tr key={m[0]} className="border-t align-top">{m.map((c, i) => <td key={i} className="py-1.5 pr-3">{c}</td>)}</tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
