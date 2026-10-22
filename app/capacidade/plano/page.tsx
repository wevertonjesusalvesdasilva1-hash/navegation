'use client';
import { useStore } from '@/lib/store';
import { Btn, Card, Num, Titulo } from '@/components/ui';
import { Grid, Col } from '@/components/Grid';
import { FAMILIAS } from '@/lib/capacidade';

type Row = { modelo: string; familia: string } & Record<`m${number}`, number>;

export default function Plano() {
  const { a, set, aviso } = useStore();
  const cols: Col<Row>[] = [{ key: 'modelo', label: 'Modelo', w: 'w-32' }, { key: 'familia', label: 'Família', opcoes: FAMILIAS, w: 'w-24' },
    ...a.meses.map((m, i): Col<Row> => ({ key: `m${i}` as `m${number}`, label: m + (i === a.mes ? ' ●' : ''), tipo: 'num', w: 'w-20' }))];
  const rows = a.plano.map((p, id) => ({ id, row: { modelo: p.modelo, familia: p.familia, ...Object.fromEntries(p.qtd.map((q, i) => [`m${i}`, q])) } as Row }));
  return (
    <>
      <Titulo t="Plano de produção e dias úteis" sub="Demanda mensal por modelo (máquinas/mês). Altere e todas as cargas recalculam.">
        <Btn onClick={() => set((n) => { n.plano.push({ modelo: 'NOVO', familia: 'HE/PC', qtd: Array(12).fill(0) }); }, { campo: 'Novo modelo no plano', de: '', para: 'NOVO' })}>+ Modelo</Btn>
      </Titulo>
      <Card>
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">{a.meses.map((m, i) => <label key={m} className="text-center text-xs text-slate-500">dias {m}<Num v={a.dias[i]} max={31} w="w-full" on={(v) => set((n) => { n.dias[i] = v; }, { campo: `Dias úteis ${m}`, de: String(a.dias[i]), para: String(v) })} /></label>)}</div>
        <Grid cols={cols} rows={rows} onSalvar={(ms) => { set((n) => ms.forEach((m) => { const p = n.plano[m.id]; if (m.key === 'modelo') p.modelo = String(m.para); else if (m.key === 'familia') p.familia = String(m.para); else p.qtd[+String(m.key).slice(1)] = Number(m.para); }), ms.map((m) => ({ campo: `Plano ${a.plano[m.id].modelo} — ${m.key.startsWith('m') && m.key !== 'modelo' ? a.meses[+m.key.slice(1)] : m.key}`, de: String(m.de), para: String(m.para) }))); aviso('Plano salvo — cargas recalculadas'); }} />
      </Card>
    </>
  );
}
