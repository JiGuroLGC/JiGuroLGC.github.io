/**
 * Twikoo submit form collapse/expand toggle
 * - Article pages: button placed in .post-page-bottom (left side)
 * - Message page:  button placed before the form inside Twikoo
 */
(function () {
  var POLL_MS = 200;
  var TIMEOUT_MS = 15000;

  var isMessage = location.pathname.indexOf('/message') === 0;
  var labelExpand = isMessage ? '写留言' : '写评论';
  var labelCollapse = '收起';

  var penSvg = '<span class="tk-toggle-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>';
  var chevronSvg = '<span class="tk-toggle-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';

  function setup() {
    var twikoo = document.querySelector('.twikoo');
    if (!twikoo) return false;

    /* Find the main .tk-submit (not nested reply forms inside .tk-comment) */
    var allSubmits = twikoo.querySelectorAll('.tk-submit');
    var submit = null;
    for (var i = 0; i < allSubmits.length; i++) {
      if (!allSubmits[i].closest('.tk-comment')) {
        submit = allSubmits[i];
        break;
      }
    }
    if (!submit) return false;

    /* Mark it so CSS can target it */
    submit.classList.add('tk-submit-main');

    /* Create toggle button */
    var btn = document.createElement('button');
    btn.className = 'tk-submit-toggle';
    btn.innerHTML = penSvg + labelExpand;

    /* Decide where to place the button */
    var bottomBar = document.querySelector('.post-page-bottom');
    if (bottomBar) {
      /* Article page: insert as first child of .post-page-bottom */
      bottomBar.insertBefore(btn, bottomBar.firstChild);
    } else {
      /* Message page: insert before the form with reveal animation */
      btn.classList.add('tk-animate-in');
      submit.parentNode.insertBefore(btn, submit);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          btn.classList.add('is-revealed');
        });
      });
    }

    var expanded = false;

    btn.addEventListener('click', function () {
      expanded = !expanded;
      if (expanded) {
        submit.classList.add('tk-expanded');
        btn.classList.add('active');
        btn.innerHTML = chevronSvg + labelCollapse;
      } else {
        btn.style.transition = 'none';
        submit.classList.remove('tk-expanded');
        btn.classList.remove('active');
        btn.innerHTML = penSvg + labelExpand;
        void btn.offsetWidth;
        btn.style.transition = '';
      }
    });

    return true;
  }

  /* Poll until Twikoo renders */
  var timer = setInterval(function () {
    if (setup()) clearInterval(timer);
  }, POLL_MS);

  setTimeout(function () { clearInterval(timer); }, TIMEOUT_MS);
})();
