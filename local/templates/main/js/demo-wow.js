/* ============================================================
   DEMO WOW
   Затемнение с «фонариком» на clip-path + логотип по центру,
   снимается автоматически через 5 секунд
   ============================================================ */
(function () {
	'use strict';

	/* путь относительный: сборка может лежать не в корне домена */
	var LOGO = 'local/templates/main/images/header/mark-intro.svg';
	var HOLD_MS = 5000;

	var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
	var REDUCED = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;

	/* Состояние интро для смежных скриптов: pending → running → done
	   (или skipped, если системная настройка просит меньше движения). */
	window.__demoIntro = REDUCED ? 'skipped' : 'pending';

	var lerp = function (a, b, t) { return a + (b - a) * t; };
	var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

	/* =========================================================
	   ФОНАРИК НА CLIP-PATH
	   ========================================================= */
	function runSpotlight(done) {
		window.__demoIntro = 'running';
		var supportsPath = window.CSS && CSS.supports &&
			CSS.supports('clip-path', 'path("M0 0 H1 V1 H0 Z")');

		var root = document.createElement('div');
		root.className = 'demo-wow-spot';
		root.setAttribute('aria-hidden', 'true');
		root.innerHTML =
			'<div class="demo-wow-spot__veil"></div>' +
			'<div class="demo-wow-spot__glow"></div>' +
			'<div class="demo-wow-spot__brand">' +
				'<div class="demo-wow-spot__brand-in">' +
					'<img class="demo-wow-spot__logo" src="' + LOGO + '" alt="DEMO">' +
					'<p class="demo-wow-spot__hint">Ведите мышью</p>' +
				'</div>' +
			'</div>';

		var veil = root.querySelector('.demo-wow-spot__veil');
		var hint = root.querySelector('.demo-wow-spot__hint');
		var brand = root.querySelector('.demo-wow-spot__brand');
		var brandIn = root.querySelector('.demo-wow-spot__brand-in');

		document.documentElement.classList.add('demo-wow-lock');
		window.scrollTo(0, 0);
		document.body.appendChild(root);

		var vw = window.innerWidth, vh = window.innerHeight;
		var baseR = clamp(Math.min(vw, vh) * 0.22, 150, 260);
		var maxR = Math.sqrt(vw * vw + vh * vh) * 0.62;

		var tx = vw / 2, ty = vh / 2;      // цель (курсор)
		var cx = vw / 2, cy = vh / 2;      // текущая позиция «луча»
		var r = 0, rTarget = baseR;
		var phase = 'in';
		var raf = 0, moved = false, finished = false;

		function onResize() {
			vw = window.innerWidth; vh = window.innerHeight;
			baseR = clamp(Math.min(vw, vh) * 0.22, 150, 260);
			maxR = Math.sqrt(vw * vw + vh * vh) * 0.62;
			if (phase !== 'out') rTarget = baseR;
		}

		function onMove(e) {
			var t = e.touches ? e.touches[0] : e;
			if (!t) return;
			tx = t.clientX; ty = t.clientY;
			if (!moved) { moved = true; hint.classList.add('is-gone'); }
		}

		/* Дыра в затемнении: внешний прямоугольник + окружность,
		   fill-rule evenodd превращает окружность в сквозное отверстие. */
		function applyHole() {
			if (supportsPath) {
				var x0 = (cx - r).toFixed(1), y0 = cy.toFixed(1), rr = r.toFixed(1), d = (r * 2).toFixed(1);
				veil.style.clipPath =
					'path(evenodd, "M0 0 H' + vw + ' V' + vh + ' H0 Z ' +
					'M' + x0 + ' ' + y0 +
					' a' + rr + ' ' + rr + ' 0 1 0 ' + d + ' 0' +
					' a' + rr + ' ' + rr + ' 0 1 0 -' + d + ' 0 Z")';
			} else {
				/* запасной вариант для старых браузеров */
				var g = 'radial-gradient(circle ' + r.toFixed(1) + 'px at ' +
					cx.toFixed(1) + 'px ' + cy.toFixed(1) + 'px, ' +
					'transparent 0, transparent 96%, #000 100%)';
				veil.style.webkitMaskImage = g;
				veil.style.maskImage = g;
			}
			root.style.setProperty('--wow-x', cx.toFixed(1) + 'px');
			root.style.setProperty('--wow-y', cy.toFixed(1) + 'px');
			root.style.setProperty('--wow-r', r.toFixed(1) + 'px');
		}

		function finish() {
			if (finished) return;
			finished = true;
			phase = 'out';
			rTarget = maxR;
			veil.style.opacity = '0';
			brand.style.opacity = '0';
			brandIn.style.transform = 'scale(1.06)';
			root.querySelector('.demo-wow-spot__glow').style.opacity = '0';
			document.documentElement.classList.remove('demo-wow-lock');
			window.__demoIntro = 'done';
			window.dispatchEvent(new CustomEvent('demo:intro-done'));

			setTimeout(function () {
				if (raf) cancelAnimationFrame(raf);
				window.removeEventListener('mousemove', onMove);
				window.removeEventListener('touchmove', onMove);
				window.removeEventListener('resize', onResize);
				document.removeEventListener('keydown', onKey);
				root.removeEventListener('click', finish);
				if (root.parentNode) root.parentNode.removeChild(root);
				if (typeof done === 'function') done();
			}, 620);
		}

		function onKey(e) { if (e.key === 'Escape') finish(); }

		function frame() {
			cx = lerp(cx, tx, 0.16);
			cy = lerp(cy, ty, 0.16);
			r = lerp(r, rTarget, phase === 'out' ? 0.14 : 0.1);
			if (phase === 'in' && Math.abs(r - baseR) < 2) phase = 'live';
			applyHole();
			raf = requestAnimationFrame(frame);
		}

		window.addEventListener('mousemove', onMove, { passive: true });
		window.addEventListener('touchmove', onMove, { passive: true });
		window.addEventListener('resize', onResize);
		document.addEventListener('keydown', onKey);
		root.style.pointerEvents = 'auto';
		root.addEventListener('click', finish);

		applyHole();
		raf = requestAnimationFrame(frame);
		setTimeout(finish, HOLD_MS);
	}

	/* =========================================================
	   Кнопка повтора — чтобы показывать эффект заказчику
	   ========================================================= */
	/* Отладочная кнопка повтора заставки в публичной сборке не нужна. */


	/* =========================================================
	   Старт
	   ========================================================= */
	function boot() {
		if (REDUCED) return;               // при «меньше движения» интро не показываем
		runSpotlight();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
