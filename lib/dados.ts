import dados from '@/tools/dados_usinagem.json';
import { Estado, Linha, novoEstado } from '@/lib/capacidade';

export type Plano = { modelo: string; familia: string; qtd: number[] };
export type Hist = { t: number; quem: string; campo: string; de: string; para: string; ref?: { i: number; k: string } };
export type Salvo = { id: string; nome: string; cenario: Estado['cenarios'][number]; t: number };
export type App = { est: Estado; plano: Plano[]; dias: number[]; meses: string[]; mes: number; sel: number; fam: string; hist: Hist[]; salvos: Salvo[]; pitch: number };

export const inicial = (): App => {
  const e = novoEstado();
  e.turnos = [{ nome: 'A', ini: '07:30', fim: '17:08', pausa: 60 }, { nome: 'B', ini: '20:40', fim: '05:37', pausa: 60 }, { nome: 'C', ini: '22:00', fim: '06:00', pausa: 0 }];
  e.turnosAtual = structuredClone(e.turnos); // escala atual (Excel); e.turnos = nova escala planejada
  e.maqCfg = {}; e.alocacao = 'proporcional'; e.pesoTurno = [1, 1, 1];
  e.maquinas = dados.maquinas;
  const base = { efic: 0.845969, disp: 0.955, fDem: 1, fTempo: 0.9, base: 'Padrão' as const, heH: 0, heDias: 0 };
  e.cenarios = [
    { nome: 'Atual', turnos: [true, false, false], ...base },
    { nome: 'Ajustado', turnos: [true, true, false], ...base },
    { nome: 'Otimizado', turnos: [true, true, false], ...base, heH: 0.8, heDias: 21 },
  ];
  const mk = (l: { familia: string; modelo: string; peca: string; maquina: string; tp: number }): Linha => ({ familia: l.familia, modelo: l.modelo, peca: l.peca, processo: 'USINAGEM', celula: '', maquina: l.maquina, oper: 1, tp: l.tp, tr: 0, setup: 0, lote: 0, dem: 0, codigo: '', obs: '', ativo: true });
  e.linhas = [...dados.linhas.map(mk), ...dados.linhas_sem_tempo.map(mk)];
  return { est: e, plano: dados.plano, dias: dados.dias, meses: dados.meses, mes: 6, sel: 0, fam: 'TODAS', hist: [], salvos: [], pitch: 0 };
};

/** Estado com demanda do mês e dias úteis resolvidos — entrada dos cálculos. */
export const efetivoDe = (a: App, mes = a.mes): Estado => {
  const dem = (m: string) => a.plano.find((p) => p.modelo === m)?.qtd[mes] ?? 0;
  return { ...a.est, diasMes: a.dias[mes], linhas: a.est.linhas.map((l) => ({ ...l, dem: dem(l.modelo) })) };
};

/** Completa campos novos em estados salvos por versões anteriores. */
export const normalizar = (a: App): App => {
  const n = { ...inicial(), ...a }; const e = n.est;
  e.turnosAtual ??= structuredClone(e.turnos); e.maqCfg ??= {}; e.alocacao ??= 'proporcional'; e.pesoTurno ??= [1, 1, 1];
  e.celulas.forEach((c) => { while (c.func.length < e.cenarios.length) c.func.push([0, 0, 0]); });
  return n;
};
