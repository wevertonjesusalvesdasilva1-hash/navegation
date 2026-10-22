export type Turno = { nome: string; ini: string; fim: string; pausa: number };
export type Cenario = { nome: string; turnos: [boolean, boolean, boolean]; heH: number; heDias: number; efic: number; disp: number; fDem: number; fTempo: number; base: "Padrão" | "Real" };
export type Celula = { nome: string; familia: string; func: [number, number, number][] }; // func[cenario][turno]
export type Linha = { familia: string; modelo: string; peca: string; processo: string; celula: string; maquina: string; oper: number; tp: number; tr: number; setup: number; lote: number; dem: number };
export type Estado = { heRef: number; diasMes: number; diasSem: number; amarelo: number; vermelho: number; sogyodo: "Nominal" | "Efetiva"; turnos: Turno[]; cenarios: Cenario[]; celulas: Celula[]; maquinas: string[]; linhas: Linha[] };
export type Status = "SEM CARGA" | "OK" | "ATENÇÃO" | "INSUFICIENTE";
export type Res = { nome: string; familia: string; func: number; nominal: number; efetiva: number; extraHE: number; carga: number; util: number; saldo: number; ocioso: number; deficit: number; funcAdic: number; sogyodo: number; status: Status; capPc: number };

const mins = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const horasTurno = (t: Turno) => (((mins(t.fim) - mins(t.ini)) % 1440) + 1440) % 1440 / 60 - t.pausa / 60;

export const novoEstado = (): Estado => ({
  heRef: 0.8, diasMes: 22, diasSem: 5, amarelo: 0.85, vermelho: 1, sogyodo: "Nominal", // PROVISÓRIO: confirmar
  turnos: [{ nome: "A", ini: "06:00", fim: "14:00", pausa: 60 }, { nome: "B", ini: "14:00", fim: "22:00", pausa: 60 }, { nome: "C", ini: "22:00", fim: "06:00", pausa: 60 }],
  cenarios: [
    { nome: "Atual", turnos: [true, false, false], heH: 0, heDias: 0, efic: 0.85, disp: 0.9, fDem: 1, fTempo: 1, base: "Padrão" },
    { nome: "Ajustado", turnos: [true, true, false], heH: 0, heDias: 0, efic: 0.85, disp: 0.9, fDem: 1, fTempo: 1, base: "Padrão" },
    { nome: "Otimizado", turnos: [true, true, false], heH: 0, heDias: 0, efic: 0.9, disp: 0.92, fDem: 1, fTempo: 0.9, base: "Padrão" },
  ],
  celulas: [], maquinas: ["UMC-01", "UMC-02", "HMC-16"], linhas: [],
});

export const statusDe = (e: Estado, carga: number, cap: number): Status =>
  carga === 0 ? "SEM CARGA" : cap === 0 || carga / cap >= e.vermelho ? "INSUFICIENTE" : carga / cap >= e.amarelo ? "ATENÇÃO" : "OK";

function cargaRecurso(e: Estado, c: Cenario, filtro: (l: Linha) => boolean, comOper: boolean) {
  let h = 0;
  for (const l of e.linhas) {
    if (!filtro(l)) continue;
    const t = c.base === "Real" && l.tr > 0 ? l.tr : l.tp;
    const setup = l.lote > 0 ? l.setup / l.lote : 0;
    h += (l.dem * (comOper ? (l.oper > 0 ? l.oper : 1) : 1) * (t * c.fTempo + setup) * c.fDem) / 60;
  }
  return h;
}

export function calcular(e: Estado, s: number) {
  const c = e.cenarios[s];
  const hT = e.turnos.map(horasTurno);
  const hAtivas = c.turnos.reduce((a, on, i) => a + (on ? hT[i] : 0), 0);
  const nTurnos = c.turnos.filter(Boolean).length;
  const ef = c.efic * c.disp;
  const hFunc = e.diasMes * hAtivas * ef; // horas efetivas por funcionário/mês

  const celulas: Res[] = e.celulas.filter((x) => x.nome).map((x) => {
    const f = x.func[s] ?? [0, 0, 0];
    const func = f.reduce((a, n, i) => a + (c.turnos[i] ? n : 0), 0);
    const nominal = e.diasMes * f.reduce((a, n, i) => a + (c.turnos[i] ? n * hT[i] : 0), 0);
    const efetiva = nominal * ef;
    const extraHE = c.heDias * c.heH * func;
    const carga = cargaRecurso(e, c, (l) => l.celula === x.nome, true);
    const util = efetiva > 0 ? carga / efetiva : 0;
    const dem = e.linhas.filter((l) => l.celula === x.nome).reduce((a, l) => a + l.dem, 0) * c.fDem;
    return { nome: x.nome, familia: x.familia, func, nominal, efetiva, extraHE, carga, util, saldo: efetiva - carga, ocioso: Math.max(0, efetiva - carga), deficit: Math.max(0, carga - efetiva),
      funcAdic: hFunc > 0 ? Math.max(0, carga - efetiva) / hFunc : 0, sogyodo: e.sogyodo === "Nominal" ? (nominal > 0 ? carga / nominal : 0) : util, status: statusDe(e, carga, efetiva), capPc: carga > 0 ? (dem * efetiva) / carga : 0 };
  });

  const maquinas: Res[] = e.maquinas.filter(Boolean).map((m) => {
    const nominal = e.diasMes * hAtivas;
    const efetiva = nominal * ef;
    const extraHE = c.heDias * c.heH * nTurnos;
    const carga = cargaRecurso(e, c, (l) => l.maquina === m, false);
    const util = efetiva > 0 ? carga / efetiva : 0;
    return { nome: m, familia: "", func: nTurnos, nominal, efetiva, extraHE, carga, util, saldo: efetiva - carga, ocioso: Math.max(0, efetiva - carga), deficit: Math.max(0, carga - efetiva),
      funcAdic: 0, sogyodo: e.sogyodo === "Nominal" ? (nominal > 0 ? carga / nominal : 0) : util, status: statusDe(e, carga, efetiva), capPc: 0 };
  });

  // utilização da máquina com 1, 2 e 3 turnos (mesma eficiência/disponibilidade do cenário)
  const turnosMaq = maquinas.map((m) => [1, 2, 3].map((n) => { const cap = e.diasMes * hT.slice(0, n).reduce((a, b) => a + b, 0) * ef; return cap > 0 ? m.carga / cap : 0; }));

  const soma = (k: keyof Res, l: Res[]) => l.reduce((a, r) => a + (r[k] as number), 0);
  const cap = soma("efetiva", celulas), carga = soma("carga", celulas), nom = soma("nominal", celulas);
  const dem = e.linhas.reduce((a, l) => a + l.dem, 0) * c.fDem;
  const tot = {
    cap, carga, util: cap > 0 ? carga / cap : 0, excedente: soma("deficit", celulas), ocioso: soma("ocioso", celulas), he: soma("deficit", celulas),
    funcDisp: soma("func", celulas), funcNec: soma("func", celulas) + soma("funcAdic", celulas), sogyodo: e.sogyodo === "Nominal" ? (nom > 0 ? carga / nom : 0) : cap > 0 ? carga / cap : 0,
    demanda: dem, capPc: carga > 0 ? (dem * cap) / carga : 0,
    celInsuf: celulas.filter((r) => r.status === "INSUFICIENTE").length, maqInsuf: maquinas.filter((r) => r.status === "INSUFICIENTE").length,
  };

  // gargalo de cada fluxo (modelo+peça): recurso de maior utilização
  const util = (l: Linha) => Math.max(celulas.find((x) => x.nome === l.celula)?.util ?? 0, maquinas.find((x) => x.nome === l.maquina)?.util ?? 0);
  const fluxos = new Map<string, { chave: string; recurso: string; util: number }>();
  for (const l of e.linhas) {
    if (!l.peca) continue;
    const k = `${l.modelo}|${l.peca}`, u = util(l);
    if (u > (fluxos.get(k)?.util ?? -1)) fluxos.set(k, { chave: `${l.modelo} / ${l.peca}`, recurso: l.celula || l.maquina, util: u });
  }
  // horas-máquina por modelo (todas as linhas com máquina)
  const mm = new Map<string, { nome: string; familia: string; horas: number }>();
  for (const l of e.linhas) {
    if (!l.maquina) continue;
    const t = c.base === "Real" && l.tr > 0 ? l.tr : l.tp;
    const hh = (l.dem * (t * c.fTempo + (l.lote > 0 ? l.setup / l.lote : 0)) * c.fDem) / 60;
    const x = mm.get(l.modelo) ?? { nome: l.modelo, familia: l.familia, horas: 0 };
    x.horas += hh; mm.set(l.modelo, x);
  }
  const pilha: Record<string, Record<string, number>> = {};
  for (const l of e.linhas) {
    if (!l.maquina) continue;
    const t = c.base === "Real" && l.tr > 0 ? l.tr : l.tp;
    pilha[l.maquina] ??= {};
    pilha[l.maquina][l.modelo] = (pilha[l.maquina][l.modelo] ?? 0) + (l.dem * (t * c.fTempo + (l.lote > 0 ? l.setup / l.lote : 0)) * c.fDem) / 60;
  }
  // linhas de capacidade do gráfico original (5.Load Graph): 1 turno, 1 turno+HE, 2 turnos, 2 turnos+HE
  const capLinhas = { t1: e.diasMes * hT[0] * ef, t1he: e.diasMes * (hT[0] * ef + e.heRef), t2: e.diasMes * (hT[0] + hT[1]) * ef, t2he: e.diasMes * ((hT[0] + hT[1]) * ef + 2 * e.heRef) };
  const modelos = Array.from(mm.values()).sort((a, b) => b.horas - a.horas);
  return { celulas, maquinas, turnosMaq, tot, modelos, pilha, capLinhas, gargalos: Array.from(fluxos.values()).sort((a, b) => b.util - a.util) };
}

export const semTempo = (l: Linha) => !(l.tp > 0);
export const FAMILIAS = ["HE/PC", "WL/WA", "CT", "MG"];
