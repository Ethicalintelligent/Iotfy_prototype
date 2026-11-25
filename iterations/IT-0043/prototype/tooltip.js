/* EIT Smart Track — themed tooltips for every [title] in the app.
 * Replaces the browser's native title bubble with the design-system tooltip.
 * Content, triggers (hover/focus) and target elements are unchanged: the title text is read live on show. */
(function () {
  if (window.EITTooltip) return;
  var tip = null, txt = null, cur = null, timer = 0;
  function build() {
    tip = document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;max-width:260px;padding:6px 10px;border-radius:8px;' +
      'background:linear-gradient(180deg,#0A2A44 0%,#01152C 100%);color:#fff;font:600 12px/16px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
      'letter-spacing:.01em;white-space:pre-line;text-wrap:pretty;box-shadow:0 0 0 1px rgba(3,173,134,.45),0 8px 24px rgba(1,29,50,.28),0 2px 6px rgba(1,29,50,.18);' +
      'opacity:0;transform:translateY(2px);transition:opacity .12s ease,transform .12s ease';
    txt = document.createElement('span');
    var arrow = document.createElement('span');
    arrow.setAttribute('data-arrow', '1');
    arrow.style.cssText = 'position:absolute;left:50%;width:8px;height:8px;margin-left:-4px;background:#01152C;transform:rotate(45deg);box-shadow:1px 1px 0 rgba(3,173,134,.45)';
    tip.appendChild(txt); tip.appendChild(arrow);
  }
  function host() { return document.fullscreenElement || document.body; }
  function hide() {
    clearTimeout(timer);
    if (cur) { if (!cur.hasAttribute('title') && cur.__eitTitle != null) cur.setAttribute('title', cur.__eitTitle); cur.__eitTitle = null; cur = null; }
    if (tip) { tip.style.opacity = '0'; tip.style.transform = 'translateY(2px)'; }
  }
  function show(el) {
    var t = el.__eitTitle; if (!t || !document.body.contains(el)) return;
    if (!tip) build();
    var h = host(); if (tip.parentNode !== h) h.appendChild(tip);
    txt.textContent = t;
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, ht = tip.offsetHeight, gap = 8;
    var below = r.top - ht - gap < 4;
    var x = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
    var y = below ? r.bottom + gap : r.top - ht - gap;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    var a = tip.querySelector('[data-arrow]');
    a.style.left = Math.max(10, Math.min(w - 10, r.left + r.width / 2 - x)) + 'px';
    a.style.top = below ? '-4px' : 'auto'; a.style.bottom = below ? 'auto' : '-4px';
    a.style.boxShadow = below ? '-1px -1px 0 rgba(3,173,134,.45)' : '1px 1px 0 rgba(3,173,134,.45)';
    tip.style.opacity = '1'; tip.style.transform = 'translateY(0)';
  }
  function enter(e) {
    var el = e.target && e.target.closest ? e.target.closest('[title]') : null;
    if (!el || el === cur) return;
    if (el.tagName === 'IFRAME' || el.closest('svg title')) return;
    var t = el.getAttribute('title'); if (!t || !t.trim()) return;
    hide();
    cur = el; el.__eitTitle = t; el.removeAttribute('title');
    timer = setTimeout(function () { if (cur === el) show(el); }, e.type === 'focusin' ? 0 : 350);
  }
  function leave(e) {
    if (!cur) return;
    var to = e.relatedTarget;
    if (e.type === 'mouseout' && to && cur.contains(to)) return;
    hide();
  }
  document.addEventListener('mouseover', enter, true);
  document.addEventListener('mouseout', leave, true);
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches(':focus-visible')) enter(e); }, true);
  document.addEventListener('focusout', leave, true);
  document.addEventListener('mousedown', hide, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); }, true);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
  // React may re-apply title while hovered; keep the native bubble suppressed and the text in sync.
  new MutationObserver(function (ms) { ms.forEach(function (m) { var el = m.target; if (el === cur && el.hasAttribute('title')) { el.__eitTitle = el.getAttribute('title'); el.removeAttribute('title'); if (tip && tip.style.opacity === '1') txt.textContent = el.__eitTitle; } }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['title'], subtree: true });
  window.EITTooltip = { hide: hide };
})();
