// declaraction of document.ready() function.
(function() {
    var ie = !!(window.attachEvent && !window.opera);
    var wk = /webkit\/(\d+)/i.test(navigator.userAgent) && (RegExp.$1 < 525);
    var fn = [];
    var run = function() {
        for (var i = 0; i < fn.length; i++) fn[i]();
    };
    var d = document;
    d.ready = function(f) {
        if (!ie && !wk && d.addEventListener)
            return d.addEventListener('DOMContentLoaded', f, false);
        if (fn.push(f) > 1) return;
        if (ie)
            (function() {
                try {
                    d.documentElement.doScroll('left');
                    run();
                } catch (err) {
                    setTimeout(arguments.callee, 0);
                }
            })();
        else if (wk)
            var t = setInterval(function() {
                if (/^(loaded|complete)$/.test(d.readyState))
                    clearInterval(t), run();
            }, 0);
    };
})();


document.ready(
    () => {
        var _Blog = window._Blog || {};
        var currentTheme = window.localStorage && window.localStorage.getItem('theme') || '';
        var isDark = currentTheme === 'dark';
        var pagebody = document.getElementsByTagName('body')[0];

        // Strip mobile overlay from DOM on non-mobile screens
        if (window.innerWidth > 479) {
            var ov = document.getElementById('mobile-overlay');
            if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
        }

        if (isDark) {
            pagebody.classList.add('dark-theme');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById("switch_default").checked = true;
            document.getElementById("mobile-toggle-theme").innerText = "· 九阴";
        } else {
            document.getElementById("switch_default").checked = false;
            document.getElementById("mobile-toggle-theme").innerText = "· 重阳";
        }

        function applyTheme(dark, clickY) {
            var fromTop = clickY < window.innerHeight / 2;
            // Reverse direction when switching to light
            var direction = dark ? (fromTop ? 'down' : 'up') : (fromTop ? 'up' : 'down');
            var supportsVT = !!document.startViewTransition;

            function doSwitch() {
                if (dark) {
                    pagebody.classList.add('dark-theme');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById("switch_default").checked = true;
                    document.getElementById("mobile-toggle-theme").innerText = "· 九阴";
                } else {
                    pagebody.classList.remove('dark-theme');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.getElementById("switch_default").checked = false;
                    document.getElementById("mobile-toggle-theme").innerText = "· 重阳";
                }
                // Toggle highlight.js theme if present
                var hljsTheme = document.getElementById('hljs-theme');
                if (hljsTheme) {
                    hljsTheme.href = dark ?
                        'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css' :
                        'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
                }
                window.localStorage && window.localStorage.setItem('theme', dark ? 'dark' : 'light');
                if (typeof Fancybox !== 'undefined') {
                    Fancybox.getDefaults().theme = dark ? 'dark' : 'light';
                }
            }

            if (!supportsVT) {
                doSwitch();
                return;
            }

            // Set view-transition-name on html to scope the transition snapshot
            document.documentElement.style.setProperty('view-transition-name', 'theme-toggle');

            // Globally disable all CSS transitions during snapshot capture
            document.documentElement.classList.add('no-transitions');

            var vt = document.startViewTransition(function() {
                doSwitch();
            });
            vt.ready.then(function() {
                var clipStart = direction === 'down' ?
                    'inset(0 0 100% 0)' :
                    'inset(100% 0 0 0)';
                document.documentElement.animate({
                    clipPath: [clipStart, 'inset(0 0 0 0)']
                }, {
                    duration: 500,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: '::view-transition-new(theme-toggle)'
                });
                vt.finished.then(function() {
                    document.documentElement.classList.remove('no-transitions');
                    document.documentElement.style.removeProperty('view-transition-name');
                });
            });
        }

        document.getElementsByClassName('toggleBtn')[0].addEventListener('click', function(e) {
            var dark = !pagebody.classList.contains('dark-theme');
            applyTheme(dark, e.clientY);
        });

        document.getElementById('mobile-toggle-theme').addEventListener('click', function(e) {
            var dark = !pagebody.classList.contains('dark-theme');
            applyTheme(dark, e.clientY || e.touches ? (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY) : e.clientY);
        });

        _Blog.toggleTheme = function() {};
        _Blog.toggleTheme();

        // Lock body scroll + slide navbar when mobile menu is open
        var scrollY = 0;
        var navMobile = document.getElementById('nav-mobile');
        var menuObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    var oldClasses = (mutation.oldValue || '').split(/\s+/).filter(function(c) {
                        return c;
                    });
                    var hadMenuOpen = oldClasses.indexOf('menu-open') !== -1;
                    var hasMenuOpen = document.body.classList.contains('menu-open');

                    if (!hadMenuOpen && hasMenuOpen) {
                        // Menu opened
                        scrollY = window.scrollY;
                        document.body.style.position = 'fixed';
                        document.body.style.top = '-' + scrollY + 'px';
                        document.body.style.width = '100%';
                        if (navMobile) navMobile.style.transform = 'translateY(-100%)';
                    } else if (hadMenuOpen && !hasMenuOpen) {
                        // Menu closed
                        document.body.style.position = '';
                        document.body.style.top = '';
                        document.body.style.width = '';
                        window.scrollTo(0, scrollY);
                        if (navMobile) navMobile.style.transform = '';
                    }
                }
            });
        });
        menuObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            attributeOldValue: true
        });
    }
);

// Loading screen and transition animation
document.ready(function() {
    var loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    var loadingWrapper = loadingScreen.querySelector('.loading-wrapper');
    var blockGray = loadingScreen.querySelector('.block-gray');
    var blockTheme = loadingScreen.querySelector('.block-theme');
    var elements = document.querySelectorAll('.fade-in-element');
    var loadingFailsafe;

    if (window.sessionStorage && sessionStorage.getItem('_home_skip')) {
        sessionStorage.removeItem('_home_skip');
        loadingScreen.style.display = 'none';
        for (var i = 0; i < elements.length; i++) {
            elements[i].classList.add('visible');
        }
        return;
    }
    if (window.sessionStorage && sessionStorage.getItem('_visited')) {
        loadingScreen.style.display = 'none';
        for (var i = 0; i < elements.length; i++) {
            elements[i].classList.add('visible');
        }
        return;
    }

    var startTime = Date.now();
    var resourcesReady = false;
    var minTimeElapsed = false;

    function waitForResources() {
        var promises = [];
        promises.push(new Promise(function(resolve) {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        }));
        if (document.fonts) {
            promises.push(document.fonts.ready);
        }
        return Promise.all(promises);
    }

    function startTransition() {
        loadingWrapper.classList.add('fade-out');

        setTimeout(function() {
            blockGray.style.transition = 'none';
            blockTheme.style.transition = 'none';
            blockTheme.style.zIndex = '3';

            blockGray.style.left = '-100vw';
            blockGray.style.width = '100vw';
            blockTheme.style.left = '-100vw';
            blockTheme.style.width = '100vw';

            var animStart = null;
            var bgTransparentSet = false;
            var GRAY_END = 250;
            var OPP_START = 180;
            var OPP_END = 330;
            var CPLX_START = 330;
            var CPLX_DUR = 550;
            var totalDur = CPLX_START + CPLX_DUR;

            function easeInOut(t) {
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }

            function stepAll(ts) {
                if (!animStart) animStart = ts;
                var elapsed = ts - animStart;

                if (!bgTransparentSet && elapsed >= GRAY_END) {
                    bgTransparentSet = true;
                    loadingScreen.classList.add('transparent-bg');
                }

                if (elapsed < GRAY_END) {
                    var gt = elapsed / GRAY_END;
                    blockGray.style.left = (-100 + 100 * gt) + 'vw';
                    blockGray.style.width = '100vw';
                } else if (elapsed < CPLX_START) {
                    blockGray.style.left = '0vw';
                    blockGray.style.width = '100vw';
                }

                if (elapsed >= OPP_START && elapsed < OPP_END) {
                    var ot = (elapsed - OPP_START) / (OPP_END - OPP_START);
                    blockTheme.style.left = (-100 + 80 * ot) + 'vw';
                    blockTheme.style.width = '100vw';
                }

                if (elapsed >= CPLX_START && elapsed < totalDur) {
                    var t = easeInOut((elapsed - CPLX_START) / CPLX_DUR);
                    blockTheme.style.left = (-20 + 135 * t) + 'vw';
                    blockTheme.style.width = (100 - 100 * t) + 'vw';
                    blockGray.style.left = (0 + 115 * t) + 'vw';
                    blockGray.style.width = (100 - 100 * t) + 'vw';
                }

                if (elapsed >= totalDur) {
                    blockTheme.style.left = '115vw';
                    blockTheme.style.width = '0vw';
                    blockGray.style.left = '115vw';
                    blockGray.style.width = '0vw';
                    return;
                }

                requestAnimationFrame(stepAll);
            }

            requestAnimationFrame(stepAll);
        }, 200);

        setTimeout(function() {
            clearTimeout(loadingFailsafe);
            loadingScreen.style.display = 'none';
            if (window.sessionStorage) {
                sessionStorage.setItem('_visited', '1');
            }
            for (var i = 0; i < elements.length; i++) {
                (function(el, idx) {
                    setTimeout(function() {
                        el.classList.add('visible');
                    }, idx * 100);
                })(elements[i], i);
            }
        }, 1100);
    }

    function checkReady() {
        if (resourcesReady && minTimeElapsed && !loadingScreen._started) {
            loadingScreen._started = true;
            startTransition();
        }
    }

    var elapsed = Date.now() - startTime;
    var remaining = 4000 - elapsed;
    if (remaining <= 0) {
        minTimeElapsed = true;
    } else {
        setTimeout(function() {
            minTimeElapsed = true;
            checkReady();
        }, remaining);
    }

    // Failsafe: force-show after 8s even if fonts/external resources hang
    loadingFailsafe = setTimeout(function() {
        if (!loadingScreen._started) {
            loadingScreen.style.display = 'none';
            if (window.sessionStorage) {
                sessionStorage.setItem('_visited', '1');
            }
            for (var i = 0; i < elements.length; i++) {
                elements[i].classList.add('visible');
            }
        }
    }, 8000);

    waitForResources().then(function() {
        resourcesReady = true;
        checkReady();
    });
});

// Scroll-aware mobile navbar
document.ready(function() {
    var navbar = document.getElementById('nav-mobile');
    if (!navbar) return;

    var lastY = 0;
    var ticking = false;
    var THRESHOLD = 10;

    function update() {
        if (document.body.classList.contains('menu-open')) return;
        if (window.scrollY <= 0) {
            navbar.style.transform = 'translateY(0)';
        } else if (window.scrollY < lastY - THRESHOLD) {
            navbar.style.transform = 'translateY(0)';
        } else if (window.scrollY > lastY + THRESHOLD) {
            navbar.style.transform = 'translateY(-100%)';
        }
        lastY = window.scrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, {
        passive: true
    });

    navbar.style.transition = 'transform 0.3s ease';
});