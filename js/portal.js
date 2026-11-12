/* Bhuiyan Academy preview: student portal demonstration.
   Seed (js/portal-seed.js, window.BA_SEED) + localStorage overrides (key ba_portal_v1).
   Nothing leaves the browser. Overrides: notices added in the office view, read marks, role flag. */
(function () {
  'use strict';

  var KEY = 'ba_portal_v1';
  var SEED = window.BA_SEED;
  if (!SEED) { return; }

  var ASSESSMENT = '2027-10-01';                       // indicative start of the October 2027 UoL cycle
  var DEFAULT_UNREAD = ['N-2026-11-18', 'N-2026-11-26', 'N-2026-12-03'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* Storage ------------------------------------------------------------ */
  var memory = null;
  function rawGet() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return memory; }
  }
  function rawSet(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { memory = v; }
  }
  function rawClear() {
    memory = null;
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }
  function blank() { return { v: 1, added: [], read: {}, role: null }; }
  function load() {
    var raw = rawGet();
    var s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    if (!s || typeof s !== 'object') { s = blank(); rawSet(JSON.stringify(s)); }
    if (!Array.isArray(s.added)) { s.added = []; }
    if (!s.read || typeof s.read !== 'object') { s.read = {}; }
    return s;
  }
  function save() { rawSet(JSON.stringify(state)); }
  var state = load();

  /* Helpers ------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseISO(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayDate() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(s) {
    var d = typeof s === 'string' ? parseISO(s) : s;
    return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function daysUntil(s) { return Math.round((parseISO(s) - todayDate()) / 86400000); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // Bangladeshi digit grouping: Tk 1,12,500
  function fmtBDT(n) {
    var s = String(Math.round(n));
    var last = s.slice(-3);
    var rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return 'Tk ' + (rest ? rest + ',' + last : last);
  }

  var BADGES = {
    paid: ['ok', 'Paid'], due: ['warn', 'Due'], overdue: ['due', 'Overdue'], upcoming: ['', 'Upcoming'],
    first: ['ok', 'First'], '2:1': ['ok', '2:1'], '2:2': ['warn', '2:2'], third: ['due', 'Third']
  };
  function badge(key) {
    var b = BADGES[String(key).toLowerCase()] || ['', key];
    return '<span class="badge' + (b[0] ? ' badge--' + b[0] : '') + '">' + esc(b[1]) + '</span>';
  }

  var toastTimer = null;
  function toast(msg) {
    var old = $('.toast');
    if (old) { old.remove(); }
    clearTimeout(toastTimer);
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    toastTimer = setTimeout(function () { t.remove(); }, 3200);
  }

  /* Notices ------------------------------------------------------------ */
  function allNotices() {
    var local = state.added.map(function (n) { return Object.assign({ local: true }, n); });
    return local.concat(SEED.notices);
  }
  function boardOrder() {
    return allNotices().sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) { return a.pinned ? -1 : 1; }          // pinned first
      if (!!a.local !== !!b.local) { return a.local ? -1 : 1; }              // office posts above the seed
      if (a.local && b.local) { return (b.addedAt || 0) - (a.addedAt || 0); }
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;                 // then date, newest first
    });
  }
  function isRead(n) {
    if (Object.prototype.hasOwnProperty.call(state.read, n.id)) { return !!state.read[n.id]; }
    return !(n.local || DEFAULT_UNREAD.indexOf(n.id) !== -1);
  }
  function unreadCount() { return allNotices().filter(function (n) { return !isRead(n); }).length; }

  function noticeHTML(n, opts) {
    opts = opts || {};
    var unread = !isRead(n);
    var meta = '<span class="notice__date">' + fmtDate(n.date) + '</span>' +
      (n.pinned ? '<span class="notice__pin">Pinned</span>' : '') +
      (opts.office && n.local ? '<span class="notice__pin">Posted here</span>' : '') +
      (!opts.office && unread ? '<span class="notice__new">New</span>' : '');
    var actions = '';
    if (opts.toggle) {
      actions = '<button type="button" class="btn btn--text notice__toggle" data-toggle-read="' + esc(n.id) + '">' +
        (unread ? 'Mark as read' : 'Mark as unread') + '</button>';
    }
    if (opts.office && n.local) {
      actions = '<button type="button" class="btn btn--text notice__toggle" data-remove-notice="' + esc(n.id) + '">Remove</button>';
    }
    return '<article class="notice' + (!opts.office && unread ? ' is-unread' : '') + '" data-id="' + esc(n.id) + '">' +
      '<div class="notice__meta">' + meta + '</div>' +
      '<div><h3 class="notice__title">' + esc(n.title) + '</h3>' +
      '<p class="notice__summary">' + esc(n.body) + '</p>' + actions + '</div></article>';
  }

  /* Timetable ------------------------------------------------------------ */
  function dayEntry(name) {
    for (var i = 0; i < SEED.timetable.length; i++) {
      if (SEED.timetable[i].day === name) { return SEED.timetable[i]; }
    }
    return null;
  }
  function toMinutes(t) {                    // seed times have no am/pm: hours below 8 are afternoon
    var p = t.split(':'), h = +p[0];
    if (h < 8) { h += 12; }
    return h * 60 + (+p[1]);
  }
  function slotRange(slot) { var r = slot.time.split(/\s*-\s*/); return [toMinutes(r[0]), toMinutes(r[1])]; }
  function clock(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h % 12 || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'pm' : 'am');
  }
  function timeText(slot) { return slot.time.replace(/\s*-\s*/, ' – '); }
  function nextClass() {
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes();
    for (var off = 0; off < 7; off++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
      var entry = dayEntry(DAYS[d.getDay()]);
      if (!entry) { continue; }
      for (var i = 0; i < entry.slots.length; i++) {
        var r = slotRange(entry.slots[i]);
        if (off > 0 || r[1] > mins) {
          return { off: off, day: entry.day, slot: entry.slots[i], start: r[0], live: off === 0 && r[0] <= mins };
        }
      }
    }
    return null;
  }

  /* Page renderers ------------------------------------------------------ */
  var R = {};

  R.dashboard = function () {
    var f = SEED.fees.instalments, nextFee = null, i;
    for (i = 0; i < f.length; i++) { if (f[i].status !== 'paid') { nextFee = f[i]; break; } }
    var nc = nextClass(), ncValue = '-', ncNote = 'No classes scheduled';
    if (nc) {
      ncValue = nc.live ? 'Now' : (nc.off === 0 ? 'Today' : nc.off === 1 ? 'Tomorrow' : nc.day.slice(0, 3)) + ' ' + clock(nc.start);
      ncNote = nc.slot.module + ' · Room ' + nc.slot.room;
    }
    var days = daysUntil(ASSESSMENT);
    var unread = unreadCount(), total = allNotices().length;
    var feeStatus = nextFee ? nextFee.status : 'paid';
    var feeNote = nextFee ? 'Instalment ' + nextFee.no + ': ' + nextFee.display + ' due ' + fmtDate(nextFee.date) : 'All instalments paid';

    var rows = [
      ['Next class', ncValue, ncNote],
      ['Next assessment', days > 0 ? plural(days, 'day', 'days') : 'This month', 'UoL assessments, Oct 2027 (indicative)'],
      ['Unread notices', String(unread), 'of ' + total + ' on the board'],
      ['Fee status', badge(feeStatus), feeNote]
    ];
    $('[data-mount="stats"]').innerHTML = rows.map(function (r) {
      return '<li class="stat"><span class="stat__label">' + r[0] + '</span><span><span class="stat__value">' + r[1] +
        '</span><span class="stat__note">' + esc(r[2]) + '</span></span></li>';
    }).join('');

    var now = new Date(), tdName = DAYS[now.getDay()], entry = dayEntry(tdName);
    var mount = $('[data-mount="today"]');
    $('[data-today]').textContent = tdName + ', ' + fmtDate(todayDate());
    if (!entry) {
      mount.innerHTML = '<div class="empty"><p class="empty__title">No classes on ' + tdName + '</p><p class="empty__text">' +
        (nc ? 'Next: ' + esc(nc.day) + ' ' + clock(nc.start) + ', ' + esc(nc.slot.module) + '.' : 'The timetable resumes on Saturday.') + '</p></div>';
    } else {
      var mins = now.getHours() * 60 + now.getMinutes(), flagged = false;
      mount.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr><th>Time</th><th>Module</th><th>Room</th></tr></thead><tbody>' +
        entry.slots.map(function (s) {
          var r = slotRange(s), cls = '', tag = '';
          if (r[0] <= mins && mins < r[1]) { cls = ' class="is-now"'; tag = ' <span class="notice__new">Now</span>'; flagged = true; }
          else if (!flagged && r[0] > mins) { cls = ' class="is-now"'; tag = ' <span class="notice__new">Next</span>'; flagged = true; }
          return '<tr' + cls + '><td class="num">' + timeText(s) + '</td><td>' + esc(s.module) + tag +
            '<span class="data__sub">' + esc(s.lecturer) + '</span></td><td class="num">' + esc(s.room) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    $('[data-mount="latest"]').innerHTML = '<div class="notice-list">' +
      boardOrder().slice(0, 3).map(function (n) { return noticeHTML(n); }).join('') + '</div>';
  };

  R.notices = function () {
    var list = boardOrder(), unread = unreadCount();
    $('[data-mount="notices"]').innerHTML = list.map(function (n) { return noticeHTML(n, { toggle: true }); }).join('');
    $('[data-count]').textContent = list.length + ' notices · ' + unread + ' unread';
  };

  R.timetable = function () {
    var order = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    var todayName = DAYS[new Date().getDay()], max = 0;
    order.forEach(function (d) { var e = dayEntry(d); if (e) { max = Math.max(max, e.slots.length); } });
    var head = '<tr><th scope="col">Slot</th>' + order.map(function (d) {
      return '<th scope="col"' + (d === todayName ? ' class="is-today"' : '') + '>' + d +
        (d === todayName ? ' <span class="tt__today">Today</span>' : '') + '</th>';
    }).join('') + '</tr>';
    var body = '';
    for (var r = 0; r < max; r++) {
      body += '<tr><th scope="row" class="tt__slot">' + (r + 1) + '</th>' + order.map(function (d) {
        var e = dayEntry(d), s = e && e.slots[r], cls = d === todayName ? ' class="is-today"' : '';
        if (!s) { return '<td' + cls + '><span class="muted">-</span></td>'; }
        return '<td' + cls + '><span class="tt__time">' + timeText(s) + '</span><span class="tt__module">' + esc(s.module) +
          '</span><span class="tt__meta">' + esc(s.lecturer) + ' · Room ' + esc(s.room) + '</span></td>';
      }).join('') + '</tr>';
    }
    $('[data-mount="grid"]').innerHTML = '<div class="table-wrap"><table class="data tt"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    $('[data-today-note]').textContent = todayName === 'Friday'
      ? 'No classes on Friday. The week resumes on Saturday.'
      : 'Today, ' + todayName + ', is highlighted.';
  };

  R.results = function () {
    var rows = SEED.results.rows, sum2 = 0, good = 0;
    rows.forEach(function (r) { sum2 += r.mock2; if (r.band === 'First' || r.band === '2:1') { good++; } });
    var stats = [
      ['Modules', String(rows.length), 'indicative list'],
      ['Average, mock 2', (sum2 / rows.length).toFixed(1), 'out of 100'],
      ['At 2:1 or above', good + ' of ' + rows.length, 'by grade band']
    ];
    $('[data-mount="summary"]').innerHTML = stats.map(function (r) {
      return '<li class="stat"><span class="stat__label">' + r[0] + '</span><span><span class="stat__value">' + r[1] +
        '</span><span class="stat__note">' + r[2] + '</span></span></li>';
    }).join('');
    $('[data-mount="marks"]').innerHTML = '<div class="table-wrap"><table class="data"><thead><tr><th>Module</th>' +
      '<th class="num">Mock 1</th><th class="num">Mock 2</th><th>Grade band</th><th>Mock 2 against 40 and 70</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(r.module) + '<span class="data__sub">' + esc(r.code) + '</span></td>' +
          '<td class="num">' + r.mock1 + '</td><td class="num">' + r.mock2 + '</td><td>' + badge(r.band) + '</td>' +
          '<td class="bar-cell"><div class="bar" role="img" aria-label="Mock 2: ' + r.mock2 + ' out of 100"><span class="bar__fill" style="width:' + r.mock2 + '%"></span></div></td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  R.fees = function () {
    var inst = SEED.fees.instalments, total = 0, paid = 0, i;
    inst.forEach(function (x) { total += x.amount; if (x.status === 'paid') { paid += x.amount; } });
    var next = null;
    for (i = 0; i < inst.length; i++) { if (inst[i].status !== 'paid') { next = inst[i]; break; } }
    var stats = [
      ['Total fee', fmtBDT(total), 'three instalments'],
      ['Paid', fmtBDT(paid), 'receipts at the accounts desk'],
      ['Outstanding', fmtBDT(total - paid), next ? 'next: ' + fmtDate(next.date) : 'nothing due']
    ];
    $('[data-mount="summary"]').innerHTML = stats.map(function (r) {
      return '<li class="stat"><span class="stat__label">' + r[0] + '</span><span><span class="stat__value">' + r[1] +
        '</span><span class="stat__note">' + r[2] + '</span></span></li>';
    }).join('');
    var pct = total ? Math.round(paid / total * 100) : 0;
    var STATUS_LINE = {
      paid: function (x) { return 'Paid ' + fmtDate(x.date) + (x.receipt ? ' · Receipt ' + esc(x.receipt) : ''); },
      due: function (x) { var d = daysUntil(x.date); return d >= 0 ? 'Due in ' + plural(d, 'day', 'days') : 'Overdue by ' + plural(-d, 'day', 'days'); },
      overdue: function (x) { return 'Overdue since ' + fmtDate(x.date); },
      upcoming: function () { return 'Not yet due'; }
    };
    $('[data-mount="statement"]').innerHTML =
      '<div class="feebar" role="img" aria-label="' + pct + ' percent of this year’s fee paid">' +
        '<div class="feebar__track"><span class="feebar__fill" style="width:' + pct + '%"></span></div>' +
        '<p class="feebar__text"><strong>' + fmtBDT(paid) + '</strong> paid of ' + fmtBDT(total) + ' · ' + pct + '%</p>' +
      '</div>' +
      '<ol class="inst">' + inst.map(function (x) {
        var line = (STATUS_LINE[x.status] || STATUS_LINE.upcoming)(x);
        return '<li class="inst__row inst__row--' + x.status + '">' +
          '<div class="inst__main"><p class="inst__title">Instalment ' + x.no + '</p>' +
          '<p class="inst__due">Due ' + fmtDate(x.date) + '</p></div>' +
          '<p class="inst__status">' + line + '</p>' +
          '<div class="inst__money"><span class="inst__amount">' + fmtBDT(x.amount) + '</span>' + badge(x.status) + '</div>' +
          '</li>';
      }).join('') + '</ol>' +
      '<div class="inst__total"><span>Outstanding</span><strong>' + fmtBDT(total - paid) + '</strong></div>';
  };

  var resFilter = 'all';
  var TYPE_LABEL = { notes: 'Notes', 'past-paper': 'Past paper', reading: 'Reading' };
  R.resources = function () {
    $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === resFilter ? 'true' : 'false'); });
    var html = '';
    SEED.resources.forEach(function (m) {
      var items = m.items.filter(function (it) { return resFilter === 'all' || it.type === resFilter; });
      if (!items.length) { return; }
      html += '<section class="panel res"><div class="panel__head"><h3 class="panel__title">' + esc(m.module) + '</h3>' +
        '<span class="panel__meta">' + plural(items.length, 'item', 'items') + '</span></div>' +
        '<div class="table-wrap table-wrap--flat"><table class="data"><thead><tr><th>Title</th><th>Type</th><th class="num">Added</th></tr></thead><tbody>' +
        items.map(function (it) {
          return '<tr><td>' + esc(it.title) + '</td><td><span class="badge">' + (TYPE_LABEL[it.type] || esc(it.type)) +
            '</span></td><td class="num">' + fmtDate(it.date) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    });
    $('[data-mount="resources"]').innerHTML = html ||
      '<div class="empty"><p class="empty__title">Nothing of that type yet</p><p class="empty__text">Use the request form to ask the office.</p></div>';
  };

  var highlightId = null;
  R['admin-notices'] = function () {
    var list = boardOrder();
    $('[data-mount="board"]').innerHTML = '<div class="notice-list">' +
      list.map(function (n) { return noticeHTML(n, { office: true }); }).join('') + '</div>';
    $('[data-count]').textContent = list.length + ' on the board · ' + plural(state.added.length, 'posted here', 'posted here');
    if (highlightId) {
      var row = $('[data-id="' + highlightId + '"]');
      highlightId = null;
      if (row) {
        row.classList.add('is-new');
        if (row.scrollIntoView) { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        setTimeout(function () { row.classList.remove('is-new'); }, 1200);
      }
    }
  };

  function waLink(phone) {
    var d = String(phone).replace(/\D/g, '').replace(/^0+/, '');
    return 'https://wa.me/880' + d;
  }
  function prettyPhone(phone) {
    var d = String(phone).replace(/\D/g, '');
    return d.length === 11 ? d.slice(0, 5) + '-' + d.slice(5) : phone;
  }
  R['admin-students'] = function () {
    var input = $('#student-search'), q = input ? input.value.trim().toLowerCase() : '';
    var all = SEED.students;
    var rows = all.filter(function (s) {
      return !q || (s.name + ' ' + s.id + ' ' + s.programme + ' ' + s.batch).toLowerCase().indexOf(q) !== -1;
    });
    var due = rows.filter(function (s) { return s.feeStatus !== 'paid'; }).length;
    $('[data-count]').textContent = (q ? rows.length + ' of ' + all.length : all.length) + ' students · ' + due + ' fees due';
    $('[data-mount="students"]').innerHTML = rows.length
      ? '<div class="table-wrap"><table class="data"><thead><tr><th>ID</th><th>Name</th><th>Programme</th><th>Batch</th><th>Fees</th><th>Phone</th></tr></thead><tbody>' +
        rows.map(function (s) {
          return '<tr><td class="num">' + esc(s.id) + '</td><td>' + esc(s.name) + '</td><td>' + esc(s.programme) + '</td>' +
            '<td class="num">' + esc(s.batch) + '</td><td>' + badge(s.feeStatus) + '</td>' +
            '<td class="num">' + esc(prettyPhone(s.phone)) + ' <a class="wa" href="' + waLink(s.phone) +
            '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(s.name) + '">WhatsApp</a></td></tr>';
        }).join('') + '</tbody></table></div>'
      : '<div class="empty"><p class="empty__title">No student matches “' + esc(input.value.trim()) + '”</p><p class="empty__text">Try a name, an ID such as BA-25, or a programme.</p></div>';
  };

  /* Shell ------------------------------------------------------------------ */
  var nav = document.body.getAttribute('data-nav') || '';
  var office = nav.indexOf('admin') === 0;

  function fillShell() {
    var name = office ? 'Front office' : SEED.student.name;
    $$('[data-student-name]').forEach(function (el) { el.textContent = name; });
    $$('[data-student-id]').forEach(function (el) { el.textContent = office ? 'Demo staff view' : SEED.student.id; });
    $$('[data-first-name]').forEach(function (el) { el.textContent = SEED.student.name.split(' ')[0]; });
    $$('[data-student-line]').forEach(function (el) {
      el.textContent = SEED.student.programme + ' · Year ' + SEED.student.year + ' · batch ' + SEED.student.batch;
    });
    var sidebar = $('.sidebar');
    if (sidebar && !$('.sidebar__foot')) {
      var foot = document.createElement('div');
      foot.className = 'sidebar__foot';
      foot.innerHTML = '<button type="button" class="sidebar__reset" data-reset>Reset demo data</button>';
      sidebar.appendChild(foot);
    }
    $$('[data-default-today]').forEach(function (el) { if (!el.value) { el.value = toISO(todayDate()); } });
    var badgeEl = $('[data-unread-badge]');
    if (badgeEl) { badgeEl.textContent = String(unreadCount()); }
  }

  function render() {
    if (R[nav]) { R[nav](); }
    fillShell();
  }

  /* Events ----------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-toggle-read],[data-remove-notice],[data-mark-all],[data-reset],[data-enter],[data-filter],[aria-disabled="true"]') : null;
    if (!t) { return; }

    if (t.hasAttribute('data-enter')) {
      state.role = t.getAttribute('data-enter');
      save();
      return;                                         // let the link navigate
    }
    if (t.hasAttribute('data-reset')) {
      rawClear();
      toast('Demo data reset.');
      setTimeout(function () { window.location.reload(); }, 450);
      return;
    }
    if (t.hasAttribute('data-toggle-read')) {
      var id = t.getAttribute('data-toggle-read'), n = allNotices().filter(function (x) { return x.id === id; })[0];
      if (n) { state.read[id] = isRead(n) ? false : true; save(); render(); }
      return;
    }
    if (t.hasAttribute('data-mark-all')) {
      allNotices().forEach(function (n) { state.read[n.id] = true; });
      save(); render(); toast('All notices marked as read.');
      return;
    }
    if (t.hasAttribute('data-remove-notice')) {
      var rid = t.getAttribute('data-remove-notice');
      state.added = state.added.filter(function (x) { return x.id !== rid; });
      delete state.read[rid];
      save(); render(); toast('Notice removed from the board.');
      return;
    }
    if (t.hasAttribute('data-filter')) {
      resFilter = t.getAttribute('data-filter');
      render();
      return;
    }
    if (t.getAttribute('aria-disabled') === 'true' && t.tagName === 'A') {
      e.preventDefault();
      toast('This is disabled in the demonstration.');
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.hasAttribute('data-form-notice')) {
      e.preventDefault();
      var title = form.elements.title, body = form.elements.body, date = form.elements.date;
      var ok = true;
      [[title, 'Add a title.'], [body, 'Write the notice text.']].forEach(function (p) {
        var err = $('[data-error-for="' + p[0].name + '"]', form), bad = !p[0].value.trim();
        p[0].setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (err) { err.textContent = p[1]; err.hidden = !bad; }
        if (bad) { ok = false; }
      });
      if (!ok) { (title.value.trim() ? body : title).focus(); return; }
      var n = {
        id: 'N-local-' + Date.now(),
        date: date.value || toISO(todayDate()),
        title: title.value.trim(),
        body: body.value.trim(),
        pinned: form.elements.pinned.checked,
        addedAt: Date.now()
      };
      state.added.unshift(n);
      save();
      highlightId = n.id;
      title.value = ''; body.value = ''; form.elements.pinned.checked = false; date.value = toISO(todayDate());
      render();
      toast('Posted. Students see it on their notice board now.');
      return;
    }
    if (form.hasAttribute('data-form-request')) {
      e.preventDefault();
      var what = form.elements.what;
      var err2 = $('[data-error-for="what"]', form);
      if (!what.value.trim()) {
        what.setAttribute('aria-invalid', 'true');
        if (err2) { err2.textContent = 'Say what you need.'; err2.hidden = false; }
        what.focus();
        return;
      }
      what.setAttribute('aria-invalid', 'false');
      if (err2) { err2.hidden = true; }
      form.reset();
      toast('Request noted for the office (demonstration only, nothing is sent).');
      return;
    }
    if (form.hasAttribute('data-form-disabled')) {
      e.preventDefault();
      toast('Sign-in is disabled in the demonstration.');
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'student-search') { render(); }
  });

  // A notice posted in another tab shows up here without a reload.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { state = load(); render(); }
  });

  render();
})();
