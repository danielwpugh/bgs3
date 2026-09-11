import {useEffect} from 'react';
import {usePathname} from './navigation';
declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: any[]) => void } }
export default function Analytics() {
  const path=usePathname();
  useEffect(()=>{
    const id=window.BEASTGAMES_CONFIG?.gaMeasurementId;
    if(!id || !/^G-[A-Z0-9]+$/.test(id))return;
    window.dataLayer ??=[];
    if(!document.getElementById('beastgames-analytics')) {
      window.gtag ??= function(){window.dataLayer!.push(arguments);};
      const script=document.createElement('script');script.id='beastgames-analytics';script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;document.head.append(script);
      window.gtag('js',new Date());window.gtag('config',id,{send_page_view:false});
    }
    window.gtag?.('event','page_view',{send_to:id,page_path:path,page_location:location.href});
  },[path]);
  return null;
}
