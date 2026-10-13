import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Section hiện dần khi cuộn tới (1 lần). Giảm chuyển động: CSS tắt hiệu ứng.
 * Trình duyệt không có IntersectionObserver thì hiện luôn.
 */
export function Reveal({
  id,
  className = '',
  labelledBy,
  children,
}: {
  id?: string;
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={labelledBy}
      data-in={shown}
      className={`sk-section sk-reveal ${className}`}
    >
      {children}
    </section>
  );
}
