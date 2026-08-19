/* ===================================================================
   magus_avatar.js — közös profilkép (avatar) rendszer.

   API:
     MagusAvatar.render(mountEl, profile, { size })      // monogram VAGY arc
     MagusAvatar.hydrate(sb, mountEl, idOrProfile, opts)  // avatar betöltése DB-ből (hibatűrő)
     MagusAvatar.openEditor({ sb, userId, mount, current, size, name, onSaved })
     MagusAvatar.DEFAULT                                  // alap-config

   Config (user_profiles.avatar jsonb):
     { eyes:'eye3', nose:'nose1', mouth:'mouth0',
       colors:{ eyes:'#1a1a1a', nose:'#1a1a1a', mouth:'#1a1a1a' },
       bg:'#d8c3a5' }

   A fekete vonalas PNG-ket CSS mask-ként használjuk: az alfa a forma,
   a szín a background-color-ból jön -> rétegenként színezhető.
   Minden 500x500-as, pozícióra igazított, így egymásra rakva összeáll az arc.
   =================================================================== */
(function (global) {
    'use strict';

    var BASE = 'assets/profile/';

    // A választható elemek (a PNG-fájlnevek kiterjesztés nélkül).
    var ITEMS = ['0', '00', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var FEATURES = [
        { key: 'eyes',  label: 'Szem', dir: 'eyes/',   prefix: 'eye',   items: ITEMS.map(function (n) { return 'eye' + n; }) },
        { key: 'nose',  label: 'Orr',  dir: 'noses/',  prefix: 'nose',  items: ITEMS.map(function (n) { return 'nose' + n; }) },
        { key: 'mouth', label: 'Száj', dir: 'mouths/', prefix: 'mouth', items: ITEMS.map(function (n) { return 'mouth' + n; }) }
    ];

    var DEFAULT = {
        eyes: 'eye0', nose: 'nose0', mouth: 'mouth0',
        colors: { eyes: '#1a1a1a', nose: '#1a1a1a', mouth: '#1a1a1a' },
        bg: '#d8c3a5',
        offset: { x: 0, y: 0 }   // az arc finom eltolása (a méret arányában), clamp ±0.22
    };
    var OFFSET_CLAMP = 0.22;

    function featureByKey(k) {
        for (var i = 0; i < FEATURES.length; i++) { if (FEATURES[i].key === k) return FEATURES[i]; }
        return null;
    }
    function assetUrl(featureKey, item) {
        var f = featureByKey(featureKey);
        return BASE + (f ? f.dir : '') + item + '.png';
    }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    /* ---------- monogram (fallback) ---------- */
    var BG_PALETTE = ['#7c3aed', '#2563eb', '#0891b2', '#059669',
                      '#d97706', '#dc2626', '#db2777', '#4f46e5'];
    function hashString(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
        return Math.abs(h);
    }
    function initials(name) {
        if (!name) return '?';
        var parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function styleMount(el, size) {
        var s = el.style;
        s.position = 'relative';
        s.width = size + 'px';
        s.height = size + 'px';
        s.borderRadius = '50%';
        s.display = 'inline-flex';
        s.alignItems = 'center';
        s.justifyContent = 'center';
        s.flexShrink = '0';
        s.overflow = 'hidden';
        s.userSelect = 'none';
        s.fontFamily = "'Cinzel', serif";
        s.fontWeight = '600';
        s.lineHeight = '1';
        s.color = '#fff';
        s.fontSize = Math.round(size * 0.42) + 'px';
        s.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.14)';
        s.verticalAlign = 'middle';
    }

    // Egy réteg (maszkolt PNG adott színnel) a mountba.
    function addLayer(mount, featureKey, item, color) {
        if (!item) return;
        var url = assetUrl(featureKey, item);
        var d = document.createElement('div');
        var s = d.style;
        s.position = 'absolute'; s.top = '0'; s.left = '0'; s.right = '0'; s.bottom = '0';
        s.webkitMaskImage = 'url("' + url + '")'; s.maskImage = 'url("' + url + '")';
        s.webkitMaskSize = 'contain'; s.maskSize = 'contain';
        s.webkitMaskRepeat = 'no-repeat'; s.maskRepeat = 'no-repeat';
        s.webkitMaskPosition = 'center'; s.maskPosition = 'center';
        s.backgroundColor = color || '#1a1a1a';
        mount.appendChild(d);
    }

    // Kész arc rajzolása a configból.
    function renderFace(mount, cfg, size) {
        if (!mount || !cfg) return false;
        styleMount(mount, size || 30);
        mount.textContent = '';
        mount.style.background = cfg.bg || DEFAULT.bg;
        var colors = cfg.colors || {};
        var off = cfg.offset || { x: 0, y: 0 };
        // Az összes réteg egy belső dobozban, hogy egyben eltolható legyen.
        var inner = document.createElement('div');
        inner.style.position = 'absolute';
        inner.style.top = '0'; inner.style.left = '0'; inner.style.right = '0'; inner.style.bottom = '0';
        inner.style.transform = 'translate(' + ((off.x || 0) * 100) + '%,' + ((off.y || 0) * 100) + '%)';
        FEATURES.forEach(function (f) {
            addLayer(inner, f.key, cfg[f.key], colors[f.key]);
        });
        mount.appendChild(inner);
        mount._mgAvatar = cfg;
        return true;
    }

    // Monogram VAGY arc (ha a profilban van avatar-config).
    function render(mount, profile, opts) {
        if (!mount) return;
        opts = opts || {};
        var size = opts.size || 30;
        profile = profile || {};

        if (profile.avatar) { renderFace(mount, profile.avatar, size); mount.title = profile.display_name || ''; return; }

        styleMount(mount, size);
        mount.innerHTML = '';
        mount.title = profile.display_name || '';
        mount._mgAvatar = null;
        var name = profile.display_name || '';
        mount.style.background = BG_PALETTE[hashString(name || '?') % BG_PALETTE.length];
        mount.textContent = initials(name);
    }

    // Avatar betöltése DB-ből és kirajzolása. Hibatűrő: ha nincs `avatar`
    // oszlop vagy nincs config, a monogram marad. Visszaadja a configot vagy null.
    function hydrate(sb, mount, idOrProfile, opts) {
        opts = opts || {};
        var id = (typeof idOrProfile === 'string') ? idOrProfile : (idOrProfile && idOrProfile.id);
        if (!sb || !id || !mount) return Promise.resolve(null);
        return sb.from('user_profiles').select('avatar').eq('id', id).single()
            .then(function (res) {
                var cfg = res && res.data && res.data.avatar;
                if (cfg) { renderFace(mount, cfg, opts.size || 30); return cfg; }
                return null;
            })
            .catch(function () { return null; });
    }

    // Teljes bekötés egy sorban: monogram -> uid a session-ből -> hydrate ->
    // kattintható (editor). Bármely oldalon működik, csak az `sb` kliens kell.
    // Visszaadja a betöltött configot (vagy null, ha nincs avatar).
    function attach(sb, mount, profile, opts) {
        opts = opts || {};
        var size = opts.size || 30;
        render(mount, profile, { size: size });
        if (!sb || !mount) return Promise.resolve(null);
        var getUid = opts.userId
            ? Promise.resolve(opts.userId)
            : Promise.resolve(sb.auth.getSession())
                .then(function (r) { return r && r.data && r.data.session && r.data.session.user && r.data.session.user.id; })
                .catch(function () { return null; });
        return getUid.then(function (uid) {
            if (!uid) return null;
            mount.style.cursor = 'pointer';
            var editable = opts.editable !== false;   // alapból szerkeszthető (index); máshol csak-nézet
            if (!mount.title) mount.title = editable ? 'Profilkép szerkesztése' : 'Profilkép megtekintése';
            mount.onclick = function () {
                if (editable) {
                    openEditor({
                        sb: sb, userId: uid, mount: mount, current: mount._mgAvatar,
                        size: size, name: profile && profile.display_name, onSaved: opts.onSaved
                    });
                } else {
                    showLarge({ display_name: profile && profile.display_name, avatar: mount._mgAvatar });
                }
            };
            return hydrate(sb, mount, uid, { size: size });
        });
    }

    // Saját avatar mentése: előbb a biztonságos rpc (set_my_avatar), ami CSAK
    // az avatar oszlopot írja a saját sorban. Ha a függvény még nincs kint
    // (régi DB), visszaesik a közvetlen update-re (admin útja most se törik).
    function saveMyAvatar(sb, userId, avatar) {
        return Promise.resolve(sb.rpc('set_my_avatar', { new_avatar: avatar }))
            .then(function (res) {
                if (res && res.error) {
                    return Promise.resolve(sb.from('user_profiles').update({ avatar: avatar }).eq('id', userId))
                        .then(function (r2) { if (r2 && r2.error) throw r2.error; });
                }
            });
    }

    // Nagy, CSAK-NÉZET profilkép modal (nem szerkesztő). Az index-en kívül a
    // fejléc-avatarra kattintva ez nyílik meg.
    function showLarge(profile, opts) {
        opts = opts || {};
        var overlay = document.createElement('div');
        overlay.className = 'mg-large-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(3px);padding:1rem;';
        var card = document.createElement('div');
        card.style.cssText = 'background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:1.8rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);';
        var avEl = document.createElement('span');
        avEl.style.display = 'inline-flex';
        card.appendChild(avEl);
        if (profile && profile.display_name) {
            var nm = document.createElement('div');
            nm.style.cssText = "font-family:'Cinzel',serif;color:#d4af37;font-size:1.15rem;letter-spacing:.04em;margin-top:.8rem;";
            nm.textContent = profile.display_name;
            card.appendChild(nm);
        }
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        render(avEl, profile || {}, { size: opts.size || 160 });
        overlay.addEventListener('click', function () { overlay.remove(); });
    }

    /* ============================ EDITOR ============================ */
    function ensureStyles() {
        if (document.getElementById('mg-ed-styles')) return;
        var css = ''
        + '.mg-ed-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;'
        + 'background:rgba(2,6,23,.72);backdrop-filter:blur(3px);padding:1rem;}'
        + '.mg-ed-panel{background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:16px;'
        + 'width:min(440px,96vw);max-height:92vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.5);'
        + 'font-family:Inter,system-ui,sans-serif;color:#e2e8f0;}'
        + '.mg-ed-head{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.1rem;'
        + "border-bottom:1px solid rgba(255,255,255,.08);font-family:'Cinzel',serif;color:#d4af37;letter-spacing:.04em;}"
        + '.mg-ed-x{background:none;border:none;color:#94a3b8;font-size:1.1rem;cursor:pointer;line-height:1;}'
        + '.mg-ed-x:hover{color:#fff;}'
        + '.mg-ed-preview{display:flex;justify-content:center;padding:1.1rem 0 .6rem;}'
        + '.mg-ed-prev-circle{width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 3px rgba(212,175,55,.35),0 8px 24px rgba(0,0,0,.4);cursor:grab;touch-action:none;}'
        + '.mg-ed-prev-circle:active{cursor:grabbing;}'
        + '.mg-ed-hint{text-align:center;font-size:.7rem;color:#64748b;margin:-.2rem 0 .4rem;}'
        + '.mg-ed-col-all{grid-column:1 / -1;}'
        + '.mg-ed-body{padding:.2rem 1.1rem;}'
        + '.mg-ed-sec{margin:.7rem 0;}'
        + '.mg-ed-sec-label{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin-bottom:.35rem;}'
        + '.mg-ed-thumbs{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.3rem;scrollbar-width:thin;}'
        + '.mg-ed-thumb{flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:2px solid transparent;'
        + 'background:none;padding:0;cursor:pointer;position:relative;overflow:hidden;transition:border-color .15s;}'
        + '.mg-ed-thumb:hover{border-color:rgba(212,175,55,.4);}'
        + '.mg-ed-thumb.sel{border-color:#d4af37;}'
        + '.mg-ed-colors{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:.6rem 1.1rem;}'
        + '.mg-ed-colors label{display:flex;align-items:center;justify-content:space-between;gap:.5rem;'
        + 'font-size:.82rem;color:#cbd5e1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);'
        + 'border-radius:.5rem;padding:.35rem .55rem;}'
        + '.mg-ed-colors input[type=color]{width:34px;height:26px;border:none;border-radius:.35rem;background:none;cursor:pointer;padding:0;}'
        + '.mg-ed-foot{display:flex;align-items:center;gap:.5rem;padding:.9rem 1.1rem 1.1rem;border-top:1px solid rgba(255,255,255,.08);}'
        + '.mg-ed-btn{border:1px solid transparent;border-radius:.5rem;padding:.5rem .95rem;font-size:.85rem;font-weight:600;cursor:pointer;}'
        + '.mg-ed-btn.gold{background:#d4af37;color:#1a1200;}'
        + '.mg-ed-btn.gold:hover{background:#e6c04a;}'
        + '.mg-ed-btn.ghost{background:transparent;border-color:rgba(255,255,255,.15);color:#cbd5e1;}'
        + '.mg-ed-btn.ghost:hover{background:rgba(255,255,255,.06);}'
        + '.mg-ed-btn.danger{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);color:#f87171;}'
        + '.mg-ed-btn.danger:hover{background:rgba(248,113,113,.2);}';
        var st = document.createElement('style');
        st.id = 'mg-ed-styles';
        st.textContent = css;
        document.head.appendChild(st);
    }

    // Egy kis kör kirajzolása egyetlen elemmel (thumbhoz): bg + egy maszkolt réteg.
    function paintThumb(el, cfg, featureKey, item) {
        el.style.background = cfg.bg || DEFAULT.bg;
        el.innerHTML = '';
        var color = (cfg.colors && cfg.colors[featureKey]) || '#1a1a1a';
        addLayer(el, featureKey, item, color);
    }

    function openEditor(opts) {
        opts = opts || {};
        var sb = opts.sb, userId = opts.userId, mount = opts.mount;
        var size = opts.size || 30;
        var cfg = clone(opts.current && opts.current.eyes ? opts.current : DEFAULT);
        if (!cfg.colors) cfg.colors = clone(DEFAULT.colors);
        if (!cfg.offset) cfg.offset = { x: 0, y: 0 };

        ensureStyles();
        var overlay = document.createElement('div');
        overlay.className = 'mg-ed-overlay';
        overlay.innerHTML =
            '<div class="mg-ed-panel" role="dialog" aria-label="Profilkép szerkesztő">'
          +   '<div class="mg-ed-head"><span>Profilkép szerkesztő</span><button class="mg-ed-x" data-act="cancel" title="Bezárás">✕</button></div>'
          +   '<div class="mg-ed-preview"><div class="mg-ed-prev-circle" id="mgEdPrev"></div></div>'
          +   '<div class="mg-ed-hint">Húzd az arcot a finomításhoz</div>'
          +   '<div class="mg-ed-body" id="mgEdBody"></div>'
          +   '<div class="mg-ed-colors">'
          +     '<label class="mg-ed-col-all">Mind (vonal) <input type="color" data-color="all"></label>'
          +     '<label>Háttér <input type="color" data-color="bg"></label>'
          +     '<label>Szem <input type="color" data-color="eyes"></label>'
          +     '<label>Orr <input type="color" data-color="nose"></label>'
          +     '<label>Száj <input type="color" data-color="mouth"></label>'
          +   '</div>'
          +   '<div class="mg-ed-foot">'
          +     '<button class="mg-ed-btn danger" data-act="delete">Törlés</button>'
          +     '<span style="flex:1"></span>'
          +     '<button class="mg-ed-btn ghost" data-act="cancel">Mégse</button>'
          +     '<button class="mg-ed-btn gold" data-act="save">Kész</button>'
          +   '</div>'
          + '</div>';
        document.body.appendChild(overlay);

        var prev = overlay.querySelector('#mgEdPrev');
        var body = overlay.querySelector('#mgEdBody');

        function updatePreview() { renderFace(prev, cfg, 150); }

        // Feature-szekciók + thumbök felépítése.
        FEATURES.forEach(function (f) {
            var sec = document.createElement('div');
            sec.className = 'mg-ed-sec';
            sec.innerHTML = '<div class="mg-ed-sec-label">' + f.label + '</div>';
            var row = document.createElement('div');
            row.className = 'mg-ed-thumbs';
            f.items.forEach(function (item) {
                var t = document.createElement('button');
                t.type = 'button';
                t.className = 'mg-ed-thumb' + (cfg[f.key] === item ? ' sel' : '');
                t.dataset.item = item;
                paintThumb(t, cfg, f.key, item);
                t.addEventListener('click', function () {
                    cfg[f.key] = item;
                    row.querySelectorAll('.mg-ed-thumb').forEach(function (x) { x.classList.remove('sel'); });
                    t.classList.add('sel');
                    updatePreview();
                });
                row.appendChild(t);
            });
            sec.appendChild(row);
            body.appendChild(sec);
            f._row = row;
        });

        // Színválasztók init + kezelés (bg / all / szem / orr / száj).
        var colorInputs = {};
        overlay.querySelectorAll('input[type=color]').forEach(function (inp) { colorInputs[inp.dataset.color] = inp; });
        function repaintFeatureThumbs(featKey) {
            FEATURES.forEach(function (f) {
                if (f.key !== featKey || !f._row) return;
                f._row.querySelectorAll('.mg-ed-thumb').forEach(function (t) { paintThumb(t, cfg, f.key, t.dataset.item); });
            });
        }
        Object.keys(colorInputs).forEach(function (key) {
            var inp = colorInputs[key];
            inp.value = (key === 'bg') ? (cfg.bg || DEFAULT.bg)
                      : (key === 'all') ? ((cfg.colors && cfg.colors.eyes) || '#1a1a1a')
                      : ((cfg.colors && cfg.colors[key]) || '#1a1a1a');
            inp.addEventListener('input', function () {
                if (key === 'bg') { cfg.bg = inp.value; updatePreview(); return; }
                if (key === 'all') {
                    ['eyes', 'nose', 'mouth'].forEach(function (k) {
                        cfg.colors[k] = inp.value;
                        if (colorInputs[k]) colorInputs[k].value = inp.value;
                        repaintFeatureThumbs(k);
                    });
                    updatePreview(); return;
                }
                cfg.colors[key] = inp.value;
                if (colorInputs.all) colorInputs.all.value = inp.value;
                repaintFeatureThumbs(key);
                updatePreview();
            });
        });

        updatePreview();

        // Az arc finom eltolása húzással (clamp-elve, hogy ki ne csússzon).
        prev.style.cursor = 'grab'; prev.style.touchAction = 'none';
        var dragging = false, startX = 0, startY = 0, startOff = { x: 0, y: 0 };
        prev.addEventListener('pointerdown', function (e) {
            dragging = true; startX = e.clientX; startY = e.clientY;
            startOff = { x: (cfg.offset && cfg.offset.x) || 0, y: (cfg.offset && cfg.offset.y) || 0 };
            try { prev.setPointerCapture(e.pointerId); } catch (err) {}
        });
        prev.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var rect = prev.getBoundingClientRect();
            var nx = startOff.x + (e.clientX - startX) / rect.width;
            var ny = startOff.y + (e.clientY - startY) / rect.height;
            cfg.offset = {
                x: Math.max(-OFFSET_CLAMP, Math.min(OFFSET_CLAMP, nx)),
                y: Math.max(-OFFSET_CLAMP, Math.min(OFFSET_CLAMP, ny))
            };
            updatePreview();
        });
        function endDrag() { dragging = false; }
        prev.addEventListener('pointerup', endDrag);
        prev.addEventListener('pointercancel', endDrag);

        function close() { overlay.remove(); }

        overlay.addEventListener('click', function (e) {
            var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
            if (e.target === overlay) { close(); return; }
            if (!act) return;
            if (act === 'cancel') { close(); return; }
            if (act === 'save') { doSave(); return; }
            if (act === 'delete') { doDelete(); return; }
        });

        function doSave() {
            var btn = overlay.querySelector('[data-act=save]');
            btn.disabled = true; btn.textContent = 'Mentés…';
            saveMyAvatar(sb, userId, cfg)
                .then(function () {
                    if (mount) renderFace(mount, cfg, size);
                    if (opts.onSaved) opts.onSaved(cfg);
                    close();
                })
                .catch(function (e) {
                    btn.disabled = false; btn.textContent = 'Kész';
                    alert('Mentés sikertelen. Lehet, hogy még nem futott le az avatar SQL a Supabase-en.\n\n' + (e && e.message ? e.message : e));
                });
        }

        function doDelete() {
            saveMyAvatar(sb, userId, null)
                .catch(function () {})
                .then(function () {
                    if (mount) render(mount, { display_name: opts.name || '' }, { size: size });
                    if (opts.onSaved) opts.onSaved(null);
                    close();
                });
        }
    }

    global.MagusAvatar = {
        render: render,
        renderFace: renderFace,
        hydrate: hydrate,
        attach: attach,
        showLarge: showLarge,
        openEditor: openEditor,
        initials: initials,
        DEFAULT: DEFAULT,
        FEATURES: FEATURES
    };
})(window);
