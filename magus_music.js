/* =====================================================================
   magus_music.js — KÖZÖS szoba-zene (DJ) modul.
   Használja: Kalandkockák app (bemásolva) ÉS a web /kocka (belinkelve).
   Egy mount konténerbe rendeli a zene-sávot + DJ-pultot, és MINDENT kezel:
   audio/YouTube lejátszó, realtime szinkron (room_music), feltöltés, hangerő.

   Backend (közös): room_music tábla + music_tracks + 'room_music' Storage bucket
   (security/room_music.sql).  Betöltés: <script src="magus_music.js?v=N"></script>

   API:
     var ctrl = MagusMusic.mount({
        sb,                       // supabase kliens
        bar,                      // konténer elem a zene-sávnak
        getUid:  function(){...}, // aktuális user id
        isAdmin: function(){...}  // tölthet-e fel (opcionális; a tulaj úgyis admin)
     });
     ctrl.enter(roomId, isOwner); // belépés egy szoba zenéjébe
     ctrl.leave();                // kilépés

   Queue-modell (room_music.state.queue elemei TYPE-osak):
     { type:'file', title, url }      -> <audio>   (100% reklámmentes, ez az alap)
     { type:'yt',   title, videoId }  -> YouTube IFrame (lazy; reklám lehetséges!)
   A sync (index, playing, started_at, paused_sec, loop) MINDKÉT type-ra megy.
   ===================================================================== */
(function (global) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Letisztult, monokróm SVG-ikonok (currentColor) — nem emoji. */
  var ICONS = {
    play: '<path d="M5 3.3v9.4L13 8z" fill="currentColor"/>',
    pause: '<rect x="4.4" y="3.4" width="2.4" height="9.2" rx=".6" fill="currentColor"/><rect x="9.2" y="3.4" width="2.4" height="9.2" rx=".6" fill="currentColor"/>',
    prev: '<rect x="3.3" y="3.4" width="1.9" height="9.2" rx=".5" fill="currentColor"/><path d="M13 3.7v8.6L6.4 8z" fill="currentColor"/>',
    next: '<rect x="10.8" y="3.4" width="1.9" height="9.2" rx=".5" fill="currentColor"/><path d="M3 3.7v8.6L9.6 8z" fill="currentColor"/>',
    repeat: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.3V6.5A2.5 2.5 0 0 1 5.5 4H12"/><path d="M10 2 12.6 4 10 6"/><path d="M13 8.7v.8A2.5 2.5 0 0 1 10.5 12H4"/><path d="M6 10 3.4 12 6 14"/></g>',
    repeat1: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.3V6.5A2.5 2.5 0 0 1 5.5 4H12"/><path d="M10 2 12.6 4 10 6"/><path d="M13 8.7v.8A2.5 2.5 0 0 1 10.5 12H4"/><path d="M6 10 3.4 12 6 14"/></g><text x="8" y="9.7" font-size="5.6" font-weight="700" text-anchor="middle" fill="currentColor" font-family="Inter,system-ui,sans-serif">1</text>',
    vol: '<path d="M3 6.2h2L8 3.8v8.4L5 9.8H3z" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M10.4 6.3a2.4 2.4 0 0 1 0 3.4"/><path d="M12.2 4.8a4.6 4.6 0 0 1 0 6.4"/></g>',
    mute: '<path d="M3 6.2h2L8 3.8v8.4L5 9.8H3z" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M10.6 6.4 13.4 9.6M13.4 6.4 10.6 9.6"/></g>',
    note: '<path d="M12.6 2.1 6 3.6v6.3a2 2 0 1 1-1.2-1.85V5.05l6-1.35v4.3a2 2 0 1 1-1.2-1.85V3.2l3-.65z" fill="currentColor"/>',
    upload: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10.5V3"/><path d="M5.2 5.6 8 2.8l2.8 2.8"/><path d="M3 10.6v1.6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.6"/></g>',
    plus: '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3.6v8.8M3.6 8h8.8"/></g>',
    trash: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10"/><path d="M6.2 4.5V3.3a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.2"/><path d="M4.7 4.5 5.1 12a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.4-7.5"/></g>',
    up: '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.5 8 6l3.5 3.5"/></g>',
    down: '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5 8 10l3.5-3.5"/></g>',
    x: '<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"/></g>',
    edit: '<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 3.4 12.6 6.2"/><path d="M10.8 2.4a1.1 1.1 0 0 1 1.6 0l1.2 1.2a1.1 1.1 0 0 1 0 1.6L6.2 13 3 13l0-3.2z"/></g>'
  };
  function ic(n) { return '<svg class="mm-ic" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }

  function ensureStyles() {
    if (document.getElementById('mmusic-style')) return;
    var css =
      ".mm-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--panel,#16171e);border:1px solid var(--border,#2a2c38);border-radius:12px;flex-wrap:wrap;font-family:'Inter',system-ui,sans-serif}" +
      ".mm-btn{background:var(--panel-2,#1c1e27);border:1px solid var(--border-2,#3a3d4d);color:var(--text,#e6e7ee);border-radius:8px;height:32px;min-width:32px;padding:0 8px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}" +
      ".mm-btn:hover{border-color:var(--gold,#d4af37);color:var(--gold,#d4af37)}" +
      ".mm-gold{color:var(--gold,#d4af37);border-color:rgba(212,175,55,.4);white-space:nowrap}" +
      ".mm-btn.on{background:rgba(212,175,55,.12);color:#f3cd47;border-color:rgba(212,175,55,.5)}" +
      ".mm-now{flex:1;min-width:120px;display:flex;flex-direction:column;gap:4px}" +
      ".mm-title{font-size:12.5px;color:var(--text,#e6e7ee);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".mm-prog{height:5px;background:var(--panel-2,#1c1e27);border-radius:3px;overflow:hidden;cursor:pointer}" +
      ".mm-progf{height:100%;width:0;background:linear-gradient(90deg,#cf9f30,#e6c258)}" +
      ".mm-vol{display:inline-flex;align-items:center;gap:6px}" +
      ".mm-vol input[type=range]{width:84px;accent-color:var(--gold,#d4af37)}" +
      ".mm-yt{position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:.01;pointer-events:none}" +
      ".mm-ovl{position:fixed;inset:0;z-index:80;background:rgba(6,7,11,.72);display:flex;align-items:flex-start;justify-content:center;padding:5dvh 1rem;overflow-y:auto;font-family:'Inter',system-ui,sans-serif}" +
      ".mm-sheet{background:var(--panel,#16171e);border:1px solid var(--border-2,#3a3d4d);border-radius:14px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;color:var(--text,#e6e7ee)}" +
      ".mm-sh-h{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1rem;border-bottom:1px solid var(--border,#2a2c38);font-family:'Cinzel',serif;color:var(--gold,#d4af37);font-weight:600}" +
      ".mm-x{background:none;border:1px solid var(--border-2,#3a3d4d);color:var(--muted,#9498a8);border-radius:8px;width:30px;height:30px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
      ".mm-x:hover{color:var(--text,#e6e7ee);border-color:var(--gold,#d4af37)}" +
      ".mm-sh-b{padding:.8rem 1rem;overflow-y:auto}" +
      ".mm-sec{margin-bottom:14px}" +
      ".mm-lbl{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#9498a8);margin-bottom:8px}" +
      ".mm-mini{background:var(--panel-2,#1c1e27);color:var(--muted,#9498a8);border:1px solid var(--border-2,#3a3d4d);border-radius:8px;padding:4px 9px;font-family:inherit;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}" +
      ".mm-mini:hover{color:var(--text,#e6e7ee);border-color:var(--gold,#d4af37)}" +
      ".mm-list{display:flex;flex-direction:column;gap:5px;max-height:34vh;overflow-y:auto}" +
      ".mm-empty{color:var(--muted,#9498a8);font-size:.82rem;padding:.6rem;text-align:center}" +
      ".mm-row{display:flex;align-items:center;gap:7px;background:var(--panel-2,#1c1e27);border:1px solid var(--border,#2a2c38);border-radius:8px;padding:5px 8px;font-size:12.5px}" +
      ".mm-row .mm-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:6px}" +
      ".mm-row .mm-t:hover{color:#f3cd47}" +
      ".mm-row.playing{border-color:rgba(212,175,55,.5);background:rgba(212,175,55,.12)}" +
      ".mm-row button{background:none;border:none;color:var(--muted,#9498a8);cursor:pointer;font-size:13px;padding:0 2px}" +
      ".mm-row button:hover{color:var(--gold,#d4af37)}" +
      ".mm-row .mm-del{color:#f87171}.mm-row .mm-del:hover{color:#fca5a5}" +
      ".mm-badge{font-size:9px;background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);border-radius:4px;padding:1px 4px;letter-spacing:.04em;flex:none}" +
      ".mm-cur{color:var(--gold,#d4af37);display:inline-flex;align-items:center;flex:none}" +
      ".mm-hint{font-size:11px;line-height:1.5;color:var(--muted,#9498a8)}.mm-hint .mm-invcur{color:var(--gold,#d4af37);font-weight:600}" +
      ".mm-lrow,.mm-allrow{gap:9px}.mm-allrow{margin-bottom:6px;border-color:var(--border-2,#3a3d4d)}.mm-allrow .mm-t{font-weight:600;color:var(--gold,#d4af37)}" +
      ".mm-lnum{flex:none;min-width:30px;text-align:right;font-size:12px;color:var(--muted,#9498a8);display:inline-flex;align-items:center;justify-content:flex-end}" +
      ".mm-lr{flex:none;width:120px;accent-color:var(--gold,#d4af37)}" +
      ".mm-ren{color:var(--muted,#9498a8)}.mm-ren:hover{color:var(--gold,#d4af37)}" +
      ".mm-btn svg,.mm-mini svg,.mm-x svg,.mm-row button svg{display:block;flex:none}.mm-btn{gap:5px}";
    var st = document.createElement('style'); st.id = 'mmusic-style'; st.textContent = css; document.head.appendChild(st);
  }

  /* ---------- YouTube IFrame API (lazy) ---------- */
  var ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(function (resolve) {
      if (global.YT && global.YT.Player) { resolve(global.YT); return; }
      var prev = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () { if (prev) { try { prev(); } catch (e) {} } resolve(global.YT); };
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
    });
    return ytReady;
  }
  function parseYT(input) {
    input = (input || '').trim();
    var m = input.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    return null;
  }

  /* ========================= mount ========================= */
  function mount(opts) {
    ensureStyles();
    var sb = opts.sb, bar = opts.bar;
    var getUid = opts.getUid || function () { return null; };
    var getName = opts.getName || function () { return ''; };

    var ST = { roomId: null, isOwner: false, state: null, tracks: [], chan: null, vol: 60, muted: false, armed: false, ytP: null, ytLoaded: null,
      invHosts: [], ytCache: {}, ytFail: {}, ytResolving: null, presence: {} };

    /* ---------- Invidious instance-ok (YT-linkek reklámmentes feloldásához) ---------- */
    // Sorrend = próbálkozási sorrend; az első a leggyakrabban működő. A felhasználó
    // felülírhatja (DJ-pult „Invidious szerver" mező → localStorage).
    var DEFAULT_INV = ['https://yt.chocolatemoo53.com', 'https://invidious.nerdvpn.de', 'https://inv.nadeko.net', 'https://invidious.tiekoetter.com'];
    function normHost(h) { h = (h || '').trim().replace(/\/+$/, ''); if (h && !/^https?:\/\//.test(h)) h = 'https://' + h; return h; }
    (function initHosts() {
      var custom = []; try { var raw = localStorage.getItem('kk_inv_hosts'); if (raw) custom = JSON.parse(raw) || []; } catch (e) {}
      if (opts.invidiousHosts && opts.invidiousHosts.length) custom = opts.invidiousHosts;
      var seen = {}, out = [];
      custom.concat(DEFAULT_INV).forEach(function (h) { h = normHost(h); if (h && !seen[h]) { seen[h] = 1; out.push(h); } });
      ST.invHosts = out;
    })();

    // --- Sáv DOM ---
    bar.innerHTML =
      '<div class="mm-bar" hidden>' +
      '<button class="mm-btn mm-prev" hidden title="Előző">' + ic('prev') + '</button>' +
      '<button class="mm-btn mm-play" hidden title="Lejátszás/Szünet">' + ic('play') + '</button>' +
      '<button class="mm-btn mm-next" hidden title="Következő">' + ic('next') + '</button>' +
      '<div class="mm-now"><span class="mm-title">Nincs zene</span><div class="mm-prog"><div class="mm-progf"></div></div></div>' +
      '<button class="mm-btn mm-loop" hidden title="Ismétlés">' + ic('repeat') + '</button>' +
      '<span class="mm-vol"><button class="mm-btn mm-mute" title="Némítás">' + ic('vol') + '</button><input type="range" class="mm-volr" min="0" max="100" value="60" aria-label="Hangerő"></span>' +
      '<button class="mm-btn mm-gold mm-dj" hidden title="Zene vezérlés">' + ic('note') + ' Zene</button>' +
      '</div>';
    var el = function (s) { return bar.querySelector(s); };
    var barEl = el('.mm-bar');

    // --- Rejtett lejátszók + DJ overlay a body-ban ---
    var audio = document.createElement('audio'); audio.preload = 'auto'; document.body.appendChild(audio);
    var ytHost = document.createElement('div'); ytHost.className = 'mm-yt'; document.body.appendChild(ytHost);
    var dj = document.createElement('div'); dj.className = 'mm-ovl'; dj.hidden = true;
    dj.innerHTML =
      '<div class="mm-sheet"><div class="mm-sh-h"><span>Zene — DJ pult</span><button class="mm-x mm-close" aria-label="Bezárás">' + ic('x') + '</button></div>' +
      '<div class="mm-sh-b">' +
      '<div class="mm-sec"><div class="mm-lbl"><span>Zene-könyvtár</span><span><button class="mm-mini mm-upload">' + ic('upload') + ' Feltöltés</button> <button class="mm-mini mm-ytadd">' + ic('plus') + ' YT-link</button></span></div>' +
      '<input type="file" class="mm-file" accept="audio/*" multiple hidden>' +
      '<div class="mm-list mm-lib"><div class="mm-empty">Tölts fel zenéket.</div></div></div>' +
      '<div class="mm-sec"><div class="mm-lbl"><span>Lejátszási sor</span><button class="mm-mini mm-clear">Ürítés</button></div>' +
      '<div class="mm-list mm-queue"><div class="mm-empty">A sor üres — a könyvtárból add hozzá.</div></div></div>' +
      '<div class="mm-sec"><div class="mm-lbl"><span>Hallgatók — hangerő</span></div>' +
      '<div class="mm-row mm-allrow"><span class="mm-t">Mindenki</span><span class="mm-lnum mm-allnum">80</span><input type="range" class="mm-lr mm-allr" min="0" max="100" value="80"></div>' +
      '<div class="mm-list mm-listeners"><div class="mm-empty">Nincs csatlakozott hallgató.</div></div></div>' +
      '<div class="mm-sec"><div class="mm-lbl"><span>YT-forrás (Invidious)</span><span><button class="mm-mini mm-invset">Szerver</button> <button class="mm-mini mm-invreset">Alap</button></span></div>' +
      '<div class="mm-hint">A YouTube-linkeket ezen az <b class="mm-invcur">szerveren</b> át játsszuk le, reklámmentesen. Ha egy link nem szólal meg, válts szervert.</div></div>' +
      '</div></div>';
    document.body.appendChild(dj);
    var djEl = function (s) { return dj.querySelector(s); };

    /* ---------- hangerő ---------- */
    try { ST.vol = parseInt(localStorage.getItem('kk_music_vol'), 10); if (isNaN(ST.vol)) ST.vol = 60; } catch (e) { ST.vol = 60; }
    try { ST.muted = localStorage.getItem('kk_music_muted') === '1'; } catch (e) {}
    el('.mm-volr').value = ST.vol; el('.mm-mute').innerHTML = ic(ST.muted ? 'mute' : 'vol');
    function applyVol() {
      var v = ST.muted ? 0 : (ST.vol / 100);
      try { audio.volume = v; } catch (e) {}
      try { if (ST.ytP && ST.ytP.setVolume) ST.ytP.setVolume(ST.muted ? 0 : ST.vol); } catch (e) {}
    }
    el('.mm-volr').oninput = function () { ST.vol = parseInt(this.value, 10) || 0; ST.muted = false; applyVol(); el('.mm-mute').innerHTML = ic('vol'); try { localStorage.setItem('kk_music_vol', ST.vol); } catch (e) {} trackPresence(); };
    el('.mm-mute').onclick = function () { ST.muted = !ST.muted; applyVol(); el('.mm-mute').innerHTML = ic(ST.muted ? 'mute' : 'vol'); try { localStorage.setItem('kk_music_muted', ST.muted ? '1' : '0'); } catch (e) {} trackPresence(); };

    /* ---------- transport gombok + overlay ---------- */
    el('.mm-play').onclick = djTogglePlay;
    el('.mm-next').onclick = function () { djNext(true); };
    el('.mm-prev').onclick = djPrev;
    el('.mm-loop').onclick = djToggleLoop;
    el('.mm-prog').onclick = function (e) { if (!ST.isOwner) return; var r = this.getBoundingClientRect(); djSeek(((e.clientX - r.left) / r.width) * getDur()); };
    el('.mm-dj').onclick = function () { dj.hidden = false; renderLib(); renderQueue(); renderListeners(); };
    djEl('.mm-allr').oninput = function () { djEl('.mm-allnum').textContent = parseInt(this.value, 10) || 0; };
    djEl('.mm-allr').onchange = function () { sendVol('all', parseInt(this.value, 10) || 0); };
    djEl('.mm-close').onclick = function () { dj.hidden = true; };
    dj.onclick = function (e) { if (e.target === dj) dj.hidden = true; };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dj.hidden) dj.hidden = true; });
    djEl('.mm-upload').onclick = function () { djEl('.mm-file').click(); };
    djEl('.mm-file').onchange = function () { uploadTracks(this.files); this.value = ''; };
    djEl('.mm-ytadd').onclick = addYtLink;
    djEl('.mm-clear').onclick = function () { if (confirm('Üríted a lejátszási sort?')) djSetQueue([], true); };
    function renderInv() { var c = djEl('.mm-invcur'); if (c) c.textContent = (ST.invHosts[0] || '').replace(/^https?:\/\//, ''); }
    function setInvHosts(primary) {
      var seen = {}, out = [];
      [primary].concat(DEFAULT_INV).forEach(function (h) { h = normHost(h); if (h && !seen[h]) { seen[h] = 1; out.push(h); } });
      ST.invHosts = out; ST.ytCache = {}; ST.ytFail = {};     // új szerver → minden yt-szám újra-feloldandó
      try { localStorage.setItem('kk_inv_hosts', JSON.stringify([ST.invHosts[0]])); } catch (e) {}
      renderInv(); if (activeType() === 'yt') applyState();
    }
    djEl('.mm-invset').onclick = function () { var h = prompt('Invidious-szerver címe (pl. https://inv.nadeko.net):', ST.invHosts[0] || ''); if (h && normHost(h)) setInvHosts(h); };
    djEl('.mm-invreset').onclick = function () { ST.ytCache = {}; ST.ytFail = {}; try { localStorage.removeItem('kk_inv_hosts'); } catch (e) {} var seen = {}, out = []; DEFAULT_INV.forEach(function (h) { h = normHost(h); if (!seen[h]) { seen[h] = 1; out.push(h); } }); ST.invHosts = out; renderInv(); if (activeType() === 'yt') applyState(); };
    renderInv();

    // progress-sáv frissítés (file + feloldott yt az <audio>-ból)
    audio.ontimeupdate = function () { if (usesAudio()) updateProg(); };
    audio.onended = function () { if (ST.isOwner && usesAudio()) djTrackEnded(); };
    // Ha egy feloldott yt-stream URL-je lejárt (pár óra után) → dobd a cache-t és oldd fel újra.
    audio.onerror = function () { var t = curTrack(); if (t && (t.type || 'file') === 'yt' && ST.ytCache[t.videoId]) { delete ST.ytCache[t.videoId]; applyState(); } };
    // IFrame-fallback esetén a yt haladását időzítőből frissítjük.
    setInterval(function () { var t = curTrack(); if (!barEl.hidden && t && (t.type || 'file') === 'yt' && !usesAudio(t)) updateProg(); }, 500);

    /* ---------- lejátszó-absztrakció ---------- */
    function curTrack() { var s = ST.state; return (s && s.queue && s.queue[s.index]) || null; }
    function activeType() { var t = curTrack(); return t ? (t.type || 'file') : null; }
    // Egy yt-szám akkor szól az <audio>-ból (reklámmentes, Invidious-feloldva),
    // ha van hozzá cache-elt URL; különben a YouTube IFrame-ről (fallback).
    function ytUrl(t) { return (t && (t.type || 'file') === 'yt' && ST.ytCache[t.videoId]) ? ST.ytCache[t.videoId] : null; }
    function usesAudio(t) { t = t || curTrack(); if (!t) return false; return (t.type || 'file') === 'file' || !!ytUrl(t); }
    function getDur() { var t = curTrack(); if (!t) return 0; if (!usesAudio(t)) { try { return (ST.ytP && ST.ytP.getDuration) ? ST.ytP.getDuration() : 0; } catch (e) { return 0; } } return audio.duration || 0; }
    function getTime() { var t = curTrack(); if (!t) return 0; if (!usesAudio(t)) { try { return (ST.ytP && ST.ytP.getCurrentTime) ? ST.ytP.getCurrentTime() : 0; } catch (e) { return 0; } } return audio.currentTime || 0; }
    function updateProg() { var d = getDur(); el('.mm-progf').style.width = (d ? Math.min(100, (getTime() / d) * 100) : 0) + '%'; }
    function pauseAll() { try { audio.pause(); } catch (e) {} try { if (ST.ytP && ST.ytP.pauseVideo) ST.ytP.pauseVideo(); } catch (e) {} }

    // Közös <audio>-lejátszás (fájl ÉS feloldott yt-stream ugyanazt használja).
    function playAudioSrc(url, s, pos) {
      try { if (ST.ytP && ST.ytP.pauseVideo) ST.ytP.pauseVideo(); } catch (e) {}
      if (audio.getAttribute('src') !== url) { audio.setAttribute('src', url); audio.load(); }
      var go = function () {
        if (Math.abs((audio.currentTime || 0) - pos) > 1.6) { try { audio.currentTime = pos; } catch (e) {} }
        if (s.playing) { var pr = audio.play(); if (pr && pr.catch) pr.catch(needArm); } else { try { audio.pause(); } catch (e) {} }
      };
      if (audio.readyState >= 1) go(); else { audio.onloadedmetadata = function () { audio.onloadedmetadata = null; go(); }; }
    }

    /* ---------- Invidious feloldó: videoId → reklámmentes audio-stream URL ---------- */
    // A proxy-URL (local=true) az instance-on át megy → minden kliensnek lejátszható
    // (nem IP-hez kötött), és CORS-barát. itag 140 = m4a audio; 251 = webm/opus.
    function canLoad(src) {
      return new Promise(function (res) {
        var a = new Audio(); var done = false;
        var fin = function (v) { if (done) return; done = true; try { a.src = ''; } catch (e) {} res(v); };
        a.preload = 'metadata';
        a.addEventListener('loadedmetadata', function () { fin(true); });
        a.addEventListener('error', function () { fin(false); });
        setTimeout(function () { fin(false); }, 7000);
        try { a.src = src; } catch (e) { fin(false); }
      });
    }
    function resolveYT(vid) {
      var hosts = ST.invHosts, itags = ['140', '251', '18'], hi = 0;
      function nextHost() {
        if (hi >= hosts.length) return Promise.resolve(null);
        var h = hosts[hi++];
        return probe(h, 0);
      }
      function probe(h, ti) {
        if (ti >= itags.length) return nextHost();
        var url = h + '/latest_version?id=' + encodeURIComponent(vid) + '&itag=' + itags[ti] + '&local=true';
        return canLoad(url).then(function (ok) { return ok ? url : probe(h, ti + 1); });
      }
      return nextHost();
    }

    function applyState() {
      var s = ST.state, t = curTrack();
      if (!t) { pauseAll(); renderBar(); return; }
      var type = t.type || 'file';
      var pos = s.playing ? Math.max(0, (Date.now() - (s.started_at || Date.now())) / 1000) : (s.paused_sec || 0);
      if (type === 'file') {
        playAudioSrc(t.url, s, pos);
      } else { // yt
        var cached = ytUrl(t);
        if (cached) {
          playAudioSrc(cached, s, pos);           // reklámmentes stream az <audio>-ból
        } else if (ST.ytFail[t.videoId]) {
          ytIframe(t, s, pos);                     // fallback: beépített YouTube-lejátszó (reklám lehet)
        } else {
          // feloldás Invidious-on át; közben szünet
          try { audio.pause(); } catch (e) {}
          if (ST.ytResolving !== t.videoId) {
            ST.ytResolving = t.videoId;
            resolveYT(t.videoId).then(function (url) {
              ST.ytResolving = null;
              if (url) ST.ytCache[t.videoId] = url; else ST.ytFail[t.videoId] = true;
              var cur = curTrack(); if (cur && cur.videoId === t.videoId) applyState();
            });
          }
          renderBar(); return;
        }
      }
      renderBar();
    }

    // Beépített YouTube IFrame (csak ha az Invidious-feloldás nem sikerült).
    function ytIframe(t, s, pos) {
      try { audio.pause(); } catch (e) {}
      loadYT().then(function (YT) {
        if (!ST.ytP) {
          ST.ytP = new YT.Player(ytHost, {
            height: '1', width: '1', videoId: t.videoId,
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
            events: {
              onReady: function () { ST.ytLoaded = t.videoId; applyVol(); ytApply(t, s, pos); },
              onStateChange: function (ev) { if (ev.data === 0 && ST.isOwner && !usesAudio()) djTrackEnded(); }
            }
          });
        } else { ytApply(t, s, pos); }
      });
    }
    function ytApply(t, s, pos) {
      try {
        if (ST.ytLoaded !== t.videoId) { ST.ytP.loadVideoById({ videoId: t.videoId, startSeconds: pos }); ST.ytLoaded = t.videoId; applyVol(); }
        else { var ct = ST.ytP.getCurrentTime ? ST.ytP.getCurrentTime() : 0; if (Math.abs(ct - pos) > 1.8) { ST.ytP.seekTo(pos, true); } }
        if (s.playing) { ST.ytP.playVideo(); } else { ST.ytP.pauseVideo(); }
      } catch (e) {}
    }
    function needArm() {
      if (ST.armed) return;
      var b = el('.mm-play'); b.hidden = false; b.innerHTML = ic('vol') + ' Hang be'; b.classList.add('on');
      b.onclick = function () { ST.armed = true; b.classList.remove('on'); b.innerHTML = ic('play'); b.onclick = djTogglePlay; b.hidden = !ST.isOwner; applyState(); };
    }

    /* ---------- könyvtár (a FELHASZNÁLÓ zenéi: fájlok ÉS YT-linkek, szobák közt újrahasználható) ---------- */
    function loadLib() {
      sb.from('music_tracks').select('id,title,url,path,type,video_id').eq('owner_id', getUid()).order('created_at', { ascending: false }).then(function (r) {
        ST.tracks = (r && r.data && !r.error) ? r.data : []; renderLib();
      });
    }
    // Könyvtári sor → lejátszási-sor tétel (type-helyesen).
    function trackToQueue(t) {
      return (t.type === 'yt') ? { type: 'yt', videoId: t.video_id, title: t.title } : { type: 'file', url: t.url, title: t.title };
    }
    function uploadTracks(files) {
      if (!files || !files.length) return;
      var list = Array.prototype.slice.call(files);
      (function next() {
        if (!list.length) { loadLib(); return; }
        var f = list.shift();
        var ext = (f.name.split('.').pop() || 'mp3').toLowerCase();
        var path = getUid() + '/' + Date.now() + '_' + Math.random().toString(16).slice(2, 8) + '.' + ext;
        sb.storage.from('room_music').upload(path, f, { contentType: f.type || 'audio/mpeg' }).then(function (u) {
          if (u.error) { alert('Feltöltés hiba (' + f.name + '): ' + u.error.message); next(); return; }
          var url = sb.storage.from('room_music').getPublicUrl(path).data.publicUrl;
          sb.from('music_tracks').insert({ owner_id: getUid(), title: f.name.replace(/\.[^.]+$/, ''), url: url, path: path }).then(function () { next(); });
        });
      })();
    }
    function delTrack(t) {
      if (!confirm('Törlöd a könyvtárból: "' + t.title + '"?')) return;
      (t.path ? sb.storage.from('room_music').remove([t.path]) : Promise.resolve()).then(function () {
        sb.from('music_tracks').delete().eq('id', t.id).then(loadLib);
      });
    }
    function addYtLink() {
      var u = prompt('YouTube link vagy videó-ID:\n(Reklámmentesen játsszuk le egy Invidious-szerveren át. Ha egy szerver épp nem elérhető, a beépített YouTube-lejátszóra vált — ott lehet reklám. A fájl-feltöltés mindig 100% reklámmentes.)');
      if (!u) return;
      var vid = parseYT(u); if (!vid) { alert('Nem ismerem fel a YouTube-linket.'); return; }
      var title = (prompt('Adj nevet a számnak:', '') || '').trim() || 'YouTube-szám';
      // 1) mentés a felhasználó könyvtárába → bármelyik szobádban újrahasználható
      sb.from('music_tracks').insert({ owner_id: getUid(), title: title, type: 'yt', video_id: vid, url: 'https://youtu.be/' + vid }).then(function (r) {
        if (r && r.error) console.warn('[zene] a YT-link könyvtárba mentése nem sikerült:', r.error.message);
        loadLib();
      });
      // 2) és rögtön a mostani sorba is
      djAddToQueue({ type: 'yt', videoId: vid, title: title });
    }
    // Átnevezés: könyvtári szám (DB) + a lejátszási sorban lévő tétel (room_music.state).
    function renameTrack(t) {
      var name = (prompt('Új név a számhoz:', t.title) || '').trim(); if (!name || name === t.title) return;
      sb.from('music_tracks').update({ title: name }).eq('id', t.id).then(function (r) {
        if (r && r.error) { alert('Átnevezés hiba: ' + r.error.message); return; }
        t.title = name; renderLib();
      });
    }
    function renameQueue(i) {
      var s = curState(); var tr = s.queue && s.queue[i]; if (!tr) return;
      var name = (prompt('Új név a sorban lévő számhoz:', tr.title) || '').trim(); if (!name || name === tr.title) return;
      tr.title = name; saveState(s); renderQueue(); renderBar();
    }
    function renderLib() {
      var box = djEl('.mm-lib'); if (!box) return;
      if (!ST.tracks.length) { box.innerHTML = '<div class="mm-empty">Tölts fel zenéket a Feltöltés gombbal, vagy adj YT-linket.</div>'; return; }
      box.innerHTML = '';
      ST.tracks.forEach(function (t) {
        var row = document.createElement('div'); row.className = 'mm-row';
        row.innerHTML = '<span class="mm-t" title="Lejátszás most">' + (t.type === 'yt' ? '<span class="mm-badge">YT</span> ' : '') + esc(t.title) + '</span>' +
          '<button class="mm-ren" title="Átnevezés">' + ic('edit') + '</button>' +
          '<button class="mm-add" title="Sorba">' + ic('plus') + '</button><button class="mm-del" title="Törlés">' + ic('trash') + '</button>';
        row.querySelector('.mm-t').onclick = function () { djAddAndPlay(trackToQueue(t)); };
        row.querySelector('.mm-ren').onclick = function () { renameTrack(t); };
        row.querySelector('.mm-add').onclick = function () { djAddToQueue(trackToQueue(t)); };
        row.querySelector('.mm-del').onclick = function () { delTrack(t); };
        box.appendChild(row);
      });
    }

    /* ---------- állapot + szinkron ---------- */
    function curState() { return ST.state || { queue: [], index: 0, playing: false, started_at: 0, paused_sec: 0, loop: 'off' }; }
    function loadState() {
      return sb.from('room_music').select('state').eq('room_id', ST.roomId).maybeSingle()
        .then(function (r) { if (r && r.error) console.warn('[zene] loadState hiba:', r.error.message); ST.state = (r && r.data && r.data.state) ? r.data.state : null; })
        .catch(function (e) { console.warn('[zene] loadState kivétel:', e); ST.state = null; });
    }
    function saveState(s) {
      s.rev = (((ST.state && ST.state.rev) || 0) + 1);                // monoton verzió → az elkésett/elavult üzenet nem írja felül az újabbat
      ST.state = s;
      pushState();                                                    // 1) AZONNALI, megbízható élő szinkron (broadcast) — nem függ a postgres_changes UPDATE-kézbesítéstől
      sb.from('room_music').upsert({ room_id: ST.roomId, state: s, updated_at: new Date().toISOString() }) // 2) perzisztencia + késői csatlakozóknak (loadState)
        .then(function (r) { if (r && r.error) console.warn('[zene] saveState DB-hiba:', r.error.message); })
        .catch(function (e) { console.warn('[zene] saveState kivétel:', e); });
    }
    // A tulaj a teljes állapotot broadcast-tal is kiküldi (ez a megbízható élő csatorna).
    function pushState() {
      if (ST.chan && ST.chan.send && ST.state) { try { ST.chan.send({ type: 'broadcast', event: 'state', payload: ST.state }); } catch (e) {} }
    }
    // Beérkező állapot alkalmazása (broadcast ÉS postgres_changes közös útja), elavult-szűréssel.
    function applyIncoming(st) {
      if (!st) return;
      if (st.rev != null && ST.state && ST.state.rev != null && st.rev < ST.state.rev) return; // régebbi, mint ami már nálunk van → eldobjuk
      ST.state = st; applyState(); renderBar(); if (!dj.hidden) renderQueue();
    }
    function subscribe() {
      if (ST.chan) { try { sb.removeChannel(ST.chan); } catch (e) {} ST.chan = null; }
      var uid = getUid() || 'anon';
      ST.chan = sb.channel('music-' + ST.roomId, { config: { presence: { key: uid } } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_music' }, function (p) {
          var row = p.new; if (!row || row.room_id !== ST.roomId) return;
          applyIncoming(row.state);                                   // tartalék csatorna (a broadcast az elsődleges)
        })
        .on('presence', { event: 'sync' }, function () { try { ST.presence = ST.chan.presenceState(); } catch (e) { ST.presence = {}; } renderListeners(); if (ST.isOwner) pushState(); /* új csatlakozó is megkapja az aktuális állapotot */ })
        .on('broadcast', { event: 'state' }, function (m) { applyIncoming(m && m.payload); })
        .on('broadcast', { event: 'setvol' }, function (m) { applyRemoteVol(m && m.payload); })
        .subscribe(function (status, err) {
          console.log('[zene] realtime csatorna:', status, err || '');
          if (status === 'SUBSCRIBED') { trackPresence(); if (ST.isOwner) pushState(); }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[zene] a realtime NEM él — a room_music tábla valószínűleg nincs a realtime publikációban (lásd room_music.sql).');
        });
    }

    /* ---------- jelenlét + távoli hangerő (ki mennyin hallgatja / DJ állítja) ---------- */
    function trackPresence() {
      if (!ST.chan || !ST.chan.track) return;
      try { ST.chan.track({ name: (getName() || 'Játékos'), vol: ST.vol, muted: !!ST.muted, owner: !!ST.isOwner }); } catch (e) {}
    }
    // Más gépen állítottak a hangerőmön (DJ) → alkalmazom helyben.
    function applyRemoteVol(p) {
      if (!p) return;
      var me = getUid() || 'anon';
      if (p.target !== 'all' && p.target !== me) return;
      if (typeof p.vol === 'number') { ST.vol = Math.max(0, Math.min(100, p.vol)); ST.muted = false; }
      if (typeof p.muted === 'boolean') ST.muted = p.muted;
      try { el('.mm-volr').value = ST.vol; el('.mm-mute').innerHTML = ic(ST.muted ? 'mute' : 'vol'); } catch (e) {}
      applyVol();
      try { localStorage.setItem('kk_music_vol', ST.vol); localStorage.setItem('kk_music_muted', ST.muted ? '1' : '0'); } catch (e) {}
      trackPresence();
    }
    // DJ → beállít egy hallgatónak (uid) vagy mindenkinek ('all') egy hangerőt.
    function sendVol(target, vol) {
      if (ST.chan && ST.chan.send) { try { ST.chan.send({ type: 'broadcast', event: 'setvol', payload: { target: target, vol: vol } }); } catch (e) {} }
      applyRemoteVol({ target: target, vol: vol }); // a feladó a saját broadcastját nem kapja vissza → 'all'/saját esetén itt
    }
    function renderListeners() {
      var box = djEl('.mm-listeners'); if (!box) return;
      var ps = ST.presence || {}; var keys = Object.keys(ps);
      if (!keys.length) { box.innerHTML = '<div class="mm-empty">Nincs csatlakozott hallgató.</div>'; return; }
      var me = getUid() || 'anon';
      box.innerHTML = '';
      keys.forEach(function (k) {
        var meta = (ps[k] || [])[0] || {};
        var vol = typeof meta.vol === 'number' ? meta.vol : 0, muted = !!meta.muted;
        var nm = (meta.name || 'Játékos') + (k === me ? ' (te)' : '') + (meta.owner ? ' · DJ' : '');
        var row = document.createElement('div'); row.className = 'mm-row mm-lrow';
        row.innerHTML = '<span class="mm-t">' + esc(nm) + '</span><span class="mm-lnum">' + (muted ? '🔇' : vol) + '</span>' +
          '<input type="range" class="mm-lr" min="0" max="100" value="' + vol + '">';
        var num = row.querySelector('.mm-lnum');
        if (muted) num.innerHTML = ic('mute'); else num.textContent = vol;
        var r = row.querySelector('.mm-lr');
        r.oninput = function () { num.textContent = parseInt(this.value, 10) || 0; };
        r.onchange = function () { sendVol(k, parseInt(this.value, 10) || 0); };
        box.appendChild(row);
      });
    }

    function renderBar() {
      var s = ST.state, t = (s && s.queue && s.queue[s.index]) ? s.queue[s.index] : null;
      el('.mm-title').innerHTML = t ? ((t.type === 'yt' ? '<span class="mm-badge" title="YouTube-link — reklámmentesen, Invidious-on át">YT</span> ' : '') + esc(t.title)) : 'Nincs zene';
      if (ST.isOwner) {
        el('.mm-play').innerHTML = ic((s && s.playing) ? 'pause' : 'play');
        var loop = (s && s.loop) || 'off';
        el('.mm-loop').innerHTML = ic(loop === 'one' ? 'repeat1' : 'repeat');
        el('.mm-loop').classList.toggle('on', loop !== 'off');
        el('.mm-loop').title = loop === 'off' ? 'Ismétlés: ki' : loop === 'all' ? 'Ismétlés: összes' : 'Ismétlés: egy';
      }
      if (!dj.hidden) renderQueue();
    }

    /* ---------- DJ transport (CSAK a tulaj ír) ---------- */
    function djAddToQueue(tr) { var s = curState(); s.queue = (s.queue || []).concat([tr]); saveState(s); renderQueue(); renderBar(); }
    function djAddAndPlay(tr) { var s = curState(); s.queue = (s.queue || []).concat([tr]); playAt(s, s.queue.length - 1); }
    function djSetQueue(q, reset) { var s = curState(); s.queue = q; if (reset) { s.index = 0; s.playing = false; s.paused_sec = 0; } saveState(s); applyState(); renderBar(); }
    function playAt(s, i) { s.index = i; s.playing = true; s.started_at = Date.now(); s.paused_sec = 0; saveState(s); applyState(); renderBar(); }
    function djTogglePlay() { var s = curState(); if (!s.queue || !s.queue.length) return; if (s.playing) { s.paused_sec = Math.max(0, (Date.now() - (s.started_at || Date.now())) / 1000); s.playing = false; } else { s.started_at = Date.now() - (s.paused_sec || 0) * 1000; s.playing = true; } saveState(s); applyState(); renderBar(); }
    function djNext(user) { var s = curState(); if (!s.queue || !s.queue.length) return; var n = s.index + 1; if (n >= s.queue.length) { if (s.loop === 'all' || user) { n = 0; } else { s.playing = false; s.paused_sec = 0; saveState(s); applyState(); renderBar(); return; } } playAt(s, n); }
    function djPrev() { var s = curState(); if (!s.queue || !s.queue.length) return; var n = s.index - 1; if (n < 0) n = s.queue.length - 1; playAt(s, n); }
    function djSeek(sec) { var s = curState(); sec = Math.max(0, sec || 0); if (s.playing) { s.started_at = Date.now() - sec * 1000; } else { s.paused_sec = sec; } saveState(s); applyState(); }
    function djToggleLoop() { var s = curState(); s.loop = s.loop === 'off' ? 'all' : s.loop === 'all' ? 'one' : 'off'; saveState(s); renderBar(); }
    function djTrackEnded() { var s = curState(); if (s.loop === 'one') { playAt(s, s.index); return; } djNext(false); }
    function djMove(i, dir) { var s = curState(); var j = i + dir; if (j < 0 || j >= s.queue.length) return; var t = s.queue[i]; s.queue[i] = s.queue[j]; s.queue[j] = t; if (s.index === i) s.index = j; else if (s.index === j) s.index = i; saveState(s); renderQueue(); }
    function djRemoveQ(i) { var s = curState(); s.queue.splice(i, 1); if (s.index >= s.queue.length) s.index = Math.max(0, s.queue.length - 1); if (!s.queue.length) s.playing = false; saveState(s); applyState(); renderQueue(); renderBar(); }

    function renderQueue() {
      var box = djEl('.mm-queue'); if (!box) return; var s = ST.state; var q = (s && s.queue) || [];
      if (!q.length) { box.innerHTML = '<div class="mm-empty">A sor üres — a könyvtárból add hozzá.</div>'; return; }
      box.innerHTML = '';
      q.forEach(function (tr, i) {
        var row = document.createElement('div'); row.className = 'mm-row' + ((s && s.index === i && s.playing) ? ' playing' : '');
        row.innerHTML = '<span class="mm-t" title="Lejátszás innen">' + (s && s.index === i ? '<span class="mm-cur">' + ic('play') + '</span>' : '') + (tr.type === 'yt' ? '<span class="mm-badge">YT</span> ' : '') + esc(tr.title) + '</span>' +
          '<button class="mm-ren" title="Átnevezés">' + ic('edit') + '</button>' +
          '<button class="mm-up" title="Fel">' + ic('up') + '</button><button class="mm-dn" title="Le">' + ic('down') + '</button><button class="mm-del" title="Kivesz">' + ic('x') + '</button>';
        row.querySelector('.mm-t').onclick = function () { playAt(curState(), i); };
        row.querySelector('.mm-ren').onclick = function () { renameQueue(i); };
        row.querySelector('.mm-up').onclick = function () { djMove(i, -1); };
        row.querySelector('.mm-dn').onclick = function () { djMove(i, 1); };
        row.querySelector('.mm-del').onclick = function () { djRemoveQ(i); };
        box.appendChild(row);
      });
    }

    /* ---------- kontroller API ---------- */
    function enter(roomId, isOwner) {
      ST.roomId = roomId; ST.isOwner = !!isOwner;
      barEl.hidden = false;
      ['.mm-prev', '.mm-play', '.mm-next', '.mm-loop', '.mm-dj'].forEach(function (sel) { el(sel).hidden = !ST.isOwner; });
      applyVol();
      if (ST.isOwner) loadLib();
      loadState().then(function () { applyState(); renderBar(); });
      subscribe();
    }
    function leave() {
      if (ST.chan) { try { sb.removeChannel(ST.chan); } catch (e) {} ST.chan = null; }
      pauseAll();
      try { audio.removeAttribute('src'); audio.load(); } catch (e) {}
      try { if (ST.ytP && ST.ytP.stopVideo) ST.ytP.stopVideo(); } catch (e) {}
      ST.state = null; ST.roomId = null; barEl.hidden = true; dj.hidden = true;
    }

    return { enter: enter, leave: leave };
  }

  global.MagusMusic = { mount: mount, ensureStyles: ensureStyles, parseYT: parseYT };
})(window);
