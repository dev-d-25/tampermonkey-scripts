// ==UserScript==
// @name         vplink chain skipper
// @namespace    local
// @version      1.2
// @description  Skips the waiting on vplink.in link chains (countdowns + fake "Action Required"
//               modals). Does NOT fake ad engagement - the chain only releases its destination
//               after real ad impressions, so ads must be allowed on pipefitter/jobskiki.
// @match        *://*.pipefitter.in/*
// @match        *://*.jobskiki.in/*
// @match        *://*.vplink.in/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const ON_VPLINK = /vplink\.in$/i.test(location.hostname);
  const ON_FARM   = /pipefitter\.in|jobskiki\.in$/i.test(location.hostname);

  // Containers of the fake "Action Required" / "CLICK ADS WAIT & BACK" modals.
  // These are HIDDEN, never removed - the countdown timer inside them must keep
  // running or it throws on a null node and the gate never opens.
  const OVERLAYS = ['#ggd-container', '#adOverlay', '.ce-modal', '#tp-modal'];

  // ---------- vplink: leave it completely alone ----------
  // Cloudflare Turnstile validates timing on init. Warping the clock here makes it
  // fail with "message from unexpected source", so nothing on this domain is touched
  // except read-only status reporting.
  if (ON_VPLINK) {
    setInterval(() => {
      const iframes = document.querySelectorAll('iframe').length;
      console.debug('[vplink-skip] vplink', {
        href: location.href,
        iframes,
        getlink: !!document.querySelector('#getlink, [id*="getlink"]'),
      });
    }, 2000);
    return;
  }

  if (!ON_FARM) return;

  // ---------- ad-farm pages: fast-forward the waiting ----------
  const CAP = 50;    // cap every timer at 50ms
  const SPEED = 30;  // warp the clock 30x for Date.now()-driven countdowns

  const realNow = Date.now.bind(Date);
  const T0 = realNow();
  const virt = () => realNow() + (realNow() - T0) * (SPEED - 1);

  const RD = Date;
  function D(...a) { return a.length ? new RD(...a) : new RD(virt()); }
  D.prototype = RD.prototype;
  D.now = virt; D.parse = RD.parse; D.UTC = RD.UTC;
  Object.setPrototypeOf(D, RD);
  window.Date = D;

  const _pn = performance.now.bind(performance);
  performance.now = () => _pn() * SPEED;

  const _si = window.setInterval;
  const _st = window.setTimeout;
  window.setInterval = (fn, ms, ...a) => _si(fn, Math.min(ms || 0, CAP), ...a);
  window.setTimeout = (fn, ms, ...a) => _st(fn, Math.min(ms || 0, CAP), ...a);

  // ---------- hide the deceptive UI (without breaking the timers) ----------
  setInterval(() => {
    // never interfere while a Cloudflare challenge is live
    if (document.querySelector('iframe[src*="challenges.cloudflare"], .cf-turnstile')) return;

    for (const sel of OVERLAYS) {
      try {
        document.querySelectorAll(sel).forEach(e => {
          if (getComputedStyle(e).display !== 'none') {
            console.debug('[vplink-skip] hid overlay', sel);
          }
          e.style.setProperty('display', 'none', 'important');
        });
      } catch (_) {}
    }
  }, 200);

  // ---------- status: is the chain actually able to release? ----------
  // The engagement cookie is set by the site under a ROTATING name - seen as
  // both `adcadg=` and `eonudb=`. Detect it by value (the site's category list),
  // not by name, so this keeps working when the name changes.
  const ENGAGED = /adcadg=|eonudb=|insurance,online_colleges|online_colleges,study_abroad/;
  const engaged = () => ENGAGED.test(document.cookie);

  let warned = false;
  setInterval(() => {
    const iframes = document.querySelectorAll('iframe').length;
    const adcadg = engaged();
    const gateOpen = !!document.querySelector('#getlink, #btn6');

    // Ads take a moment to request, so don't judge the page before they arrive.
    // Only flag it as blocked once ads have had time to load and still none appeared.
    const elapsed = Date.now() - T0;

    if (iframes > 0 || adcadg || gateOpen) {
      if (warned) {  // recover from the early false alarm
        warned = false;
        document.title = document.title.replace('[BLOCKED] ', '');
        console.debug('[vplink-skip] ads are loading - cleared the BLOCKED flag');
      }
    } else if (elapsed > 12000) {
      console.warn('[vplink-skip] NO AD IFRAMES after 12s - ad blocking is on. ' +
        'The chain will loop forever and never release the destination. ' +
        'Allow ads on this domain, or the countdown will end but Get Link goes nowhere.');
      if (!warned) { warned = true; document.title = '[BLOCKED] ' + document.title; }
      return;
    }

    if (adcadg) console.debug('[vplink-skip] adcadg set - engagement registered, gate should open');
    if (gateOpen) console.debug('[vplink-skip] gate open - click Continue');
    console.debug('[vplink-skip] status', {
      iframes, adcadg, gateOpen,
      cookies: document.cookie.split(';').map(s => s.trim().split('=')[0]).filter(Boolean),
      note: gateOpen ? 'gate OPEN - click Continue'
         : adcadg ? 'engagement registered, waiting for gate'
         : iframes > 0 ? 'click once inside an ad to register engagement'
         : 'no ads yet',
    });
  }, 2000);
})();
