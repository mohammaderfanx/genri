import { describe,it,expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { cheapestOffer, regressionGate, cacheEstimate, routes6, adapters6, managePhase6, verifyTelemetry } from '@/lib/phase6';
import { deploymentFiles } from '@/lib/phase6-bundle';
describe('Phase 6 planning rules',()=>{
 it('offers five target/draft pairs',()=>expect(routes6).toHaveLength(5));
 it('offers eight adapter scenarios',()=>expect(adapters6).toHaveLength(8));
 it('selects lowest-cost venue satisfying latency',()=>expect(cheapestOffer(500,'Any')?.provider).toBe('RunPod'));
 it('enforces region as well as SLA',()=>expect(cheapestOffer(400,'EU')).toBeNull());
 it('blocks quality regressions above budget',()=>expect(regressionGate(72,78,1.1,1)).toBe(false));
 it('does not pass without improvement',()=>expect(regressionGate(78,78,0,1)).toBe(false));
 it('counts cached prefix tokens',()=>expect(cacheEstimate(2048,500,86.2)).toBe(882688));
 it('restricts configuration writes to managers',()=>{expect(managePhase6('viewer')).toBe(false);expect(managePhase6('evaluator')).toBe(false);expect(managePhase6('admin')).toBe(true);expect(managePhase6('owner')).toBe(true);});
 it('exports no-pull templates without external dependencies',()=>{const files=deploymentFiles('llama-3-3-70b');expect(files['compose.yaml']).toContain('pull_policy: never');expect(files['helm/templates/deployment.yaml']).toContain('imagePullPolicy: Never');});
 it('rejects a tampered signed payload',async()=>{Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const key=await crypto.subtle.exportKey('jwk',pair.publicKey);const payload='{"latency_ms":21}';const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,new TextEncoder().encode(payload));const signature=btoa(String.fromCharCode(...new Uint8Array(sig)));const envelope={algorithm:'ECDSA-P256-SHA256',payload,signature};expect(await verifyTelemetry(envelope,key)).toBe(true);expect(await verifyTelemetry({...envelope,payload:'{"latency_ms":1}'},key)).toBe(false);});
});
