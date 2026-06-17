// declaraction of document.ready() function.
(function () {
    var ie = !!(window.attachEvent && !window.opera);
    var wk = /webkit\/(\d+)/i.test(navigator.userAgent) && (RegExp.$1 < 525);
    var fn = [];
    var run = function () {
        for (var i = 0; i < fn.length; i++) fn[i]();
    };
    var d = document;
    d.ready = function (f) {
        if (!ie && !wk && d.addEventListener)
            return d.addEventListener('DOMContentLoaded', f, false);
        if (fn.push(f) > 1) return;
        if (ie)
            (function () {
                try {
                    d.documentElement.doScroll('left');
                    run();
                } catch (err) {
                    setTimeout(arguments.callee, 0);
                }
            })();
        else if (wk)
            var t = setInterval(function () {
                if (/^(loaded|complete)$/.test(d.readyState))
                    clearInterval(t), run();
            }, 0);
    };
})();


document.ready(
    // toggleTheme function.
    // this script shouldn't be changed.
    () => {
        var _Blog = window._Blog || {};
        const currentTheme = window.localStorage && window.localStorage.getItem('theme');
        const isDark = currentTheme === 'dark';
        const pagebody = document.getElementsByTagName('body')[0]
        if (isDark) {
            document.getElementById("switch_default").checked = true;
            // mobile
            document.getElementById("mobile-toggle-theme").innerText = "· 九阴"
        } else {
            document.getElementById("switch_default").checked = false;
            // mobile
            document.getElementById("mobile-toggle-theme").innerText = "· 重阳"
        }
        _Blog.toggleTheme = function () {
            if (isDark) {
                pagebody.classList.add('dark-theme');
                // mobile
                document.getElementById("mobile-toggle-theme").innerText = "· 九阴"
            } else {
                pagebody.classList.remove('dark-theme');
                // mobile
                document.getElementById("mobile-toggle-theme").innerText = "· 重阳"
            }
            document.getElementsByClassName('toggleBtn')[0].addEventListener('click', () => {
                if (pagebody.classList.contains('dark-theme')) {
                    pagebody.classList.remove('dark-theme');
                } else {
                    pagebody.classList.add('dark-theme');
                }
                window.localStorage &&
                window.localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light',)
            })
            // moblie
            document.getElementById('mobile-toggle-theme').addEventListener('click', () => {
                if (pagebody.classList.contains('dark-theme')) {
                    pagebody.classList.remove('dark-theme');
                    // mobile
                    document.getElementById("mobile-toggle-theme").innerText = "· 重阳"

                } else {
                    pagebody.classList.add('dark-theme');
                    // mobile
                    document.getElementById("mobile-toggle-theme").innerText = "· 九阴"
                }
                window.localStorage &&
                window.localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light',)
            })
        };
        _Blog.toggleTheme();
        // ready function.
    }
);

// Loading screen and transition animation
document.ready(function () {
    var loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    var loadingWrapper = loadingScreen.querySelector('.loading-wrapper');
    var blockGray = loadingScreen.querySelector('.block-gray');
    var blockTheme = loadingScreen.querySelector('.block-theme');
    var elements = document.querySelectorAll('.fade-in-element');

    // Skip loading screen if user came via navbar link or previously visited
    if (window.sessionStorage) {
        if (sessionStorage.getItem('_home_skip')) {
            sessionStorage.removeItem('_home_skip');
            loadingScreen.style.display = 'none';
            for (var i = 0; i < elements.length; i++) {
                elements[i].classList.add('visible');
            }
            return;
        }
        if (sessionStorage.getItem('_visited')) {
            loadingScreen.style.display = 'none';
            for (var i = 0; i < elements.length; i++) {
                elements[i].classList.add('visible');
            }
            return;
        }
    }

    var startTime = Date.now();
    var resourcesReady = false;
    var minTimeElapsed = false;

    function waitForResources() {
        var promises = [];
        promises.push(new Promise(function (resolve) {
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
        // Fade out spinner
        loadingWrapper.classList.add('fade-out');

        // Unified RAF animation: all phases in one smooth loop
        setTimeout(function () {
            blockGray.style.transition = 'none';
            blockTheme.style.transition = 'none';
            blockTheme.style.zIndex = '3';

            blockGray.style.left = '-100vw';
            blockGray.style.width = '100vw';
            blockTheme.style.left = '-100vw';
            blockTheme.style.width = '100vw';

            var animStart = null;
            var bgTransparentSet = false;
            var GRAY_END   = 250;
            var OPP_START  = 180;
            var OPP_END    = 330;
            var CPLX_START = 330;
            var CPLX_DUR   = 550;
            var totalDur   = CPLX_START + CPLX_DUR;

            function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

            function stepAll(ts) {
                if (!animStart) animStart = ts;
                var elapsed = ts - animStart;

                if (!bgTransparentSet && elapsed >= GRAY_END) {
                    bgTransparentSet = true;
                    loadingScreen.classList.add('transparent-bg');
                }

                // Track A: Gray enters (linear)
                if (elapsed < GRAY_END) {
                    var gt = elapsed / GRAY_END;
                    blockGray.style.left = (-100 + 100 * gt) + 'vw';
                    blockGray.style.width = '100vw';
                } else if (elapsed < CPLX_START) {
                    blockGray.style.left = '0vw';
                    blockGray.style.width = '100vw';
                }

                // Track B: Opposite enters (linear, overlaps gray tail)
                if (elapsed >= OPP_START && elapsed < OPP_END) {
                    var ot = (elapsed - OPP_START) / (OPP_END - OPP_START);
                    blockTheme.style.left = (-100 + 80 * ot) + 'vw';
                    blockTheme.style.width = '100vw';
                }

                // Track C: Complex — single easeInOut curve, no boundaries
                if (elapsed >= CPLX_START && elapsed < totalDur) {
                    var t = easeInOut((elapsed - CPLX_START) / CPLX_DUR);
                    blockTheme.style.left  = (-20 + 135 * t) + 'vw';  // -20 → 115
                    blockTheme.style.width = (100 - 100 * t) + 'vw';  // 100 → 0
                    blockGray.style.left   = (0 + 115 * t) + 'vw';    // 0 → 115
                    blockGray.style.width  = (100 - 100 * t) + 'vw';  // 100 → 0
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

        // ===== Show page (1.1s) =====
        setTimeout(function () {
            loadingScreen.style.display = 'none';
            if (window.sessionStorage) {
                sessionStorage.setItem('_visited', '1');
            }
            for (var i = 0; i < elements.length; i++) {
                (function (el, idx) {
                    setTimeout(function () {
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

    // Ensure loading animation completes at least one full cycle (4s)
    var elapsed = Date.now() - startTime;
    var remaining = 4000 - elapsed;
    if (remaining <= 0) {
        minTimeElapsed = true;
    } else {
        setTimeout(function () {
            minTimeElapsed = true;
            checkReady();
        }, remaining);
    }

    waitForResources().then(function () {
        resourcesReady = true;
        checkReady();
    });
});

// Scroll-aware mobile navbar
document.ready(function () {
    var navbar = document.getElementById('nav-mobile');
    if (!navbar) return;

    var lastY = 0;
    var ticking = false;
    var THRESHOLD = 10;

    function update() {
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

    window.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    navbar.style.transition = 'transform 0.3s ease';
});

