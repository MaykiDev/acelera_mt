'use strict';

(function () {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  // ===== Mobile menu (acessível) =====
  function initMobileMenu() {
  const btn = $('#mobile-menu');
  const nav = $('#site-nav');
  const backdrop = $('#nav-backdrop');
  if (!btn || !nav) return;

  // Região rolável real do drawer (onde ficam as opções)
  const scrollRegion = nav.querySelector('.mobile-nav-body') || nav;

  const closeBtn = nav.querySelector('[data-menu-close]');
  const closeTargets = [backdrop, closeBtn].filter(Boolean);

  const mq = window.matchMedia('(max-width: 992px)');
  let lastFocus = null;

  const applyA11y = (isOpen) => {
    // Em desktop o nav é “normal” (não esconder do leitor de tela).
    if (!mq.matches) {
      nav.setAttribute('aria-hidden', 'false');
      if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
      return;
    }

    nav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    if (backdrop) backdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  };

  const setOpenState = (isOpen) => {
    nav.classList.toggle('active', isOpen);
    btn.classList.toggle('is-active', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    btn.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');

    document.body.classList.toggle('menu-open', isOpen);

    applyA11y(isOpen);

    // Foco (só faz sentido no mobile)
    if (mq.matches) {
      if (isOpen) {
        // Garante que o menu sempre abra mostrando o topo (todas as opções)
        scrollRegion.scrollTop = 0;
        lastFocus = document.activeElement;
        const focusTarget = closeBtn || nav.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        focusTarget?.focus?.();
      } else {
        btn.focus?.();
        lastFocus = null;
      }
    }
  };

  const open = () => setOpenState(true);
  const close = () => setOpenState(false);

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? close() : open();
  });

  // Fecha ao clicar no backdrop ou no X
  closeTargets.forEach((el) => el.addEventListener('click', close));

  // Fecha ao clicar em links (âncoras)
  nav.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.matches('a[href^="#"]')) close();
  });

  // Fecha no ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Se sair do mobile para desktop, garante tudo fechado e a11y ok
  const onResize = () => {
    if (!mq.matches) {
      // desktop
      nav.classList.remove('active');
      btn.classList.remove('is-active');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('menu-open');
      applyA11y(false);
    } else {
      // mobile fechado por padrão
      applyA11y(btn.getAttribute('aria-expanded') === 'true');
    }
  };

  mq.addEventListener?.('change', onResize);
  window.addEventListener('resize', onResize);

  // Estado inicial
  onResize();
}

  // ===== Countdown (com timezone explícito) =====
  function initCountdown() {
    const section = $('.countdown-section');
    if (!section) return;

    const iso = section.dataset.eventStart;
    if (!iso) return;

    const target = new Date(iso).getTime();
    if (!Number.isFinite(target)) return;

    const nodes = {
      months: $('#months'),
      days: $('#days'),
      hours: $('#hours'),
      minutes: $('#minutes'),
    };

    const container = $('.countdown-container', section);

    function render(ms) {
      const safe = Math.max(0, ms);

      // meses aproximados (30,44 dias)
      const months = Math.floor(safe / (1000 * 60 * 60 * 24 * 30.44));
      const days = Math.floor((safe % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((safe % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((safe % (1000 * 60 * 60)) / (1000 * 60));

      if (nodes.months) nodes.months.textContent = String(months);
      if (nodes.days) nodes.days.textContent = String(days);
      if (nodes.hours) nodes.hours.textContent = String(hours);
      if (nodes.minutes) nodes.minutes.textContent = String(minutes);
    }

    function tick() {
      const now = Date.now();
      const dist = target - now;

      if (dist <= 0) {
        render(0);
        if (container) container.innerHTML = '<h2 class="countdown-finished">O EVENTO COMEÇOU!</h2>';
        return;
      }

      render(dist);
      window.setTimeout(tick, 1000);
    }

    tick();
  }

  // ===== Vertical infinite scroll (sobre) =====
  function initVerticalMarquee(trackId, direction = 'up', speed = 0.35) {
    const track = document.getElementById(trackId);
    if (!track) return;

    // duplica apenas uma vez
    if (!track.dataset.cloned) {
      const clone = track.cloneNode(true);
      clone.removeAttribute('id');
      clone.dataset.clone = 'true';
      // marca clones como decorativos
      $$('img', clone).forEach((img) => (img.alt = ''));
      track.append(...Array.from(clone.children));
      track.dataset.cloned = 'true';
    }

    if (prefersReducedMotion) return;

    let y = 0;
    let rafId = 0;

    const step = () => {
      const half = track.scrollHeight / 2;
      const dir = direction === 'up' ? -1 : 1;

      y += dir * speed;

      if (direction === 'up' && Math.abs(y) >= half) y = 0;
      if (direction === 'down' && y >= 0) y = -half;

      track.style.transform = `translateY(${y}px)`;
      rafId = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(step);
    };

    document.addEventListener('visibilitychange', onVisibility);
    rafId = requestAnimationFrame(step);
  }

  // ===== Collapses (Ingressos + FAQ) =====
  function setExpanded(button, content, expanded) {
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    if (expanded) {
      content.hidden = false;

      // força reflow para a transição funcionar de forma consistente
      // eslint-disable-next-line no-unused-expressions
      content.offsetHeight;

      content.style.maxHeight = `${content.scrollHeight}px`;
      content.classList.add('is-open');
      return;
    }

    // colapsar (anima e só depois esconde)
    content.style.maxHeight = '0px';
    content.classList.remove('is-open');

    const onEnd = () => {
      content.hidden = true;
    };

    content.addEventListener('transitionend', onEnd, { once: true });
  }

  function initCollapses() {
    const buttons = $$('[data-toggle="collapse"]');

    buttons.forEach((btn) => {
      const targetSel = btn.getAttribute('data-target');
      if (!targetSel) return;

      const content = $(targetSel);
      if (!content) return;

      // estado inicial
      btn.setAttribute('aria-expanded', 'false');
      content.style.overflow = 'hidden';
      content.style.maxHeight = '0px';
      content.hidden = true;

      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        setExpanded(btn, content, !expanded);

        const chev = $('.chev', btn);
        if (chev) chev.classList.toggle('rotate', !expanded);

        const arrow = $('.faq-arrow', btn);
        if (arrow) arrow.classList.toggle('rotate', !expanded);
      });
    });
  }

  // ===== Speakers: scroll com controles =====
  function initSpeakers() {
    const carousel = $('.speakers-carousel');
    const track = $('#speakers-track');
    if (!carousel || !track) return;

    // transforma o container em scroll horizontal nativo (acessível)
    // e mantém os botões funcionando
    const prevBtn = $('[data-action="prev"]');
    const nextBtn = $('[data-action="next"]');

    const scrollByCard = (dir) => {
      const card = $('.speaker-card', track);
      if (!card) return;

      const gap = 20;
      const amount = card.getBoundingClientRect().width + gap;
      carousel.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    prevBtn?.addEventListener('click', () => scrollByCard(-1));
    nextBtn?.addEventListener('click', () => scrollByCard(1));
  }

  
  // ===== Speakers modal / popup (centralizado e acessível) =====
  function initSpeakerModal() {
    const modal = $('#speaker-modal');
    if (!modal) return;

    const dialog = $('.speaker-modal__dialog', modal);
    const btnClose = $('.speaker-modal__close', modal);

    const elImg = $('#speaker-modal-img');
    const elTitle = $('#speaker-modal-title');
    const elRole = $('#speaker-modal-role');
    const elBio = $('#speaker-modal-bio');

    const aInstagram = $('#speaker-modal-instagram');
    const aLinkedin = $('#speaker-modal-linkedin');

    let isOpen = false;
    let lastFocused = null;

    function setSocialLink(anchor, href) {
      if (!anchor) return;
      const valid = typeof href === 'string' && href.trim() && href.trim() !== '#';
      if (!valid) {
        anchor.style.display = 'none';
        anchor.removeAttribute('href');
        return;
      }
      anchor.style.display = 'inline-flex';
      anchor.setAttribute('href', href);
    }

    function openFromCard(card) {
      if (!card) return;

      const name = card.dataset.speakerName || $('h3', card)?.textContent || 'Palestrante';
      const role = card.dataset.speakerRole || '';
      const bio = card.dataset.speakerBio || '';

      const imgSrc = card.dataset.speakerImg || $('img', card)?.getAttribute('src') || '';
      const instagram = card.dataset.instagram || '';
      const linkedin = card.dataset.linkedin || '';

      if (elTitle) elTitle.textContent = name;
      if (elRole) elRole.textContent = role;
      if (elBio) elBio.textContent = bio;

      if (elImg) {
        if (imgSrc) {
          elImg.src = imgSrc;
          elImg.alt = `Foto do palestrante ${name}`;
        } else {
          elImg.removeAttribute('src');
          elImg.alt = '';
        }
      }

      setSocialLink(aInstagram, instagram);
      setSocialLink(aLinkedin, linkedin);

      lastFocused = document.activeElement;
      isOpen = true;

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      // foco no botão de fechar
      window.setTimeout(() => btnClose?.focus?.(), 0);
    }

    function close() {
      if (!isOpen) return;

      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');

      isOpen = false;

      // devolve foco
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
      lastFocused = null;
    }

    // Click nos cards (delegação para evitar duplicação/clones)
    document.addEventListener('click', (e) => {
      const target = e.target;
      const card = target?.closest?.('.speaker-card-btn');
      if (!card) return;
      e.preventDefault();
      openFromCard(card);
    });

    document.addEventListener('keydown', (e) => {
      // Abrir via teclado no card (Enter/Espaço)
      const target = e.target;
      const card = target?.closest?.('.speaker-card-btn');
      if (card && !isOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openFromCard(card);
        return;
      }

      // Fechar no ESC
      if (isOpen && e.key === 'Escape') {
        close();
        return;
      }

      // Trap de foco no TAB
      if (isOpen && e.key === 'Tab') {
        const focusables = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', dialog || modal);
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Fechar por clique (X ou backdrop)
    $$('[data-modal-close]', modal).forEach((el) => el.addEventListener('click', close));
  }

// ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initCountdown();

    initVerticalMarquee('track1', 'up', 0.45);
    initVerticalMarquee('track2', 'down', 0.45);

    initCollapses();
    initSpeakers();
    initSpeakerModal();
  });
})();
