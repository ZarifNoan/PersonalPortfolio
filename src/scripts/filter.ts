import { matches, parseFilterParam } from '../lib/filters';

export function initFilter(group: HTMLElement): void {
  const param = group.dataset.param!;
  const optionSlugs = (group.dataset.options ?? '').split(' ').filter(Boolean);
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-filter-option]'));
  const items = Array.from((group.closest('main') ?? document).querySelectorAll<HTMLElement>('[data-filter-item]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const apply = (active: string | null, push: boolean) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.filterOption === 'all' ? null : b.dataset.filterOption) === active)));
    items.forEach((el) => {
      const show = matches((el.dataset.filterValues ?? '').split(' '), active);
      if (show === !el.hidden) return;
      if (show) { el.hidden = false; if (!reduce) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); }
      else el.hidden = true;
    });
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
