'use client';
import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Num, Titulo, h1 } from '@/components/ui';
import { ParamCen } from '@/components/ParamCen';
import { horasTurno } from '@/lib/capacidade';
import { inicial } from '@/lib/dados';

export default function Turnos() {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const base = useRef(inicial().est.turnos);
  const c = a.est.cenarios[a.sel];
  const nome = (k: string) => ({ turnos: 'turnos ativos', heH: 'HE h/dia', heDias: 'dias HE', efic: 'eficiência', disp: 'disponibilidade', fDem: 'fator demanda', fTempo: 'fator tempo', base: 'base de tempo' } as Record<string, string>)[k] ?? k;
  const horasAtivas = e.turnos.reduce((s, t, i) => s + (c.turnos[i] ? horasTurno(t) : 0), 0);
  const ctrl = (i: number, campo: 'ini' | 'fim' | 'pausa', v: string | number) => set((n) => { (n.est.turnos[i] as any)[campo] = v; }, { campo: `Turno ${e.turnos[i].nome} — ${campo}`, de: String(e.turnos[i][campo]), para: String(v) });
  return (
    <>
      <Titulo t="Turnos e pessoas" sub="Altere horários, intervalos, dias úteis, horas extras e máquinas. O impacto aparece na hora." />
      <div className="grid gap-4 md:grid-cols-3">
        {e.turnos.map((t, i) => {
          const dh = horasTurno(t) - horasTurno(base.current[i]);
          return (
            <Card key={t.nome}>
              <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Turno {t.nome}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${c.turnos[i] ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>{c.turnos[i] ? 'ativo no cenário' : 'inativo'}</span></div>
              <div className="flex items-center gap-2"><Inp type="time" value={t.ini} onChange={(x) => ctrl(i, 'ini', x.target.value)} /><span>→</span><Inp type="time" value={t.fim} onChange={(x) => ctrl(i, 'fim', x.target.value)} /></div>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-500">Intervalo (min)<Num v={t.pausa} max={240} w="w-16" on={(v) => ctrl(i, 'pausa', v)} /></label>
              <div className="mt-3 text-2xl font-semibold">{h1(horasTurno(t), 2)} h<span className="text-sm font-normal text-slate-400"> produtivas/dia</span></div>
              <div className={`text-xs ${dh === 0 ? 'text-slate-400' : dh > 0 ? 'text-green-600' : 'text-red-600'}`}>{dh === 0 ? 'igual ao Excel original' : `${dh > 0 ? '+' : ''}${h1(dh, 2)} h/dia vs Excel (${h1(dh * e.diasMes)} h/mês por pessoa/máquina)`}</div>
            </Card>
          );
        })}
      </div>
      <Card>
        <Titulo t={`Cenário ${c.nome} — jornada, HE e dias`} sub={`${h1(horasAtivas, 2)} h/dia nos turnos ativos × ${e.diasMes} dias úteis em ${a.meses[a.mes]}`} />
        <ParamCen c={c} turnos={e.turnos.map((t) => t.nome)} on={(k, v) => set((n) => { (n.est.cenarios[a.sel] as any)[k] = v; }, { campo: `${c.nome} — ${nome(k)}`, de: String(c[k]), para: String(v) })} />
      </Card>
      <Card>
        <Titulo t="Dias úteis por mês" sub="semana de trabalho e feriados por mês" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">{a.meses.map((m, i) => <label key={m} className="text-center text-xs text-slate-500">{m}<Num v={a.dias[i]} max={31} w="w-full" on={(v) => set((n) => { n.dias[i] = v; }, { campo: `Dias úteis ${m}`, de: String(a.dias[i]), para: String(v) })} /></label>)}</div>
      </Card>
      <Card>
        <Titulo t="Máquinas disponíveis" sub="cada máquina entra nos cálculos e nas listas de seleção" />
        <div className="flex flex-wrap gap-2">
          {a.est.maquinas.filter(Boolean).map((m) => <span key={m} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-800">{m}<button className="text-blue-400 hover:text-red-600" onClick={() => confirm(`Remover a máquina ${m}?`) && set((n) => { n.est.maquinas = n.est.maquinas.filter((x) => x !== m); }, { campo: 'Máquina removida', de: m, para: '' })}>×</button></span>)}
          <form className="flex gap-2" onSubmit={(x) => { x.preventDefault(); const f = new FormData(x.currentTarget); const v = String(f.get('m') ?? '').trim(); if (!v || a.est.maquinas.includes(v)) return aviso('Informe um nome novo'); set((n) => { n.est.maquinas.push(v); }, { campo: 'Nova máquina', de: '', para: v }); x.currentTarget.reset(); }}><Inp name="m" placeholder="Nova máquina" /><Btn type="submit" v="soft">Adicionar</Btn></form>
        </div>
      </Card>
      <p className="text-xs text-slate-400">Funcionários por célula: veja a aba <b>Células</b>. Capacidade total do cenário: {h1(r.maquinas.reduce((s, m) => s + m.efetiva, 0))} h de máquina e {h1(r.celulas.reduce((s, m) => s + m.efetiva, 0))} h-homem.</p>
    </>
  );
}
