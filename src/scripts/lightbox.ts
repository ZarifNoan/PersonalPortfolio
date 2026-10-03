type Item = { src: string; alt: string };

export function initLightbox(): void {
  const dlg = document.getElementById('lightbox') as HTMLDialogElement | null;
  if (!dlg) return;
  const img = dlg.querySelector('img')!;
  const cap = dlg.querySelector<HTMLElement>('[data-lb-caption]')!;
  const count = dlg.querySelector<HTMLElement>('[data-lb-count]')!;
  const prev = dlg.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const next = dlg.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  let items: Item[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const it = items[index]!;
    img.onerror = () => { img.hidden = true; cap.textContent = it.alt; };
    img.hidden = false;
    img.src = it.src;
    img.alt = it.alt;
    cap.textContent = it.alt;
    count.textContent = `${index + 1} / ${items.length}`;
    const multi = items.length > 1;
    prev.hidden = !multi; next.hidden = !multi; count.hidden = !multi;
  };

  document.querySelectorAll<HTMLAnchorElement>('[data-open-lightbox]').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    items = JSON.parse(a.closest<HTMLElement>('[data-gallery]')!.dataset.gallery!);
    opener = a;
    show(Number(a.dataset.index ?? 0));
    dlg.showModal();
  }));

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dlg.querySelector('[data-lb-close]')!.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg || (ev.target as HTMLElement).tagName === 'FIGURE') dlg.close(); });
  dlg.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' && items.length > 1) { ev.preventDefault(); show(index + 1); }
    if (ev.key === 'ArrowLeft' && items.length > 1) { ev.preventDefault(); show(index - 1); }
  });
  let startX = 0;
  dlg.addEventListener('touchstart', (e) => { startX = e.touches[0]!.clientX; }, { passive: true });
  dlg.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0]!.clientX - startX;
    if (Math.abs(dx) > 50 && items.length > 1) show(index + (dx < 0 ? 1 : -1));
  });
  dlg.addEventListener('close', () => opener?.focus());
}
