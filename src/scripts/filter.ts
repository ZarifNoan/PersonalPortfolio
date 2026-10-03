import { matches, parseFilterParam } from '../lib/filters';

export function initFilter(group: HTMLElement): void {
  const param = group.dataset.param!;
  const optionSlugs = (group.dataset.options ?? '').split(' ').filter(Boolean);
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-option]'));
  const items = Array.from((group.closest('main') ?? document).querySelectorAll<HTMLElement>('[data-filter-item]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Cross-fade: non-matching items fade out, then they're hidden and the newly matching ones fade in.
  // A newer click cancels a fade in progress and recomputes from the current DOM state.
  let gen = 0;
  let running: Animation[] = [];

  const apply = (active: string | null, push: boolean) => {
    const my = ++gen;
    running.forEach((a) => a.cancel());
    running = [];
    buttons.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.filterOption === 'all' ? null : b.dataset.filterOption) === active)));
    const show = (el: HTMLElement) => matches((el.dataset.filterValues ?? '').split(' '), active);
    const toHide = items.filter((el) => !el.hidden && !show(el));
    const toShow = items.filter((el) => el.hidden && show(el));
    const reveal = () => toShow.forEach((el) => {
      el.hidden = false;
      if (!reduce) running.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' }));
    });
    if (reduce || toHide.length === 0) {
      toHide.forEach((el) => { el.hidden = true; });
      reveal();
    } else {
      // Start from the current opacity so a not-yet-revealed (scroll reveal) item doesn't flash in.
      running = toHide.map((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }));
      const fading = running;
      Promise.all(fading.map((a) => a.finished)).then(() => {
        if (my !== gen) return;
        toHide.forEach((el) => { el.hidden = true; });
        fading.forEach((a) => a.cancel()); // drop the fill now that they're hidden
        running = [];
        reveal();
      }, () => { /* cancelled by a newer click */ });
    }
    if (push) {
      const url = new URL(location.href);
      if (active) url.searchParams.set(param, active); else url.searchParams.delete(param);
      history.replaceState(null, '', url);
    }
  };

  buttons.forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.filterOption!;
    apply(v === 'all' ? null : v, true);
  }));
  group.hidden = false;
  apply(parseFilterParam(location.search, param, optionSlugs), false);
}
