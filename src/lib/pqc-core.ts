import { z } from 'zod';
export const pqcAlgorithms7=['ML-DSA-44','Falcon-512','SLH-DSA-SHA2-128f'] as const;
export const pqcEnvelope7=z.object({algorithm:z.enum(pqcAlgorithms7),payload:z.string().min(1).max(1_000_000),signature:z.string().min(1).max(30_000)});
export async function fingerprint7(bytes:Uint8Array) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');}
export function decode7(s:string){return Uint8Array.from(atob(s.trim()),c=>c.charCodeAt(0));}