import { Alocacao, Estado, Linha, Turno, ativas, calcular, dispMaq, horasTurno, maqAtiva, permitidos } from '@/lib/capacidade';

const mins = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
/** Horas entre entrada e saída, sem descontar intervalo. */
export const brutoTurno = (t: Turno) => ((((mins(t.fim) - mins(t.ini)) % 1440) + 1440) % 1440) / 60;

export type Agg = { cap: number; nominal: number; carga: number; util: number; ocioso: number; deficit: number; saldo: number; sogyodo: number; pecas: number };
export type TurnoRes = { nome: string; ini: string; fim: string; bruto: number; liquida: number; produtiva: number; ativo: boolean; func: number; maq: Agg; cel: Agg };
export type Recurso = { nome: string; familia: string; t: Agg[]; total: Agg };
export type PorTurno = { turnos: TurnoRes[]; maquinas: Recurso[]; celulas: Recurso[]; total: { maq: Agg; cel: Agg } };

const vazio = (): Agg => ({ cap: 0, nominal: 0, carga: 0, util: 0, ocioso: 0, deficit: 0, saldo: 0, sogyodo: 0, pecas: 0 });
const fecha = (e: Estado, a: Agg): Agg => {
  a.util = a.cap > 0 ? a.carga / a.cap : 0; a.saldo = a.cap - a.carga;
  a.sogyodo = e.sogyodo === 'Nominal' ? (a.nominal > 0 ? a.carga / a.nominal : 0) : a.util; return a;
};
const soma = (e: Estado, l: Agg[]): Agg => fecha(e, l.reduce((x, y) => ({ ...x, cap: x.cap + y.cap, nominal: x.nominal + y.nominal, carga: x.carga + y.carga, ocioso: x.ocioso + y.ocioso, deficit: x.deficit + y.deficit, pecas: x.pecas + y.pecas }), vazio()));

/** Distribui a carga mensal de um recurso entre os turnos em que ele opera. */
function alocar(carga: number, cap: number[], modo: Alocacao, peso: number[]): number[] {
  const on = cap.map((c) => c > 0), out = [0, 0, 0]; const tot = cap.reduce((a, b) => a + b, 0);
  if (!on.some(Boolean)) { out[0] = carga; return out; } // sem turno disponível: carga fica sem capacidade (déficit total)
  if (modo === 'sequencial') {
    let rem = carga, last = 0;
    cap.forEach((c, i) => { if (!on[i]) return; const x = Math.min(rem, c); out[i] = x; rem -= x; last = i; });
    out[last] += rem; return out;
  }
  if (modo === 'manual') { const w = peso.map((p, i) => (on[i] ? p : 0)), sw = w.reduce((a, b) => a + b, 0); if (sw > 0) return w.map((x) => (carga * x) / sw); }
  return cap.map((c) => (carga * c) / tot);
}

/** Capacidade e carga individuais de cada turno, com uma escala (horários) e um cenário (pessoas, turnos ativos, máquinas). */
export function porTurno(e: Estado, s: number, turnos: Turno[] = e.turnos): PorTurno {
  const ee: Estado = { ...e, turnos }, c = ee.cenarios[s], base = calcular(ee, s);
  const hT = turnos.map(horasTurno), modo = e.alocacao ?? 'proporcional', peso = e.pesoTurno ?? [1, 1, 1];
  const L = ativas(ee);

  const maquinas: Recurso[] = base.maquinas.map((m) => {
    const pm = permitidos(ee, c, m.nome), ef = c.efic * dispMaq(ee, c, m.nome);
    const nom = [0, 1, 2].map((i) => (pm[i] ? ee.diasMes * hT[i] : 0)), cap = nom.map((n) => n * ef);
    const cg = alocar(m.carga, cap, modo, peso);
    const pecas = L.filter((l) => l.maquina === m.nome).reduce((a, l) => a + l.dem, 0) * c.fDem;
    const t = [0, 1, 2].map((i) => fecha(ee, { cap: cap[i], nominal: nom[i], carga: cg[i], util: 0, ocioso: Math.max(0, cap[i] - cg[i]), deficit: Math.max(0, cg[i] - cap[i]), saldo: 0, sogyodo: 0, pecas: m.carga > 0 ? (pecas * cap[i]) / m.carga : 0 }));
    return { nome: m.nome, familia: '', t, total: soma(ee, t) };
  });

  const celulas: Recurso[] = base.celulas.map((m, k) => {
    const cel = ee.celulas.filter((x) => x.nome)[k], f = cel.func[s] ?? [0, 0, 0], ef = c.efic * c.disp;
    const nom = [0, 1, 2].map((i) => (c.turnos[i] ? ee.diasMes * f[i] * hT[i] : 0)), cap = nom.map((n) => n * ef);
    const cg = alocar(m.carga, cap, modo, peso);
    const pecas = L.filter((l) => l.celula === m.nome).reduce((a, l) => a + l.dem, 0) * c.fDem;
    const t = [0, 1, 2].map((i) => fecha(ee, { cap: cap[i], nominal: nom[i], carga: cg[i], util: 0, ocioso: Math.max(0, cap[i] - cg[i]), deficit: Math.max(0, cg[i] - cap[i]), saldo: 0, sogyodo: 0, pecas: m.carga > 0 ? (pecas * cap[i]) / m.carga : 0 }));
    return { nome: m.nome, familia: m.familia, t, total: soma(ee, t) };
  });

  const ts: TurnoRes[] = turnos.map((t, i) => ({
    nome: t.nome, ini: t.ini, fim: t.fim, bruto: brutoTurno(t), liquida: hT[i], produtiva: hT[i] * c.efic * c.disp, ativo: c.turnos[i],
    func: ee.celulas.reduce((a, x) => a + (c.turnos[i] ? (x.func[s]?.[i] ?? 0) : 0), 0),
    maq: soma(ee, maquinas.map((m) => m.t[i])), cel: soma(ee, celulas.map((m) => m.t[i])),
  }));
  return { turnos: ts, maquinas, celulas, total: { maq: soma(ee, ts.map((x) => x.maq)), cel: soma(ee, ts.map((x) => x.cel)) } };
}

export const periodos = (e: Estado, mensal: number) => ({ diario: e.diasMes > 0 ? mensal / e.diasMes : 0, semanal: e.diasMes > 0 ? (mensal / e.diasMes) * e.diasSem : 0, mensal });
export const dif = (a: number, b: number) => ({ h: b - a, pct: a !== 0 ? (b - a) / a : b !== 0 ? 1 : 0 });

/** Escala atual (turnosAtual + cenário `sAtual`) × nova escala (turnos + cenário `sNova`). */
export function comparar(e: Estado, sAtual: number, sNova: number) {
  const atual = porTurno(e, sAtual, e.turnosAtual ?? e.turnos), nova = porTurno(e, sNova, e.turnos);
  const perdas = nova.turnos.map((t, i) => ({ turno: t.nome, maq: dif(atual.turnos[i].maq.cap, t.maq.cap), cel: dif(atual.turnos[i].cel.cap, t.cel.cap), pecas: dif(atual.turnos[i].maq.pecas + atual.turnos[i].cel.pecas, t.maq.pecas + t.cel.pecas) }));
  return { atual, nova, perdas };
}

/** Onde faltará capacidade na nova escala e o que fazer: HE, redistribuir pessoas ou transferir peças. */
export function sugestoes(e: Estado, nova: PorTurno, s: number): string[] {
  const out: string[] = [], c = e.cenarios[s], f = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const hT = e.turnos.map(horasTurno);
  nova.maquinas.forEach((m) => m.t.forEach((t, i) => {
    if (t.deficit < 0.5) return;
    const alvo = nova.maquinas.filter((x) => x.nome !== m.nome).sort((a, b) => b.total.ocioso - a.total.ocioso)[0];
    out.push(`Máquina ${m.nome} · turno ${e.turnos[i].nome}: faltam ${f(t.deficit)} h/mês (${f(t.deficit / Math.max(1, e.diasMes))} h/dia) → horas extras${alvo && alvo.total.ocioso > 1 ? ` ou transferir peças compatíveis para ${alvo.nome} (folga ${f(alvo.total.ocioso)} h)` : ''}. Mais funcionários não aumentam a capacidade da máquina.`);
  }));
  nova.celulas.forEach((m) => m.t.forEach((t, i) => {
    if (t.deficit < 0.5) return;
    const ef = c.efic * c.disp, porFunc = e.diasMes * hT[i] * ef, n = porFunc > 0 ? Math.ceil(t.deficit / porFunc) : 0;
    const doa = nova.celulas.filter((x) => x.nome !== m.nome && x.t[i].ocioso > porFunc).sort((a, b) => b.t[i].ocioso - a.t[i].ocioso)[0];
    out.push(`Célula ${m.nome} · turno ${e.turnos[i].nome}: faltam ${f(t.deficit)} h → ${doa ? `redistribuir ${Math.min(n, Math.floor(doa.t[i].ocioso / porFunc))} func. de ${doa.nome} (ociosa ${f(doa.t[i].ocioso)} h) ou ` : ''}+${n} func. ou ${f(t.deficit)} h extras.`);
  }));
  return out.slice(0, 14);
}

export const chavePeca = (l: Linha) => `${l.modelo}|${l.peca}|${l.processo}`;
/** Linha ativa (a que carrega a produção) da mesma peça. */
export const linhaAtiva = (e: Estado, idx: number) => e.linhas.findIndex((l) => l.ativo !== false && chavePeca(l) === chavePeca(e.linhas[idx]));
/** Outras máquinas já cadastradas para a peça (com tempo específico) = compatíveis. */
export const alternativas = (e: Estado, idx: number) => e.linhas.map((l, i) => ({ l, i })).filter(({ l, i }) => i !== idx && chavePeca(l) === chavePeca(e.linhas[idx]) && l.maquina);

/** Transfere a peça `idx` para outra máquina: desativa a linha atual e ativa (ou cria) a da máquina destino. Não altera `e`. */
export function transferir(e: Estado, idx: number, destino: string, tpDestino?: number): Estado {
  const n = structuredClone(e), o = n.linhas[idx];
  const alt = n.linhas.findIndex((l, i) => i !== idx && chavePeca(l) === chavePeca(o) && l.maquina === destino);
  o.ativo = false;
  if (alt >= 0) { n.linhas[alt].ativo = true; if (tpDestino && tpDestino > 0) n.linhas[alt].tp = tpDestino; }
  else n.linhas.push({ ...o, maquina: destino, tp: tpDestino ?? o.tp, tr: 0, ativo: true });
  return n;
}
export { maqAtiva };
