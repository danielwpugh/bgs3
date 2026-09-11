import React, { createContext, useContext } from 'react';
export const RouteContext = createContext('/');
export function usePathname() { return useContext(RouteContext).split('?')[0]; }
export function useSearchParams() { return new URLSearchParams(useContext(RouteContext).split('?')[1] || ''); }
export function useParams() { return { slug: decodeURIComponent(usePathname().split('/')[2] || '') }; }
export function useRouter() { return { push: (url: string) => { window.location.hash = url.startsWith('/') && !url.startsWith('//') ? url : '/'; }, replace: (url: string) => { window.location.replace(`#${url.startsWith('/') && !url.startsWith('//') ? url : '/'}`); }, refresh: () => window.location.reload() }; }
export default function Link({href, children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href?.startsWith('/') ? `#${href}` : href}>{children}</a>;
}
