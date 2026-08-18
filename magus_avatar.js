/* ===================================================================
   magus_avatar.js — közös profilkép (avatar) renderelő.

   Használat:
     MagusAvatar.render(mountEl, profile, { size: 30 })

   `profile`  : { display_name, avatar? }  — az avatar a jövőbeli
                editor által mentett config (szem/orr/száj + színek + bg).
   Jelenleg   : ha nincs avatar-config, MONOGRAM-placeholder-t rajzol
                (névből determinisztikus háttérszín + kezdőbetűk).
   Később     : ha profile.avatar létezik, réteges SVG-arcot rajzol —
                lásd a renderFace() TODO-t.

   Minden stílust inline állít, így nem kell per-oldal CSS.
   =================================================================== */
(function (global) {
    'use strict';

    // Monogram-hátterek (determinisztikus a névből, hogy konzisztens legyen).
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

    // A mount elem alap-stílusai (kör alakú badge, középre igazított tartalom).
    function styleMount(el, size) {
        var s = el.style;
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

    // TODO (editor kész után): profile.avatar config -> réteges SVG arc.
    // A fekete vonalas rajzok recolor-ja: SVG fill/stroke felülírás, vagy
    // CSS mask + background-color. A bg a kör háttérszíne lesz.
    function renderFace(mount, avatar, size) {
        // Egyelőre nincs implementálva — a hívó a monogramra esik vissza.
        return false;
    }

    function render(mount, profile, opts) {
        if (!mount) return;
        opts = opts || {};
        var size = opts.size || 30;
        profile = profile || {};

        styleMount(mount, size);
        mount.innerHTML = '';
        mount.title = profile.display_name || '';

        // Ha lesz mentett avatar-config, azt rajzoljuk; különben monogram.
        if (profile.avatar && renderFace(mount, profile.avatar, size)) return;

        var name = profile.display_name || '';
        mount.style.background = BG_PALETTE[hashString(name || '?') % BG_PALETTE.length];
        mount.textContent = initials(name);
    }

    global.MagusAvatar = { render: render, initials: initials };
})(window);
