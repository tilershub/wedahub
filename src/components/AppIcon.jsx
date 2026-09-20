const paths = {
 home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 briefcase: 'M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3',
 user: 'M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 jobs: 'M8 3H4v18h16V3h-4M8 2h8v4H8Zm0 9h8m-8 5h6',
 grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
 tool: 'm14 6 4 4 4-4a7 7 0 0 1-9 9l-7 7-4-4 7-7a7 7 0 0 1 9-9Z',
 book: 'M12 5v16M2 3c5-1 8 0 10 2 2-2 5-3 10-2v16c-5-1-8 0-10 2-2-2-5-3-10-2Z',
 screen: 'M2 3h20v14H2Zm5 18h10m-5-4v4',
 car: 'M3 11h18v8H3ZM5 11l2-7h10l2 7M6 19v3m12-3v3M6 14h2m8 0h2',
 heart: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 9 8 15 8-6 12-11 8-15Z',
 leaf: 'M21 3C7 1 1 7 5 16c9 5 16-1 16-13ZM3 21 16 8',
 star: 'm12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z',
 bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6',
 menu: 'M3 6h18M3 12h18M3 18h18', plus:'M12 4v16M4 12h16', arrow:'M4 12h16m-6-6 6 6-6 6',
}
export default function AppIcon({ name = 'grid', size = 22 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid}/></svg> }
