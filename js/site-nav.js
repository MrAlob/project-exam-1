(function () {
    const nav = document.querySelector('[data-nav]');
    const toggle = document.querySelector('[data-nav-toggle]');
    if (!nav || !toggle) {
        return;
    }

    const overlay = document.querySelector('[data-nav-overlay]');
    const closeButtons = nav.querySelectorAll('[data-nav-close]');
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    let lastFocusedElement = null;
    let trapHandlerBound = false;

    function isMobile() {
        return mediaQuery.matches;
    }

    function trapFocus(event) {
        if (!nav.classList.contains('site-nav--open') || !isMobile()) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeNav();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = nav.querySelectorAll(focusableSelector);
        if (!focusable.length) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function addTrapHandler() {
        if (!trapHandlerBound) {
            trapHandlerBound = true;
            document.addEventListener('keydown', trapFocus);
        }
    }

    function removeTrapHandler() {
        if (trapHandlerBound) {
            trapHandlerBound = false;
            document.removeEventListener('keydown', trapFocus);
        }
    }

    function syncAriaState(isOpen) {
        if (isMobile()) {
            nav.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        } else {
            nav.removeAttribute('aria-hidden');
        }
    }

    function openNav() {
        if (nav.classList.contains('site-nav--open')) {
            return;
        }

        lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        nav.classList.add('site-nav--open');
        toggle.setAttribute('aria-expanded', 'true');
        syncAriaState(true);

        if (isMobile()) {
            document.body.classList.add('has-nav-open');
            if (overlay) {
                overlay.hidden = false;
                requestAnimationFrame(() => {
                    overlay.classList.add('site-nav__overlay--visible');
                });
            }

            const focusTarget = nav.querySelector(focusableSelector);
            if (focusTarget instanceof HTMLElement) {
                focusTarget.focus();
            }

            addTrapHandler();
        }
    }

    function closeNav() {
        if (!nav.classList.contains('site-nav--open')) {
            return;
        }

        nav.classList.remove('site-nav--open');
        toggle.setAttribute('aria-expanded', 'false');
        syncAriaState(false);

        if (overlay) {
            overlay.classList.remove('site-nav__overlay--visible');
            if (isMobile()) {
                const transitionDuration = 250;
                window.setTimeout(() => {
                    if (!nav.classList.contains('site-nav--open')) {
                        overlay.hidden = true;
                    }
                }, transitionDuration);
            } else {
                overlay.hidden = true;
            }
        }

        document.body.classList.remove('has-nav-open');
        removeTrapHandler();

        const target = lastFocusedElement && document.contains(lastFocusedElement) ? lastFocusedElement : toggle;
        if (target instanceof HTMLElement) {
            target.focus();
        }
        lastFocusedElement = null;
    }

    toggle.addEventListener('click', () => {
        if (nav.classList.contains('site-nav--open')) {
            closeNav();
        } else {
            openNav();
        }
    });

    closeButtons.forEach((button) => {
        button.addEventListener('click', () => closeNav());
    });

    if (overlay) {
        overlay.addEventListener('click', () => closeNav());
    }

    nav.addEventListener('click', (event) => {
        const link = event.target instanceof Element ? event.target.closest('a') : null;
        if (link) {
            closeNav();
        }
    });

    mediaQuery.addEventListener('change', () => {
        syncAriaState(nav.classList.contains('site-nav--open'));
        if (!isMobile()) {
            document.body.classList.remove('has-nav-open');
            if (overlay) {
                overlay.hidden = true;
                overlay.classList.remove('site-nav__overlay--visible');
            }
            removeTrapHandler();
        }
    });

    toggle.setAttribute('aria-expanded', 'false');
    syncAriaState(false);
})();
