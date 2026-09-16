/* =====================================================================
   magus_dice.js — KÖZÖS kockadobó modul (renderer + motor + notation).
   Használja: kocka.html (élő dobó) és később karakter_kezelo.html (inline).
   NINCS külső lib (vanilla, a projekt filozófiája).
   Betöltés: <script src="magus_dice.js?v=N"></script>  (API-változáskor bump!)
   Globál: window.MagusDice
   ===================================================================== */
(function () {
  'use strict';

  var SIDES = [4, 6, 8, 10, 12, 20, 100];

  /* --- Kocka-sziluettek (viewBox 0 0 100 100, közép 50,50) -----------
     A user által jóváhagyott formák:
     d4=háromszög, d6=lekerekített négyzet, d8=rombusz,
     d10=nyújtott rombusz+gerinc, d12=ötszög, d20=hatszög+beírt háromszög,
     d100=12-szög + sugár-küllők. */
  var SHAPES = {
    4: {
      outline: '<polygon points="50,12 84,80 16,80"/>',
      facets: '<path d="M50,12 L50,58 M84,80 L50,58 M16,80 L50,58"/>',
      ty: 68, fscale: 0.9
    },
    6: {
      outline: '<rect x="14" y="14" width="72" height="72" rx="10"/>',
      facets: '',
      ty: 58, fscale: 1
    },
    8: {
      outline: '<polygon points="50,10 90,50 50,90 10,50"/>',
      facets: '<path d="M10,50 L90,50 M50,10 L50,90"/>',
      ty: 57, fscale: 1
    },
    10: {
      outline: '<polygon points="50,8 76,50 50,92 24,50"/>',
      facets: '<path d="M24,50 L76,50 M50,8 L50,92"/>',
      ty: 56, fscale: 0.92
    },
    12: {
      outline: '<polygon points="50,10 88,37.6 73.5,82.4 26.5,82.4 12,37.6"/>',
      facets: '<path d="M50,10 L50,52 M88,37.6 L50,52 M73.5,82.4 L50,52 M26.5,82.4 L50,52 M12,37.6 L50,52"/>',
      ty: 60, fscale: 1
    },
    20: {
      outline: '<polygon points="50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30"/>',
      facets: '<polygon points="50,10 84.6,70 15.4,70" fill="none"/>',
      ty: 62, fscale: 0.92
    },
    100: {
      outline: '<polygon points="90,50 84.6,70 70,84.6 50,90 30,84.6 15.4,70 10,50 15.4,30 30,15.4 50,10 70,15.4 84.6,30"/>',
      facets: '<path d="M50,50 L90,50 M50,50 L84.6,70 M50,50 L70,84.6 M50,50 L50,90 M50,50 L30,84.6 M50,50 L15.4,70 M50,50 L10,50 M50,50 L15.4,30 M50,50 L30,15.4 M50,50 L50,10 M50,50 L70,15.4 M50,50 L84.6,30"/>',
      ty: 57, fscale: 0.78
    }
  };

  var DEF = {
    accent: '#e0b84a',   // körvonal
    facet: '#4a4d60',    // belső fazetta-vonalak
    ink: '#f2dc93'       // szám
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* dieSVG(sides, value, opts) -> SVG string egy kockáról a megadott értékkel.
     opts: { size, accent, facet, ink, cls } */
  function dieSVG(sides, value, opts) {
    opts = opts || {};
    var sh = SHAPES[sides] || SHAPES[6];
    var size = opts.size || 64;
    var accent = opts.accent || DEF.accent;
    var facet = opts.facet || DEF.facet;
    var ink = opts.ink || DEF.ink;
    var cls = opts.cls ? ' ' + opts.cls : '';
    var hideLabel = (value == null) && opts.hideLabel;
    var label = (value == null) ? 'd' + sides : String(value);
    // szöveg-méretezés a jegyek szerint
    var base = 30 * sh.fscale;
    var fs = base;
    if (label.length >= 3) fs = base * 0.66;
    else if (label.length === 2) fs = base * 0.82;
    var facetSvg = sh.facets
      ? '<g fill="none" stroke="' + facet + '" stroke-width="1.4" stroke-linejoin="round">' + sh.facets + '</g>'
      : '';
    return '<svg class="mdice-svg' + cls + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="d' + sides +
      (value == null ? '' : (': ' + esc(label))) + '">' +
      facetSvg +
      '<g fill="none" stroke="' + accent + '" stroke-width="3.2" stroke-linejoin="round">' + sh.outline + '</g>' +
      (hideLabel ? '' :
        '<text x="50" y="' + sh.ty + '" text-anchor="middle" font-family="Cinzel, Georgia, serif" ' +
        'font-weight="700" font-size="' + fs.toFixed(1) + '" fill="' + ink + '">' + esc(label) + '</text>') +
      '</svg>';
  }

  /* --- Dobó-motor ---------------------------------------------------- */
  function rollOne(sides) {
    return 1 + Math.floor(Math.random() * sides);
  }

  /* rollPool(pool, modifier) — pool: [{sides, count}] tömb.
     -> { dice:[{sides,value}], modifier, total, notation } */
  function rollPool(pool, modifier) {
    modifier = modifier | 0;
    var dice = [];
    (pool || []).forEach(function (p) {
      var n = Math.max(0, p.count | 0);
      for (var i = 0; i < n; i++) dice.push({ sides: p.sides, value: rollOne(p.sides) });
    });
    var sum = dice.reduce(function (a, d) { return a + d.value; }, 0) + modifier;
    return { dice: dice, modifier: modifier, total: sum, notation: poolNotation(pool, modifier) };
  }

  /* poolNotation([{sides,count}], mod) -> "2d6 + 1d20 + 3" (üres kockákat kihagy) */
  function poolNotation(pool, modifier) {
    var parts = [];
    // csoportosítás oldalszám szerint, sorrend: SIDES szerint
    var byS = {};
    (pool || []).forEach(function (p) { if (p.count > 0) byS[p.sides] = (byS[p.sides] || 0) + (p.count | 0); });
    SIDES.forEach(function (s) { if (byS[s]) parts.push(byS[s] + 'd' + s); });
    var str = parts.join(' + ');
    if (modifier) str += (modifier > 0 ? ' + ' : ' − ') + Math.abs(modifier);
    return str || '—';
  }

  /* parseNotation("2d6+3 1d20", ) -> { pool:[{sides,count}], modifier } | null
     Elfogad: NdM, dM (=1dM), +K, -K, szóköz vagy + elválasztóval. */
  function parseNotation(str) {
    if (!str) return null;
    var s = String(str).toLowerCase().replace(/\s+/g, '');
    // tokenekre: dobás-tagok és számok, előjellel
    var re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
    var m, found = false, mod = 0, byS = {};
    var valid = SIDES.reduce(function (o, x) { o[x] = 1; return o; }, {});
    while ((m = re.exec(s)) !== null) {
      if (m[3]) {
        var sides = parseInt(m[3], 10);
        if (!valid[sides]) return null;
        var cnt = m[2] === '' ? 1 : parseInt(m[2], 10);
        if (m[1] === '-') return null; // negatív kockaszám értelmetlen
        byS[sides] = (byS[sides] || 0) + cnt;
        found = true;
      } else if (m[5]) {
        mod += (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
        found = true;
      }
    }
    if (!found) return null;
    var pool = SIDES.filter(function (x) { return byS[x]; }).map(function (x) { return { sides: x, count: byS[x] }; });
    return { pool: pool, modifier: mod };
  }

  /* --- Animáció-stílus (egyszer beszúrva) ---------------------------- */
  function ensureStyles() {
    if (document.getElementById('mdice-style')) return;
    var st = document.createElement('style');
    st.id = 'mdice-style';
    st.textContent =
      '@keyframes mdiceTumble{0%{transform:rotate(-160deg) scale(.5);opacity:0}' +
      '60%{transform:rotate(12deg) scale(1.12);opacity:1}100%{transform:rotate(0) scale(1)}}' +
      '.mdice-svg{display:block}' +
      '.mdice-rolling{animation:mdiceTumble .5s cubic-bezier(.2,.8,.3,1.2) both}' +
      '@media (prefers-reduced-motion: reduce){.mdice-rolling{animation:none}}';
    document.head.appendChild(st);
  }

  window.MagusDice = {
    SIDES: SIDES,
    dieSVG: dieSVG,
    rollOne: rollOne,
    rollPool: rollPool,
    poolNotation: poolNotation,
    parseNotation: parseNotation,
    ensureStyles: ensureStyles,
    _defaults: DEF
  };
})();
