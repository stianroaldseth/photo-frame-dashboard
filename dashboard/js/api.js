// Polls /api/<widget>, keeps the latest envelope in App.feeds and a copy in localStorage, so the
// wall still shows the last known data (marked stale) if the server or the Wi-Fi is down.
(function () {
  'use strict';
  var KEY = 'feed:';
  App.feeds = {};

  function remember(name, env) { try { localStorage.setItem(KEY + name, JSON.stringify(env)); } catch (e) { /* storage full or blocked */ } }
  function recall(name) { try { return JSON.parse(localStorage.getItem(KEY + name)); } catch (e) { return null; } }

  function update(name, env) {
    App.feeds[name] = env;
    App.emit('feed', name);
    App.emit('feed:' + name, env);
  }

  // Poll `name` every `everyMs`. Server-side stale data passes through; a failed request falls
  // back to the previous envelope (in memory, else localStorage) with stale: true.
  App.poll = function (name, everyMs) {
    var cached = recall(name);
    if (cached) update(name, Object.assign({}, cached, { stale: true }));
    function run() {
      fetch('/api/' + name, { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (env) {
          if (env.data == null) throw new Error(env.error || 'no data');
          if (!env.stale) remember(name, env);
          update(name, env);
        })
        .catch(function () {
          var last = App.feeds[name] || recall(name);
          if (last) update(name, Object.assign({}, last, { stale: true }));
        })
        .then(function () { setTimeout(run, everyMs); });
    }
    run();
  };

  // Small "data from 14:05" marker for stale widgets; empty string when fresh.
  App.staleTag = function (env) {
    if (!env || !env.stale) return '';
    var t = env.updatedAt ? App.fmt.time(new Date(env.updatedAt)) : '';
    return '<span class="stale" title="Kunne ikke opdatere">' + App.icon('clock', 14) + (t ? 'data fra ' + t : 'forældet') + '</span>';
  };

  // ---------------------------------------------------------------- calendar → App state
  // /api/calendar gives people (with colours) and events as ISO strings; the views expect Date
  // objects in DATA.people / DATA.events.
  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function person(p) {
    var c = rgb(p.color), light = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 160;
    return Object.assign({}, p, { rgb: c.join(' '), ink: light ? '#111111' : '#FFFFFF' });
  }
  function localDay(ymd) { var a = ymd.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function event(e) {
    return {
      id: e.id, title: e.title, people: e.people, loc: e.location || '', allDay: e.allDay, tags: e.tags,
      start: e.allDay ? localDay(e.start) : new Date(e.start), end: e.allDay ? localDay(e.end) : new Date(e.end)
    };
  }
  App.on('feed:calendar', function (env) {
    var D = window.DATA, seen = {};
    D.people = env.data.people.map(person);
    D.ALL = D.people.map(function (p) { return p.id; });
    D.events = [];
    env.data.days.forEach(function (day) {
      day.events.forEach(function (e) { if (!seen[e.id]) { seen[e.id] = 1; D.events.push(event(e)); } });
    });
    App.rerender();
    App.emit('data');
  });

  App.on('ready', function () {
    App.poll('calendar', 5 * 60 * 1000);
    App.poll('kids', 5 * 60 * 1000);
    App.poll('dropoff', 5 * 60 * 1000);
    App.poll('birthdays', 30 * 60 * 1000);
    App.poll('weather', 10 * 60 * 1000);
    App.poll('electricity', 15 * 60 * 1000);
  });
})();
