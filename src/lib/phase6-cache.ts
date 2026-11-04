import { useEffect, useState } from 'react';
function openCache():Promise<IDBDatabase> {return new Promise((resolve,reject)=>{const r=indexedDB.open('genri-phase6-local',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function useLocalDraft<T>(key:string,initial:T) {
 const [value,setValue]=useState(initial); const [ready,setReady]=useState(false); const [state,setState]=useState('Opening local cache');
 useEffect(()=>{let active=true;setReady(false);setValue(initial);openCache().then(db=>{const r=db.transaction('drafts').objectStore('drafts').get(key);r.onsuccess=()=>{if(active){if(r.result!==undefined)setValue(r.result);setReady(true);setState('Cached locally');}db.close();};r.onerror=()=>{if(active){setReady(true);setState('Local cache unavailable');}db.close();};}).catch(()=>{if(active){setReady(true);setState('Local cache unavailable');}});return()=>{active=false;};},[key]);
 const update=(next:T)=>{setValue(next);setState('Saving locally');openCache().then(db=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(next,key);tx.oncomplete=()=>{setState('Cached locally');db.close();};tx.onerror=()=>{setState('Local cache unavailable');db.close();};}).catch(()=>setState('Local cache unavailable'));};
 return {value,update,ready,state};
}
