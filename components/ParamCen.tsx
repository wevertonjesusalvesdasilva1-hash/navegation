'use client';
import { Num, Sel, cx } from '@/components/ui';
import type { Cenario } from '@/lib/capacidade';

/** Parâmetros de um cenário. `on(campo, valor)` aplica a alteração (já com histórico, se for o caso). */
export function ParamCen({ c, turnos, on, compacto }: { c: Cenario; turnos: string[]; on: <K extends keyof Cenario>(k: K, v: Cenario[K]) => void; compacto?: boolean }) {
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="flex items-center justify-between gap-2 text-sm"><span className="text-slate-500">{t}</span>{children}</label>;
  return (
    <div className={cx('grid gap-x-6 gap-y-2', compacto ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      <L t="Turnos ativos"><span className="flex gap-2">{turnos.map((n, k) => <label key={n} className="flex items-center gap-1"><input type="checkbox" checked={c.turnos[k]} onChange={(e) => { const t = [...c.turnos] as Cenario['turnos']; t[k] = e.target.checked; on('turnos', t); }} />{n}</label>)}</span></L>
      <L t="Horas extras (h/turno/dia)"><Num v={c.heH} step={0.1} max={8} on={(v) => on('heH', v)} w="w-20" /></L>
      <L t="Dias com HE no mês"><Num v={c.heDias} max={31} on={(v) => on('heDias', v)} w="w-20" /></L>
      <L t="Eficiência (%)"><Num v={+(c.efic * 100).toFixed(1)} step={0.5} min={1} max={100} on={(v) => on('efic', v / 100)} w="w-20" /></L>
      <L t="Disponibilidade (%)"><Num v={+(c.disp * 100).toFixed(1)} step={0.5} min={1} max={100} on={(v) => on('disp', v / 100)} w="w-20" /></L>
      <L t="Demanda × (1,20 = +20%)"><Num v={c.fDem} step={0.05} on={(v) => on('fDem', v)} w="w-20" /></L>
      <L t="Tempo × (0,90 = −10%)"><Num v={c.fTempo} step={0.05} min={0.1} on={(v) => on('fTempo', v)} w="w-20" /></L>
      <L t="Base de tempo"><Sel value={c.base} onChange={(e) => on('base', e.target.value as Cenario['base'])}><option>Padrão</option><option>Real</option></Sel></L>
    </div>
  );
}
