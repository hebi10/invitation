/** Small functional symbols; botanical artwork is supplied by the theme assets. */
export default function WeddingActionIcon({ kind }: { kind: 'photo' | 'calendar' | 'pin' | 'accounts' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'photo' ? <><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="8" cy="9" r="1.5" /><path d="m3 17 6-5 4 3 4-5 4 5" /></> : null}
    {kind === 'calendar' ? <><rect x="4" y="5" width="16" height="16" rx="1" /><path d="M8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2m4 0h2" /></> : null}
    {kind === 'pin' ? <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></> : null}
    {kind === 'accounts' ? <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 10h18m-13 5h4" /></> : null}
  </svg>;
}
