// Joins web-src/*.js into the one script the plugin ships (Jellyfin.Plugin.Afterglow/Web/afterglow.js),
// and copies the stylesheet next to it. Run it after changing anything in web-src/.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

// Order matters: core first (the others use it), main last (it starts everything).
export const MODULES = ['core', 'quality', 'rail', 'favorites', 'drawer', 'hero', 'topten', 'tonight', 'main'];

export function bundle(read = (name) => readFileSync(new URL(`../web-src/${name}.js`, import.meta.url), 'utf8')) {
  const parts = MODULES.flatMap((name) => {
    let source;
    try { source = read(name); } catch { return []; } // a feature not written yet is simply left out
    return [`  // ---------- ${name} ----------\n  (function (ag) {\n${source.replace(/^/gm, '    ')}\n  })(ag);`];
  });
  return `/*!
 * Afterglow for Jellyfin: the script of the Afterglow plugin (https://github.com/kiketorres98/jellyfin-plugin-afterglow).
 * Generated from web-src/ by scripts/build-web.mjs: edit the sources, not this file.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || window.__afterglow) return;
  window.__afterglow = { loaded: true };
  var ag = {};

${parts.join('\n\n')}

  ag.start();
})();
`;
}

if (process.argv[1]?.endsWith('build-web.mjs')) {
  writeFileSync(new URL('../Jellyfin.Plugin.Afterglow/Web/afterglow.js', import.meta.url), bundle());
  copyFileSync(new URL('../web-src/afterglow.css', import.meta.url), new URL('../Jellyfin.Plugin.Afterglow/Web/afterglow.css', import.meta.url));
  console.log('Web/afterglow.js and Web/afterglow.css written');
}
