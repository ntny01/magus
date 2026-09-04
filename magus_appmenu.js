/* =====================================================================
   magus_appmenu.js — közös "app-menü" vezérlő telefonra/tabletre
   Használat:
     MagusAppMenu.mount({
       menu:   '.toolbar' | Element,     // a tool-konténer (ez lesz a panel)
       header: 'header'   | Element,     // ide kerül a ☰ gomb (alap: menu szülője)
       user:   '.header-user' | Element, // opc.: avatar+Kilépés, a menü tetejére kerül mobilon
       accent: '#d4af37',                // opc.: ☰ szín
       autoClose: true                   // művelet-választáskor záruljon (alap: true)
     });
   A legördülő-NYITÓ gombokra tegyél `data-am-keepopen` attribútumot, hogy azok
   NE zárják a menüt (accordion). A .app-menu.css adja a megjelenést.
   Csak ≤767px-en aktív ténylegesen (a CSS ott alakítja panellé).
   ===================================================================== */
(function () {
  function el(x, ctx) { return typeof x === 'string' ? (ctx || document).querySelector(x) : x; }
  var mq = window.matchMedia('(max-width:767px)');

  window.MagusAppMenu = {
    mount: function (opts) {
      opts = opts || {};
      var menu = el(opts.menu);
      if (!menu) return null;
      var header = opts.header ? el(opts.header) : menu.parentElement;
      var user = opts.user ? el(opts.user) : null;
      var autoClose = opts.autoClose !== false;

      menu.classList.add('app-menu');
      if (opts.accent) menu.style.setProperty('--am-accent', opts.accent);

      // ☰ gomb
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'app-menu-toggle';
      toggle.setAttribute('aria-label', 'Menü');
      toggle.title = 'Menü';
      toggle.textContent = '☰';
      if (opts.accent) toggle.style.setProperty('--am-accent', opts.accent);
      (header || document.body).appendChild(toggle);

      // háttér (zárásra)
      var backdrop = document.createElement('div');
      backdrop.className = 'app-menu-backdrop';
      document.body.appendChild(backdrop);

      function isOpen() { return menu.classList.contains('open'); }
      function setOpen(open) {
        menu.classList.toggle('open', open);
        backdrop.classList.toggle('open', open);
      }

      toggle.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!isOpen()); });
      backdrop.addEventListener('click', function () { setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

      // Művelet-választáskor záruljon (a data-am-keepopen gombok NEM).
      if (autoClose) {
        menu.addEventListener('click', function (e) {
          if (!isOpen()) return;
          if (e.target.closest('[data-am-keepopen]')) return;   // legördülő-nyitó → maradjon nyitva
          if (e.target.closest('button, a, [role="menuitem"], .dd-item, .export-item, option')) {
            setTimeout(function () { setOpen(false); }, 80);
          }
        });
      }

      // A user-sor mobilon a menübe, desktopon vissza a fejlécbe.
      function syncUser() {
        if (!user) return;
        if (mq.matches) {
          if (user.parentElement !== menu) menu.insertBefore(user, menu.firstChild);
          user.classList.add('app-menu-user');
        } else {
          if (header && user.parentElement !== header) header.appendChild(user);
          user.classList.remove('app-menu-user');
        }
      }
      syncUser();
      if (mq.addEventListener) mq.addEventListener('change', syncUser);
      else window.addEventListener('resize', syncUser);

      return {
        el: menu,
        open: function () { setOpen(true); },
        close: function () { setOpen(false); },
        toggle: function () { setOpen(!isOpen()); }
      };
    }
  };
})();
