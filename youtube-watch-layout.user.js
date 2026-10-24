// ==UserScript==
// @name         YouTube - Old watch page layout
// @version      1.0
// @description  Disable the Oct 2026 watch page layout experiment flags (comments stay in the right sidebar). Based on uBO filters by u/s4muka11.
// @match        https://www.youtube.com/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Experiment flags that drive the new watch page layout. Flipping these to
  // false makes YouTube fall back to the classic layout (comments on the right).
  const FLAGS_OFF = [
    'web_watch_eligible_to_switch_to_grid', 'web_watch_enable_single_column_grid_view',
    'web_fixed_panel_watch_next_grid_swap', 'web_live_chat_panel_watch_next_grid_swap',
    'web_watch_fixed_default_panels', 'web_engagement_panel_show_description',
    'web_watch_move_summary_to_sd', 'web_watch_hero_list', 'web_watch_split_scroll',
    'web_side_rail_dismissible_panels', 'kevlar_watch_hide_comments_while_panel_open',
    'kevlar_watch_cinematics', 'disable_theater_mode',
  ];
  const patchFlags = (f) => { if (f && typeof f === 'object') for (const k of FLAGS_OFF) f[k] = false; return f; };

  // YouTube builds window.yt -> yt.config_ -> EXPERIMENT_FLAGS in stages, so
  // intercept each level at the moment it gets assigned and patch whatever lands there.
  function trap(obj, key, onSet) {
    let value = obj[key];
    if (value !== undefined) value = onSet(value);
    try {
      Object.defineProperty(obj, key, {
        configurable: true, enumerable: true,
        get: () => value,
        set: (v) => { value = onSet(v); },
      });
    } catch (e) {}
  }
  trap(window, 'yt', (yt) => {
    if (yt && typeof yt === 'object') trap(yt, 'config_', (cfg) => {
      if (cfg && typeof cfg === 'object') trap(cfg, 'EXPERIMENT_FLAGS', patchFlags);
      return cfg;
    });
    return yt;
  });

  // Fallbacks: patch anything that got assigned without going through the setters.
  const repatch = () => patchFlags(window.yt?.config_?.EXPERIMENT_FLAGS);
  const iv = setInterval(repatch, 50);
  setTimeout(() => clearInterval(iv), 10000);
  document.addEventListener('yt-navigate-start', repatch);
  document.addEventListener('yt-navigate-finish', repatch);

  // Hide the new right-side rail that the experiment adds.
  const s = document.createElement('style');
  s.textContent = `.ytSideRailViewModelHost{display:none!important}
    ytd-watch-flexy{--ytd-watch-flexy-fixed-side-menu-width:0px!important}
    ytd-watch-flexy #columns::after{width:0!important;display:none!important}`;
  (document.head || document.documentElement).appendChild(s);
})();
