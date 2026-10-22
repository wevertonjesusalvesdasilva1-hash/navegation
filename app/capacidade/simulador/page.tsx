'use client';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Modal, Num, Sel, Status, Titulo, corUtil, h1, pct } from '@/components/ui';
import { ParamCen } from '@/components/ParamCen';
import { Cenario, calcular } from '@/lib/capacidade';

export default function Simulador() {
  const { a, efetivo: e, r, set, aviso, papel } = useStore();
  const orig = a.est.cenarios[a.sel];
  const [cen, setCen] = useState<Cenario>(orig);
  const [dias, setDias] = useState(a.dias[a.mes]);
  const [celula, setCelula] = useState(''), [delta, setDelta] = useState(0);
  const [cmp, setCmp] = useState(false), [apl, setApl] = useState(false);
  useEffect(() => { setCen(a.est.cenarios[a.sel]); setDias(a.dias[a.mes]); setDelta(0); }, [a.sel, a.mes]); // eslint-disable-line

  const sim = useMemo(() => calcular({ ...e, diasMes: dias,
    cenarios: e.cenarios.map((c, i) => (i === a.sel ? cen : c)),
    celulas: e.celulas.map((c) => (c.nome === celula && delta ? { ...c, func: c.func.map((f, k) => (k === a.sel ? (f.map((n) => Math.max(0, n + delta)) as [number, number, number]) : f)) } : c)) }, a.sel), [e, cen, dias, celula, delta, a.sel]);
  const soma = (x: typeof r, k: 'efetiva' | 'carga' | 'deficit' | 'ocioso') => x.maquinas.reduce((s, m) => s + m[k], 0);
  const capA = soma(r, 'efetiva'), capS = soma(sim, 'efetiva'), carS = soma(sim, 'carga'), carA = soma(r, 'carga');
  const dem = e.linhas.reduce((s, l) => s + l.dem, 0);
  const atend = (x: typeof r) => Math.min(1, Math.min(...x.maquinas.filter((m) => m.carga > 0).map((m) => (m.efetiva / m.carga))), 9);
  const mudou = JSON.stringify(cen) !== JSON.stringify(orig) || dias !== a.dias[a.mes] || delta !== 0;
  const pode = ['admin', 'editor', 'local'].includes(papel);
  const comparar = useMemo(() => [{ nome: `${orig.nome} (oficial)`, c: orig }, { nome: 'Simulação atual', c: cen }, ...a.salvos.map((s) => ({ nome: s.nome, c: s.cenario }))].map((x) => {
    const y = calcular({ ...e, cenarios: [x.c] }, 0); const cap = soma(y, 'efetiva'), car = soma(y, 'carga');
    return { nome: x.nome, cap, car, util: cap ? car / cap : 0, he: soma(y, 'deficit'), insuf: y.maquinas.filter((m) => m.status === 'INSUFICIENTE').length, atend: atend(y) };
  }), [e, orig, cen, a.salvos]); // eslint-disable-line

  const L = ({ t, v, s }: { t: string; v: string; s?: string }) => <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">{t}</div><div className="text-xl font-semibold">{v}</div>{s && <div className="text-xs text-slate-400">{s}</div>}</div>;
  const dh = capS - capA;
  return (
    <>
      <Titulo t="Simulador de capacidade" sub={`Base: cenário ${orig.nome} · ${a.meses[a.mes]}. Resultados atualizam durante a digitação, sem salvar.`}>
        <Btn disabled={!mudou} onClick={() => { setCen(orig); setDias(a.dias[a.mes]); setDelta(0); }}>Restaurar valores originais</Btn>
        <Btn onClick={() => { const nm = prompt('Nome do cenário:', `Simulação ${a.salvos.length + 1}`); if (nm) { set((n) => { n.salvos.push({ id: String(Date.now()), nome: nm, cenario: cen, t: Date.now() }); }, { campo: 'Cenário salvo', de: '', para: nm }); } }}>Salvar cenário</Btn>
        <Btn onClick={() => setCmp(true)}>Comparar cenários</Btn>
        <Btn v="primary" disabled={!mudou || !pode} title={pode ? '' : 'Seu papel não permite alterar o planejamento oficial'} onClick={() => setApl(true)}>Aplicar ao planejamento oficial</Btn>
      </Titulo>
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card>
          <h3 className="mb-3 font-semibold">Parâmetros</h3>
          <ParamCen c={cen} turnos={e.turnos.map((t) => t.nome)} on={(k, v) => setCen({ ...cen, [k]: v })} compacto />
          <label className="mt-2 flex items-center justify-between gap-2"><span className="text-slate-500">Dias úteis</span><Num v={dias} max={31} on={setDias} /></label>
          <div className="mt-4 border-t pt-3"><div className="mb-1 text-xs font-medium text-slate-500">Funcionários (células)</div>
            <div className="flex items-center gap-2"><Sel value={celula} onChange={(x) => setCelula(x.target.value)} className="flex-1"><option value="">célula…</option>{e.celulas.map((c) => <option key={c.nome}>{c.nome}</option>)}</Sel>
              <Btn onClick={() => setDelta(delta - 1)}>−</Btn><b className="w-8 text-center">{delta > 0 ? '+' : ''}{delta}</b><Btn onClick={() => setDelta(delta + 1)}>+</Btn></div>
            <p className="mt-1 text-[11px] text-slate-400">variação por turno ativo na célula escolhida</p></div>
          <p className="mt-3 text-[11px] text-slate-400">Tempo padrão: use “Tempo ×”. Para tempos individuais, edite em <b>Tempos padrão</b> e veja o efeito aqui.</p>
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <L t="Capacidade anterior (h)" v={h1(capA)} /><L t="Capacidade simulada (h)" v={h1(capS)} />
              <L t="Diferença (h)" v={`${dh >= 0 ? '+' : ''}${h1(dh)}`} s={capA ? `${dh >= 0 ? '+' : ''}${h1((dh / capA) * 100)}%` : ''} /><L t="Plano atendido" v={pct(Math.min(1, atend(sim)))} s={`antes: ${pct(Math.min(1, atend(r)))}`} />
              <L t="Carga simulada (h)" v={h1(carS)} s={`antes ${h1(carA)}`} /><L t="Utilização" v={pct(capS ? carS / capS : 0)} s={`antes ${pct(capA ? carA / capA : 0)}`} />
              <L t="HE necessárias (h)" v={h1(soma(sim, 'deficit'))} s={`antes ${h1(soma(r, 'deficit'))}`} /><L t="Máquinas possíveis no mês" v={h1(dem * Math.min(atend(sim), 9), 0)} s={`plano: ${h1(dem, 0)} · antes ${h1(dem * Math.min(atend(r), 9), 0)}`} />
            </div>
          </Card>
          <Card>
            <h3 className="mb-2 font-semibold">Máquinas — antes × simulado</h3>
            <table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">Máquina</th><th>Cap. antes</th><th>Cap. simulada</th><th>Δ h</th><th>Util. antes</th><th>Util. simulada</th><th>Status</th></tr></thead><tbody>
              {sim.maquinas.map((m, i) => <tr key={m.nome} className="border-t"><td className="text-left font-medium">{m.nome}</td><td>{h1(r.maquinas[i].efetiva)}</td><td>{h1(m.efetiva)}</td><td className={m.efetiva - r.maquinas[i].efetiva >= 0 ? 'text-green-600' : 'text-red-600'}>{h1(m.efetiva - r.maquinas[i].efetiva)}</td><td>{pct(r.maquinas[i].util)}</td><td className="font-semibold" style={{ color: corUtil(m.util, e.amarelo, e.vermelho) }}>{pct(m.util)}</td><td><Status s={m.status} /></td></tr>)}
            </tbody></table>
            <p className="mt-2 text-xs text-slate-500"><b>Gargalo:</b> {[...sim.maquinas].sort((x, y) => y.util - x.util)[0]?.nome} ({pct(Math.max(0, ...sim.maquinas.map((m) => m.util)))}) · fluxos: {sim.gargalos.slice(0, 3).map((g) => `${g.chave} → ${g.recurso}`).join(' · ')}</p>
          </Card>
          {sim.celulas.length > 0 && <Card><h3 className="mb-2 font-semibold">Células</h3>
            <table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">Célula</th><th>Func.</th><th>Cap. antes</th><th>Cap. simulada</th><th>Util. simulada</th><th>Func. adic.</th></tr></thead><tbody>
              {sim.celulas.map((c, i) => <tr key={c.nome} className="border-t"><td className="text-left font-medium">{c.nome}</td><td>{c.func}</td><td>{h1(r.celulas[i]?.efetiva ?? 0)}</td><td>{h1(c.efetiva)}</td><td style={{ color: corUtil(c.util, e.amarelo, e.vermelho) }}>{pct(c.util)}</td><td>{h1(c.funcAdic)}</td></tr>)}</tbody></table></Card>}
        </div>
      </div>
      <Modal aberto={cmp} fechar={() => setCmp(false)} titulo="Comparar cenários">
        <table className="w-full text-right text-sm"><thead><tr className="text-xs text-slate-500"><th className="text-left">Cenário</th><th>Cap. (h)</th><th>Carga (h)</th><th>Util.</th><th>HE (h)</th><th>Insuf.</th><th>Plano atendido</th></tr></thead><tbody>
          {comparar.map((x) => <tr key={x.nome} className="border-t"><td className="text-left">{x.nome}</td><td>{h1(x.cap)}</td><td>{h1(x.car)}</td><td style={{ color: corUtil(x.util, e.amarelo, e.vermelho) }}>{pct(x.util)}</td><td>{h1(x.he)}</td><td>{x.insuf}</td><td>{pct(Math.min(1, x.atend))}</td></tr>)}</tbody></table>
        {a.salvos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{a.salvos.map((s) => <Btn key={s.id} onClick={() => { setCen(s.cenario); setCmp(false); aviso(`Cenário "${s.nome}" carregado no simulador`); }}>Carregar “{s.nome}”</Btn>)}</div>}
      </Modal>
      <Modal aberto={apl} fechar={() => setApl(false)} titulo="Aplicar ao planejamento oficial">
        <p className="mb-3">Isto substitui os parâmetros do cenário <b>{orig.nome}</b> pelos valores simulados{dias !== a.dias[a.mes] ? ` e altera os dias úteis de ${a.meses[a.mes]} para ${dias}` : ''}. A alteração fica no histórico e pode ser desfeita no botão Desfazer.</p>
        <div className="flex justify-end gap-2"><Btn onClick={() => setApl(false)}>Cancelar</Btn><Btn v="danger" onClick={() => { set((n) => { n.est.cenarios[a.sel] = cen; n.dias[n.mes] = dias; }, { campo: `Cenário ${orig.nome} atualizado pelo simulador`, de: JSON.stringify(orig), para: JSON.stringify(cen) }); setApl(false); aviso('Planejamento oficial atualizado'); }}>Confirmar e aplicar</Btn></div>
      </Modal>
    </>
  );
}
