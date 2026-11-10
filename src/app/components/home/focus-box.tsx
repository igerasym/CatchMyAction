/**
 * Autofocus box locked on the surfer in /hero-bg.jpg. Pure CSS: the parent (`.hero-photo`, a size container) holds the
 * photo drawn with `object-fit: cover`, and the box is placed with the same math in container units, so it stays on
 * the surfer at any size with no JS, no flash and no stale measurement. The constants must match the photo and the
 * classes on the hero <Image> (object-position 50% on phones, 70% + scale 1.4 from the left edge from md up);
 * see `.focus-box` in globals.css.
 */
export default function FocusBox() {
  return (
    <div aria-hidden="true" className="focus-box">
      <span className="tag-rec absolute -top-7 left-0 whitespace-nowrap">IT&apos;S YOU</span>
      <div className="brk brk-sm brk-rec" />
    </div>
  );
}
