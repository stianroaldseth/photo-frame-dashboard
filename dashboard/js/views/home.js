// Home / Today: the glanceable overview. Never scrolls.
(function () {
  'use strict';
  var D = window.DATA, V = {};

  function clock() {
    var n = App.now();
    return '<div class="h-time num">' + App.fmt.time(n) + '</div>' +
      '<div class="h-date"><b>' + App.fmt.day(n) + '</b> ' + App.fmt.ddmm(n) + '<span class="h-week">Uge ' + App.fmt.week(n) + '</span></div>';
  }

  function commute(c) {
    if (!c) return '';
    return '<span class="h-cm h-cm--' + c.verdict + '" title="' + App.esc(c.text) + '">' + (c.day === 'tomorrow' ? '<small>i morgen</small>' : '') + '<b>' + c.label + '</b>' + App.esc(c.short || c.text) + '</span>';
  }

  function weather() {
    var w = App.weatherNow(), env = App.feeds.weather;
    var hours = App.hourly(7);
    var temps = hours.map(function (h) { return h.t; });
    var tmin = Math.min.apply(null, temps), tmax = Math.max.apply(null, temps);
    return '<div class="h-wx-top">' +
      '<span class="h-wx-icon">' + App.icon(w.cond, 60) + '</span>' +
      '<span class="h-wx-temp num">' + w.temp + '°</span>' +
      '<span class="h-wx-meta"><b>' + w.label + '</b><span>' + w.hi + '° / ' + w.lo + '° · ' + App.esc(w.summary) + '</span></span>' +
      App.staleTag(env) +
      '</div>' +
      '<div class="h-wx-commute">' + App.icon('bike', 26) + (w.commute ? commute(w.commute.morning) + commute(w.commute.afternoon) : '') + '</div>' +
      '<div class="h-wx-hours">' + hours.map(function (h) {
        var lift = tmax === tmin ? 0 : Math.round((h.t - tmin) / (tmax - tmin) * 8);
        return '<div class="h-hr' + (h.p >= 50 ? ' is-wet' : '') + '"><span class="h-hr-l">' + h.label + '</span>' +
          '<span class="h-hr-i" style="transform:translateY(' + -lift + 'px)">' + App.icon(h.c, 22) + '</span><b>' + h.t + '°</b></div>';
      }).join('') + '</div>';
  }

  // Electricity: next ~24 hours as bars, cheapest charging window highlighted.
  function power() {
    var env = App.feeds.electricity, E = env && env.data;
    if (!E) return '<div class="label">Strøm · DK2</div><div class="h-free serif"><i>Henter elpriser …</i></div>';
    var cur = Math.floor(App.now() / 36e5) * 36e5;
    var hours = E.hours.filter(function (h) { return Date.parse(h.start) >= cur; }).slice(0, 24);
    var max = Math.max.apply(null, hours.map(function (h) { return h.price; }).concat([0.01]));
    var c = E.cheapest, cs = c && Date.parse(c.start), ce = c && Date.parse(c.end);
    var bars = hours.map(function (h, i) {
      var t = Date.parse(h.start), hr = new Date(t).getHours(), cheap = c && t >= cs && t < ce;
      var label = i === 0 ? 'nu' : hr % 6 === 0 ? (hr < 10 ? '0' : '') + hr : '';
      return '<i class="' + (cheap ? 'is-cheap' : '') + (i === 0 ? ' is-now' : '') + '" style="height:' + Math.max(6, Math.round(Math.max(0, h.price) / max * 100)) + '%"><span>' + label + '</span></i>';
    }).join('');
    var when = c ? App.fmt.rel(new Date(cs)).toLowerCase() + ' ' + App.fmt.time(new Date(cs)) + '–' + App.fmt.time(new Date(ce)) : '';
    return '<div class="label">Strøm · DK2 · nu <b class="num">' + App.fmt.num(E.now, 2) + '</b> kr/kWh' + App.staleTag(env) + '</div>' +
      '<div class="h-pw-bars">' + bars + '</div>' +
      (c ? '<div class="h-pw-tip">' + App.icon('car', 22) + '<span>Billigst at lade <b>' + when + '</b> · ' + App.fmt.num(c.avgPrice, 2) + ' kr</span></div>' : '');
  }

  // Widget 3: who takes the kids to Pilegården and who picks them up.
  function dropoff() {
    var env = App.feeds.dropoff, X = env && env.data;
    function row(kind, label, x) {
      if (!x) return '<div class="h-drop-row is-open"><span class="h-drop-k">' + label + '</span><span class="h-drop-who">Ikke aftalt</span></div>';
      var who = Array.isArray(x.who) ? x.who : [x.who];
      var p = x.who ? App.person(who[0]) : D.family;
      return '<div class="h-drop-row" style="' + App.pstyle(p) + '"><span class="h-drop-k">' + label + '</span>' +
        '<span class="h-drop-who">' + (x.who ? who.map(function (id) { return App.person(id).name; }).join(' + ') : App.esc(x.title)) + '</span>' +
        '<b class="h-drop-t num">' + App.fmt.time(new Date(x.time)) + '</b></div>';
    }
    var head = '<div class="label">Pilegården' + App.staleTag(env) + '</div>';
    if (!X) return head;
    var weekend = [0, 6].indexOf(App.now().getDay()) > -1;
    if (weekend && !X.dropoff && !X.pickup) return head + '<div class="h-drop-free serif"><i>Weekend</i> – ingen aflevering</div>';
    return head + row('drop', 'Aflevering', X.dropoff) + row('pick', 'Hentning', X.pickup);
  }

  // Widget 2: the kids' day in pictures.
  function kids() {
    var env = App.feeds.kids, K = env && env.data;
    if (!K) return '<div class="label">Børnenes dag</div>';
    return '<div class="label">Børnenes dag' + App.staleTag(env) + '</div><div class="h-kids-row">' + K.items.map(function (i) {
      var dots = i.who.map(function (id) { return '<i style="' + App.pstyle(id) + '"></i>'; }).join('');
      var t = i.start ? App.fmt.time(new Date(i.start)) : '';
      return '<div class="h-kid"><span class="h-kid-pic">' + i.emoji + '</span><span class="h-kid-dots">' + dots + '</span>' +
        '<b>' + App.esc(i.label) + '</b>' + (t ? '<small class="num">' + t + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function hero() {
    var e = App.nextEvent(), now = App.now();
    if (!e) {
      var tomorrow = App.timedOn(App.addDays(now, 1))[0];
      return '<div class="h-hero h-hero--empty" data-go="calendar">' +
        '<div class="label label--light">Resten af dagen</div>' +
        '<div class="h-hero-title serif">Intet mere i dag.<br><i>Nyd roen.</i></div>' +
        (tomorrow ? '<div class="h-hero-meta">I morgen starter med <b>' + App.esc(tomorrow.title) + '</b> kl. ' + App.fmt.time(tomorrow.start) + '</div>' : '') +
        '</div>';
    }
    var p = App.evColor(e);
    var mins = (e.start - now) / 60000;
    var leave = (App.leaveBy(e) - now) / 60000;
    var who = e.people.map(function (id) { return App.person(id).name; });
    var whoText = App.isFamily(e) ? 'Alle' : who.join(' + ');
    var big = mins < 100
      ? '<div class="h-hero-count num">' + Math.round(mins) + '<small>min</small></div>'
      : '<div class="h-hero-count num">' + App.fmt.time(e.start) + '<small>kl.</small></div>';
    var leavePill = '';
    if (e.travel) {
      leavePill = leave <= 0
        ? '<span class="pill pill--alert"><i class="pulse"></i>Afsted nu</span>'
        : '<span class="pill' + (leave <= 15 ? ' pill--soon' : '') + '">' + App.icon('car', 20) + 'Afsted om ' + App.fmt.mins(leave) + '</span>';
    }
    return '<button class="h-hero" style="' + App.pstyle(p) + '" data-ev="' + e.id + '">' +
      '<div class="h-hero-main">' +
      '  <div class="label label--on">Næste · ' + App.esc(whoText) + '</div>' +
      '  <div class="h-hero-title serif">' + App.esc(e.title) + '</div>' +
      '  <div class="h-hero-meta">' + App.fmt.range(e.start, e.end) + (e.loc ? ' · ' + App.esc(e.loc) : '') + '</div>' +
      '  <div class="h-hero-foot">' + (e.people.length > 1 ? App.dots(e.people, 22) : '') + leavePill + '</div>' +
      '</div>' + big + '</button>';
  }

  function lanes() {
    var now = App.now();
    return D.people.map(function (p) {
      var list = App.timedOn(now, p.id).filter(function (e) { return e.end > now; });
      var shown = list.slice(0, 3), more = list.length - shown.length;
      return '<div class="h-lane" style="' + App.pstyle(p) + '">' +
        '<div class="h-lane-head">' + App.avatar(p, 30) + '<b>' + p.name + '</b></div>' +
        (list.length ? shown.map(function (e) {
          var cur = e.start <= now;
          return '<button class="h-ev' + (cur ? ' is-now' : '') + '" data-ev="' + e.id + '">' +
            '<span class="h-ev-t">' + (cur ? 'Nu' : App.fmt.time(e.start)) + '</span>' +
            '<span class="h-ev-n">' + App.esc(e.title) + '</span></button>';
        }).join('') : '<div class="h-free serif"><i>Fri</i> resten af dagen</div>') +
        (more > 0 ? '<button class="h-more" data-go="calendar">+' + more + ' mere</button>' : '') +
        '</div>';
    }).join('');
  }

  function ring(done, total, size) {
    var r = size / 2 - 5, c = 2 * Math.PI * r, f = total ? done / total : 0;
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-bg"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-fg" stroke-dasharray="' + (c * f) + ' ' + c + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  }
  App.ring = ring;

  function paint() {
    var el = V.el;
    el.querySelector('.h-clock').innerHTML = clock();
    el.querySelector('.h-weather').innerHTML = weather();
    el.querySelector('.h-presence').innerHTML = dropoff();
    el.querySelector('.h-hero-slot').innerHTML = hero();
    el.querySelector('.h-lanes').innerHTML = lanes();
    el.querySelector('.h-power').innerHTML = power();
    el.querySelector('.h-kids').innerHTML = kids();
  }

  function photoCaption(s) {
    var m = App.photoMeta(s.photos[0]);
    V.el.querySelector('.h-photo-cap').innerHTML = '<b>' + (m.onThisDay ? 'På denne dag · ' : '') + m.kicker + '</b><span>' + App.esc(m.place) + '</span>';
  }

  App.register('home', {
    show: function (el) {
      V.el = el;
      if (!el.firstChild) {
        el.innerHTML = '<div class="home">' +
          '<div class="h-clock" data-go="calendar"></div>' +
          '<div class="h-weather"></div>' +
          '<div class="h-presence"></div>' +
          '<div class="h-main"><div class="h-hero-slot"></div><div class="h-lanes" ></div></div>' +
          '<div class="h-side">' +
          '  <button class="h-photo" data-go="photos"><div class="h-photo-stage"></div><div class="h-photo-cap"></div></button>' +
          '  <div class="h-power card"></div>' +
          '  <div class="h-kids card"></div>' +
          '</div></div>';
        el.addEventListener('click', function (e) {
          var ev = e.target.closest('[data-ev]');
          if (ev) { App.eventSheet(App.findEvent(ev.dataset.ev)); return; }
          var g = e.target.closest('[data-go]');
          if (g) App.go(g.dataset.go);
        });
        V.slides = new App.Slideshow(el.querySelector('.h-photo-stage'), { layout: 'cover', captions: false, interval: 12000, onChange: photoCaption });
      }
      paint();
      V.slides.start();
    },
    resume: function () { V.slides.start(); },
    hide: function () { if (V.slides) V.slides.stop(); }
  });
  // Every minute: just the clock and next-up countdown (cheap, even while hidden). Weather on the hour.
  App.on('minute', function (n) {
    if (!V.el || !V.el.firstChild) return;
    V.el.querySelector('.h-clock').innerHTML = clock();
    V.el.querySelector('.h-hero-slot').innerHTML = hero();
    if (n.getMinutes() === 0) { V.el.querySelector('.h-weather').innerHTML = weather(); V.el.querySelector('.h-power').innerHTML = power(); V.el.querySelector('.h-lanes').innerHTML = lanes(); }
  });
  App.on('data', function () { if (App.current === 'home') paint(); });
  App.on('feed', function (name) {
    if (!V.el || !V.el.firstChild) return;
    if (name === 'weather') V.el.querySelector('.h-weather').innerHTML = weather();
    if (name === 'electricity') V.el.querySelector('.h-power').innerHTML = power();
    if (name === 'dropoff') V.el.querySelector('.h-presence').innerHTML = dropoff();
    if (name === 'kids') V.el.querySelector('.h-kids').innerHTML = kids();
  });
})();
