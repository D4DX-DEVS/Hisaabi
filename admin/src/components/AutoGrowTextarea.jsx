import { useCallback, useEffect, useRef } from 'react';

/**
 * Textarea that grows with content (min height ~rows). Matches manual resize behavior
 * from fixed rows without requiring the user to drag the handle.
 */
export default function AutoGrowTextarea({ value, onChange, minRows = 3, className = '', ...props }) {
  const ref = useRef(null);

  const adjust = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjust();
  }, [value, adjust]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange(e);
        requestAnimationFrame(adjust);
      }}
      className={`${className} resize-none overflow-hidden`.trim()}
      {...props}
    />
  );
}
