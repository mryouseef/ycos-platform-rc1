/** YCOS M-02 design: a quiet loading state that announces progress without shifting page structure. */
export default function LocaleLoading() { return <div className="route-state" role="status" aria-live="polite">Loading public content…</div>; }
