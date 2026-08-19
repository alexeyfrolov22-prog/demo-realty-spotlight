/* ============================================================
   DEMO FX
   1) появление блоков при скролле   4) параллакс фото и слоёв
   2) счётчики цифр                  5) раскрытие заголовка по строкам
   3) магнитные кнопки               6) кастомный курсор
   ============================================================ */
(function () {
	'use strict';

	var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
	var REDUCED = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;
	var COARSE = mq ? mq('(pointer: coarse)').matches : false;

	var EASE = 'cubic-bezier(.16,.84,.32,1)';
	var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

	/* Ждём, пока доиграет интро с «фонариком».
	   Опираемся на явный флаг, а не на наличие оверлея в DOM: так порядок
	   задаётся порядком тегов <script>, а не случайным таймингом. */
	function afterIntro(fn) {
		var state = window.__demoIntro;
		if (state === 'pending' || state === 'running') {
			window.addEventListener('demo:intro-done', fn, { once: true });
			return;
		}
		fn();
	}

	/* =========================================================
	   1. ПОЯВЛЕНИЕ БЛОКОВ ПРИ СКРОЛЛЕ
	   ========================================================= */
	function initReveal() {
		var SELECTORS = [
			'.home-page__section-title',
			'.home-page__adv-card',
			'a.home-page__portfolio-card',
			'.home-page__about-text',
			'.unified-request-form__field'
		];

		var els = [];
		SELECTORS.forEach(function (s) {
			[].push.apply(els, [].slice.call(document.querySelectorAll(s)));
		});
		/* герой анимируется отдельной секвенцией — исключаем */
		els = els.filter(function (el, i) {
			return els.indexOf(el) === i && !el.closest('.home-page__hero');
		});
		if (!els.length || !('IntersectionObserver' in window)) return;

		/* задержка по порядку внутри одного родителя — эффект «волны» */
		var order = new Map();
		els.forEach(function (el) {
			var p = el.parentNode;
			var n = order.get(p) || 0;
			order.set(p, n + 1);
			el._fxDelay = Math.min(n * 90, 360);
			el.style.opacity = '0';
		});

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) return;
				var el = en.target;
				io.unobserve(el);
				var anim = el.animate(
					[{ opacity: 0, transform: 'translateY(26px)' },
					 { opacity: 1, transform: 'none' }],
					{ duration: 780, delay: el._fxDelay, easing: EASE, fill: 'both' }
				);
				anim.addEventListener('finish', function () {
					/* сначала отпускаем инлайн-стиль, затем снимаем анимацию:
					   иначе её fill продолжал бы удерживать transform и мешал магниту */
					el.style.opacity = '';
					anim.cancel();
				});
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

		els.forEach(function (el) { io.observe(el); });
	}

	/* =========================================================
	   2. СЧЁТЧИКИ ЦИФР
	   ========================================================= */
	function runCounters() {
		var nodes = [].slice.call(document.querySelectorAll('.home-page__stat-number'));
		if (!nodes.length) return;

		nodes.forEach(function (el, i) {
			var raw = (el.textContent || '').trim();
			var m = raw.match(/^(\D*)(\d[\d\s]*)(.*)$/);
			if (!m) return;

			var pre = m[1], suf = m[3];
			var target = parseInt(m[2].replace(/\s/g, ''), 10);
			if (!isFinite(target)) return;

			/* фиксируем ширину по финальному значению, чтобы карточку не «дёргало» */
			el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
			el.style.display = el.style.display || 'inline-block';

			var dur = 1400, t0 = null;
			setTimeout(function () {
				requestAnimationFrame(function step(ts) {
					if (t0 === null) t0 = ts;
					var p = clamp((ts - t0) / dur, 0, 1);
					var eased = 1 - Math.pow(1 - p, 3);            // easeOutCubic
					el.textContent = pre + Math.round(target * eased) + suf;
					if (p < 1) requestAnimationFrame(step);
					else el.textContent = raw;
				});
			}, i * 130);
		});
	}

	/* =========================================================
	   3. МАГНИТНЫЕ КНОПКИ
	   Берём все содержательные кнопки и CTA. Намеренно НЕ трогаем
	   точки слайдеров, чипы и пункты выпадающих списков: их много,
	   они мелкие, и «уползающий» пункт списка мешает попасть.
	   ========================================================= */
	function initMagnetic() {
		if (COARSE) return;

		var SEL = [
			'.site-header__cta', '.site-header__burger', '.site-header__close',
			'.header-menu__portfolio-wide-cta',
			'.home-page__button', '.home-page__history-nav-btn',
			'.site-footer__cta', '.scroll-to-top',
			'.cookie-banner__accept', '.cookie-banner__close',
			'.show-request-modal__submit', '.show-request-modal__close',
			'.show-request-result-modal__btn', '.show-request-result-modal__close',
			'.demo-wow-replay'
		].join(',');

		var PULL_X = 0.26, PULL_Y = 0.4, MAX = 18;   /* ход ограничен, иначе кнопку «уносит» */

		[].slice.call(document.querySelectorAll(SEL)).forEach(function (el) {
			if (el._fxMag) return;
			el._fxMag = true;

			var cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;

			function tick() {
				cx += (tx - cx) * 0.18;
				cy += (ty - cy) * 0.18;
				if (Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1) { cx = tx; cy = ty; }
				/* пишем инлайн-transform: собственные transition кнопки не трогаем */
				el.style.transform = (cx || cy)
					? 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)'
					: '';
				raf = (cx !== tx || cy !== ty) ? requestAnimationFrame(tick) : 0;
			}

			el.addEventListener('mousemove', function (e) {
				var b = el.getBoundingClientRect();
				tx = clamp((e.clientX - (b.left + b.width / 2)) * PULL_X, -MAX, MAX);
				ty = clamp((e.clientY - (b.top + b.height / 2)) * PULL_Y, -MAX, MAX);
				if (!raf) raf = requestAnimationFrame(tick);
			});

			el.addEventListener('mouseleave', function () {
				tx = 0; ty = 0;
				if (!raf) raf = requestAnimationFrame(tick);
			});
		});
	}

	/* =========================================================
	   4. ПАРАЛЛАКС
	   ========================================================= */

	/* 4a. фоновое фото героя — уезжает медленнее контента */
	function initHeroParallax() {
		var hero = document.querySelector('.home-page__hero');
		var bg = hero && hero.querySelector('.home-page__hero-bg');
		if (!bg) return;

		/* Запас на увеличении должен покрывать максимальный сдвиг:
		   сдвиг = высота * FACTOR, запас с одной стороны = высота * (SCALE-1)/2. */
		var SCALE = 1.2, FACTOR = 0.09;

		bg.style.willChange = 'transform';
		var raf = 0;

		function apply() {
			var h = hero.getBoundingClientRect().height || 1;
			var shift = clamp(window.pageYOffset, 0, h) * FACTOR;
			bg.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0) scale(' + SCALE + ')';
			raf = 0;
		}

		window.addEventListener('scroll', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		}, { passive: true });

		apply();
	}

	/* 4b. отдельные слои: дом в «О компании» и фоновые здания в форме.
	       Сдвиг считаем от того, насколько центр элемента ушёл от центра экрана. */
	function initLayerParallax() {
		var LAYERS = [
			{ sel: '.home-page__about-buildings', amp: -46 },
			{ sel: '.home-page__cta-bg--left',    amp: -34 },
			{ sel: '.home-page__cta-bg--right',   amp:  34 }
		];

		var items = [];
		LAYERS.forEach(function (l) {
			[].slice.call(document.querySelectorAll(l.sel)).forEach(function (el) {
				/* если у слоя уже есть свой transform из вёрстки — сохраняем его как базу */
				var base = getComputedStyle(el).transform;
				items.push({
					el: el,
					amp: l.amp,
					base: (base && base !== 'none') ? base + ' ' : ''
				});
				el.style.willChange = 'transform';
			});
		});
		if (!items.length) return;

		var raf = 0;

		function apply() {
			var vh = window.innerHeight || 1;
			items.forEach(function (it) {
				var r = it.el.getBoundingClientRect();
				if (r.bottom < -vh || r.top > vh * 2) return;      /* далеко за экраном — пропускаем */
				var d = ((r.top + r.height / 2) - vh / 2) / vh;     /* примерно -1..1 */
				var y = clamp(d, -1.4, 1.4) * it.amp;
				it.el.style.transform = it.base + 'translate3d(0,' + y.toFixed(2) + 'px,0)';
			});
			raf = 0;
		}

		window.addEventListener('scroll', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		}, { passive: true });
		window.addEventListener('resize', function () {
			if (!raf) raf = requestAnimationFrame(apply);
		});

		apply();
	}

	/* =========================================================
	   5. РАСКРЫТИЕ ЗАГОЛОВКА ПО СТРОКАМ
	   ========================================================= */
	function runHeroTitle() {
		var lines = [].slice.call(document.querySelectorAll('.home-page__hero-title-line'));
		var sub = document.querySelector('.home-page__hero-subtitle');

		lines.forEach(function (line, i) {
			var inner = document.createElement('span');
			inner.className = 'demo-fx-line-in';
			while (line.firstChild) inner.appendChild(line.firstChild);
			line.appendChild(inner);
			line.classList.add('demo-fx-line');

			inner.animate(
				[{ transform: 'translateY(110%)' }, { transform: 'none' }],
				{ duration: 980, delay: i * 130, easing: EASE, fill: 'both' }
			);
		});

		if (sub) {
			sub.animate(
				[{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
				{ duration: 820, delay: 300 + lines.length * 130, easing: EASE, fill: 'both' }
			);
		}

		[].slice.call(document.querySelectorAll('.home-page__stat-card')).forEach(function (c, i) {
			c.animate(
				[{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
				{ duration: 760, delay: 420 + i * 100, easing: EASE, fill: 'both' }
			);
		});
	}

	/* =========================================================
	   6. КАСТОМНЫЙ КУРСОР
	   Одна крупная точка; над кнопками и ссылками она разрастается —
	   тем же движением, что и магнит на самой кнопке.
	   ========================================================= */
	function initCursor() {
		if (COARSE) return;

		var dot = document.createElement('div');
		dot.className = 'demo-fx-cur';
		dot.setAttribute('aria-hidden', 'true');
		document.body.appendChild(dot);
		document.documentElement.classList.add('demo-fx-cursor');

		var HOT = 'a,button,[role="button"],input,textarea,select,label';
		var mx = window.innerWidth / 2, my = window.innerHeight / 2;
		var x = mx, y = my, s = 1, ts = 1, raf = 0;

		function tick() {
			x += (mx - x) * 0.28;
			y += (my - y) * 0.28;
			s += (ts - s) * 0.16;
			dot.style.transform =
				'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';

			var moving = Math.abs(mx - x) > 0.1 || Math.abs(my - y) > 0.1 || Math.abs(ts - s) > 0.002;
			raf = moving ? requestAnimationFrame(tick) : 0;
		}

		document.addEventListener('mousemove', function (e) {
			mx = e.clientX; my = e.clientY;
			if (!raf) raf = requestAnimationFrame(tick);
		}, { passive: true });

		document.addEventListener('mouseover', function (e) {
			ts = (e.target.closest && e.target.closest(HOT)) ? 2.6 : 1;
			if (!raf) raf = requestAnimationFrame(tick);
		});

		document.addEventListener('mouseleave', function () { dot.classList.add('is-hidden'); });
		document.addEventListener('mouseenter', function () { dot.classList.remove('is-hidden'); });
	}

	/* =========================================================
	   Старт
	   ========================================================= */
	function boot() {
		initCursor();                 /* курсор и магнит уместны даже без анимаций */
		initMagnetic();
		if (REDUCED) return;

		initHeroParallax();
		initLayerParallax();
		initReveal();

		afterIntro(function () {
			runHeroTitle();
			runCounters();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
