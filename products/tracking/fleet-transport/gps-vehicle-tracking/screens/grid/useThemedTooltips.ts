// Grid View: the approved design's themed tooltips (its tooltip script) for every [title] element
// of this page, including the controls it places in the shell header. The browser's own title
// bubble is replaced by the design's dark tooltip; everything is removed when the page closes.
import { useEffect } from 'react';

const TIP_STYLE =
  'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;max-width:260px;padding:6px 10px;border-radius:8px;' +
  'background:linear-gradient(180deg,#0A2A44 0%,#01152C 100%);color:#fff;font:600 12px/16px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
  'letter-spacing:.01em;white-space:pre-line;text-wrap:pretty;box-shadow:0 0 0 1px rgba(3,173,134,.45),0 8px 24px rgba(1,29,50,.28),0 2px 6px rgba(1,29,50,.18);' +
  'opacity:0;transform:translateY(2px);transition:opacity .12s ease,transform .12s ease';
const ARROW_STYLE =
  'position:absolute;left:50%;width:8px;height:8px;margin-left:-4px;background:#01152C;transform:rotate(45deg);box-shadow:1px 1px 0 rgba(3,173,134,.45)';

/** `scopeSelector` marks this page's elements (page wrapper and header-slot wrappers). */
export function useThemedTooltips(scopeSelector: string) {
  useEffect(() => {
    const tip = document.createElement('div');
    tip.setAttribute('role', 'tooltip');
    tip.style.cssText = TIP_STYLE;
    const text = document.createElement('span');
    const arrow = document.createElement('span');
    arrow.style.cssText = ARROW_STYLE;
    tip.append(text, arrow);

    let current: HTMLElement | null = null;
    let savedTitle: string | null = null;
    let timer = 0;

    const host = () => document.fullscreenElement ?? document.body;
    const hide = () => {
      window.clearTimeout(timer);
      if (current) {
        if (!current.hasAttribute('title') && savedTitle != null)
          current.setAttribute('title', savedTitle);
        current = null;
        savedTitle = null;
      }
      tip.style.opacity = '0';
      tip.style.transform = 'translateY(2px)';
    };
    const show = (el: HTMLElement) => {
      if (!savedTitle || !document.body.contains(el)) return;
      const h = host();
      if (tip.parentNode !== h) h.appendChild(tip);
      text.textContent = savedTitle;
      const r = el.getBoundingClientRect();
      const w = tip.offsetWidth;
      const ht = tip.offsetHeight;
      const gap = 8;
      const below = r.top - ht - gap < 4;
      const x = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
      const y = below ? r.bottom + gap : r.top - ht - gap;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      arrow.style.left = `${Math.max(10, Math.min(w - 10, r.left + r.width / 2 - x))}px`;
      arrow.style.top = below ? '-4px' : 'auto';
      arrow.style.bottom = below ? 'auto' : '-4px';
      arrow.style.boxShadow = below
        ? '-1px -1px 0 rgba(3,173,134,.45)'
        : '1px 1px 0 rgba(3,173,134,.45)';
      tip.style.opacity = '1';
      tip.style.transform = 'translateY(0)';
    };
    const enter = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      const el = target?.closest<HTMLElement>('[title]') ?? null;
      if (!el || el === current || !el.closest(scopeSelector)) return;
      if (el.tagName === 'IFRAME' || el.closest('svg title')) return;
      const t = el.getAttribute('title');
      if (!t || !t.trim()) return;
      hide();
      current = el;
      savedTitle = t;
      el.removeAttribute('title');
      timer = window.setTimeout(() => current === el && show(el), e.type === 'focusin' ? 0 : 350);
    };
    const leave = (e: Event) => {
      if (!current) return;
      const to = (e as MouseEvent).relatedTarget;
      if (e.type === 'mouseout' && to instanceof Node && current.contains(to)) return;
      hide();
    };
    const focusIn = (e: Event) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) enter(e);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    // React may set the title again while hovered: keep the native bubble off and the text in sync.
    const observer = new MutationObserver((changes) => {
      for (const m of changes) {
        const el = m.target;
        if (el === current && el instanceof HTMLElement && el.hasAttribute('title')) {
          savedTitle = el.getAttribute('title');
          el.removeAttribute('title');
          if (tip.style.opacity === '1') text.textContent = savedTitle;
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['title'],
      subtree: true,
    });

    document.addEventListener('mouseover', enter, true);
    document.addEventListener('mouseout', leave, true);
    document.addEventListener('focusin', focusIn, true);
    document.addEventListener('focusout', leave, true);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('keydown', key, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      observer.disconnect();
      document.removeEventListener('mouseover', enter, true);
      document.removeEventListener('mouseout', leave, true);
      document.removeEventListener('focusin', focusIn, true);
      document.removeEventListener('focusout', leave, true);
      document.removeEventListener('mousedown', hide, true);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
      tip.remove();
    };
  }, [scopeSelector]);
}
