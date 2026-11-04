import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { config6Schema, routes6, adapters6, scorecards6 } from './phase6';
export const saveGridConfig=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>config6Schema.parse(d)).handler(async({data,context})=>{
 const {data:allowed,error:permissionError}=await context.supabase.rpc('can_manage_org',{_org:data.orgId,_user:context.userId});
 if(permissionError||!allowed) return {ok:false,error:'Only workspace owners and admins can save configurations.'};
 let result;
 if(data.kind==='route') {const r=routes6[data.index];if(!r)return {ok:false,error:'Unknown route'};result=await context.supabase.from('speculative_route_configs').insert({org_id:data.orgId,target_model_id:r.target,draft_model_id:r.draft,acceptance_rate_pct:r.acceptance,latency_reduction_pct:r.reduction,shared_kv_cache_hits:data.cache?r.cache:0,is_active:false,source:'sample-replay',config:{k:data.k,cache:data.cache}}).select('id').single();}
 else if(data.kind==='adapter') {const a=adapters6[data.index];if(!a)return {ok:false,error:'Unknown adapter'};result=await context.supabase.from('fine_tune_adapters').insert({org_id:data.orgId,base_model_id:a.model,adapter_name:a.name,rank:a.rank,alpha:a.alpha,training_cost_usd:a.cost,eval_pass_rate_improvement:a.tuned-a.base,status:'evaluating',source:'sample-replay',report:{base:a.base,tuned:a.tuned,simulatedStatus:a.status}}).select('id').single();}
 else {const a=scorecards6[data.index];if(!a)return {ok:false,error:'Unknown scorecard'};result=await context.supabase.from('sovereignty_compliance_audits').insert({org_id:data.orgId,model_id:a.model,jurisdiction:a.jurisdiction,data_residency_region:a.region,zero_data_retention_verified:false,source:'sample-scorecard',report:{provider:a.provider,illustrativeScore:a.score,evidence:'not supplied'}}).select('id').single();}
 if(result.error)return {ok:false,error:'Configuration could not be saved.'};return {ok:true,id:result.data?.id};
});
export const listGridConfigs=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(d=>z.object({orgId:z.string().uuid(),kind:z.enum(['route','adapter','audit'])}).parse(d)).handler(async({data,context})=>{
 if(data.kind==='route'){const r=await context.supabase.from('speculative_route_configs').select('id,target_model_id,source,config').eq('org_id',data.orgId).order('created_at',{ascending:false}).limit(20);return {ok:!r.error,rows:(r.data??[]).map(x=>({id:x.id,name:x.target_model_id,source:x.source}))};}
 if(data.kind==='adapter'){const r=await context.supabase.from('fine_tune_adapters').select('id,adapter_name,source').eq('org_id',data.orgId).order('created_at',{ascending:false}).limit(20);return {ok:!r.error,rows:(r.data??[]).map(x=>({id:x.id,name:x.adapter_name,source:x.source}))};}
 const r=await context.supabase.from('sovereignty_compliance_audits').select('id,data_residency_region,source').eq('org_id',data.orgId).order('created_at',{ascending:false}).limit(20);return {ok:!r.error,rows:(r.data??[]).map(x=>({id:x.id,name:x.data_residency_region,source:x.source}))};
});
