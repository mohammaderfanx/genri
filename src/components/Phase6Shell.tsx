import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { GitBranch, ShieldCheck, Layers, ChartNoAxesCombined, Save, History } from 'lucide-react';
import { Button } from './ui/button';
import { OrgGate } from './OrgGate';
import { DemoBadge } from './Phase4Shell';
import { useUser } from '@/lib/auth';
import { saveGridConfig, listGridConfigs } from '@/lib/phase6.functions';
import { managePhase6 } from '@/lib/phase6';
const tabs=[{to:'/infrastructure/speculative',name:'Speculative',icon:GitBranch},{to:'/compliance/sovereign',name:'Sovereign',icon:ShieldCheck},{to:'/labs/auto-finetune',name:'Adapters',icon:Layers},{to:'/marketplace/tokens',name:'Clearinghouse',icon:ChartNoAxesCombined}] as const;
export function Phase6Shell({title,label,children}:{title:string;label:string;children:ReactNode}) {return <main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 font-mono text-xs text-speed">GENRI GRID / PHASE 06 / {label}</p><h1 className="text-3xl font-semibold">{title}</h1></div><DemoBadge>SAMPLE SCENARIOS · NOT LIVE EXECUTION</DemoBadge></div><nav aria-label="Phase 6 grid" className="mb-6 flex gap-1 overflow-x-auto border-b pb-3">{tabs.map(({to,name,icon:Icon})=><Button asChild key={to} variant="ghost" size="sm"><Link to={to} activeProps={{className:'bg-secondary text-foreground'}}><Icon/>{name}</Link></Button>)}</nav>{children}</main>;}
export function GridSave({kind,index,k=5,cache=true}:{kind:'route'|'adapter'|'audit';index:number;k?:number;cache?:boolean}) {
 const {user}=useUser();
 if(!user)return <div className="mt-6 border-t pt-4"><Button asChild variant="outline"><Link to="/auth"><Save/>Sign in to save configuration</Link></Button></div>;
 return <div className="mt-6 border-t pt-4"><OrgGate>{(org,switcher)=><GridSaveActions key={`${org.id}:${user.id}`} orgId={org.id} role={org.myRole} switcher={switcher} kind={kind} index={index} k={k} cache={cache}/>}</OrgGate></div>;
}
function GridSaveActions({orgId,role,switcher,kind,index,k,cache}:{orgId:string;role:string;switcher:ReactNode;kind:'route'|'adapter'|'audit';index:number;k:number;cache:boolean}) {
 const save=useServerFn(saveGridConfig);const list=useServerFn(listGridConfigs);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [rows,setRows]=useState<{id:string;name:string;source:string}[]>([]);
 async function act(saving:boolean){setBusy(true);try{if(saving){const r=await save({data:{orgId,kind,index,k,cache}});if(!r.ok){setMessage(r.error??'Save failed');return;}setMessage('Configuration saved');}const r=await list({data:{orgId,kind}});if(!r.ok)setMessage('Saved configurations unavailable');setRows(r.rows);}catch{setMessage('Workspace unavailable');}finally{setBusy(false);}}
 return <><div className="flex flex-wrap items-center gap-3">{switcher}<Button variant="outline" size="sm" onClick={()=>act(true)} disabled={busy||!managePhase6(role)}><Save/>Save configuration</Button><Button variant="ghost" size="sm" disabled={busy} onClick={()=>act(false)}><History/>Saved configurations</Button><span className="text-xs text-gain" role="status">{message}</span></div>{!managePhase6(role)&&<p className="mt-2 text-xs text-muted-foreground">Read-only workspace role</p>}<ul aria-label="Saved grid configurations" className="mt-3 divide-y font-mono text-xs">{rows.map(r=><li key={r.id} className="flex flex-wrap justify-between gap-2 py-3"><span>{r.name}</span><span className="text-muted-foreground">{r.source}</span></li>)}</ul></>;
}
