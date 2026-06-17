/**
 * Music Player for JiGuro's Blog
 * Floating player with Meting API / custom audio, dual-line lyrics, collapse toggle.
 *
 * Configure inside /posts/music.json per article-id:
 *   { "2026-06-16": { "enabled":true, "meting":{ "server":"netease","type":"song","id":"1352714439" } } }
 * Or custom:
 *   { "2026-06-16": { "enabled":true, "title":"...","artist":"...","audio":"https://...","cover":"https://...","lyric":"[00:00.00]..." } }
 */

(function () {
  'use strict';

  /* ====== state ====== */
  var postId;
  var audio = null;
  var lrcParsed = [];          // [{time:seconds, text:string}, ...]
  var lrcCurrent = -1;        // index of current lyric line
  var isPlaying = false;
  var isCollapsed = false;
  var volume = 0.7;
  var updateTimer = 0;
  var isSeeking = false;

  /* ====== DOM references (filled by buildDOM) ====== */
  var $wrap, $card, $inner;
  var $cover, $coverFallback, $title, $artist;
  var $lyricCur, $lyricNext, $lyricPlaceholder;
  var $timeCur, $timeDur, $progress, $progressBar;
  var $btnPlay, $btnClose, $btnCollapseIn, $btnCollapseOut;
  var $volumeBtn, $volumeSlider;
  var $collapsedPlay, $collapsedIcon, $collapsedLyric;

  /* ====== entry ====== */
  function init() {
    postId = new URLSearchParams(window.location.search).get('id');
    if (!postId) return;

    fetch('/posts/music.json')
      .then(function (r) {
        if (!r.ok) throw new Error('No music config');
        return r.json();
      })
      .then(function (config) {
        var cfg = config[postId];
        if (!cfg || !cfg.enabled) return;

        buildDOM();

        if (cfg.meting) {
          fetchMeting(cfg.meting);
        } else if (cfg.audio) {
          buildPlayer({
            title: cfg.title || '未知歌曲',
            artist: cfg.artist || '未知歌手',
            cover: cfg.cover || '',
            audio: cfg.audio,
            lyric: cfg.lyric || ''
          });
        } else {
          showError('音乐配置缺少音频源');
        }
      })
      .catch(function () {
        /* no config or fetch error — just don't show player */
      });
  }

  /* ====== Meting API ====== */
  function fetchMeting(meting) {
    showLoading();
    var metaServer = meting.server || 'netease';
    var metaType = meting.type || 'song';
    var metaId = meting.id;
    var url = 'https://meting.mikus.ink/api?server=' + metaServer +
      '&type=' + metaType + '&id=' + metaId;

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.length) throw new Error('Empty Meting response');
        var song = data[0];
        var songData = {
          title: song.title || '未知歌曲',
          artist: song.author || '未知歌手',
          cover: song.pic || '',
          audio: song.url || '',
          lyric: ''
        };

        /* lrc might be text or a URL */
        var lrcRaw = song.lrc || '';
        if (lrcRaw && /^https?:\/\//i.test(lrcRaw)) {
          /* lrc is a URL — fetch it */
          return fetch(lrcRaw)
            .then(function (lr) { return lr.text(); })
            .then(function (lrcText) {
              songData.lyric = lrcText;
              return songData;
            })
            .catch(function () {
              /* lyric fetch failed, build without lyrics */
              return songData;
            });
        } else {
          /* lrc is plain text */
          songData.lyric = lrcRaw;
          return songData;
        }
      })
      .then(function (songData) {
        buildPlayer(songData);
      })
      .catch(function () {
        showError('无法获取音乐信息，请检查歌曲ID');
      });
  }

  /* ====== build player UI ====== */
  function buildDOM() {
    /* wrapper */
    $wrap = document.createElement('div');
    $wrap.className = 'music-player-wrap music-player-wrap-appear collapsed';
    $wrap.id = 'music-player';
    isCollapsed = true;

    /* card */
    $card = document.createElement('div');
    $card.className = 'music-player-card';

    /* collapsed bar (shown when collapsed) */
    var $bar = document.createElement('div');
    $bar.className = 'music-player-collapsed-bar';

    /* music icon */
    $collapsedIcon = document.createElement('div');
    $collapsedIcon.className = 'music-player-collapsed-icon';
    $collapsedIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    $bar.appendChild($collapsedIcon);

    /* play/pause in collapsed */
    $collapsedPlay = document.createElement('button');
    $collapsedPlay.className = 'music-player-collapsed-btn';
    $collapsedPlay.title = '播放/暂停';
    $collapsedPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    $bar.appendChild($collapsedPlay);

    /* expand button in collapsed */
    $btnCollapseOut = document.createElement('button');
    $btnCollapseOut.className = 'music-player-collapsed-btn';
    $btnCollapseOut.title = '展开播放器';
    $btnCollapseOut.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>';
    $bar.appendChild($btnCollapseOut);

    /* vertical lyric in collapsed bar (below buttons, fills remaining space) */
    $collapsedLyric = document.createElement('div');
    $collapsedLyric.className = 'music-player-collapsed-lyric';
    $collapsedLyric.textContent = '';
    $bar.appendChild($collapsedLyric);

    /* inner (shown when expanded) */
    $inner = document.createElement('div');
    $inner.className = 'music-player-inner';

    /* top row */
    var $top = document.createElement('div');
    $top.className = 'music-player-top';

    /* cover */
    $cover = document.createElement('img');
    $cover.className = 'music-player-cover';
    $cover.alt = '';
    $cover.style.display = 'none';
    $cover.onerror = function () {
      $cover.style.display = 'none';
      $coverFallback.style.display = 'flex';
    };
    $cover.onload = function () {
      $cover.style.display = '';
      $coverFallback.style.display = 'none';
    };

    $coverFallback = document.createElement('div');
    $coverFallback.className = 'music-player-cover-fallback';
    $coverFallback.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

    /* info */
    var $info = document.createElement('div');
    $info.className = 'music-player-info';
    $title = document.createElement('div');
    $title.className = 'music-player-title';
    $title.textContent = '加载中...';
    $artist = document.createElement('div');
    $artist.className = 'music-player-artist';
    $artist.textContent = '';
    $info.appendChild($title);
    $info.appendChild($artist);

    /* actions */
    var $actions = document.createElement('div');
    $actions.className = 'music-player-actions';

    /* collapse button */
    $btnCollapseIn = document.createElement('button');
    $btnCollapseIn.className = 'music-player-btn';
    $btnCollapseIn.title = '收起为窄条';
    $btnCollapseIn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>';

    /* close button */
    $btnClose = document.createElement('button');
    $btnClose.className = 'music-player-btn';
    $btnClose.title = '关闭播放器';
    $btnClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    $actions.appendChild($btnCollapseIn);
    $actions.appendChild($btnClose);

    $top.appendChild($cover);
    $top.appendChild($coverFallback);
    $top.appendChild($info);
    $top.appendChild($actions);

    /* lyrics */
    var $lyrics = document.createElement('div');
    $lyrics.className = 'music-player-lyrics';
    $lyricCur = document.createElement('div');
    $lyricCur.className = 'music-player-lyric-line music-player-lyric-current';
    $lyricNext = document.createElement('div');
    $lyricNext.className = 'music-player-lyric-line music-player-lyric-next';
    $lyricPlaceholder = document.createElement('div');
    $lyricPlaceholder.className = 'music-player-lyric-line music-player-lyric-placeholder';
    $lyricPlaceholder.textContent = '...';
    $lyrics.appendChild($lyricCur);
    $lyrics.appendChild($lyricNext);
    $lyrics.appendChild($lyricPlaceholder);

    /* progress */
    var $progressWrap = document.createElement('div');
    $progressWrap.className = 'music-player-progress-wrap';

    $timeCur = document.createElement('span');
    $timeCur.className = 'music-player-time';
    $timeCur.textContent = '0:00';

    $progress = document.createElement('div');
    $progress.className = 'music-player-progress';
    $progressBar = document.createElement('div');
    $progressBar.className = 'music-player-progress-bar';
    var $thumb = document.createElement('div');
    $thumb.className = 'music-player-progress-thumb';
    $progressBar.appendChild($thumb);
    $progress.appendChild($progressBar);

    $timeDur = document.createElement('span');
    $timeDur.className = 'music-player-time';
    $timeDur.textContent = '0:00';

    $progressWrap.appendChild($timeCur);
    $progressWrap.appendChild($progress);
    $progressWrap.appendChild($timeDur);

    /* controls */
    var $controls = document.createElement('div');
    $controls.className = 'music-player-controls';

    /* play/pause */
    $btnPlay = document.createElement('button');
    $btnPlay.className = 'music-player-c-btn play-pause paused-state';
    $btnPlay.title = '播放';
    $btnPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 20,12 8,19"/></svg>';

    /* volume */
    var $volWrap = document.createElement('div');
    $volWrap.className = 'music-player-volume-wrap';

    $volumeBtn = document.createElement('button');
    $volumeBtn.className = 'music-player-c-btn';
    $volumeBtn.title = '音量';
    $volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';

    var $volSliderWrap = document.createElement('div');
    $volSliderWrap.className = 'music-player-volume-slider';
    $volumeSlider = document.createElement('input');
    $volumeSlider.type = 'range';
    $volumeSlider.className = 'music-player-volume-input';
    $volumeSlider.min = '0';
    $volumeSlider.max = '100';
    $volumeSlider.value = '70';
    $volSliderWrap.appendChild($volumeSlider);

    $volWrap.appendChild($volumeBtn);
    $volWrap.appendChild($volSliderWrap);

    $controls.appendChild($btnPlay);
    $controls.appendChild($volWrap);

    /* assemble inner */
    $inner.appendChild($top);
    $inner.appendChild($lyrics);
    $inner.appendChild($progressWrap);
    $inner.appendChild($controls);

    /* final assembly */
    $card.appendChild($bar);
    $card.appendChild($inner);
    $wrap.appendChild($card);
    document.body.appendChild($wrap);

    /* bind events */
    bindEvents();
  }

  function showLoading() {
    if ($inner) $inner.style.display = 'none';
    if ($collapsedIcon) $collapsedIcon.classList.add('loading');
    if ($collapsedLyric) {
      $collapsedLyric.textContent = '加载中...';
      $collapsedLyric.classList.add('loading-text');
      $collapsedLyric.classList.remove('error-text');
    }
  }

  function showError(msg) {
    if ($inner) $inner.style.display = 'none';
    if ($collapsedIcon) $collapsedIcon.classList.remove('loading');
    if ($collapsedLyric) {
      $collapsedLyric.textContent = msg;
      $collapsedLyric.classList.remove('loading-text');
      $collapsedLyric.classList.add('error-text');
    }
  }

  /* ====== build audio & lyrics from song data ====== */
  function buildPlayer(data) {
    if ($inner) $inner.style.display = '';
    if ($collapsedIcon) $collapsedIcon.classList.remove('loading');
    if ($collapsedLyric) {
      $collapsedLyric.classList.remove('loading-text', 'error-text');
    }

    $title.textContent = data.title;
    $artist.textContent = data.artist;

    if (data.cover) {
      $cover.src = data.cover;
      $cover.style.display = '';
      $coverFallback.style.display = 'none';
    } else {
      $cover.style.display = 'none';
      $coverFallback.style.display = 'flex';
    }

    /* parse lyrics */
    lrcParsed = parseLRC(data.lyric || '');
    lrcCurrent = -1;
    $lyricCur.textContent = '';
    $lyricNext.textContent = '';
    $lyricPlaceholder.style.display = lrcParsed.length ? 'none' : '';
    if ($collapsedLyric) {
      $collapsedLyric.textContent = lrcParsed.length ? '' : '';
    }

    /* audio */
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    audio = new Audio();
    audio.src = data.audio;
    audio.volume = volume;
    audio.preload = 'auto';
    audio.loop = true;

    audio.addEventListener('loadedmetadata', function () {
      $timeDur.textContent = formatTime(audio.duration || 0);
    });

    audio.addEventListener('timeupdate', function () {
      if (!isSeeking) {
        $timeCur.textContent = formatTime(audio.currentTime || 0);
        var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        $progressBar.style.width = pct + '%';
        updateLyrics(audio.currentTime);
      }
    });

    audio.addEventListener('play', function () {
      isPlaying = true;
      setPlayBtnState(true);
      $collapsedPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      $collapsedIcon.classList.add('playing');
    });

    audio.addEventListener('pause', function () {
      isPlaying = false;
      setPlayBtnState(false);
      $collapsedPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
      $collapsedIcon.classList.remove('playing');
    });

    audio.addEventListener('ended', function () {
      isPlaying = false;
      setPlayBtnState(false);
      $collapsedPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
      $collapsedIcon.classList.remove('playing');
      $progressBar.style.width = '0%';
      $timeCur.textContent = '0:00';
    });

    audio.addEventListener('error', function () {
      showError('音频加载失败');
    });

    audio.addEventListener('canplay', function () {
      /* auto-play on ready */
      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(function () {
          /* autoplay blocked — wait for user gesture */
          setPlayBtnState(false);
          $collapsedPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
          $collapsedIcon.classList.remove('playing');
          waitForInteraction();
        });
      }
    });
  }

  /* ====== LRC parsing ====== */
  function parseLRC(lrcText) {
    var lines = [];
    if (!lrcText) return lines;

    var raw = lrcText.split('\n');
    for (var i = 0; i < raw.length; i++) {
      var line = raw[i].trim();
      if (!line) continue;

      /* match [mm:ss.xx] or [mm:ss] */
      var matches = line.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g);
      if (!matches) continue;

      var text = line.replace(/\[[\d:.]+\]/g, '').trim();
      if (!text) continue;

      for (var m = 0; m < matches.length; m++) {
        var parts = matches[m].match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (!parts) continue;
        var mins = parseInt(parts[1], 10);
        var secs = parseInt(parts[2], 10);
        var ms = parts[3] ? parseInt(parts[3], 10) / Math.pow(10, parts[3].length) : 0;
        var time = mins * 60 + secs + ms;
        lines.push({ time: time, text: text });
      }
    }

    lines.sort(function (a, b) { return a.time - b.time; });
    return lines;
  }

  function updateLyrics(currentSec) {
    if (!lrcParsed.length) return;
    var idx = -1;
    for (var i = 0; i < lrcParsed.length; i++) {
      if (currentSec >= lrcParsed[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    if (idx !== lrcCurrent) {
      lrcCurrent = idx;
      $lyricPlaceholder.style.display = 'none';

      /* current line */
      if (idx >= 0) {
        var lineText = lrcParsed[idx].text;
        $lyricCur.textContent = lineText;
        $lyricCur.style.opacity = '1';
        $lyricCur.style.transform = 'translateY(0)';
        /* vertical lyric in collapsed bar */
        if ($collapsedLyric) $collapsedLyric.textContent = lineText;
      } else {
        $lyricCur.textContent = '';
      }

      /* next line */
      if (idx + 1 < lrcParsed.length) {
        $lyricNext.textContent = lrcParsed[idx + 1].text;
        $lyricNext.style.opacity = '0.6';
        $lyricNext.style.transform = 'translateY(0)';
      } else {
        $lyricNext.textContent = '';
      }
    }
  }

  /* ====== controls ====== */
  function setPlayBtnState(playing) {
    if (playing) {
      $btnPlay.classList.remove('paused-state');
      $btnPlay.title = '暂停';
      $btnPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    } else {
      $btnPlay.classList.add('paused-state');
      $btnPlay.title = '播放';
      $btnPlay.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 20,12 8,19"/></svg>';
    }
  }

  function togglePlay() {
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      $wrap.classList.add('collapsed');
    } else {
      $wrap.classList.remove('collapsed');
    }
  }

  function closePlayer() {
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio = null;
    }
    $wrap.classList.add('removing');
    setTimeout(function () {
      if ($wrap.parentNode) $wrap.parentNode.removeChild($wrap);
    }, 360);
  }

  function seekFromEvent(e) {
    if (!audio || !audio.duration) return;
    var rect = $progress.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * audio.duration;
    $progressBar.style.width = (pct * 100) + '%';
    $timeCur.textContent = formatTime(audio.currentTime);
  }

  function updateVolume(val) {
    volume = val / 100;
    if (audio) audio.volume = volume;
    updateVolumeIcon(volume);
  }

  function updateVolumeIcon(vol) {
    var svg;
    if (vol === 0) {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    } else if (vol < 0.5) {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
    } else {
      svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
    }
    $volumeBtn.innerHTML = svg;
  }

  /* ====== event binding ====== */
  function bindEvents() {
    /* play/pause */
    $btnPlay.addEventListener('click', togglePlay);
    $collapsedPlay.addEventListener('click', togglePlay);

    /* collapse / expand */
    $btnCollapseIn.addEventListener('click', toggleCollapse);
    $btnCollapseOut.addEventListener('click', toggleCollapse);

    /* close */
    $btnClose.addEventListener('click', closePlayer);

    /* progress bar drag */
    $progress.addEventListener('mousedown', function (e) {
      isSeeking = true;
      seekFromEvent(e);
      document.addEventListener('mousemove', onSeekMove);
      document.addEventListener('mouseup', onSeekUp);
    });

    $progress.addEventListener('touchstart', function (e) {
      isSeeking = true;
      seekFromEvent(e.touches[0]);
      document.addEventListener('touchmove', onSeekTouchMove, { passive: false });
      document.addEventListener('touchend', onSeekUp);
    });

    /* volume */
    $volumeSlider.addEventListener('input', function () {
      updateVolume(parseInt($volumeSlider.value, 10));
    });

    $volumeBtn.addEventListener('click', function () {
      if (volume > 0) {
        updateVolume(0);
        $volumeSlider.value = '0';
      } else {
        updateVolume(70);
        $volumeSlider.value = '70';
      }
    });

    /* keyboard shortcuts */
    document.addEventListener('keydown', function (e) {
      if (!$wrap || $wrap.classList.contains('removing')) return;
      if (e.code === 'Space') {
        /* only if not typing in an input */
        var tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        togglePlay();
      }
    });
  }

  function onSeekMove(e) {
    if (!isSeeking) return;
    seekFromEvent(e);
  }

  function onSeekTouchMove(e) {
    if (!isSeeking) return;
    e.preventDefault();
    seekFromEvent(e.touches[0]);
  }

  function onSeekUp() {
    isSeeking = false;
    document.removeEventListener('mousemove', onSeekMove);
    document.removeEventListener('mouseup', onSeekUp);
    document.removeEventListener('touchmove', onSeekTouchMove);
    document.removeEventListener('touchend', onSeekUp);
  }

  /* ====== helpers ====== */
  function formatTime(sec) {
    var s = Math.floor(sec || 0);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ====== autoplay fallback for mobile ====== */
  function waitForInteraction() {
    var interacted = false;
    function onInteract() {
      if (interacted) return;
      interacted = true;
      document.removeEventListener('click', onInteract);
      document.removeEventListener('touchstart', onInteract);
      document.removeEventListener('keydown', onInteract);
      if (audio && audio.paused) {
        audio.play().catch(function () {});
      }
    }
    document.addEventListener('click', onInteract, { once: false });
    document.addEventListener('touchstart', onInteract, { once: false });
    document.addEventListener('keydown', onInteract, { once: false });
  }

  /* ====== stop on navigation ====== */
  window.addEventListener('pagehide', function () {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  window.addEventListener('beforeunload', function () {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  /* ====== bootstrap ====== */
  init();
})();
