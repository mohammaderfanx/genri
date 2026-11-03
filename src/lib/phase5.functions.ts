import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { saveReportSchema, synthesize, hardware, redteamReports } from './phase5';
export const saveLabReport = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).inputValidator((d)=>saveReportSchema.parse(d)).handler(async ({data, context}) => {
  let result;
  if(data.kind === 'suite') {
    const d=data.data; const report={source:'local-template', contamination:'Not measured', cases:synthesize(d.domain,d.count,d.difficulty,d.seed)};
    result=await context.supabase.from('synthetic_benchmark_suites').insert({name:d.name,target_domain:d.domain,difficulty_rating:d.difficulty,created_by:context.userId,source:'local-template',report}).select('id').single();
  } else if(data.kind==='hardware') {
    const h=hardware[data.data.index]; if(!h) return {ok:false,error:'Unknown hardware profile.'};
    result=await context.supabase.from('hardware_telemetry_profiles').insert({model_id:'sample-llama-70b',host_provider:h.host,quantization_level:data.data.quantization,memory_bandwidth_gbps:h.bandwidth,energy_efficiency_tok_per_joule:h.tps/h.watts,inter_gpu_interconnect_latency_us:h.interconnect,kv_cache_hit_ratio:h.cache,created_by:context.userId,source:'sample',report:h}).select('id').single();
  } else {
    const r=redteamReports[data.data.index]; if(!r) return {ok:false,error:'Unknown scan.'};
    result=await context.supabase.from('security_redteam_scans').insert({model_id:r.model,attack_vector:r.vector,success_rate_pct:r.success,safety_guardrail_latency_overhead_ms:r.guarded-r.raw,attack_payload_samples:r.samples,created_by:context.userId,source:'sample-replay',report:r}).select('id').single();
  }
  if(result.error) return {ok:false,error:'Report could not be saved.'};
  return {ok:true,id:result.data?.id};
});
export const listLabReports = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const [a,b,c]=await Promise.all([context.supabase.from('synthetic_benchmark_suites').select('id,name,source,created_at').eq('created_by',context.userId).order('created_at',{ascending:false}).limit(20),context.supabase.from('hardware_telemetry_profiles').select('id,host_provider,source,created_at').eq('created_by',context.userId).order('created_at',{ascending:false}).limit(20),context.supabase.from('security_redteam_scans').select('id,model_id,source,created_at').eq('created_by',context.userId).order('created_at',{ascending:false}).limit(20)]);
 if(a.error || b.error || c.error) return {ok:false, rows:[]};
 return {ok:true,rows:[...(a.data ?? []).map(r=>({...r,name:r.name})),...(b.data ?? []).map(r=>({...r,name:r.host_provider})),...(c.data ?? []).map(r=>({...r,name:r.model_id}))].sort((x,y)=>y.created_at.localeCompare(x.created_at))};
});
