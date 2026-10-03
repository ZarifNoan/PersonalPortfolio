export function initGalleries(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-gallery]').forEach((g) => {
    const slides = g.querySelectorAll<HTMLElement>('[data-slide]');
    const thumbs = g.querySelectorAll<HTMLAnchorElement>('[data-thumb]');
    thumbs.forEach((t) => t.addEventListener('click', (ev) => {
      ev.preventDefault();
      const i = t.dataset.index!;
      slides.forEach((s) => { s.hidden = s.dataset.index !== i; });
      thumbs.forEach((x) => (x === t ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current')));
    }));
  });
}
