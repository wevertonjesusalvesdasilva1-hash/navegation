'use client';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Num, Titulo, h1 } from '@/components/ui';
import { ParamCen } from '@/components/ParamCen';
import { horasTurno } from '@/lib/capacidade';

export default function Turnos() {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const c = a.est.cenarios[a.sel];
  const nome = (k: string) => ({ turnos: 'turnos ativos', heH: 'HE h/dia', heDias: 'dias HE', efic: 'eficiência', disp: 'disponibilidade', fDem: 'fator demanda', fTempo: 'fator tempo', base: 'base de tempo' } as Record<string, string>)[k] ?? k;
  const horasAtivas = e.turnos.reduce((s, t, i) => s + (c.turnos[i] ? horasTurno(t) : 0), 0);
  const ctrl = (i: number, campo: 'ini' | 'fim' | 'pausa', v: string | number) => set((n) => { (n.est.turnos[i] as any)[campo] = v; }, { campo: `Turno ${e.turnos[i].nome} — ${campo}`, de: String(e.turnos[i][campo]), para: String(v) });
  return (
    <>
      <Titulo t="Turnos e pessoas" sub="Altere horários, intervalos, dias úteis, horas extras e máquinas. O impacto aparece na hora." />
      <Card>
        <Titulo t="Escala atual × nova escala" sub="A escala atual vem do Excel; a nova escala é a que alimenta todos os cálculos. Compare em Capacidade por turno.">
          <Btn onClick={() => { set((n) => { n.est.turnos = structuredClone(n.est.turnosAtual ?? n.est.turnos); }, { campo: 'Nova escala = escala atual', de: '', para: '' }); aviso('Nova escala igualada à atual'); }}>Nova = Atual</Btn>
          <Link href="/capacidade/turno" className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition active:scale-95">Ver capacidade por turno →</Link>
        </Titulo>
        <div className="grid gap-4 md:grid-cols-3">
          {e.turnos.map((t, i) => {
            const at = a.est.turnosAtual?.[i] ?? t; const dh = horasTurno(t) - horasTurno(at);
            const campo = (esc: 'turnosAtual' | 'turnos', k: 'ini' | 'fim' | 'pausa', v: string | number) => set((n) => { ((n.est as any)[esc][i] as any)[k] = v; }, { campo: `${esc === 'turnos' ? 'Nova' : 'Atual'} escala — turno ${t.nome} ${k}`, de: String((esc === 'turnos' ? t : at)[k]), para: String(v) });
            return (
              <div key={t.nome} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Turno {t.nome}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${c.turnos[i] ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>{c.turnos[i] ? 'ativo no cenário' : 'inativo'}</span></div>
                {([['turnosAtual', 'Escala atual', at], ['turnos', 'Nova escala', t]] as const).map(([esc, nm, v]) => (
                  <div key={esc} className="mb-2"><div className="text-[11px] uppercase tracking-wide text-slate-400">{nm}</div>
                    <div className="flex items-center gap-1.5"><Inp type="time" value={v.ini} onChange={(x) => campo(esc, 'ini', x.target.value)} /><span>→</span><Inp type="time" value={v.fim} onChange={(x) => campo(esc, 'fim', x.target.value)} /></div>
                    <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">Intervalo (min)<Num v={v.pausa} max={240} w="w-16" on={(x) => campo(esc, 'pausa', x)} /><b className="ml-auto text-slate-700">{h1(horasTurno(v), 2)} h produtivas</b></label></div>
                ))}
                <div className={`border-t pt-2 text-sm font-medium ${dh === 0 ? 'text-slate-400' : dh > 0 ? 'text-green-600' : 'text-red-600'}`}>{dh === 0 ? 'sem mudança' : `${dh > 0 ? '+' : ''}${h1(dh, 2)} h/dia por pessoa/máquina (${dh > 0 ? '+' : ''}${h1(dh * e.diasMes)} h/mês)`}</div>
              </div>
            );
          })}
        </div>
      </Card>
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
