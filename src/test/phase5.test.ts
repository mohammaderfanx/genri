import { describe, expect, it } from 'vitest';
import { domains, hardware, meshNodes, synthesize, energyEstimate, saveReportSchema } from '@/lib/phase5';
describe('Phase 5 rules',()=>{
 it('provides six accelerator chipsets',()=>expect(hardware.map(h=>h.name)).toEqual(['Nvidia H100','Nvidia B200','Groq LPU','TPU v5e','Apple M4 Max','AMD MI300X']));
 it('provides over 100 synthetic probers without claiming verification',()=>{expect(meshNodes.length).toBeGreaterThanOrEqual(100);expect(meshNodes.every(n=>!n.verified)).toBe(true);});
 it('calculates tokens per joule from throughput and watts',()=>expect(energyEstimate(1000000,1000,500,.2)).toEqual({seconds:1000,kwh:500000/3600000,cost:(500000/3600000)*.2,efficiency:2}));
 it('generates a deterministic expected answer for each domain',()=>{const answers=domains.map(d=>synthesize(d,4,5,0)[0]?.answer);expect(answers).toEqual(['1/4','10','279','7']);expect(synthesize(domains[0],4,5,0)).toEqual(synthesize(domains[0],4,5,0));});
 it('rejects unknown accelerator indices for private reports',()=>expect(saveReportSchema.safeParse({kind:'hardware',data:{index:6,quantization:'FP16'}}).success).toBe(false));
});