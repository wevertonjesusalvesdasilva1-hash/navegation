'use client';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { Btn, Card, Inp, Modal, Num, Sel, Status, Titulo, corUtil, cx, h1, pct } from '@/components/ui';
import { Col, Grid } from '@/components/Grid';
import { FAMILIAS, Linha, calcular, cargaLinha, ativas } from '@/lib/capacidade';
import { alternativas, chavePeca, linhaAtiva, porTurno, transferir } from '@/lib/turnos';

type Aba = 'pecas' | 'maquinas' | 'hist';

export default function TemposUsinagem() {
  const { a, efetivo: e, r, set, aviso, reverter } = useStore();
  const [aba, setAba] = useState<Aba>('pecas');
  const [f, setF] = useState({ fam: '', modelo: '', q: '', maq: '', sem: false, alt: false });
  const [fator, setFator] = useState(100);
  const [tr, setTr] = useState<{ idx: number; destino: string; tp: number } | null>(null);
  const [nova, setNova] = useState(false);
  const c = e.cenarios[a.sel];
  const L = a.est.linhas;
  const maqsAtivas = a.est.maquinas.filter((m) => m && a.est.maqCfg?.[m]?.ativa !== false);
  const modelos = useMemo(() => Array.from(new Set([...L.map((l) => l.modelo), ...a.plano.map((p) => p.modelo)].filter(Boolean))).sort(), [L, a.plano]);
  const rows = useMemo(() => e.linhas.map((row, id) => ({ id, row })).filter(({ row: l }) =>
    (f.alt || l.ativo !== false) && (!f.fam || l.familia === f.fam) && (!f.modelo || l.modelo === f.modelo) && (!f.maq || l.maquina === f.maq) && (!f.sem || (l.ativo !== false && !(l.tp > 0))) &&
    (!f.q || `${l.peca} ${l.codigo ?? ''} ${l.modelo}`.toLowerCase().includes(f.q.toLowerCase()))), [e.linhas, f]);
  const sem = ativas(a.est).filter((l) => !(l.tp > 0)).length;
  const ids = rows.filter((x) => x.row.ativo !== false).map((x) => x.id);

  const COLS: Col<Linha>[] = [
    { key: 'familia', label: 'Família', opcoes: FAMILIAS, w: 'min-w-[6.5rem]' }, { key: 'modelo', label: 'Modelo', w: 'min-w-[7rem]' }, { key: 'peca', label: 'Peça', w: 'min-w-[13rem]' }, { key: 'codigo', label: 'Código', w: 'min-w-[6rem]' },
    { key: 'maquina', label: 'Máquina de usinagem', w: 'min-w-[9rem]', custom: (id, row) => row.ativo === false
      ? <span className="block px-2 py-1 text-slate-400" title="Máquina alternativa (compatível) — não carrega produção">{row.maquina} <i>(alt.)</i></span>
      : <select className="w-full bg-transparent px-2 py-1 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-300" value={row.maquina}
          onChange={(x) => x.target.value !== row.maquina && setTr({ idx: id, destino: x.target.value, tp: alternativas(e, id).find((z) => z.l.maquina === x.target.value)?.l.tp ?? row.tp })}>
          <option value="">— escolher —</option>{Array.from(new Set([...maqsAtivas, row.maquina].filter(Boolean))).map((m) => <option key={m}>{m}</option>)}</select> },
    { key: 'tp', label: 'Tempo padrão (min)', tipo: 'num', w: 'w-32', aviso: (v, row) => (row.ativo === false ? null : !(v > 0) ? 'Sem tempo cadastrado' : v > 600 ? 'Tempo acima de 10 h — confira' : null) },
    { key: 'setup', label: 'Setup (min/lote)', tipo: 'num', w: 'w-28' }, { key: 'lote', label: 'Lote (pç)', tipo: 'num', w: 'w-20' },
    { key: 'tr', label: 'Tempo real (min)', tipo: 'num', w: 'w-28', aviso: (v, row) => (v > 0 && row.tp > 0 && (v < row.tp * 0.5 || v > row.tp * 2) ? 'Real muito diferente do padrão' : null) },
    { key: 'obs', label: 'Observações', w: 'min-w-[10rem]' },
    { key: 'dem', label: 'Carga no mês (h)', so: true, w: 'w-28', custom: (_, row) => <span className="block px-2 py-1 text-right text-slate-600">{row.ativo === false ? '—' : h1(cargaLinha(row, c), 2)}</span> },
  ];

  const duplicar = (id: number) => { set((n) => { const o = n.est.linhas[id]; n.est.linhas.splice(id + 1, 0, { ...o, peca: `${o.peca} (cópia)`, codigo: '' }); }, { campo: 'Peça duplicada', de: L[id].peca, para: `${L[id].peca} (cópia)` }); aviso('Peça duplicada logo abaixo'); };

  return (
    <>
      <Titulo t="Tempos de usinagem" sub={`${ativas(a.est).length} peças ativas · ${sem} sem tempo · ${maqsAtivas.length} máquinas ativas · ${a.meses[a.mes]} · ${c.nome}`}>
        <Btn v="primary" onClick={() => setNova(true)}>+ Nova peça</Btn>
      </Titulo>
      <PainelAoVivo />
      <div className="flex gap-1 rounded-xl bg-slate-200/60 p-1 text-sm">
        {([['pecas', 'Peças e tempos'], ['maquinas', 'Máquinas'], ['hist', `Histórico (${a.hist.length})`]] as [Aba, string][]).map(([k, n]) => <button key={k} onClick={() => setAba(k)} className={cx('rounded-lg px-4 py-1.5 transition active:scale-95', aba === k ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-500')}>{n}</button>)}
      </div>

      {aba === 'pecas' && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Inp placeholder="Pesquisar peça, código, modelo…" value={f.q} onChange={(x) => setF({ ...f, q: x.target.value })} className="min-w-[14rem] flex-1" />
            <Sel value={f.fam} onChange={(x) => setF({ ...f, fam: x.target.value })}><option value="">Família</option>{FAMILIAS.map((x) => <option key={x}>{x}</option>)}</Sel>
            <Sel value={f.modelo} onChange={(x) => setF({ ...f, modelo: x.target.value })}><option value="">Modelo</option>{modelos.map((x) => <option key={x}>{x}</option>)}</Sel>
            <Sel value={f.maq} onChange={(x) => setF({ ...f, maq: x.target.value })}><option value="">Máquina</option>{a.est.maquinas.filter(Boolean).map((x) => <option key={x}>{x}</option>)}</Sel>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.sem} onChange={(x) => setF({ ...f, sem: x.target.checked })} />só sem tempo</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.alt} onChange={(x) => setF({ ...f, alt: x.target.checked })} />mostrar máquinas alternativas</label>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">Tempo padrão dos exibidos ×<input type="number" value={fator} onChange={(x) => setFator(+x.target.value)} className="w-16 rounded border border-amber-200 bg-amber-50 px-1 py-1 text-right" />%
              <Btn v="soft" disabled={fator === 100 || !ids.length} onClick={() => { set((n) => ids.forEach((i) => { n.est.linhas[i].tp = +(n.est.linhas[i].tp * fator / 100).toFixed(3); }), { campo: `Tempo padrão × ${fator}% em ${ids.length} peças`, de: '', para: '' }); aviso(`${ids.length} tempos alterados`); setFator(100); }}>Aplicar</Btn></span>
          </div>
          <Grid cols={COLS} rows={rows} rowClass={(row) => (row.ativo === false ? 'bg-slate-50 text-slate-400 italic' : '')}
            acoes={(id, row) => row.ativo === false
              ? <Btn v="soft" className="!px-2 !py-0.5 text-xs" onClick={() => { const at = linhaAtiva(a.est, id); at >= 0 && setTr({ idx: at, destino: row.maquina, tp: row.tp }); }}>Usar esta máquina</Btn>
              : <span className="flex gap-1"><Btn className="!px-2 !py-0.5 text-xs" onClick={() => setTr({ idx: id, destino: '', tp: row.tp })}>Transferir</Btn><Btn className="!px-2 !py-0.5 text-xs" onClick={() => duplicar(id)}>Duplicar</Btn></span>}
            onSalvar={(ms) => { set((n) => ms.forEach((m) => { (n.est.linhas[m.id] as any)[m.key] = m.para; }), ms.map((m) => ({ campo: `${L[m.id].modelo} / ${L[m.id].peca} (${L[m.id].maquina || 'sem máquina'}) — ${m.key}`, de: String(m.de ?? ''), para: String(m.para ?? ''), ref: { i: m.id, k: m.key } }))); aviso(`${ms.length} alteração(ões) salva(s) — carga e capacidade recalculadas`); }} />
        </Card>
      )}
      {aba === 'maquinas' && <Maquinas />}
      {aba === 'hist' && (
        <Card>
          <Titulo t="Histórico de modificações" sub="restaure um valor anterior com um clique" />
          <div className="max-h-[60vh] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-white text-left text-xs text-slate-500"><tr><th>Quando</th><th>Campo</th><th>De</th><th>Para</th><th /></tr></thead><tbody>
            {a.hist.map((x, i) => <tr key={i} className="border-t border-slate-100"><td className="whitespace-nowrap py-1">{new Date(x.t).toLocaleString('pt-BR')}</td><td>{x.campo}</td><td className="max-w-[10rem] truncate">{x.de}</td><td className="max-w-[10rem] truncate">{x.para}</td><td>{x.ref && <Btn className="!px-2 !py-0.5 text-xs" onClick={() => reverter(i)}>Restaurar “{x.de}”</Btn>}</td></tr>)}
          </tbody></table>{!a.hist.length && <p className="py-6 text-center text-slate-400">Nenhuma alteração registrada.</p>}</div>
        </Card>
      )}
      <Transferencia tr={tr} fechar={() => setTr(null)} />
      <NovaPeca aberto={nova} fechar={() => setNova(false)} maquinas={maqsAtivas} modelos={modelos} />
    </>
  );
}

/** Impacto imediato: utilização por máquina e por turno, sempre visível. */
function PainelAoVivo() {
  const { a, efetivo: e, r } = useStore();
  const pt = porTurno(e, a.sel);
  const dados = r.maquinas.map((m) => ({ maq: m.nome, 'Carga (h)': +m.carga.toFixed(1), 'Capacidade (h)': +m.efetiva.toFixed(1) }));
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">Carga × capacidade por máquina (atualiza ao editar)</div>
          <div className="h-44"><ResponsiveContainer><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="maq" /><YAxis /><Tooltip /><Legend verticalAlign="top" /><Bar dataKey="Capacidade (h)" fill="#A5A5A5" /><Bar dataKey="Carga (h)" fill="#4472C4" /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="space-y-1.5">
          {r.maquinas.map((m) => <div key={m.nome} className="flex items-center gap-2 text-xs"><span className="w-14 font-medium">{m.nome}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.util * 100)}%`, background: corUtil(m.util, e.amarelo, e.vermelho) }} /></div><span className="w-9 text-right">{pct(m.util)}</span><Status s={m.status} /></div>)}
          <div className="border-t pt-1.5 text-[11px] text-slate-500">Utilização por turno (máquinas): {pt.turnos.map((t) => <b key={t.nome} className="ml-2" style={{ color: t.ativo ? corUtil(t.maq.util, e.amarelo, e.vermelho) : '#94a3b8' }}>{t.nome} {t.ativo ? pct(t.maq.util) : '—'}</b>)}</div>
          <div className="text-[11px] text-slate-500">Gargalo: <b>{r.gargalos[0]?.recurso ?? '—'}</b> {r.gargalos[0] ? pct(r.gargalos[0].util) : ''}</div>
        </div>
      </div>
    </Card>
  );
}

/** Simulação da transferência de uma peça para outra máquina — só vira oficial após confirmar. */
function Transferencia({ tr, fechar }: { tr: { idx: number; destino: string; tp: number } | null; fechar: () => void }) {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const [dest, setDest] = useState<string | null>(null), [tp, setTp] = useState<number | null>(null);
  const idx = tr?.idx ?? -1, o = idx >= 0 ? e.linhas[idx] : null;
  const destino = dest ?? tr?.destino ?? '', tempo = tp ?? tr?.tp ?? 0;
  const maqs = a.est.maquinas.filter((m) => m && a.est.maqCfg?.[m]?.ativa !== false && m !== o?.maquina);
  const alt = o ? alternativas(e, idx).find((z) => z.l.maquina === destino) : undefined;
  const sim = useMemo(() => (o && destino ? calcular(transferir(e, idx, destino, tempo), a.sel) : null), [e, idx, destino, tempo, a.sel, o]);
  const fecharTudo = () => { setDest(null); setTp(null); fechar(); };
  const pecas = o ? o.dem * e.cenarios[a.sel].fDem : 0;
  const par = [o?.maquina, destino].filter(Boolean) as string[];
  const dados = sim ? r.maquinas.map((m, i) => { const n = sim.maquinas.find((x) => x.nome === m.nome); return { maq: m.nome, Antes: +(m.util * 100).toFixed(0), Depois: +((n?.util ?? m.util) * 100).toFixed(0) }; }) : [];
  return (
    <Modal aberto={!!tr && !!o} fechar={fecharTudo} titulo={o ? `Transferir: ${o.modelo} / ${o.peca}` : ''}>
      {o && (
        <div className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><div className="text-xs text-slate-500">Máquina atual</div><div className="font-semibold">{o.maquina || '—'} · {o.tp} min/pç</div></div>
            <label><div className="text-xs text-slate-500">Nova máquina</div><Sel className="w-full" value={destino} onChange={(x) => { setDest(x.target.value); setTp(alternativas(e, idx).find((z) => z.l.maquina === x.target.value)?.l.tp ?? o.tp); }}><option value="">— escolher —</option>{maqs.map((m) => <option key={m} value={m}>{m}{alternativas(e, idx).some((z) => z.l.maquina === m) ? ' ✓ compatível' : ''}</option>)}</Sel></label>
            <label><div className="text-xs text-slate-500">Tempo padrão na nova máquina (min)</div><Num v={tempo} step={0.1} w="w-full" on={setTp} /></label>
          </div>
          {destino && !alt && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">⚠ {destino} não tem tempo cadastrado para esta peça. Confirme a compatibilidade técnica e ajuste o tempo (iniciado com o da máquina atual).</p>}
          <p className="text-xs text-slate-500">Peças planejadas no mês: <b>{h1(pecas, 0)}</b> · carga a transferir: <b>{h1(o.dem * (o.tp * e.cenarios[a.sel].fTempo + (o.lote > 0 ? o.setup / o.lote : 0)) * e.cenarios[a.sel].fDem / 60, 1)} h</b> na máquina atual → <b>{h1((pecas * (tempo * e.cenarios[a.sel].fTempo + (o.lote > 0 ? o.setup / o.lote : 0))) / 60, 1)} h</b> na nova.</p>
          {sim && (
            <>
              <table className="w-full text-right"><thead><tr className="text-xs text-slate-500"><th className="text-left">Máquina</th><th>Carga antes</th><th>Carga depois</th><th>Capacidade</th><th>Util. antes</th><th>Util. depois</th><th>HE necessárias</th><th>Status</th></tr></thead><tbody>
                {par.map((m) => { const b = r.maquinas.find((x) => x.nome === m), n = sim.maquinas.find((x) => x.nome === m); if (!b || !n) return null; return <tr key={m} className="border-t"><td className="text-left font-medium">{m}</td><td>{h1(b.carga)}</td><td>{h1(n.carga)}</td><td>{h1(n.efetiva)}</td><td>{pct(b.util)}</td><td className="font-semibold" style={{ color: corUtil(n.util, e.amarelo, e.vermelho) }}>{pct(n.util)}</td><td>{h1(b.deficit)} → {h1(n.deficit)}</td><td><Status s={n.status} /></td></tr>; })}
              </tbody></table>
              {sim.maquinas.find((x) => x.nome === destino)?.status === 'INSUFICIENTE' && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">⚠ {destino} ficará sobrecarregada ({pct(sim.maquinas.find((x) => x.nome === destino)!.util)}).</p>}
              <div className="h-40"><ResponsiveContainer><BarChart data={dados}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="maq" /><YAxis unit="%" /><Tooltip /><Legend verticalAlign="top" /><ReferenceLine y={e.vermelho * 100} stroke="#ef4444" strokeDasharray="4 4" /><Bar dataKey="Antes" fill="#A5A5A5" /><Bar dataKey="Depois" fill="#4472C4" /></BarChart></ResponsiveContainer></div>
              <p className="text-xs text-slate-500">Gargalos: antes <b>{r.gargalos[0]?.recurso}</b> {pct(r.gargalos[0]?.util ?? 0)} → depois <b>{sim.gargalos[0]?.recurso}</b> {pct(sim.gargalos[0]?.util ?? 0)}.</p>
            </>
          )}
          <div className="flex justify-end gap-2 border-t pt-3"><Btn onClick={fecharTudo}>Cancelar (nada muda)</Btn>
            <Btn v="primary" disabled={!destino || !(tempo > 0)} onClick={() => { set((n) => { n.est = transferir(n.est, idx, destino, tempo); }, { campo: `Transferência: ${o.modelo} / ${o.peca}`, de: o.maquina, para: destino }); aviso(`${o.peca} agora é usinada na ${destino}`); fecharTudo(); }}>Confirmar transferência</Btn></div>
        </div>
      )}
    </Modal>
  );
}

function NovaPeca({ aberto, fechar, maquinas, modelos }: { aberto: boolean; fechar: () => void; maquinas: string[]; modelos: string[] }) {
  const { a, set, aviso } = useStore();
  const v0 = { familia: 'HE/PC', modelo: '', peca: '', codigo: '', maquina: '', tp: 0, setup: 0, lote: 0, obs: '' };
  const [v, setV] = useState(v0), [mais, setMais] = useState(false);
  const pecas = useMemo(() => { const m = new Map<string, number>(); a.est.linhas.forEach((l, i) => { if (l.ativo !== false && l.peca && l.tp > 0 && !m.has(chavePeca(l))) m.set(chavePeca(l), i); }); return Array.from(m.entries()); }, [a.est.linhas]);
  const copiar = (i: number) => { const l = a.est.linhas[i]; setV({ familia: l.familia, modelo: l.modelo, peca: `${l.peca} (cópia)`, codigo: '', maquina: l.maquina, tp: l.tp, setup: l.setup, lote: l.lote, obs: l.obs ?? '' }); };
  const semPlano = v.modelo && !a.plano.some((p) => p.modelo === v.modelo);
  const ok = v.modelo.trim() && v.peca.trim() && v.maquina;
  return (
    <Modal aberto={aberto} fechar={fechar} titulo="Nova peça">
      <div className="space-y-3 text-sm">
        <label className="block"><span className="text-xs text-slate-500">Copiar de peça existente (opcional)</span><Sel className="w-full" defaultValue="" onChange={(x) => x.target.value !== '' && copiar(+x.target.value)}><option value="">— começar em branco —</option>{pecas.map(([k, i]) => <option key={k} value={i}>{a.est.linhas[i].modelo} / {a.est.linhas[i].peca} ({a.est.linhas[i].maquina})</option>)}</Sel></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="text-xs text-slate-500">Família</span><Sel className="w-full" value={v.familia} onChange={(x) => setV({ ...v, familia: x.target.value })}>{FAMILIAS.map((x) => <option key={x}>{x}</option>)}</Sel></label>
          <label><span className="text-xs text-slate-500">Modelo</span><Inp list="modelos" className="w-full" placeholder="PC210, WA320…" value={v.modelo} onChange={(x) => setV({ ...v, modelo: x.target.value })} /><datalist id="modelos">{modelos.map((m) => <option key={m} value={m} />)}</datalist></label>
          <label><span className="text-xs text-slate-500">Nome da peça</span><Inp className="w-full" value={v.peca} onChange={(x) => setV({ ...v, peca: x.target.value })} /></label>
          <label><span className="text-xs text-slate-500">Máquina de usinagem</span><Sel className="w-full" value={v.maquina} onChange={(x) => setV({ ...v, maquina: x.target.value })}><option value="">— escolher —</option>{maquinas.map((m) => <option key={m}>{m}</option>)}</Sel></label>
          <label><span className="text-xs text-slate-500">Tempo padrão (min/peça)</span><Num v={v.tp} step={0.1} w="w-full" on={(n) => setV({ ...v, tp: n })} /></label>
        </div>
        <button className="text-xs text-blue-700" onClick={() => setMais(!mais)}>{mais ? '− menos campos' : '+ código, setup, lote, observações'}</button>
        {mais && <div className="grid gap-3 sm:grid-cols-2"><label><span className="text-xs text-slate-500">Código</span><Inp className="w-full" value={v.codigo} onChange={(x) => setV({ ...v, codigo: x.target.value })} /></label><label><span className="text-xs text-slate-500">Setup (min/lote)</span><Num v={v.setup} w="w-full" on={(n) => setV({ ...v, setup: n })} /></label><label><span className="text-xs text-slate-500">Lote (pç)</span><Num v={v.lote} w="w-full" on={(n) => setV({ ...v, lote: n })} /></label><label><span className="text-xs text-slate-500">Observações</span><Inp className="w-full" value={v.obs} onChange={(x) => setV({ ...v, obs: x.target.value })} /></label></div>}
        {semPlano && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">⚠ O modelo {v.modelo} não está no Plano de produção: a carga será 0 até você informar a demanda em <b>Plano</b>.</p>}
        {!(v.tp > 0) && v.peca && <p className="text-xs text-amber-700">Sem tempo padrão a peça não gera carga (ficará marcada “sem tempo”).</p>}
        <div className="flex justify-end gap-2"><Btn onClick={fechar}>Cancelar</Btn>
          <Btn v="primary" disabled={!ok} onClick={() => { set((n) => { n.est.linhas.unshift({ familia: v.familia, modelo: v.modelo.trim(), peca: v.peca.trim(), processo: 'USINAGEM', celula: '', maquina: v.maquina, oper: 1, tp: v.tp, tr: 0, setup: v.setup, lote: v.lote, dem: 0, codigo: v.codigo, obs: v.obs, ativo: true }); }, { campo: 'Nova peça', de: '', para: `${v.modelo} / ${v.peca} em ${v.maquina}` }); aviso('Peça cadastrada — capacidade recalculada'); setV(v0); fechar(); }}>Adicionar peça</Btn></div>
      </div>
    </Modal>
  );
}

function Maquinas() {
  const { a, efetivo: e, r, set, aviso } = useStore();
  const [novo, setNovo] = useState(''), [compat, setCompat] = useState<string | null>(null);
  const cfg = (m: string) => a.est.maqCfg?.[m] ?? {};
  const up = (m: string, f: (c: NonNullable<typeof a.est.maqCfg>[string]) => void, h: { campo: string; de: string; para: string }) => set((n) => { n.est.maqCfg ??= {}; n.est.maqCfg[m] ??= {}; f(n.est.maqCfg[m]); }, h);
  const renomear = (m: string, nn: string) => { nn = nn.trim(); if (!nn || nn === m) return; if (a.est.maquinas.includes(nn)) return aviso('Já existe uma máquina com esse nome'); set((n) => { n.est.maquinas = n.est.maquinas.map((x) => (x === m ? nn : x)); if (n.est.maqCfg?.[m]) { n.est.maqCfg[nn] = n.est.maqCfg[m]; delete n.est.maqCfg[m]; } n.est.linhas.forEach((l) => { if (l.maquina === m) l.maquina = nn; }); }, { campo: 'Máquina renomeada', de: m, para: nn }); aviso(`${m} → ${nn} (histórico e peças preservados)`); };
  const all = a.est.maquinas.filter(Boolean);
  return (
    <>
      <Card>
        <Titulo t="Máquinas de usinagem" sub="turnos de operação, disponibilidade e compatibilidade — desativar não apaga histórico nem tempos" />
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th>Máquina</th><th>Ativa</th>{e.turnos.map((t) => <th key={t.nome} className="text-center">Turno {t.nome}</th>)}<th>Disp. própria %</th><th className="text-right">Peças prog.</th><th className="text-right">Compat.</th><th className="text-right">Util.</th><th /></tr></thead><tbody>
          {all.map((m) => { const k = cfg(m), res = r.maquinas.find((x) => x.nome === m), prog = a.est.linhas.filter((l) => l.maquina === m && l.ativo !== false && l.tp > 0).length, comp = a.est.linhas.filter((l) => l.maquina === m).length; const ativa = k.ativa !== false;
            return (
              <tr key={m} className={cx('border-t border-slate-100', !ativa && 'text-slate-400')}>
                <td><input defaultValue={m} key={m} onBlur={(x) => renomear(m, x.target.value)} onKeyDown={(x) => x.key === 'Enter' && (x.target as HTMLInputElement).blur()} className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-slate-200 focus:border-blue-400 focus:bg-white" /></td>
                <td><input type="checkbox" checked={ativa} onChange={(x) => { if (!x.target.checked && prog && !confirm(`${m} tem ${prog} peças programadas. Desativar mantém o histórico, mas a carga dessas peças deixa de ser contada. Transfira-as antes. Desativar mesmo assim?`)) return; up(m, (c) => { c.ativa = x.target.checked; }, { campo: `Máquina ${x.target.checked ? 'ativada' : 'desativada'}`, de: '', para: m }); }} /></td>
                {[0, 1, 2].map((t) => <td key={t} className="text-center"><input type="checkbox" checked={k.turnos ? k.turnos[t] : true} onChange={(x) => up(m, (c) => { const z = c.turnos ?? [true, true, true]; z[t] = x.target.checked; c.turnos = [...z] as [boolean, boolean, boolean]; }, { campo: `${m} opera no turno ${e.turnos[t].nome}`, de: String(k.turnos ? k.turnos[t] : true), para: String(x.target.checked) })} /></td>)}
                <td><Num v={k.disp ? +(k.disp * 100).toFixed(1) : 0} step={0.5} max={100} w="w-20" on={(v) => up(m, (c) => { c.disp = v > 0 ? v / 100 : undefined; }, { campo: `${m} disponibilidade`, de: String(k.disp ?? 'cenário'), para: v ? `${v}%` : 'cenário' })} /><span className="ml-1 text-[10px] text-slate-400">{k.disp ? '' : 'usa o cenário'}</span></td>
                <td className="text-right">{prog}</td><td className="text-right">{comp}</td><td className="text-right">{res ? pct(res.util) : '—'}</td>
                <td><Btn className="!px-2 !py-0.5 text-xs" onClick={() => setCompat(m)}>Peças compatíveis</Btn></td>
              </tr>
            ); })}
        </tbody></table></div>
        <form className="mt-3 flex gap-2" onSubmit={(x) => { x.preventDefault(); const n = novo.trim(); if (!n || a.est.maquinas.includes(n)) return aviso('Informe um nome novo'); set((s) => { s.est.maquinas.push(n); }, { campo: 'Nova máquina', de: '', para: n }); setNovo(''); aviso(`${n} cadastrada`); }}><Inp placeholder="Nova máquina (ex.: UMC-03)" value={novo} onChange={(x) => setNovo(x.target.value)} /><Btn type="submit" v="primary">Cadastrar</Btn></form>
        <p className="mt-2 text-[11px] text-slate-400">A capacidade de uma máquina depende dos turnos em que opera e da disponibilidade — nunca do número de funcionários.</p>
      </Card>
      <Compat m={compat} fechar={() => setCompat(null)} />
    </>
  );
}

/** Quais peças a máquina consegue usinar e com qual tempo padrão específico. */
function Compat({ m, fechar }: { m: string | null; fechar: () => void }) {
  const { a, set, aviso } = useStore();
  const [q, setQ] = useState('');
  const partes = useMemo(() => { const mp = new Map<string, { chave: string; modelo: string; peca: string; at: number; aqui?: number }>(); a.est.linhas.forEach((l, i) => { if (!l.peca) return; const k = chavePeca(l); const x = mp.get(k) ?? { chave: k, modelo: l.modelo, peca: l.peca, at: -1 }; if (l.ativo !== false) x.at = i; if (l.maquina === m) x.aqui = i; mp.set(k, x); }); return Array.from(mp.values()); }, [a.est.linhas, m]);
  const lista = partes.filter((p) => !q || `${p.modelo} ${p.peca}`.toLowerCase().includes(q.toLowerCase())).sort((x, y) => Number(y.aqui !== undefined) - Number(x.aqui !== undefined)).slice(0, 80);
  return (
    <Modal aberto={!!m} fechar={fechar} titulo={`Peças que a ${m} consegue usinar`}>
      <Inp placeholder="Pesquisar peça ou modelo…" value={q} onChange={(x) => setQ(x.target.value)} className="mb-3 w-full" />
      <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th>Compatível</th><th>Modelo</th><th>Peça</th><th>Tempo na {m} (min)</th><th>Situação</th></tr></thead><tbody>
        {lista.map((p) => { const l = p.aqui !== undefined ? a.est.linhas[p.aqui] : null; const prog = l?.ativo !== false && !!l; return (
          <tr key={p.chave} className="border-t border-slate-100">
            <td><input type="checkbox" checked={!!l} disabled={prog} title={prog ? 'Peça programada aqui: transfira antes de remover' : ''} onChange={(x) => {
              if (x.target.checked) { if (p.at < 0) return; set((n) => { const o = n.est.linhas[p.at]; n.est.linhas.push({ ...o, maquina: m!, ativo: false, tr: 0 }); }, { campo: 'Compatibilidade adicionada', de: '', para: `${p.peca} em ${m}` }); aviso('Compatível — ajuste o tempo específico'); }
              else if (p.aqui !== undefined) set((n) => { n.est.linhas.splice(p.aqui!, 1); }, { campo: 'Compatibilidade removida', de: `${p.peca} em ${m}`, para: '' }); }} /></td>
            <td>{p.modelo}</td><td>{p.peca}</td>
            <td>{l ? <Num v={l.tp} step={0.1} w="w-24" on={(v) => set((n) => { n.est.linhas[p.aqui!].tp = v; }, { campo: `${p.modelo}/${p.peca} (${m}) — tp`, de: String(l.tp), para: String(v), ref: { i: p.aqui!, k: 'tp' } })} /> : <span className="text-slate-300">—</span>}</td>
            <td className="text-xs">{prog ? <span className="text-green-700">programada aqui</span> : l ? 'alternativa' : ''}</td>
          </tr>); })}
      </tbody></table>
    </Modal>
  );
}
