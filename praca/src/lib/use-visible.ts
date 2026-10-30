"use client";

import { useEffect, useState, type RefObject } from "react";

/** True once the element has come within `margin` of the viewport (and stays true). Used to defer heavy widgets such as maps. */
export function useVisible(ref: RefObject<Element | null>, margin = "300px"): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: margin });
    io.observe(node);
    return () => io.disconnect();
  }, [ref, margin, visible]);
  return visible;
}
