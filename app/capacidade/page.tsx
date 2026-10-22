'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dados from '@/tools/dados_usinagem.json';
import { Estado, Linha, calcular, horasTurno, novoEstado, Res, Status } from '@/lib/capacidade';

type Plano = { modelo: string; familia: string; qtd: number[] };
type App = { est: Estado; plano: Plano[]; dias: number[]; meses: string[]; mes: number; sel: number; fam: string };
type LinhaB = Omit<Linha, 'dem'>;

const inicial = (): App => {
  const e = novoEstado();
  e.turnos = [{ nome: 'A', ini: '07:30', fim: '17:08', pausa: 60 }, { nome: 'B', ini: '20:40', fim: '05:37', pausa: 60 }, { nome: 'C', ini: '22:00', fim: '06:00', pausa: 0 }];
  e.maquinas = dados.maquinas;
  const base = { efic: 0.845969, disp: 0.955, fDem: 1, fTempo: 0.9, base: 'Padrão' as const, heH: 0, heDias: 0 };
  e.cenarios = [
    { nome: 'Atual', turnos: [true, false, false], ...base },
    { nome: 'Ajustado', turnos: [true, true, false], ...base },
    { nome: 'Otimizado', turnos: [true, true, false], ...base, heH: 0.8, heDias: 21 },
  ];
  e.linhas = dados.linhas.map((l) => ({ familia: l.familia, modelo: l.modelo, peca: l.peca, processo: 'USINAGEM', celula: '', maquina: l.maquina, oper: 1, tp: l.tp, tr: 0, setup: 0, lote: 0, dem: 0 }));
  return { est: e, plano: dados.plano, dias: dados.dias, meses: dados.meses, mes: 6, sel: 0, fam: 'TODAS' };
};

const DOT: Record<Status, string> = { OK: 'bg-green-500', 'ATENÇÃO': 'bg-yellow-400', INSUFICIENTE: 'bg-red-500 pulse-dot', 'SEM CARGA': 'bg-gray-300' };
const BTN = 'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 shadow-sm transition duration-150 hover:border-blue-300 hover:text-blue-700 active:scale-95';
const COR: Record<Status, string> = { OK: 'bg-green-100 text-green-800', 'ATENÇÃO': 'bg-yellow-100 text-yellow-800', INSUFICIENTE: 'bg-red-100 text-red-800', 'SEM CARGA': 'bg-gray-100 text-gray-500' };
const corUtil = (u: number, e: Estado) => (u >= e.vermelho ? 'bg-red-500' : u >= e.amarelo ? 'bg-yellow-400' : 'bg-green-500');
const h = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const pc = (n: number) => (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%';

function Num({ v, on, step = 1, w = 'w-20' }: { v: number; on: (n: number) => void; step?: number; w?: string }) {
  return <input type="number" step={step} value={Number.isFinite(v) ? v : 0} onChange={(x) => on(parseFloat(x.target.value) || 0)} className={`${w} rounded-md border border-amber-200 bg-amber-50/70 px-1 py-0.5 text-right text-blue-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100`} />;
}
function useCount(alvo: number) {
  const [v, setV] = useState(alvo);
  const ant = useRef(alvo);
  useEffect(() => {
    const de = ant.current, t0 = performance.now();
    let id = 0;
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / 450); setV(de + (alvo - de) * (1 - Math.pow(1 - k, 3))); if (k < 1) id = requestAnimationFrame(tick); else ant.current = alvo; };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [alvo]);
  return v;
}
const Card = ({ t, n, f = h, s, ic }: { t: string; n: number; f?: (n: number) => string; s?: string; ic: string }) => {
  const v = useCount(n);
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between text-xs text-slate-500"><span>{t}</span><Ic d={ic} className="h-4 w-4 text-slate-300 transition group-hover:text-blue-500" /></div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">{f(v)}</div>{s && <div className="text-xs text-slate-400">{s}</div>}
    </div>
  );
};
const IC = {
  gauge: 'M12 14l4-4M3 17a9 9 0 1118 0',
  load: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v4m0 4h.01M10.3 4l-8 14a2 2 0 001.7 3h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7z',
  sliders: 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4m-6 2v4m8 2v4',
  cal: 'M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  timer: 'M10 2h4M12 8v5l3 2M20 13a8 8 0 11-16 0 8 8 0 0116 0z',
  split: 'M8 3H3v5m0-5l7 7m6-7h5v5m0-5l-7 7M12 14v7',
  dl: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  up: 'M12 20V9m0 0l-4 4m4-4l4 4M5 4h14',
  reset: 'M4 4v6h6M20 20v-6h-6M5 14a8 8 0 0014 2M19 10A8 8 0 005 8',
};
function Ic({ d, className = 'h-4 w-4' }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>;
}

export default function Capacidade() {
  const [a, setA] = useState<App>(inicial);
  const [aba, setAba] = useState('dash');
  useEffect(() => { try { const s = localStorage.getItem('cap_app'); if (s) setA(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('cap_app', JSON.stringify(a)); } catch {} }, [a]);

  const efetivo = useMemo<Estado>(() => {
    const dem = (m: string) => a.plano.find((p) => p.modelo === m)?.qtd[a.mes] ?? 0;
    return { ...a.est, diasMes: a.dias[a.mes], linhas: a.est.linhas.map((l) => ({ ...l, dem: dem(l.modelo) })) };
  }, [a]);
  const res = useMemo(() => efetivo.cenarios.map((_, i) => calcular(efetivo, i)), [efetivo]);
  const r = res[a.sel];
  const e = a.est;
  const set = (f: (x: App) => void) => setA((o) => { const n = structuredClone(o); f(n); return n; });
  const maqs = r.maquinas.filter((m) => a.fam === 'TODAS' || efetivo.linhas.some((l) => l.maquina === m.nome && l.familia === a.fam));
  const t = r.maquinas.reduce((x, m) => ({ cap: x.cap + m.efetiva, car: x.car + m.carga, def: x.def + m.deficit, oc: x.oc + m.ocioso }), { cap: 0, car: 0, def: 0, oc: 0 });
  const abas: [string, string, string][] = [['dash', 'Dashboard', IC.load], ['sim', 'Simulador', IC.sliders], ['cen', 'Cenários e Turnos', IC.moon], ['plano', 'Plano', IC.cal], ['tempos', 'Tempos', IC.timer], ['comp', 'Comparativo', IC.split]];

  const exportar = () => { const b = new Blob([JSON.stringify(a)], { type: 'application/json' }); const u = document.createElement('a'); u.href = URL.createObjectURL(b); u.download = 'capacidade.json'; u.click(); };
  const importar = (f?: File) => f?.text().then((x) => setA(JSON.parse(x)));

  return (
    <div className="min-h-screen bg-slate-50"><main className="mx-auto max-w-6xl space-y-5 p-4 text-sm text-slate-700 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-800"><Ic d={IC.gauge} className="h-6 w-6 text-blue-600" />Capacidade Produtiva <span className="font-normal text-slate-400">Usinagem</span></h1>
        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={a.sel} onChange={(x) => set((n) => { n.sel = +x.target.value; })}>{e.cenarios.map((c, i) => <option key={i} value={i}>{c.nome}</option>)}</select>
        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={a.mes} onChange={(x) => set((n) => { n.mes = +x.target.value; })}>{a.meses.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={a.fam} onChange={(x) => set((n) => { n.fam = x.target.value; })}>{['TODAS', 'HE/PC', 'WL/WA', 'CT', 'MG'].map((f) => <option key={f}>{f}</option>)}</select>
        <span className="ml-auto flex gap-2 text-xs">
          <a href="/Capacidade_Produtiva.xlsx" download className={BTN}><Ic d={IC.dl} />Excel</a>
          <button className={BTN} onClick={exportar}><Ic d={IC.dl} />JSON</button>
          <label className={BTN + ' cursor-pointer'}><Ic d={IC.up} />Importar<input type="file" accept=".json" hidden onChange={(x) => importar(x.target.files?.[0])} /></label>
          <button className={BTN} onClick={() => setA(inicial())}><Ic d={IC.reset} />Restaurar</button>
        </span>
      </header>
      <nav className="flex flex-wrap gap-1 rounded-xl bg-slate-200/60 p-1">{abas.map(([k, n, ic]) => <button key={k} onClick={() => setAba(k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 active:scale-95 ${aba === k ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Ic d={ic} />{n}</button>)}</nav>
      <div key={aba} className="animate-fade-up space-y-5">

      {aba === 'dash' && <>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Card t="Capacidade (h)" n={t.cap} ic={IC.gauge} /><Card t="Carga (h)" n={t.car} ic={IC.load} />
          <Card t="Utilização" n={t.cap ? t.car / t.cap : 0} f={pc} ic={IC.cpu} /><Card t="Excedente / HE (h)" n={t.def} ic={IC.alert} /><Card t="Ociosas (h)" n={t.oc} ic={IC.clock} />
        </div>
        <Tabela titulo="Utilização das máquinas de usinagem" itens={maqs} e={efetivo} />
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Máquina × nº de turnos (utilização)</h2>
          <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Máquina</th><th>Carga (h)</th><th>1 turno</th><th>2 turnos</th><th>3 turnos</th></tr></thead><tbody>
            {r.maquinas.map((m, i) => <tr key={m.nome} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="text-left font-medium">{m.nome}</td><td>{h(m.carga)}</td>{r.turnosMaq[i].map((u, k) => <td key={k}><span className={`rounded px-1.5 ${u >= e.vermelho ? 'bg-red-100 text-red-800' : u >= e.amarelo ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{pc(u)}</span></td>)}</tr>)}
          </tbody></table>
        </section>
        <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Gargalos por fluxo (modelo / peça) — recurso mais carregado</h2>
          <ul className="grid gap-x-6 md:grid-cols-2">{r.gargalos.slice(0, 10).map((g) => <li key={g.chave} className="flex justify-between border-t py-0.5"><span>{g.chave}</span><span><b>{g.recurso}</b> {pc(g.util)}</span></li>)}</ul>
        </section>
      </>}

      {aba === 'sim' && <section className="space-y-3">
        <p className="text-gray-500">Altere os valores do cenário <b>{e.cenarios[a.sel].nome}</b> e veja o impacto imediato nas máquinas.</p>
        <Cenario e={e} i={a.sel} set={set} />
        <Tabela titulo="Resultado" itens={r.maquinas} e={efetivo} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Card t="Máquina limitante" n={Math.max(0, ...r.maquinas.map((m) => m.util))} f={pc} s={[...r.maquinas].sort((x, y) => y.util - x.util)[0]?.nome ?? '-'} ic={IC.cpu} />
          <Card t="HE necessárias (h)" n={t.def} ic={IC.alert} /><Card t="Demanda do mês (pç)" n={r.tot.demanda} ic={IC.cal} /><Card t="Máquinas insuficientes" n={r.tot.maqInsuf} f={(x) => String(Math.round(x))} ic={IC.alert} />
        </div>
      </section>}

      {aba === 'cen' && <section className="space-y-3">
        {e.cenarios.map((_, i) => <Cenario key={i} e={e} i={i} set={set} />)}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"><h2 className="mb-2 font-semibold">Turnos e limites</h2>
          <div className="flex flex-wrap gap-4">{e.turnos.map((tn, i) => <div key={i} className="space-x-1">Turno {tn.nome}
            <input type="time" value={tn.ini} onChange={(x) => set((n) => { n.est.turnos[i].ini = x.target.value; })} className="rounded border border-yellow-300 bg-yellow-50" />
            <input type="time" value={tn.fim} onChange={(x) => set((n) => { n.est.turnos[i].fim = x.target.value; })} className="rounded border border-yellow-300 bg-yellow-50" />
            pausa <Num v={tn.pausa} on={(v) => set((n) => { n.est.turnos[i].pausa = v; })} w="w-14" />min = <b>{h(horasTurno(tn))} h</b></div>)}</div>
          <div className="mt-2 space-x-3">Atenção ≥ <Num v={e.amarelo * 100} on={(v) => set((n) => { n.est.amarelo = v / 100; })} w="w-14" />% · Insuficiente ≥ <Num v={e.vermelho * 100} on={(v) => set((n) => { n.est.vermelho = v / 100; })} w="w-14" />% · Dias úteis do mês: <b>{a.dias[a.mes]}</b> (edite na aba Plano)</div>
        </div>
      </section>}

      {aba === 'plano' && <section className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <table className="text-right"><thead><tr className="text-gray-500"><th className="text-left">Modelo</th>{a.meses.map((m, i) => <th key={i} className={i === a.mes ? 'text-blue-700' : ''}>{m}</th>)}</tr></thead><tbody>
          <tr><td className="text-left font-medium">Dias úteis</td>{a.dias.map((d, i) => <td key={i}><Num v={d} w="w-12" on={(v) => set((n) => { n.dias[i] = v; })} /></td>)}</tr>
          {a.plano.map((p, pi) => <tr key={p.modelo} className="border-t"><td className="text-left">{p.modelo} <span className="text-xs text-gray-400">{p.familia}</span></td>{p.qtd.map((q, i) => <td key={i}><Num v={q} w="w-12" on={(v) => set((n) => { n.plano[pi].qtd[i] = v; })} /></td>)}</tr>)}
        </tbody></table>
      </section>}

      {aba === 'tempos' && <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <p className="mb-2 text-gray-500">Tempo padrão em min/peça. Setup (min/lote), lote e tempo real não constam no arquivo — pendentes.</p>
        <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Peça</th><th className="text-left">Modelo</th><th className="text-left">Máquina</th><th>Tempo padrão</th><th>Tempo real</th><th>Setup/lote</th><th>Lote</th></tr></thead><tbody>
          {e.linhas.map((l, i) => <tr key={i} className="border-t"><td className="text-left">{l.peca}</td><td className="text-left">{l.modelo}</td><td className="text-left">{l.maquina}</td>
            {(['tp', 'tr', 'setup', 'lote'] as (keyof LinhaB)[]).map((k) => <td key={k}><Num v={l[k] as number} step={0.1} w="w-16" on={(v) => set((n) => { (n.est.linhas[i] as any)[k] = v; })} /></td>)}</tr>)}
        </tbody></table>
      </section>}

      {aba === 'comp' && <section className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Indicador (usinagem)</th>{e.cenarios.map((c) => <th key={c.nome}>{c.nome}</th>)}</tr></thead><tbody>
          {([['Capacidade efetiva (h)', (x: Res[]) => h(x.reduce((s, m) => s + m.efetiva, 0))], ['Carga (h)', (x: Res[]) => h(x.reduce((s, m) => s + m.carga, 0))],
            ['Utilização geral', (x: Res[]) => pc(x.reduce((s, m) => s + m.efetiva, 0) ? x.reduce((s, m) => s + m.carga, 0) / x.reduce((s, m) => s + m.efetiva, 0) : 0)],
            ['Horas excedentes / HE necessárias (h)', (x: Res[]) => h(x.reduce((s, m) => s + m.deficit, 0))], ['Horas ociosas (h)', (x: Res[]) => h(x.reduce((s, m) => s + m.ocioso, 0))],
            ['Máquinas insuficientes', (x: Res[]) => String(x.filter((m) => m.status === 'INSUFICIENTE').length)], ['Maior utilização', (x: Res[]) => pc(Math.max(0, ...x.map((m) => m.util)))]] as [string, (x: Res[]) => string][])
            .map(([n, f]) => <tr key={n} className="border-t"><td className="text-left">{n}</td>{res.map((rr, i) => <td key={i}>{f(rr.maquinas)}</td>)}</tr>)}
        </tbody></table>
      </section>}
      </div>
    </main></div>
  );
}

function Cenario({ e, i, set }: { e: Estado; i: number; set: (f: (x: App) => void) => void }) {
  const c = e.cenarios[i];
  const up = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) => set((n) => { (n.est.cenarios[i] as any)[k] = v; });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <input value={c.nome} onChange={(x) => up('nome', x.target.value)} className="w-28 rounded border border-yellow-300 bg-yellow-50 px-1 font-semibold" />
      {e.turnos.map((tn, k) => <label key={k}><input type="checkbox" checked={c.turnos[k]} onChange={(x) => { const t = [...c.turnos] as typeof c.turnos; t[k] = x.target.checked; up('turnos', t); }} /> Turno {tn.nome}</label>)}
      <label>HE h/dia <Num v={c.heH} step={0.1} w="w-14" on={(v) => up('heH', v)} /></label>
      <label>dias HE <Num v={c.heDias} w="w-12" on={(v) => up('heDias', v)} /></label>
      <label>Efic. % <Num v={+(c.efic * 100).toFixed(1)} step={0.5} w="w-16" on={(v) => up('efic', v / 100)} /></label>
      <label>Disp. % <Num v={+(c.disp * 100).toFixed(1)} step={0.5} w="w-16" on={(v) => up('disp', v / 100)} /></label>
      <label>Demanda × <Num v={c.fDem} step={0.05} w="w-16" on={(v) => up('fDem', v)} /></label>
      <label>Tempo × <Num v={c.fTempo} step={0.05} w="w-16" on={(v) => up('fTempo', v)} /></label>
      <select value={c.base} onChange={(x) => up('base', x.target.value as 'Padrão' | 'Real')} className="rounded border border-yellow-300 bg-yellow-50"><option>Padrão</option><option>Real</option></select>
    </div>
  );
}

function Tabela({ titulo, itens, e }: { titulo: string; itens: Res[]; e: Estado }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-semibold">{titulo}</h2>
      <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Recurso</th><th>Capacidade (h)</th><th>Carga (h)</th><th className="w-1/3 text-left pl-3">Utilização</th><th>Saldo (h)</th><th>Status</th></tr></thead><tbody>
        {itens.map((m) => <tr key={m.nome} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="text-left font-medium">{m.nome}</td><td>{h(m.efetiva)}</td><td>{h(m.carga)}</td>
          <td className="pl-3"><div className="flex items-center gap-2"><div className="h-3 flex-1 rounded bg-gray-100"><div className={`h-3 rounded transition-all duration-700 ease-out ${corUtil(m.util, e)}`} style={{ width: `${Math.min(100, m.util * 100)}%` }} /></div><span className="w-12">{pc(m.util)}</span></div></td>
          <td>{h(m.saldo)}</td><td><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${COR[m.status]}`}><i className={`h-1.5 w-1.5 rounded-full ${DOT[m.status]}`} />{m.status}</span></td></tr>)}
      </tbody></table>
    </section>
  );
}
