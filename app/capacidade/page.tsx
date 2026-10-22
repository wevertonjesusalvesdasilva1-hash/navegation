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
const SEL = 'rounded-full bg-white/15 px-3 py-1.5 text-white outline-none backdrop-blur transition hover:bg-white/25 focus:ring-2 focus:ring-white/40 [&>option]:text-slate-800';
const GLASS = 'inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-white/25 active:scale-95';
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
    <div className="group overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
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
  const nomi = r.maquinas.reduce((x, m) => x + m.nominal, 0);
  const sogy = e.sogyodo === 'Nominal' ? (nomi ? t.car / nomi : 0) : t.cap ? t.car / t.cap : 0;
  const turnosOk = Math.max(0, ...r.turnosMaq.map((u) => (u[0] < efetivo.vermelho ? 1 : u[1] < efetivo.vermelho ? 2 : u[2] < efetivo.vermelho ? 3 : 4)));
  const serie = useMemo(() => a.meses.map((_, m) => {
    const dem = (nm: string) => a.plano.find((p) => p.modelo === nm)?.qtd[m] ?? 0;
    const es = { ...a.est, diasMes: a.dias[m], linhas: a.est.linhas.map((l) => ({ ...l, dem: dem(l.modelo) })) };
    const x = calcular(es, a.sel).maquinas;
    return { cap: x.reduce((z, q) => z + q.efetiva, 0), car: x.reduce((z, q) => z + q.carga, 0) };
  }), [a]);
  const abas: [string, string, string][] = [['dash', 'Dashboard', IC.load], ['sim', 'Simulador', IC.sliders], ['cen', 'Cenários e Turnos', IC.moon], ['plano', 'Plano', IC.cal], ['tempos', 'Tempos', IC.timer], ['comp', 'Comparativo', IC.split]];

  const exportar = () => { const b = new Blob([JSON.stringify(a)], { type: 'application/json' }); const u = document.createElement('a'); u.href = URL.createObjectURL(b); u.download = 'capacidade.json'; u.click(); };
  const importar = (f?: File) => f?.text().then((x) => setA(JSON.parse(x)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-slate-100 pb-24 text-sm text-slate-700 overflow-x-hidden md:pb-10">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-indigo-800 via-blue-700 to-sky-500 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
        <header className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-16 pt-6 md:flex-row md:items-center md:px-6 md:pb-20">
          <div className="flex items-center gap-4">
            <Ring v={t.cap ? t.car / t.cap : 0} e={efetivo} size={92} claro />
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100">Capacidade Produtiva</p>
              <h1 className="text-2xl font-semibold tracking-tight">Usinagem</h1>
              <p className="text-xs text-blue-100">{e.cenarios[a.sel].nome} · {a.meses[a.mes]} · {a.dias[a.mes]} dias úteis</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <select className={SEL} value={a.sel} onChange={(x) => set((n) => { n.sel = +x.target.value; })}>{e.cenarios.map((c, i) => <option key={i} value={i}>{c.nome}</option>)}</select>
            <select className={SEL} value={a.mes} onChange={(x) => set((n) => { n.mes = +x.target.value; })}>{a.meses.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
            <select className={SEL} value={a.fam} onChange={(x) => set((n) => { n.fam = x.target.value; })}>{['TODAS', 'HE/PC', 'WL/WA', 'CT', 'MG'].map((f) => <option key={f}>{f}</option>)}</select>
            <a href="/Capacidade_Produtiva.xlsx" download className={GLASS}><Ic d={IC.dl} />Excel</a>
            <button className={GLASS} onClick={exportar}><Ic d={IC.dl} />JSON</button>
            <label className={GLASS + ' cursor-pointer'}><Ic d={IC.up} />Importar<input type="file" accept=".json" hidden onChange={(x) => importar(x.target.files?.[0])} /></label>
            <button className={GLASS} onClick={() => setA(inicial())}><Ic d={IC.reset} />Restaurar</button>
          </div>
        </header>
      </div>
      <main className="relative mx-auto -mt-10 max-w-6xl space-y-5 px-4 md:px-6 [&>*]:min-w-0">
      <nav className="hidden gap-1 rounded-2xl bg-white/90 p-1 shadow-md backdrop-blur md:flex">{abas.map(([k, n, ic]) => <button key={k} onClick={() => setAba(k)} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 transition-all duration-200 active:scale-95 ${aba === k ? 'bg-gradient-to-r from-indigo-600 to-blue-500 font-medium text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}><Ic d={ic} />{n}</button>)}</nav>
      <nav className="fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-3xl bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur md:hidden">{abas.map(([k, n, ic]) => <button key={k} onClick={() => setAba(k)} aria-label={n} className={`flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] transition-all duration-200 active:scale-90 ${aba === k ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><Ic d={ic} className="h-5 w-5" />{n.split(' ')[0]}</button>)}</nav>
      <div key={aba} className="animate-fade-up space-y-5">

      {aba === 'dash' && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 [&>*]:min-w-0">
          <Card t="Capacidade (h)" n={t.cap} ic={IC.gauge} s="horas-máquina no mês" /><Card t="Carga planejada (h)" n={t.car} ic={IC.load} s={`${h(r.tot.demanda)} máquinas no plano`} />
          <Card t="Utilização geral" n={t.cap ? t.car / t.cap : 0} f={pc} ic={IC.cpu} s={t.cap && t.car / t.cap >= e.vermelho ? 'acima da capacidade' : 'dentro da capacidade'} /><Card t="Sogyodo" n={sogy} f={pc} ic={IC.gauge} s={`base ${e.sogyodo.toLowerCase()}`} />
          <Card t="Excedente / HE necessárias (h)" n={t.def} ic={IC.alert} s="soma das máquinas acima de 100%" /><Card t="Horas ociosas (h)" n={t.oc} ic={IC.clock} s="folga nas máquinas abaixo de 100%" />
          <Card t="Máquinas insuficientes" n={r.tot.maqInsuf} f={(x) => `${Math.round(x)} de ${r.maquinas.length}`} ic={IC.alert} s={`${r.maquinas.filter((m) => m.status === 'ATENÇÃO').length} em atenção`} /><Card t="Turnos para fechar o plano" n={turnosOk} f={(x) => (x > 3.5 ? '> 3' : String(Math.round(x)))} ic={IC.moon} s="pior máquina, sem HE" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <ChartMaq itens={maqs} e={efetivo} />
          <ChartMeses dados={serie} sel={a.mes} meses={a.meses} />
          <ChartCenarios res={res} nomes={e.cenarios.map((c) => c.nome)} sel={a.sel} e={efetivo} />
          <ChartModelos itens={r.modelos.filter((m) => a.fam === 'TODAS' || m.familia === a.fam)} />
        </div>
        <MaqCards titulo="Máquinas de usinagem" itens={maqs} e={efetivo} />
        <section className="overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
          <h2 className="mb-2 font-semibold">Máquina × nº de turnos (utilização)</h2>
          <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Máquina</th><th>Carga (h)</th><th>1 turno</th><th>2 turnos</th><th>3 turnos</th></tr></thead><tbody>
            {r.maquinas.map((m, i) => <tr key={m.nome} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="text-left font-medium">{m.nome}</td><td>{h(m.carga)}</td>{r.turnosMaq[i].map((u, k) => <td key={k}><span className={`rounded px-1.5 ${u >= e.vermelho ? 'bg-red-100 text-red-800' : u >= e.amarelo ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{pc(u)}</span></td>)}</tr>)}
          </tbody></table>
        </section>
        <section className="overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
          <h2 className="mb-2 font-semibold">Gargalos por fluxo (modelo / peça) — recurso mais carregado</h2>
          <ul className="grid gap-x-6 md:grid-cols-2">{r.gargalos.slice(0, 10).map((g) => <li key={g.chave} className="flex justify-between border-t py-0.5"><span>{g.chave}</span><span><b>{g.recurso}</b> {pc(g.util)}</span></li>)}</ul>
        </section>
      </>}

      {aba === 'sim' && <section className="space-y-3">
        <p className="text-gray-500">Altere os valores do cenário <b>{e.cenarios[a.sel].nome}</b> e veja o impacto imediato nas máquinas.</p>
        <Cenario e={e} i={a.sel} set={set} />
        <MaqCards titulo="Resultado" itens={r.maquinas} e={efetivo} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Card t="Máquina limitante" n={Math.max(0, ...r.maquinas.map((m) => m.util))} f={pc} s={[...r.maquinas].sort((x, y) => y.util - x.util)[0]?.nome ?? '-'} ic={IC.cpu} />
          <Card t="HE necessárias (h)" n={t.def} ic={IC.alert} /><Card t="Demanda do mês (pç)" n={r.tot.demanda} ic={IC.cal} /><Card t="Máquinas insuficientes" n={r.tot.maqInsuf} f={(x) => String(Math.round(x))} ic={IC.alert} />
        </div>
      </section>}

      {aba === 'cen' && <section className="space-y-3">
        {e.cenarios.map((_, i) => <Cenario key={i} e={e} i={i} set={set} />)}
        <div className="overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60"><h2 className="mb-2 font-semibold">Turnos e limites</h2>
          <div className="flex flex-wrap gap-4">{e.turnos.map((tn, i) => <div key={i} className="space-x-1">Turno {tn.nome}
            <input type="time" value={tn.ini} onChange={(x) => set((n) => { n.est.turnos[i].ini = x.target.value; })} className="rounded border border-yellow-300 bg-yellow-50" />
            <input type="time" value={tn.fim} onChange={(x) => set((n) => { n.est.turnos[i].fim = x.target.value; })} className="rounded border border-yellow-300 bg-yellow-50" />
            pausa <Num v={tn.pausa} on={(v) => set((n) => { n.est.turnos[i].pausa = v; })} w="w-14" />min = <b>{h(horasTurno(tn))} h</b></div>)}</div>
          <div className="mt-2 space-x-3">Atenção ≥ <Num v={e.amarelo * 100} on={(v) => set((n) => { n.est.amarelo = v / 100; })} w="w-14" />% · Insuficiente ≥ <Num v={e.vermelho * 100} on={(v) => set((n) => { n.est.vermelho = v / 100; })} w="w-14" />% · Dias úteis do mês: <b>{a.dias[a.mes]}</b> (edite na aba Plano)</div>
        </div>
      </section>}

      {aba === 'plano' && <section className="overflow-x-auto overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
        <table className="text-right"><thead><tr className="text-gray-500"><th className="text-left">Modelo</th>{a.meses.map((m, i) => <th key={i} className={i === a.mes ? 'text-blue-700' : ''}>{m}</th>)}</tr></thead><tbody>
          <tr><td className="text-left font-medium">Dias úteis</td>{a.dias.map((d, i) => <td key={i}><Num v={d} w="w-12" on={(v) => set((n) => { n.dias[i] = v; })} /></td>)}</tr>
          {a.plano.map((p, pi) => <tr key={p.modelo} className="border-t"><td className="text-left">{p.modelo} <span className="text-xs text-gray-400">{p.familia}</span></td>{p.qtd.map((q, i) => <td key={i}><Num v={q} w="w-12" on={(v) => set((n) => { n.plano[pi].qtd[i] = v; })} /></td>)}</tr>)}
        </tbody></table>
      </section>}

      {aba === 'tempos' && <section className="overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
        <p className="mb-2 text-gray-500">Tempo padrão em min/peça. Setup (min/lote), lote e tempo real não constam no arquivo — pendentes.</p>
        <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Peça</th><th className="text-left">Modelo</th><th className="text-left">Máquina</th><th>Tempo padrão</th><th>Tempo real</th><th>Setup/lote</th><th>Lote</th></tr></thead><tbody>
          {e.linhas.map((l, i) => <tr key={i} className="border-t"><td className="text-left">{l.peca}</td><td className="text-left">{l.modelo}</td><td className="text-left">{l.maquina}</td>
            {(['tp', 'tr', 'setup', 'lote'] as (keyof LinhaB)[]).map((k) => <td key={k}><Num v={l[k] as number} step={0.1} w="w-16" on={(v) => set((n) => { (n.est.linhas[i] as any)[k] = v; })} /></td>)}</tr>)}
        </tbody></table>
      </section>}

      {aba === 'comp' && <section className="overflow-x-auto overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
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
    <div className="flex flex-wrap items-center gap-3 overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
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
    <section className="overflow-x-auto rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60">
      <h2 className="mb-2 font-semibold">{titulo}</h2>
      <table className="w-full text-right"><thead><tr className="text-gray-500"><th className="text-left">Recurso</th><th>Capacidade (h)</th><th>Carga (h)</th><th className="w-1/3 text-left pl-3">Utilização</th><th>Saldo (h)</th><th>Status</th></tr></thead><tbody>
        {itens.map((m) => <tr key={m.nome} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="text-left font-medium">{m.nome}</td><td>{h(m.efetiva)}</td><td>{h(m.carga)}</td>
          <td className="pl-3"><div className="flex items-center gap-2"><div className="h-3 flex-1 rounded bg-gray-100"><div className={`h-3 rounded transition-all duration-700 ease-out ${corUtil(m.util, e)}`} style={{ width: `${Math.min(100, m.util * 100)}%` }} /></div><span className="w-12">{pc(m.util)}</span></div></td>
          <td>{h(m.saldo)}</td><td><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${COR[m.status]}`}><i className={`h-1.5 w-1.5 rounded-full ${DOT[m.status]}`} />{m.status}</span></td></tr>)}
      </tbody></table>
    </section>
  );
}

function Ring({ v, e, size = 72, claro = false }: { v: number; e: Estado; size?: number; claro?: boolean }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, k = useCount(v);
  const cor = claro ? '#fff' : v >= e.vermelho ? '#ef4444' : v >= e.amarelo ? '#facc15' : '#22c55e';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={claro ? 'rgba(255,255,255,.2)' : '#e2e8f0'} strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, v))} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.22,1,.36,1), stroke .4s' }} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-semibold ${claro ? 'text-lg' : 'text-sm'}`}>{pc(k)}</span>
    </div>
  );
}

function MaqCards({ titulo, itens, e }: { titulo: string; itens: Res[]; e: Estado }) {
  return (
    <section>
      <h2 className="mb-3 px-1 font-semibold text-slate-600">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {itens.map((m) => (
          <div key={m.nome} className="group rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60 transition duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[.98]">
            <div className="flex items-center justify-between">
              <div><div className="text-base font-semibold text-slate-800">{m.nome}</div>
                <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${COR[m.status]}`}><i className={`h-1.5 w-1.5 rounded-full ${DOT[m.status]}`} />{m.status}</span></div>
              <Ring v={m.util} e={e} />
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full transition-all duration-700 ease-out ${corUtil(m.util, e)}`} style={{ width: `${Math.min(100, m.util * 100)}%` }} /></div>
            <dl className="mt-3 grid grid-cols-3 text-center text-xs"><div><dt className="text-slate-400">Cap.</dt><dd className="font-medium">{h(m.efetiva)}h</dd></div><div><dt className="text-slate-400">Carga</dt><dd className="font-medium">{h(m.carga)}h</dd></div><div><dt className="text-slate-400">Saldo</dt><dd className={`font-medium ${m.saldo < 0 ? 'text-red-600' : 'text-green-600'}`}>{h(m.saldo)}h</dd></div></dl>
          </div>
        ))}
      </div>
    </section>
  );
}

const Painel = ({ t, sub, children }: { t: string; sub?: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-indigo-100/60"><h2 className="font-semibold text-slate-700">{t}</h2>{sub && <p className="text-xs text-slate-400">{sub}</p>}<div className="mt-3">{children}</div></section>
);
const Leg = ({ c, t }: { c: string; t: string }) => <span className="inline-flex items-center gap-1 text-xs text-slate-500"><i className={`h-2 w-2 rounded-full ${c}`} />{t}</span>;

function ChartMaq({ itens, e }: { itens: Res[]; e: Estado }) {
  const max = Math.max(1, ...itens.map((m) => Math.max(m.carga, m.efetiva)));
  return (
    <Painel t="Carga × capacidade por máquina" sub="horas no mês">
      <div className="flex h-44 items-end justify-around gap-3">
        {itens.map((m) => (
          <div key={m.nome} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end justify-center gap-1.5">
              <div title={`Capacidade ${h(m.efetiva)}h`} className="w-1/3 rounded-t-lg bg-slate-200 transition-all duration-700" style={{ height: `${(m.efetiva / max) * 100}%` }} />
              <div title={`Carga ${h(m.carga)}h`} className={`w-1/3 rounded-t-lg transition-all duration-700 ${corUtil(m.util, e)}`} style={{ height: `${(m.carga / max) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600">{m.nome}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3"><Leg c="bg-slate-200" t="Capacidade" /><Leg c="bg-green-500" t="Carga ok" /><Leg c="bg-yellow-400" t="Atenção" /><Leg c="bg-red-500" t="Insuficiente" /></div>
    </Painel>
  );
}

function ChartMeses({ dados, sel, meses }: { dados: { cap: number; car: number }[]; sel: number; meses: string[] }) {
  const max = Math.max(1, ...dados.map((d) => Math.max(d.cap, d.car)));
  return (
    <Painel t="Demanda × capacidade nos 12 meses" sub="carga total da usinagem vs capacidade do cenário (h)">
      <div className="relative flex h-44 items-end gap-1">
        {dados.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${meses[i]}: carga ${h(d.car)}h · cap ${h(d.cap)}h`}>
            <div className={`rounded-t-md transition-all duration-700 ${d.car > d.cap ? 'bg-red-400' : 'bg-indigo-400'} ${i === sel ? 'ring-2 ring-blue-600' : 'opacity-80'}`} style={{ height: `${(d.car / max) * 100}%` }} />
            <div className="absolute inset-x-0 border-t-2 border-slate-800/70 transition-all duration-700" style={{ bottom: `${(d.cap / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-slate-400">{meses.map((m, i) => <span key={i} className={`flex-1 text-center ${i === sel ? 'font-semibold text-blue-700' : ''}`}>{m.slice(0, 3)}</span>)}</div>
      <div className="mt-2 flex gap-3"><Leg c="bg-indigo-400" t="Carga" /><Leg c="bg-red-400" t="Carga acima da capacidade" /><span className="text-xs text-slate-500">— linha = capacidade</span></div>
    </Painel>
  );
}

function ChartCenarios({ res, nomes, sel, e }: { res: ReturnType<typeof calcular>[]; nomes: string[]; sel: number; e: Estado }) {
  const nm = res[0].maquinas.map((m) => m.nome);
  const max = Math.max(1, ...res.flatMap((x) => x.maquinas.map((m) => m.util)));
  return (
    <Painel t="Comparação dos cenários" sub="utilização por máquina">
      <div className="space-y-2">
        {nm.map((n, mi) => (
          <div key={n}><div className="mb-0.5 text-xs font-medium text-slate-600">{n}</div>
            {res.map((x, ci) => { const u = x.maquinas[mi].util; return (
              <div key={ci} className="flex items-center gap-2"><span className={`w-16 truncate text-[10px] ${ci === sel ? 'font-semibold text-blue-700' : 'text-slate-400'}`}>{nomes[ci]}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100"><div className={`h-2 rounded-full transition-all duration-700 ${corUtil(u, e)} ${ci === sel ? '' : 'opacity-60'}`} style={{ width: `${(u / max) * 100}%` }} /></div><span className="w-10 text-right text-[11px]">{pc(u)}</span></div>
            ); })}
          </div>
        ))}
      </div>
    </Painel>
  );
}

function ChartModelos({ itens }: { itens: { nome: string; familia: string; horas: number }[] }) {
  const top = itens.slice(0, 7), max = Math.max(1, ...top.map((m) => m.horas)), tot = itens.reduce((a, m) => a + m.horas, 0);
  const fams = ['HE/PC', 'WL/WA', 'CT', 'MG'].map((f) => ({ f, v: itens.filter((m) => m.familia === f).reduce((a, m) => a + m.horas, 0) }));
  const cor = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b'];
  let acc = 0;
  return (
    <Painel t="Quem consome mais horas" sub="horas-máquina por modelo e por família">
      <div className="flex flex-col gap-4 sm:flex-row">
        <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0 -rotate-90 self-center">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="6" />
          {fams.map((x, i) => { const p = tot ? (x.v / tot) * 100 : 0; const el = <circle key={x.f} cx="21" cy="21" r="15.9" fill="none" stroke={cor[i]} strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acc} style={{ transition: 'all .7s' }} />; acc += p; return el; })}
        </svg>
        <div className="flex-1 space-y-1.5">
          {top.map((m) => (
            <div key={m.nome} className="flex items-center gap-2"><span className="w-14 text-xs">{m.nome}</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${(m.horas / max) * 100}%` }} /></div><span className="w-12 text-right text-[11px] text-slate-500">{h(m.horas)}h</span></div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">{fams.map((x, i) => <span key={x.f} className="inline-flex items-center gap-1 text-xs text-slate-500"><i className="h-2 w-2 rounded-full" style={{ background: cor[i] }} />{x.f} {tot ? pc(x.v / tot) : '0%'}</span>)}</div>
    </Painel>
  );
}
