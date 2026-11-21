// Deco line icons — simple strokes so they inherit any palette colour.

const P: Record<string, string> = {
  lounge: 'M12 3v3M4.2 6.2l2.1 2.1M3 13h3M18 13h3M17.7 8.3l2.1-2.1M6 19h12M8 19a4 4 0 0 1 8 0',
  sun: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  rites: 'M5 12l4 4 10-10M4 20h16',
  blueprint: 'M4 4h16v16H4zM4 9h16M4 14h16M9 4v16',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  patrol: 'M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12',
  vault: 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 12l2.5-2.5M17 7v.01',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  corridor: 'M4 21V11a8 8 0 0 1 16 0v10M9 21v-7a3 3 0 0 1 6 0v7M2 21h20',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  study: 'M3 7l9-4 9 4-9 4zM7 9v5c0 1.5 2.5 3 5 3s5-1.5 5-3V9',
  tooth: 'M7 3c-2 0-3 2-3 4 0 4 2 5 2 9 0 2 1 5 2 5s1.5-4 4-4 3 4 4 4 2-3 2-5c0-4 2-5 2-9 0-2-1-4-3-4-2 0-3 1-5 1S9 3 7 3z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  forge: 'M4 18h16M6 18l2-6h8l2 6M9 12V8h6v4M12 3v2',
  scale: 'M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6zM8 21h8',
  comb: 'M4 6h16v4H4zM6 10v8M9 10v8M12 10v8M15 10v8M18 10v8',
  deal: 'M3 12l4-4 4 3 3-2 4 3 3-3M7 8v8M17 9v7',
  brand: 'M12 3l3 6 6 1-4.5 4 1 6L12 17l-5.5 3 1-6L3 10l6-1z',
  camera: 'M4 7h4l2-3h4l2 3h4v12H4zM12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  lab: 'M9 3h6M10 3v6l-5 10h14L14 9V3',
  briefcase: 'M4 7h16v12H4zM9 7V4h6v3M4 12h16',
  brush: 'M14 4l6 6-8 8H6v-6zM6 18l-2 3',
  people: 'M9 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2 3 5',
  heart: 'M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  mentor: 'M12 3l2 4h4l-3 3 1 5-4-2-4 2 1-5-3-3h4zM6 21h12',
  dice: 'M4 4h16v16H4zM8.5 8.5v.01M15.5 15.5v.01M12 12v.01M15.5 8.5v.01M8.5 15.5v.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  plane: 'M2 13l20-8-6 16-4-6zM12 15l-2 5',
  alfred: 'M6 9a6 6 0 0 1 12 0v3H6zM4 12h16M9 16h6M12 16v5M8 21h8',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  timer: 'M12 8v5l3 2M9 2h6M12 5a8 8 0 1 0 0 16a8 8 0 1 0 0-16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
}

export function Icon({ name, size = 22, className = '', stroke = 1.6 }: { name: string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[name] ?? P.corridor} />
    </svg>
  )
}
