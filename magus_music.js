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
      ".mm-x{background:none;border:1px solid var(--border-2,#3a3d4d);color:var(--muted,#9498a8);border-radius:8px;width:30px;height:30px;cursor:pointer}" +
      ".mm-x:hover{color:var(--text,#e6e7ee);border-color:var(--gold,#d4af37)}" +
      ".mm-sh-b{padding:.8rem 1rem;overflow-y:auto}" +
      ".mm-sec{margin-bottom:14px}" +
      ".mm-lbl{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#9498a8);margin-bottom:8px}" +
      ".mm-mini{background:var(--panel-2,#1c1e27);color:var(--muted,#9498a8);border:1px solid var(--border-2,#3a3d4d);border-radius:8px;padding:4px 9px;font-family:inherit;font-size:11.5px;cursor:pointer}" +
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
      ".mm-badge{font-size:9px;background:rgba(248,113,113,.15);color:#f87171;border:1px solid rgba(248,113,113,.3);border-radius:4px;padding:1px 4px;letter-spacing:.04em;flex:none}";
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

    var ST = { roomId: null, isOwner: false, state: null, tracks: [], chan: null, vol: 60, muted: false, armed: false, ytP: null, ytLoaded: null };

    // --- Sáv DOM ---
    bar.innerHTML =
      '<div class="mm-bar" hidden>' +
      '<button class="mm-btn mm-prev" hidden title="Előző">⏮</button>' +
      '<button class="mm-btn mm-play" hidden title="Lejátszás/Szünet">▶</button>' +
      '<button class="mm-btn mm-next" hidden title="Következő">⏭</button>' +
      '<div class="mm-now"><span class="mm-title">Nincs zene</span><div class="mm-prog"><div class="mm-progf"></div></div></div>' +
      '<button class="mm-btn mm-loop" hidden title="Ismétlés">🔁</button>' +
      '<span class="mm-vol"><button class="mm-btn mm-mute" title="Némítás">🔊</button><input type="range" class="mm-volr" min="0" max="100" value="60" aria-label="Hangerő"></span>' +
      '<button class="mm-btn mm-gold mm-dj" hidden title="Zene vezérlés">🎵 Zene</button>' +
      '</div>';
    var el = function (s) { return bar.querySelector(s); };
    var barEl = el('.mm-bar');

    // --- Rejtett lejátszók + DJ overlay a body-ban ---
    var audio = document.createElement('audio'); audio.preload = 'auto'; document.body.appendChild(audio);
    var ytHost = document.createElement('div'); ytHost.className = 'mm-yt'; document.body.appendChild(ytHost);
    var dj = document.createElement('div'); dj.className = 'mm-ovl'; dj.hidden = true;
    dj.innerHTML =
      '<div class="mm-sheet"><div class="mm-sh-h"><span>🎵 Zene — DJ pult</span><button class="mm-x mm-close" aria-label="Bezárás">✕</button></div>' +
      '<div class="mm-sh-b">' +
      '<div class="mm-sec"><div class="mm-lbl"><span>Zene-könyvtár</span><span><button class="mm-mini mm-upload">⬆ Feltöltés</button> <button class="mm-mini mm-ytadd">＋ YT-link</button></span></div>' +
      '<input type="file" class="mm-file" accept="audio/*" multiple hidden>' +
      '<div class="mm-list mm-lib"><div class="mm-empty">Tölts fel zenéket.</div></div></div>' +
      '<div class="mm-sec"><div class="mm-lbl"><span>Lejátszási sor</span><button class="mm-mini mm-clear">Ürítés</button></div>' +
      '<div class="mm-list mm-queue"><div class="mm-empty">A sor üres — a könyvtárból add hozzá ➕.</div></div></div>' +
      '</div></div>';
    document.body.appendChild(dj);
    var djEl = function (s) { return dj.querySelector(s); };

    /* ---------- hangerő ---------- */
    try { ST.vol = parseInt(localStorage.getItem('kk_music_vol'), 10); if (isNaN(ST.vol)) ST.vol = 60; } catch (e) { ST.vol = 60; }
    try { ST.muted = localStorage.getItem('kk_music_muted') === '1'; } catch (e) {}
    el('.mm-volr').value = ST.vol; el('.mm-mute').textContent = ST.muted ? '🔇' : '🔊';
    function applyVol() {
      var v = ST.muted ? 0 : (ST.vol / 100);
      try { audio.volume = v; } catch (e) {}
      try { if (ST.ytP && ST.ytP.setVolume) ST.ytP.setVolume(ST.muted ? 0 : ST.vol); } catch (e) {}
    }
    el('.mm-volr').oninput = function () { ST.vol = parseInt(this.value, 10) || 0; ST.muted = false; applyVol(); el('.mm-mute').textContent = '🔊'; try { localStorage.setItem('kk_music_vol', ST.vol); } catch (e) {} };
    el('.mm-mute').onclick = function () { ST.muted = !ST.muted; applyVol(); el('.mm-mute').textContent = ST.muted ? '🔇' : '🔊'; try { localStorage.setItem('kk_music_muted', ST.muted ? '1' : '0'); } catch (e) {} };

    /* ---------- transport gombok + overlay ---------- */
    el('.mm-play').onclick = djTogglePlay;
    el('.mm-next').onclick = function () { djNext(true); };
    el('.mm-prev').onclick = djPrev;
    el('.mm-loop').onclick = djToggleLoop;
    el('.mm-prog').onclick = function (e) { if (!ST.isOwner) return; var r = this.getBoundingClientRect(); djSeek(((e.clientX - r.left) / r.width) * getDur()); };
    el('.mm-dj').onclick = function () { dj.hidden = false; renderLib(); renderQueue(); };
    djEl('.mm-close').onclick = function () { dj.hidden = true; };
    dj.onclick = function (e) { if (e.target === dj) dj.hidden = true; };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dj.hidden) dj.hidden = true; });
    djEl('.mm-upload').onclick = function () { djEl('.mm-file').click(); };
    djEl('.mm-file').onchange = function () { uploadTracks(this.files); this.value = ''; };
    djEl('.mm-ytadd').onclick = addYtLink;
    djEl('.mm-clear').onclick = function () { if (confirm('Üríted a lejátszási sort?')) djSetQueue([], true); };

    // progress-sáv frissítés (file + yt egyaránt)
    audio.ontimeupdate = function () { if (activeType() === 'file') updateProg(); };
    audio.onended = function () { if (ST.isOwner && activeType() === 'file') djTrackEnded(); };
    setInterval(function () { if (!barEl.hidden && activeType() === 'yt') updateProg(); }, 500);

    /* ---------- lejátszó-absztrakció ---------- */
    function curTrack() { var s = ST.state; return (s && s.queue && s.queue[s.index]) || null; }
    function activeType() { var t = curTrack(); return t ? (t.type || 'file') : null; }
    function getDur() { var t = curTrack(); if (!t) return 0; if ((t.type || 'file') === 'yt') { try { return (ST.ytP && ST.ytP.getDuration) ? ST.ytP.getDuration() : 0; } catch (e) { return 0; } } return audio.duration || 0; }
    function getTime() { var t = curTrack(); if (!t) return 0; if ((t.type || 'file') === 'yt') { try { return (ST.ytP && ST.ytP.getCurrentTime) ? ST.ytP.getCurrentTime() : 0; } catch (e) { return 0; } } return audio.currentTime || 0; }
    function updateProg() { var d = getDur(); el('.mm-progf').style.width = (d ? Math.min(100, (getTime() / d) * 100) : 0) + '%'; }
    function pauseAll() { try { audio.pause(); } catch (e) {} try { if (ST.ytP && ST.ytP.pauseVideo) ST.ytP.pauseVideo(); } catch (e) {} }

    function applyState() {
      var s = ST.state, t = curTrack();
      if (!t) { pauseAll(); renderBar(); return; }
      var type = t.type || 'file';
      var pos = s.playing ? Math.max(0, (Date.now() - (s.started_at || Date.now())) / 1000) : (s.paused_sec || 0);
      if (type === 'file') {
        try { if (ST.ytP && ST.ytP.pauseVideo) ST.ytP.pauseVideo(); } catch (e) {}
        if (audio.getAttribute('src') !== t.url) { audio.setAttribute('src', t.url); audio.load(); }
        var go = function () {
          if (Math.abs((audio.currentTime || 0) - pos) > 1.6) { try { audio.currentTime = pos; } catch (e) {} }
          if (s.playing) { var pr = audio.play(); if (pr && pr.catch) pr.catch(needArm); } else { try { audio.pause(); } catch (e) {} }
        };
        if (audio.readyState >= 1) go(); else { audio.onloadedmetadata = function () { audio.onloadedmetadata = null; go(); }; }
      } else if (type === 'yt') {
        try { audio.pause(); } catch (e) {}
        loadYT().then(function (YT) {
          if (!ST.ytP) {
            ST.ytP = new YT.Player(ytHost, {
              height: '1', width: '1', videoId: t.videoId,
              playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
              events: {
                onReady: function () { ST.ytLoaded = t.videoId; applyVol(); ytApply(t, s, pos); },
                onStateChange: function (ev) { if (ev.data === 0 && ST.isOwner) djTrackEnded(); }
              }
            });
          } else { ytApply(t, s, pos); }
        });
      }
      renderBar();
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
      var b = el('.mm-play'); b.hidden = false; b.textContent = '🔊 Hang be'; b.classList.add('on');
      b.onclick = function () { ST.armed = true; b.classList.remove('on'); b.textContent = '▶'; b.onclick = djTogglePlay; b.hidden = !ST.isOwner; applyState(); };
    }

    /* ---------- könyvtár (feltöltött fájlok) ---------- */
    function loadLib() {
      sb.from('music_tracks').select('id,title,url,path').eq('owner_id', getUid()).order('created_at', { ascending: false }).then(function (r) {
        ST.tracks = (r && r.data && !r.error) ? r.data : []; renderLib();
      });
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
      var u = prompt('YouTube link vagy videó-ID:\n(Figyelem: a YouTube-számoknál reklám előfordulhat — a fájl-feltöltés 100% reklámmentes.)');
      if (!u) return;
      var vid = parseYT(u); if (!vid) { alert('Nem ismerem fel a YouTube-linket.'); return; }
      var title = prompt('Cím a számhoz:', 'YouTube: ' + vid) || ('YouTube: ' + vid);
      var s = curState(); s.queue = (s.queue || []).concat([{ type: 'yt', videoId: vid, title: title }]); saveState(s); renderQueue(); renderBar();
    }
    function renderLib() {
      var box = djEl('.mm-lib'); if (!box) return;
      if (!ST.tracks.length) { box.innerHTML = '<div class="mm-empty">Tölts fel zenéket (⬆ Feltöltés) vagy adj YT-linket.</div>'; return; }
      box.innerHTML = '';
      ST.tracks.forEach(function (t) {
        var row = document.createElement('div'); row.className = 'mm-row';
        row.innerHTML = '<span class="mm-t" title="Lejátszás most">' + esc(t.title) + '</span><button class="mm-add" title="Sorba">➕</button><button class="mm-del" title="Törlés">🗑</button>';
        row.querySelector('.mm-t').onclick = function () { djAddAndPlay({ type: 'file', url: t.url, title: t.title }); };
        row.querySelector('.mm-add').onclick = function () { djAddToQueue({ type: 'file', url: t.url, title: t.title }); };
        row.querySelector('.mm-del').onclick = function () { delTrack(t); };
        box.appendChild(row);
      });
    }

    /* ---------- állapot + szinkron ---------- */
    function curState() { return ST.state || { queue: [], index: 0, playing: false, started_at: 0, paused_sec: 0, loop: 'off' }; }
    function loadState() {
      return sb.from('room_music').select('state').eq('room_id', ST.roomId).maybeSingle()
        .then(function (r) { ST.state = (r && r.data && r.data.state) ? r.data.state : null; })
        .catch(function () { ST.state = null; });
    }
    function saveState(s) { ST.state = s; sb.from('room_music').upsert({ room_id: ST.roomId, state: s, updated_at: new Date().toISOString() }).then(function () {}); }
    function subscribe() {
      if (ST.chan) { try { sb.removeChannel(ST.chan); } catch (e) {} ST.chan = null; }
      ST.chan = sb.channel('music-' + ST.roomId).on('postgres_changes', { event: '*', schema: 'public', table: 'room_music' }, function (p) {
        var row = p.new; if (!row || row.room_id !== ST.roomId) return;
        ST.state = row.state || null; applyState(); renderBar();
      }).subscribe();
    }

    function renderBar() {
      var s = ST.state, t = (s && s.queue && s.queue[s.index]) ? s.queue[s.index] : null;
      el('.mm-title').innerHTML = t ? ((t.type === 'yt' ? '<span class="mm-badge" title="YouTube — reklám lehet">YT</span> ' : '') + esc(t.title)) : 'Nincs zene';
      if (ST.isOwner) {
        el('.mm-play').textContent = (s && s.playing) ? '⏸' : '▶';
        var loop = (s && s.loop) || 'off';
        el('.mm-loop').textContent = loop === 'one' ? '🔂' : '🔁';
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
      if (!q.length) { box.innerHTML = '<div class="mm-empty">A sor üres — a könyvtárból add hozzá ➕.</div>'; return; }
      box.innerHTML = '';
      q.forEach(function (tr, i) {
        var row = document.createElement('div'); row.className = 'mm-row' + ((s && s.index === i && s.playing) ? ' playing' : '');
        row.innerHTML = '<span class="mm-t" title="Lejátszás innen">' + (s && s.index === i ? '▶ ' : '') + (tr.type === 'yt' ? '<span class="mm-badge">YT</span> ' : '') + esc(tr.title) + '</span>' +
          '<button class="mm-up" title="Fel">▲</button><button class="mm-dn" title="Le">▼</button><button class="mm-del" title="Kivesz">✕</button>';
        row.querySelector('.mm-t').onclick = function () { playAt(curState(), i); };
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
