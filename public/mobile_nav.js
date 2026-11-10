/**
 * SPRINGDRILL MOBILE NAVIGATION ENGINE
 * Provides responsive drawer, toggle buttons, and touch interactions.
 */

(function () {
    const HAMBURGER_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';

    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        let overlay = document.getElementById('sidebarOverlay');
        
        if (!sidebar) return;

        // Ensure overlay exists
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            overlay.onclick = window.toggleSidebar;
            document.body.appendChild(overlay);
        }

        const isOpening = !sidebar.classList.contains('mobile-open');
        sidebar.classList.toggle('mobile-open');

        if (isOpening) {
            overlay.style.display = 'block';
            setTimeout(() => overlay.classList.add('active'), 10);
            if (window.innerWidth <= 992) {
                document.body.dataset.sidebarScrollLocked = 'true';
                document.body.style.overflow = 'hidden';
            }
        } else {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (!sidebar.classList.contains('mobile-open')) {
                    overlay.style.display = 'none';
                }
            }, 250);
            document.body.style.overflow = '';
        }
    };

    function initMobileNav() {
        const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
        if (!sidebar) return;

        // 1. Ensure overlay is in DOM
        let overlay = document.getElementById('sidebarOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            overlay.onclick = window.toggleSidebar;
            document.body.insertBefore(overlay, document.body.firstChild);
        }

        // 2. Add close button in sidebar header if missing
        if (!sidebar.querySelector('.sidebar-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'sidebar-close-btn';
            closeBtn.setAttribute('aria-label', 'Close Menu');
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = function (e) {
                e.stopPropagation();
                window.toggleSidebar();
            };
            const brand = sidebar.querySelector('.sidebar-brand') || sidebar;
            brand.style.position = 'relative';
            brand.appendChild(closeBtn);
        }

        // 3. Ensure toggle button in navbar or header
        if (!document.querySelector('.mobile-menu-toggle')) {
            const topNavbar = document.querySelector('.top-navbar') || document.querySelector('.main-content > div:first-child');
            if (topNavbar) {
                const btn = document.createElement('button');
                btn.className = 'mobile-menu-toggle';
                btn.setAttribute('aria-label', 'Toggle Navigation Menu');
                btn.innerHTML = HAMBURGER_SVG;
                btn.onclick = window.toggleSidebar;

                // Try to insert in first flex container, or before first element
                const flexGroup = topNavbar.querySelector('.d-flex');
                if (flexGroup) {
                    flexGroup.insertBefore(btn, flexGroup.firstChild);
                } else if (topNavbar.firstChild) {
                    topNavbar.insertBefore(btn, topNavbar.firstChild);
                } else {
                    topNavbar.appendChild(btn);
                }
            }
        } else {
            // If toggle buttons already exist, make sure their onclick is set and icon is visible
            document.querySelectorAll('.mobile-menu-toggle').forEach(btn => {
                if (!btn.onclick) {
                    btn.onclick = window.toggleSidebar;
                }
                // If button has empty content, inject SVG
                if (!btn.innerHTML.trim() || btn.innerHTML.trim() === '<i class="fas fa-bars"></i>') {
                    btn.innerHTML = HAMBURGER_SVG;
                }
            });
        }

        // 4. Auto-close drawer when clicking normal links on mobile
        sidebar.querySelectorAll('a.nav-link').forEach(link => {
            const isDropdown = link.getAttribute('data-bs-toggle') === 'collapse' || 
                               link.getAttribute('href')?.startsWith('#') ||
                               link.classList.contains('dropdown-toggle');
            if (!isDropdown) {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 992 && sidebar.classList.contains('mobile-open')) {
                        window.toggleSidebar();
                    }
                });
            }
        });

        // 5. Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
                window.toggleSidebar();
            }
        });

        // 6. Reset on resize past mobile breakpoint
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
                if (overlay) overlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();
