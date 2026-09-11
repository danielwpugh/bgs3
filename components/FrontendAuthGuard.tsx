'use client';
import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {apiFetch} from '@/lib/public-client';
export default function FrontendAuthGuard({children}:{children:React.ReactNode}) {
  const path=usePathname();const search=useSearchParams();const router=useRouter();
  const [state,setState]=useState<'checking'|'allowed'|'redirecting'|'error'>('checking');
  const [attempt,setAttempt]=useState(0);
  const skip=path?.startsWith('/admin')||path?.startsWith('/frontend-login');
  const query=search?.toString()||'';
  useEffect(()=>{
    if(skip){setState('allowed');return;}
    const controller=new AbortController();setState('checking');
    apiFetch('/api/frontend-auth/verify',{signal:controller.signal,cache:'no-store'}).then(async res=>{
      if(!res.ok)throw new Error('Verification unavailable');
      const data=await res.json();
      if(typeof data.enabled!=='boolean'||typeof data.authenticated!=='boolean')throw new Error('Invalid verification response');
      if(!data.enabled||data.authenticated)setState('allowed');
      else {setState('redirecting');router.push(`/frontend-login?returnUrl=${encodeURIComponent(path+(query?`?${query}`:''))}`);}
    }).catch(()=>{if(!controller.signal.aborted)setState('error');});
    return ()=>controller.abort();
    // Router identities differ between Next and the static adapter; route strings drive checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[path,query,skip,attempt]);
  if(skip||state==='allowed')return <>{children}</>;
  return <div className="min-h-screen flex items-center justify-center text-white">
    {state==='error'?<p role="alert">Unable to connect. <button onClick={()=>setAttempt(n=>n+1)}>Retry</button></p>:<p>{state==='redirecting'?'Redirecting…':'Loading…'}</p>}
  </div>;
}
