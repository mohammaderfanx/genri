import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Atom, Cpu, ShieldCheck, Network, Save, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DemoBadge } from './Phase4Shell';
import { useUser } from '@/lib/auth';
import { saveLabReport, listLabReports } from '@/lib/phase5.functions';
import type { z } from 'zod';
import type { saveReportSchema } from '@/lib/phase5';
const tabs=[{to:'/evals/synthesizer',name:'Synthesis',icon:Atom},{to:'/hardware/profiler',name:'Silicon',icon:Cpu},{to:'/security/redteam',name:'Red team',icon:ShieldCheck},{to:'/mesh/nodes',name:'Edge mesh',icon:Network}] as const;
export function Phase5Shell({title,label,source,children}:{title:string;label:string;source:string;children:ReactNode}) {
 return <main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 font-mono text-xs text-primary">GENRI RESEARCH / PHASE 05 / {label}</p><h1 className="text-3xl font-semibold">{title}</h1></div><DemoBadge>{source}</DemoBadge></div><nav aria-label="Phase 5 labs" className="mb-6 flex gap-2 overflow-x-auto border-b pb-3">{tabs.map(({to,name,icon:Icon})=><Button key={to} asChild variant="ghost" size="sm"><Link to={to} activeProps={{className:'bg-secondary text-foreground'}}><Icon/>{name}</Link></Button>)}</nav>{children}</main>;
}
export function SavedReports({report}:{report:z.infer<typeof saveReportSchema>}) {
 const {user}=useUser(); const save=useServerFn(saveLabReport); const list=useServerFn(listLabReports); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [rows,setRows]=useState<{id:string;name:string;source:string}[]>([]);
 if(!user) return <Button asChild variant="outline" size="sm"><Link to="/auth"><Save/>Sign in to save</Link></Button>;
 async function act(saving:boolean) {setBusy(true);setMessage('');try {if(saving){const r=await save({data:report});if(!r.ok){setMessage(r.error ?? 'Save failed');return;}setMessage('Report saved');}const r=await list();setRows(r.rows);if(!r.ok)setMessage('Reports unavailable');}catch{setMessage('Reports unavailable');}finally{setBusy(false);}}
 return <div className="mt-6 border-t pt-4"><div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" disabled={busy} onClick={()=>act(true)}><Save/>Save report</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>act(false)}><History/>Saved reports</Button><span role="status" className="text-xs text-gain">{message}</span></div>{rows.length>0&&<ul aria-label="Saved reports" className="mt-3 divide-y font-mono text-xs">{rows.map(r=><li key={r.id} className="flex justify-between gap-4 py-3"><span>{r.name}</span><span className="text-muted-foreground">{r.source}</span></li>)}</ul>}</div>;
}
