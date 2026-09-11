/** Scope public Tailwind and component styles to the SALP mount, preserving keyframes. */
export default function scopeCss() {
  return {postcssPlugin:'beastgames-scope',OnceExit(root){
    root.walkRules(rule=>{
      let parent=rule.parent;
      while(parent){if(parent.type==='atrule' && /keyframes$/.test(parent.name))return;parent=parent.parent;}
      rule.selectors=rule.selectors.map(selector=>{
        if (/^(html|body|:root)(?=[\s.:#\[]|$)/.test(selector)) return selector.replace(/^(html|body|:root)/,'#beastgames-root');
        return `#beastgames-root ${selector}`;
      });
    });
  }};
}
