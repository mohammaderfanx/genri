import { useEffect, useRef } from 'react';
import { meshNodes } from '@/lib/phase5';
export function MeshCanvas({selected,provider,onSelect,paused}:{selected:string;provider:string;onSelect:(id:string)=>void;paused:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let frame=0;let tick=0;const nodes=meshNodes.filter(n=>provider==='All'||n.provider===provider);const styles=getComputedStyle(document.documentElement);const color=(name:string)=>styles.getPropertyValue(name).trim();let width=1000,height=450;
 const resize=()=>{width=canvas.clientWidth;height=canvas.clientHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 const position=(n:typeof meshNodes[number])=>({x:(n.lon+180)/360*width,y:(90-n.lat)/180*height});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const draw=()=>{tick++;ctx.clearRect(0,0,width,height);ctx.strokeStyle=color('--border');ctx.lineWidth=.5;for(let i=0;i<=12;i++){ctx.beginPath();ctx.moveTo(width*i/12,0);ctx.lineTo(width*i/12,height);ctx.stroke();}for(let i=0;i<=6;i++){ctx.beginPath();ctx.moveTo(0,height*i/6);ctx.lineTo(width,height*i/6);ctx.stroke();}
 const focus=nodes.find(n=>n.id===selected) ?? nodes[0];if(focus){const a=position(focus);nodes.filter((_,i)=>i%9===0).forEach(n=>{const b=position(n);ctx.strokeStyle=color('--speed');ctx.globalAlpha=.24;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(!paused&&!reduced){const t=(tick%180)/180;ctx.globalAlpha=.8;ctx.fillStyle=color('--speed');ctx.beginPath();ctx.arc(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2,0,Math.PI*2);ctx.fill();}});}
 ctx.globalAlpha=1;nodes.forEach(n=>{const p=position(n);ctx.fillStyle=color(n.throttled?'--loss':n.id===selected?'--primary':'--gain');ctx.beginPath();ctx.arc(p.x,p.y,n.id===selected?6:3,0,Math.PI*2);ctx.fill();});frame=requestAnimationFrame(draw);};draw();
 const click=(event:MouseEvent)=>{const rect=canvas.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top;const closest=nodes.map(n=>({n,d:Math.hypot(position(n).x-x,position(n).y-y)})).sort((a,b)=>a.d-b.d)[0];if(closest && closest.d<24)onSelect(closest.n.id);};canvas.addEventListener('click',click);return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('click',click);};},[selected,provider,onSelect,paused]);
 return <canvas ref={ref} role="img" aria-label="Synthetic global telemetry topology with 128 sample edge nodes" className="h-[360px] w-full cursor-crosshair md:h-[440px]"/>;
}
