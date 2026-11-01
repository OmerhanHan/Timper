'use strict';

// Tema tanımları hem ana süreçte (kimlik doğrulama) hem arayüzde (renk, sprite) kullanılır.
// Sprite'lar karakter matrisidir: her karakter temanın `palette` anahtarına karşılık gelir, '.' saydamdır.
(function (root, factory) {
  const value = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = value;
  else root.PixelThemes = value;
})(typeof self !== 'undefined' ? self : this, function () {
  const ROBOT_BODY = [
    '.....kk.....',
    '......k.....',
    '..kkkkkkkk..',
    '.kddddddddk.',
    '.kddlkdlkdk.',
    '.kddlkdlkdk.',
    '.kddddddddk.',
    '..kkkkkkkk..',
    'k.kddddddk.k',
    'kkkdlldddkkk',
    '..kddddddk..',
    '..kkkkkkkk..',
  ];
  const ALIEN_BODY = [
    '...c.....c...',
    '....c...c....',
    '...ppppppp...',
    '..ppppppppp..',
    '.ppkkpppkkpp.',
    '.ppckpppckpp.',
    'ppppppppppppp',
    'pp.ppppppp.pp',
  ];
  const CAT_BODY = [
    '.k........k....k',
    'kok.......kokkok',
    'kok.......kooook',
    'kok.......kookok',
    '.kok..kkkkoooopk',
    '..kokkoooooooook',
    '...kowoowoowook.',
    '...kooooooooook.',
    '...kookkkkkkook.',
  ];
  const CAT_SIT_HEAD = ['k....k', 'kokkok', 'kooook'];
  const CAT_SIT_BODY = [
    '.........kkoopok',
    '.......kkooooook',
    '......koowoowook',
    '......kooooooook',
    '......koowoooook',
  ];
  // Baş satırları kısa yazıldı; kedinin gövdesiyle hizalamak için soldan doldurulur.
  const padHead = (rows) => rows.map((row) => row.padStart(16, '.'));
  const KNIGHT_BODY = [
    '...rrr........',
    '..rr.kkkkk....',
    '..r.ksssssk...',
    '....ksskkkk...',
    '....ksssssk..w',
    '.....kkkkk...w',
    '....kdsssdk..w',
    '...kdssggsdk.w',
    '...kdssssdkkgg',
    '...kkdsssdkkk.',
    '....kdsssdk...',
    '....kddddk....',
  ];

  const HORSE_BODY = [
    '..................kk....',
    '.................kmok...',
    '...............kmmoook..',
    '..............kmmookook.',
    '..............kmoooooook',
    '.............kmmoookkkk.',
    '..kkk.......kmmoook.....',
    '.kmmmkkkkkkkkmooook.....',
    'kmmk.koooooooooooook....',
    'kmk..kooooooooooooook...',
    'km...koooooooooooook....',
    'k....kddoooooooooddk....',
  ];
  // Kuyruk sallanan duruş: gövdenin kuyruk sütunları bir sağa kayar.
  const HORSE_BODY_SWISH = HORSE_BODY.map((row, i) => {
    const tail = { 8: '.kmmk', 9: '.kmk.', 10: '.km..', 11: '.k...' }[i];
    return tail ? tail + row.slice(5) : row;
  });
  const HORSE_STAND_LEGS = [
    '......kok.......kok.....',
    '......kok.......kok.....',
    '......kok.......kok.....',
    '......kkk.......kkk.....',
  ];

  const THEMES = [
    {
      id: 'pocket',
      name: 'Cep Konsolu',
      tagline: 'Dört ton yeşil, tek amaç: odak.',
      mascot: 'Bip',
      colors: {
        bg: '#0f380f', panel: '#9bbc0f', panelAlt: '#8bac0f', ink: '#0f380f', muted: '#26501f',
        accent: '#0f380f', accentInk: '#9bbc0f', border: '#306230', chrome: '#9bbc0f',
      },
      palette: { k: '#0f380f', d: '#306230', l: '#9bbc0f', o: '#306230' },
      walk: [
        [...ROBOT_BODY, '...kk..kk...', '...kk..kk...'],
        [...ROBOT_BODY, '..kk....kk..', '.kk......kk.'],
      ],
      rest: [
        [...ROBOT_BODY, '...kk..kk...', '...kk..kk...'],
        // Göz kırpma
        [...ROBOT_BODY.slice(0, 4), '.kddddddddk.', ...ROBOT_BODY.slice(5), '...kk..kk...', '...kk..kk...'],
      ],
      goal: [
        '.kk...kk.',
        'kook.kook',
        'koooooook',
        'koooooook',
        '.koooook.',
        '..koook..',
        '...kok...',
        '....k....',
      ],
      jingle: [523, 659, 784, 1047],
    },
    {
      id: 'neon',
      name: 'Neon Atari',
      tagline: 'Salon kapanmadan son bir el daha.',
      mascot: 'Zort',
      colors: {
        bg: '#140c2b', panel: '#241447', panelAlt: '#35205f', ink: '#f6edff', muted: '#c3b1ea',
        accent: '#ff3d9a', accentInk: '#140c2b', border: '#29e7ff', chrome: '#f6edff',
      },
      palette: { p: '#ff3d9a', c: '#29e7ff', k: '#140c2b', y: '#ffe14d' },
      walk: [
        [...ALIEN_BODY, 'pp.p.....p.pp', '...pp...pp...', '..pp.....pp..'],
        [...ALIEN_BODY, '.p.p.....p.p.', '..pp.....pp..', '...pp...pp...'],
      ],
      rest: [
        [...ALIEN_BODY, 'pp.p.....p.pp', '...pp...pp...', '..pp.....pp..'],
        // Göz kırpma
        [...ALIEN_BODY.slice(0, 4), '.ppppppppppp.', '.ppkkpppkkpp.', ...ALIEN_BODY.slice(6), 'pp.p.....p.pp', '...pp...pp...', '..pp.....pp..'],
      ],
      goal: [
        '....y....',
        '....y....',
        '...yyy...',
        'yyyyyyyyy',
        '.yyyyyyy.',
        '..yyyyy..',
        '..yyyyy..',
        '.yyy.yyy.',
        '.y.....y.',
      ],
      jingle: [659, 880, 659, 1319],
    },
    {
      id: 'cafe',
      name: 'Kedi Kafe',
      tagline: 'Kahve sıcak, kedi tezgâhın üstünde.',
      mascot: 'Tarçın',
      colors: {
        bg: '#d9b98c', panel: '#fff4e0', panelAlt: '#f3e2c7', ink: '#4a2c1d', muted: '#70493a',
        accent: '#e0752f', accentInk: '#2b160c', border: '#4a2c1d', chrome: '#2b160c',
      },
      palette: { k: '#4a2c1d', o: '#e8923f', w: '#b9602a', p: '#f49a9a', b: '#6f9fc4' },
      walk: [
        [...CAT_BODY, '...kok....kok...', '...kok....kok...', '...kk.....kk....'],
        [...CAT_BODY, '..kok......kok..', '.kok........kok.', '.kk..........kk.'],
      ],
      rest: [
        [...CAT_SIT_HEAD, 'kookok', ...CAT_SIT_BODY, 'kok...kooooooook', 'kook.kkookkkookk', '.kkkkkkkkkkkkkk.'],
        [...CAT_SIT_HEAD, 'kookok', ...CAT_SIT_BODY, '.kkk..kooooooook', 'kooookkookkkookk', '.kkkkkkkkkkkkkk.'],
      ].map(padHead),
      goal: [
        '.....kkkk...',
        'k...kbbbbk..',
        'kk.kbbbbbkk.',
        'kbkbbbbbbbbk',
        'kk.kbbbbbbk.',
        'k...kbbbbk..',
        '.....kkkk...',
      ],
      jingle: [784, 659, 523, 784],
    },
    {
      id: 'dungeon',
      name: 'Zindan',
      tagline: 'Sandık yakın, sen yeter ki yürü.',
      mascot: 'Sir Odak',
      colors: {
        bg: '#14121a', panel: '#2e2b38', panelAlt: '#3d3948', ink: '#efe6d0', muted: '#b9b2a4',
        accent: '#e0a526', accentInk: '#14121a', border: '#7a7f8e', chrome: '#efe6d0',
      },
      palette: {
        k: '#14121a', s: '#c9cdd8', d: '#7a7f8e', g: '#e0a526', r: '#c43c3c', w: '#f4f4f8',
        b: '#8a5a2b', v: '#5fb04a',
      },
      walk: [
        [...KNIGHT_BODY, '....kdkkdk....', '....kdkkdk....', '....kskksk....', '...kkk.kkk....'],
        [...KNIGHT_BODY, '...kdk..kdk...', '..kdk....kdk..', '..ksk....ksk..', '.kkk.....kkk..'],
      ],
      rest: [
        [...KNIGHT_BODY, '....kdkkdk....', '....kdkkdk....', '....kskksk....', '...kkk.kkk....'],
        // Kılıcı bir adım kaldırır
        [...KNIGHT_BODY.slice(0, 3), '....ksskkkk..w', ...KNIGHT_BODY.slice(4, 6), '....kdsssdk...', ...KNIGHT_BODY.slice(7), '....kdkkdk....', '....kdkkdk....', '....kskksk....', '...kkk.kkk....'],
      ],
      goal: [
        '..kkkkkkkk..',
        '.kbbbbbbbbk.',
        'kbbbbbbbbbbk',
        'kggggggggggk',
        'kkkkkggkkkkk',
        'kbbbbgggbbbk',
        'kbbbbbggbbbk',
        'kbbbbbbbbbbk',
        'kggggggggggk',
        'kkkkkkkkkkkk',
      ],
      jingle: [392, 523, 659, 784],
    },
    {
      id: 'yilki',
      name: 'Yılkı Sürüsü',
      tagline: 'Bozkır geniş, sürü özgür.',
      mascot: 'Doru',
      colors: {
        bg: '#241510', panel: '#3a2418', panelAlt: '#54341f', ink: '#f7e7c6', muted: '#d3b68d',
        accent: '#e8833a', accentInk: '#2b160c', border: '#d3b68d', chrome: '#f7e7c6',
      },
      palette: { k: '#2b1a12', o: '#9a5426', d: '#74401c', m: '#1f120b', y: '#e0a526' },
      walkStep: 1,
      walk: [
        [...HORSE_BODY, '.....kok.........kok....', '....kok...........kok...', '...kok.............kok..', '...kk...............kk..'],
        [...HORSE_BODY, '......kokk......kokk....', '.......kkok......kkok...', '.........kk........kk...', '........................'],
        [...HORSE_BODY, '......kok.......kok.....', '.......kok.....kok......', '.......kok.....kok......', '.......kk......kk.......'],
        [...HORSE_BODY, '.......kok.....kok......', '......kok.......kok.....', '.....kok.........kok....', '.....kk...........kk....'],
      ],
      rest: [
        [...HORSE_BODY, ...HORSE_STAND_LEGS],
        [...HORSE_BODY_SWISH, ...HORSE_STAND_LEGS],
      ],
      goal: [
        '.kkkkkkk.',
        'kyyyyyyyk',
        'kyykkkyyk',
        'kyk...kyk',
        'kyk...kyk',
        'kyk...kyk',
        'kyk...kyk',
        'kyyk.kyyk',
        '.kk...kk.',
      ],
      // Sürüdeki diğer atlar, öndeki ata göre konum ve renk. Ana ekranda ilk ikisi görünür.
      herd: [
        { dx: -18, dy: -4, coat: { o: '#c9c3b5', d: '#a39d8f', m: '#5e584e' } },
        { dx: -30, dy: 3, coat: { o: '#c26f30', d: '#984f1e', m: '#6e3414' } },
        { dx: -46, dy: -3, coat: { o: '#4a3226', d: '#36231a', m: '#1f120b' } },
        { dx: -58, dy: 2, coat: { o: '#e9e3d3', d: '#c4bdab', m: '#8f8878' } },
        { dx: -74, dy: -2, coat: { o: '#9a5426', d: '#74401c', m: '#c9b98f' } },
      ],
      jingle: [440, 554, 659, 880],
    },
  ];

  return { THEMES, THEME_IDS: THEMES.map((t) => t.id) };
});
