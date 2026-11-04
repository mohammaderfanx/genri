import { z } from 'zod';
export const phase6Head = (title:string,description:string) => ({meta:[{title:`${title} | Genri AI`},{name:'description',content:description},{property:'og:title',content:`${title} | Genri AI`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]});
export const routes6 = [
 {target:'llama-3-3-70b',draft:'llama-3-2-1b',name:'Llama 3.3 70B',draftName:'Llama 3.2 1B',acceptance:78.4,reduction:42.1,cache:86.2,k:5},
 {target:'deepseek-r1',draft:'deepseek-r1-distill',name:'DeepSeek R1',draftName:'R1 Distill 7B',acceptance:71.6,reduction:36.8,cache:79.4,k:4},
 {target:'qwen-2-5-72b',draft:'qwen-2-5-0-5b',name:'Qwen 2.5 72B',draftName:'Qwen 2.5 0.5B',acceptance:82.1,reduction:47.3,cache:91.0,k:6},
 {target:'mistral-large',draft:'ministral-8b',name:'Mistral Large',draftName:'Ministral 8B',acceptance:76.9,reduction:39.5,cache:83.1,k:5},
 {target:'gemma-3-27b',draft:'gemma-3-1b',name:'Gemma 3 27B',draftName:'Gemma 3 1B',acceptance:85.3,reduction:51.2,cache:88.7,k:7},
];
export const adapters6 = ['Medical-RAG-v3-LoRA','Legal-EU-QLoRA','Code-Repair-v2','Finance-Extract-v4','Support-Alignment','Biomedical-QA','Reasoning-SG','Secure-Tools-v1'].map((name,i)=>({name,model:routes6[i%5].target,rank:[16,32,8,64][i%4],alpha:[32,64,16,128][i%4],base:72+i*1.7,tuned:78+i*1.8,cost:4.2+i*2.4,domain:['Medical','Legal','Code','Finance'][i%4],status:['deployed_active','evaluating','training','archived'][i%4] as 'deployed_active'|'evaluating'|'training'|'archived'}));
export const jurisdictions=['EU_GDPR_AI_Act','US_HIPAA','SG_PDPA','Air_Gapped_OnPrem'] as const;
export const scorecards6 = [
 {provider:'AWS Bedrock',model:'llama-3-3-70b',region:'eu-central-1',jurisdiction:jurisdictions[0],score:88,retention:'Contract required',boundary:'Frankfurt'},
 {provider:'Azure AI',model:'mistral-large',region:'eastus2',jurisdiction:jurisdictions[1],score:91,retention:'BAA required',boundary:'Virginia'},
 {provider:'RunPod',model:'qwen-2-5-72b',region:'EU-RO',jurisdiction:jurisdictions[0],score:67,retention:'Evidence pending',boundary:'Bucharest'},
 {provider:'Lambda Labs',model:'deepseek-r1',region:'us-east',jurisdiction:jurisdictions[1],score:73,retention:'Evidence pending',boundary:'US East'},
 {provider:'On-prem vLLM',model:'llama-3-3-70b',region:'local',jurisdiction:jurisdictions[3],score:95,retention:'Local policy required',boundary:'Customer controlled'},
 {provider:'Google Vertex',model:'gemma-3-27b',region:'asia-southeast1',jurisdiction:jurisdictions[2],score:84,retention:'Contract required',boundary:'Singapore'},
];
export const offers6 = [
 {provider:'RunPod',engine:'vLLM',price:0.24,p95:480,capacity:120,region:'EU'},
 {provider:'Lambda Labs',engine:'vLLM',price:0.28,p95:360,capacity:85,region:'US'},
 {provider:'AWS',engine:'Bedrock',price:0.72,p95:620,capacity:240,region:'EU'},
 {provider:'Groq',engine:'LPU',price:0.69,p95:190,capacity:65,region:'US'},
 {provider:'Self-hosted',engine:'vLLM',price:0.19,p95:840,capacity:40,region:'Local'},
];
export function cheapestOffer(sla:number,region:string,offers=offers6) {return offers.filter(o=>o.p95<=sla && (region==='Any'||o.region===region)).sort((a,b)=>a.price-b.price)[0] ?? null;}
export function regressionGate(base:number,tuned:number,regression:number,maxRegression:number) {return tuned>base && regression<=maxRegression;}
export function cacheEstimate(tokens:number,requests:number,hitRate:number) {return Math.round(tokens*requests*hitRate/100);}
export function managePhase6(role:string) {return role==='owner'||role==='admin';}
export const config6Schema=z.object({orgId:z.string().uuid(),kind:z.enum(['route','adapter','audit']),index:z.number().int().min(0).max(7),k:z.number().int().min(1).max(16).default(5),cache:z.boolean().default(true)});
export const signatureSchema=z.object({payload:z.string().max(2_000_000),signature:z.string().max(4096),algorithm:z.literal('ECDSA-P256-SHA256')});
export async function verifyTelemetry(bundle:unknown,trustedKey:JsonWebKey) {
 const b=signatureSchema.parse(bundle);
 const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('jwk',trustedKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(b.signature),new TextEncoder().encode(b.payload));
}
