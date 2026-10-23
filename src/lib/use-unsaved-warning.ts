"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const warning = "작성 중인 내용이 저장되지 않았습니다. 페이지를 나가시겠습니까?";

export function useUnsavedWarning() {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const setChanged = useCallback(() => { dirtyRef.current = true; setDirty(true); }, []);
  const markSaved = useCallback(() => { dirtyRef.current = false; setDirty(false); }, []);
  const confirmLeave = useCallback(() => !dirtyRef.current || window.confirm(warning), []);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function click(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.href === window.location.href) return;
      if (!window.confirm(warning)) { event.preventDefault(); event.stopPropagation(); }
      else markSaved();
    }
    function popState() {
      if (restoringHistoryRef.current) { restoringHistoryRef.current = false; return; }
      if (!dirtyRef.current) return;
      if (window.confirm(warning)) markSaved();
      else { restoringHistoryRef.current = true; window.history.forward(); }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popState);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); window.removeEventListener("popstate", popState); };
  }, [markSaved]);

  return { dirty, setChanged, markSaved, confirmLeave };
}
