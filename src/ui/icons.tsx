// Tiny pixel-art icons drawn as SVG rects (8x8 grids), so the UI shares the
// hall's pixel language without any extra image files.
const PAL: Record<string, string> = { K: '#2a1a12', Y: '#f3c64a', W: '#fff6d0', O: '#d9822b', R: '#d9544d', B: '#5aa0e0', G: '#7cc46a', S: '#c9c3bb', D: '#7b6f66', P: '#b98ae6' };
const ICONS: Record<string, string[]> = {
  coin: ['..KKKK..', '.KYYYYK.', 'KYWYYYOK', 'KYYYYYOK', 'KYYYYYOK', 'KYYYYOOK', '.KOOOOK.', '..KKKK..'],
  heart: ['.KK..KK.', 'KRRKKRRK', 'KRWRRRRK', 'KRRRRRRK', '.KRRRRK.', '..KRRK..', '...KK...', '........'],
  xp: ['...KK...', '..KYYK..', 'KKKYYKKK', 'KYYWYYYK', '.KYYYYK.', '.KYKKYK.', 'KYK..KYK', 'KK....KK'],
  mana: ['...KK...', '..KBBK..', '.KBBBBK.', 'KBWBBBBK', 'KBWBBBBK', 'KBBBBBBK', '.KBBBBK.', '..KKKK..'],
  ember: ['...K....', '..KOK...', '..KOOK..', '.KOYOK..', '.KOYYOK.', 'KOYWYOK.', 'KOYYYOK.', '.KKKKK..'],
  sword: ['......KK', '.....KSK', '....KSK.', 'K..KSK..', 'KK KSK..'.replace(' ', 'K'), '.KDK....', 'KDKKK...', 'KK......'],
  leaf: ['....KKK.', '..KKGGK.', '.KGGGGK.', 'KGGWGGK.', 'KGGGGK..', 'KGGGK...', '.KKK....', 'K.......'],
  flame: ['...K....', '..KOK...', '..KOOK..', '.KOYOK..', '.KOYYOK.', 'KOYWYOK.', 'KOYYYOK.', '.KKKKK..'],
  scroll: ['.KKKKKK.', 'KWWWWWWK', '.KSSSSK.', '.KWWWWK.', '.KSSSSK.', '.KWWWWK.', 'KWWWWWWK', '.KKKKKK.'],
  moon: ['..KKK...', '.KPPK...', 'KPPK....', 'KPPK....', 'KPPK....', 'KPPPK...', '.KPPPKK.', '..KKKK..'],
  star: ['...KK...', '...KYK..', 'KKKYYKKK', 'KYYWYYYK', '.KYYYYK.', '..KYYK..', '.KYKKYK.', '.KK..KK.'],
  crown: ['........', 'K..K..K.', 'KKKYKKYK', 'KYYWYYYK', 'KYRYYBYK', 'KYYYYYYK', 'KKKKKKKK', '........'],
  check: ['........', '......KK', '.....KGK', 'KK..KGK.', 'KGKKGK..', '.KGGK...', '..KK....', '........'],
  sun: ['...KK...', '.K.YY.K.', '..KYYK..', 'KYYWYYYK', 'KYYYYYYK', '..KYYK..', '.K.YY.K.', '...KK...'],
  shield: ['KKKKKKKK', 'KSWSSSDK', 'KSSBBSDK', 'KSBBBBDK', '.KSBBDK.', '.KSSSDK.', '..KSDK..', '...KK...'],
  clock: ['..KKKK..', '.KWWWWK.', 'KWWKWWWK', 'KWWKWWWK', 'KWWKKKWK', 'KWWWWWWK', '.KWWWWK.', '..KKKK..'],
  paw: ['.KK..KK.', 'KOOK.KOK', '.KK..KK.', 'KK.KK.KK', 'KOKOOKOK', '.KOOOOK.', '.KOOOOK.', '..KKKK..'],
  book: ['KKKKKKK.', 'KRRRRRWK', 'KRYYRRWK', 'KRRRRRWK', 'KRRRRRWK', 'KRRRRRWK', 'KKKKKKWK', '.KKKKKKK'],
  chart: ['K.......', 'K.....G.', 'K....GG.', 'K.Y..GG.', 'K.YB.GG.', 'K.YB.GG.', 'K.YBBGG.', 'KKKKKKKK'],
  bell: ['...KK...', '..KYYK..', '.KYWYYK.', '.KYYYYK.', '.KYYYYK.', 'KYYYYYYK', 'KKKKKKKK', '...KK...'],
  people: ['.KK..KK.', 'KOOKKBBK', 'KOOKKBBK', '.KK..KK.', 'KOOKKBBK', 'KOOOKBBK', 'KOOKKBBK', 'KKKKKKKK'],
};
export function Icon({ name, size = 16, title }: { name: keyof typeof ICONS | string; size?: number; title?: string }) {
  const rows = ICONS[name] || ICONS.coin;
  const rects = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const c = rows[y][x];
    if (c && c !== '.') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PAL[c]} />);
  }
  return (
    <svg class="icon" width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
}
