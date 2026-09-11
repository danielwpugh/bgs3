import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouteContext } from './navigation';
import { apiFetch } from '../lib/public-client';
import Home from '../app/page';
import Analytics from './Analytics';
import BackgroundWrapper from '../components/BackgroundWrapper';
import VisitorTracker from '../components/VisitorTracker';
import FrontendAuthGuard from '../components/FrontendAuthGuard';
import '../app/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;
const Beastdex = lazy(() => import('../app/beastdex/page'));
const Login = lazy(() => import('../app/frontend-login/page'));
const Player = lazy(() => import('../app/players/[slug]/PlayerPageClient'));
function PlayerRoute({slug}: {slug: string}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/api/players/${encodeURIComponent(slug)}`, { signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error(res.status === 404 ? 'Player not found.' : 'Unable to load player.');
      setData(await res.json());
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [slug]);
  if (error) return <p role="alert">{error} <button onClick={() => location.reload()}>Retry</button></p>;
  return data ? <Player initialPlayer={data.player} initialUpvoteCount={data.upvoteCount} /> : <p>Loading player…</p>;
}
class Boundary extends React.Component<React.PropsWithChildren, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() { return this.state.failed ? <p role="alert">Unable to load this page. <button onClick={() => location.reload()}>Reload</button></p> : this.props.children; }
}
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const update = () => { setRoute(location.hash.slice(1) || '/'); window.scrollTo(0,0); }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  const path = route.split('?')[0];
  const page = path === '/' || path === '/stats' ? <Home /> : path === '/beastdex' ? <Beastdex /> : path === '/frontend-login' ? <Login /> : path.startsWith('/players/') ? <PlayerRoute key={path} slug={decodeURIComponent(path.slice(9))} /> : <p>Page not found. <a href="#/">Go home</a></p>;
  return <RouteContext.Provider value={route}><Analytics /><Boundary key={path}><VisitorTracker /><Suspense fallback={<p>Loading…</p>}><FrontendAuthGuard><BackgroundWrapper>{page}</BackgroundWrapper><footer className="relative text-center py-4 text-xs">Voting is for entertainment purposes only. | <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ">Privacy Policy</a></footer></FrontendAuthGuard></Suspense></Boundary></RouteContext.Provider>;
}
createRoot(document.getElementById('beastgames-root')!).render(<App />);
