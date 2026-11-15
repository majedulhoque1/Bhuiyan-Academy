/* Bhuiyan Academy preview: student portal and staff portal demonstration.
   Seed (js/portal-seed.js, window.BA_SEED) + localStorage overrides (key ba_portal_v1).
   Nothing leaves the browser. Overrides: notices, read marks, staff role, inquiry stages and added inquiries,
   payments recorded by Accounts, attendance saved by the Academic office. */
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
  function blank() { return { v: 1, added: [], read: {}, role: null, stage: {}, inq: [], payments: [], att: {} }; }
  function load() {
    var raw = rawGet();
    var s = null;
    if (raw) { try { s = JSON.parse(raw); } catch (e) { s = null; } }
    if (!s || typeof s !== 'object') { s = blank(); rawSet(JSON.stringify(s)); }
    if (!Array.isArray(s.added)) { s.added = []; }
    if (!s.read || typeof s.read !== 'object') { s.read = {}; }
    ['stage', 'att'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') { s[k] = {}; } });
    ['inq', 'payments'].forEach(function (k) { if (!Array.isArray(s[k])) { s[k] = []; } });
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

  /* Staff portal: departments, shared records -------------------------------- */
  var ROLES = {
    admissions: { name: 'Admissions', label: 'Admissions & front desk', home: 'Today at the front desk',
      pages: ['admin-dashboard', 'admin-inquiries', 'admin-students', 'admin-notices'] },
    accounts: { name: 'Accounts', label: 'Accounts desk', home: 'Today at the accounts desk',
      pages: ['admin-dashboard', 'admin-fees', 'admin-students'] },
    academic: { name: 'Academic', label: 'Academic office', home: 'Today in the academic office',
      pages: ['admin-dashboard', 'admin-attendance', 'admin-notices'] },
    principal: { name: 'Principal', label: 'Principal & management', home: 'Overview for the Principal',
      pages: ['admin-dashboard', 'admin-students'] }
  };
  var PAGE_OWNER = {
    'admin-inquiries': 'Admissions', 'admin-fees': 'Accounts', 'admin-attendance': 'Academic',
    'admin-notices': 'Admissions or Academic', 'admin-students': 'Admissions, Accounts or Principal'
  };
  var STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['visit', 'Visit booked'], ['enrolled', 'Enrolled'], ['lost', 'Not now']];
  var ACADEMY = 'Bhuiyan Academy';

  function isoOffset(days) { var d = todayDate(); d.setDate(d.getDate() + days); return toISO(d); }
  function waLink(phone) {
    var d = String(phone).replace(/\D/g, '').replace(/^0+/, '');
    return 'https://wa.me/880' + d;
  }
  function prettyPhone(phone) {
    var d = String(phone).replace(/\D/g, '');
    return d.length === 11 ? d.slice(0, 5) + '-' + d.slice(5) : phone;
  }
  function waBtn(phone, msg, who, label) {
    return '<a class="wa" href="' + waLink(phone) + (msg ? '?text=' + encodeURIComponent(msg) : '') +
      '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(who) + '">' + (label || 'WhatsApp') + '</a>';
  }
  function statsHTML(rows) {
    return rows.map(function (r) {
      return '<li class="stat"><span class="stat__label">' + r[0] + '</span><span><span class="stat__value">' + r[1] +
        '</span><span class="stat__note">' + esc(r[2]) + '</span></span></li>';
    }).join('');
  }
  function panel(span, title, meta, inner) {
    return '<section class="panel ' + span + '"><div class="panel__head"><h3 class="panel__title">' + title + '</h3>' +
      (meta ? '<span class="panel__meta">' + meta + '</span>' : '') + '</div>' + inner + '</section>';
  }
  function emptyHTML(title, text) {
    return '<div class="empty"><p class="empty__title">' + title + '</p>' + (text ? '<p class="empty__text">' + text + '</p>' : '') + '</div>';
  }

  // Inquiries: seed + added here, with stage changes applied and dates relative to today
  function inquiries() {
    return state.inq.concat(SEED.inquiries || []).map(function (q) {
      var stage = state.stage[q.id] || q.stage;
      var fu = q.followUp !== undefined ? q.followUp : (q.followUpIn == null ? null : isoOffset(q.followUpIn));
      if (stage === 'enrolled' || stage === 'lost') { fu = null; }
      return Object.assign({}, q, { stage: stage, date: q.date || isoOffset(-q.daysAgo), followUp: fu });
    });
  }
  function followUpsDue() {
    return inquiries().filter(function (q) { return q.followUp && daysUntil(q.followUp) <= 0; })
      .sort(function (a, b) { return a.followUp < b.followUp ? -1 : 1; });
  }

  // Students: seed + anyone Admissions has enrolled, with payments from Accounts applied
  function students() {
    var list = SEED.students.map(function (s) { return Object.assign({}, s); });
    inquiries().forEach(function (q) {
      if (q.stage !== 'enrolled') { return; }
      list.push({ id: 'BA-26-9' + String(q.id).replace(/\D/g, '').slice(-3), name: q.name, programme: q.programme,
        batch: 'New intake', feeStatus: 'due', dueAmount: null, phone: q.phone, attendance: null, fresh: true });
    });
    state.payments.forEach(function (p) {
      list.forEach(function (s) { if (s.id === p.studentId) { s.feeStatus = 'paid'; s.dueAmount = 0; s.receipt = p.no; } });
    });
    return list;
  }
  function studentById(id) { return students().filter(function (s) { return s.id === id; })[0]; }
  function receipts() {
    var seed = (SEED.receipts || []).map(function (r) { return Object.assign({ date: isoOffset(-r.daysAgo) }, r); });
    return state.payments.slice().reverse().concat(seed);
  }
  function sumReceipts(fromDays) {
    return receipts().filter(function (r) { return daysUntil(r.date) >= -fromDays; })
      .reduce(function (t, r) { return t + r.amount; }, 0);
  }
  function owing() { return students().filter(function (s) { return s.feeStatus !== 'paid'; }); }
  function outstanding() { return owing().reduce(function (t, s) { return t + (s.dueAmount || 0); }, 0); }
  function overdueList() {
    return students().filter(function (s) { return s.feeStatus === 'overdue'; })
      .sort(function (a, b) { return (b.overdueDays || 0) - (a.overdueDays || 0); });
  }

  // Attendance: saved by the Academic office today, otherwise the sample roll call
  function batches() {
    var seen = {}, out = [];
    SEED.students.forEach(function (s) { if (!seen[s.batch]) { seen[s.batch] = s.programme; out.push(s.batch); } });
    return out.map(function (b) { return { batch: b, programme: seen[b] }; });
  }
  function batchStudents(b) { return SEED.students.filter(function (s) { return s.batch === b; }); }
  function savedRoll(b) { var t = state.att[toISO(todayDate())]; return t && t[b] ? t[b] : null; }
  var NOT_TAKEN_YET = ['CertHE-2026B', 'BBA-20th'];     // sample: two batches still waiting for the roll call
  function isTaken(b) { return !!savedRoll(b) || NOT_TAKEN_YET.indexOf(b) === -1; }
  function absentIds(b) {
    var saved = savedRoll(b);
    if (saved) { return saved; }
    return batchStudents(b).filter(function (s) { return s.absentToday; }).map(function (s) { return s.id; });
  }
  function absentToday() {
    var out = [];
    batches().forEach(function (b) {
      absentIds(b.batch).forEach(function (id) {
        var s = SEED.students.filter(function (x) { return x.id === id; })[0];
        if (s) { out.push(s); }
      });
    });
    return out;
  }
  function attendancePct() {
    var total = 0, absent = 0;
    batches().forEach(function (b) {
      if (!isTaken(b.batch)) { return; }
      total += batchStudents(b.batch).length;
      absent += absentIds(b.batch).length;
    });
    return total ? Math.round((total - absent) / total * 100) : null;
  }

  function reminderText(s) {
    return 'Assalamu alaikum. This is the accounts desk at ' + ACADEMY + '. A fee payment for ' + s.name + ' (' + s.id + ') is ' +
      (s.feeStatus === 'overdue' ? 'overdue' : 'due') + (s.dueAmount ? ': ' + fmtBDT(s.dueAmount) : '') +
      '. Please pay at the accounts desk or by bKash and keep your receipt.';
  }
  function absenceText(s) {
    return 'Assalamu alaikum. This is the academic office at ' + ACADEMY + '. ' + s.name + ' was absent from class today, ' +
      fmtDate(todayDate()) + '. Please call the office if there is a reason.';
  }
  function followUpText(q) {
    return 'Assalamu alaikum ' + q.name.split(' ')[0] + '. This is the admissions desk at ' + ACADEMY +
      ', following up on your question about ' + q.programme + '. When would suit you for a call or a visit?';
  }

  function followUpTag(q) {
    if (!q.followUp) { return '<span class="muted">-</span>'; }
    var d = daysUntil(q.followUp);
    if (d < 0) { return '<span class="tag tag--late">' + plural(-d, 'day', 'days') + ' late</span>'; }
    if (d === 0) { return '<span class="tag tag--today">Today</span>'; }
    return fmtDate(q.followUp);
  }
  function inquiryRowsHTML(list, compact) {
    return '<ul class="rows">' + list.map(function (q) {
      return '<li class="row"><div class="row__main"><p class="row__title">' + esc(q.name) + '</p>' +
        '<p class="row__sub">' + esc(q.programme) + ' · ' + esc(q.source) + '</p>' +
        (compact ? '' : '<p class="row__note">' + esc(q.note) + '</p>') + '</div>' +
        '<div class="row__side">' + followUpTag(q) + waBtn(q.phone, followUpText(q), q.name) + '</div></li>';
    }).join('') + '</ul>';
  }
  function absentRowsHTML(list) {
    return '<ul class="rows">' + list.map(function (s) {
      var g = s.guardian || {};
      return '<li class="row"><div class="row__main"><p class="row__title">' + esc(s.name) + '</p>' +
        '<p class="row__sub">' + esc(s.batch) + ' · Guardian: ' + esc(g.relation || '-') + ', ' + esc(prettyPhone(g.phone || '')) + '</p></div>' +
        '<div class="row__side">' + (g.phone ? waBtn(g.phone, absenceText(s), (g.relation || 'guardian') + ' of ' + s.name, 'Message guardian') : '') + '</div></li>';
    }).join('') + '</ul>';
  }
  function overdueRowsHTML(list) {
    return '<ul class="rows">' + list.map(function (s) {
      return '<li class="row"><div class="row__main"><p class="row__title">' + esc(s.name) + '</p>' +
        '<p class="row__sub">' + esc(s.id) + ' · ' + esc(s.batch) + (s.overdueDays ? ' · ' + plural(s.overdueDays, 'day', 'days') + ' overdue' : '') + '</p></div>' +
        '<div class="row__side"><span class="row__amount">' + (s.dueAmount ? fmtBDT(s.dueAmount) : 'Not set') + '</span>' +
        waBtn(s.phone, reminderText(s), s.name, 'Send reminder') + '</div></li>';
    }).join('') + '</ul>';
  }
  function receiptsTableHTML(list) {
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>' +
      list.map(function (r) {
        var s = SEED.students.filter(function (x) { return x.id === r.studentId; })[0] || studentById(r.studentId) || { name: r.studentId };
        return '<tr data-id="' + esc(r.no) + '"><td class="mono">' + esc(r.no) + '</td><td class="mono">' + fmtDate(r.date) + '</td><td>' + esc(s.name) +
          '<span class="data__sub">' + esc(r.studentId) + '</span></td><td>' + esc(r.method) + '</td><td class="num">' + fmtBDT(r.amount) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function todayClassesHTML() {
    var now = new Date(), tdName = DAYS[now.getDay()], entry = dayEntry(tdName);
    if (!entry) { return emptyHTML('No classes on ' + tdName, 'The week resumes on Saturday.'); }
    return '<div class="table-wrap"><table class="data"><thead><tr><th>Time</th><th>Module</th><th>Room</th></tr></thead><tbody>' +
      entry.slots.map(function (s) {
        return '<tr><td class="num">' + timeText(s) + '</td><td>' + esc(s.module) + '<span class="data__sub">' + esc(s.lecturer) +
          '</span></td><td class="num">' + esc(s.room) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* Today, one page per department ------------------------------------------- */
  R['admin-dashboard'] = function () {
    var role = state.role, html = '';
    var due = followUpsDue(), absent = absentToday(), od = overdueList(), pct = attendancePct();
    var open = inquiries().filter(function (q) { return q.stage !== 'enrolled' && q.stage !== 'lost'; });
    var weekAgo = inquiries().filter(function (q) { return daysUntil(q.date) >= -7; });
    $('[data-mount="greeting"]').textContent = ROLES[role].home;
    $('[data-mount="dateline"]').textContent = DAYS[new Date().getDay()] + ', ' + fmtDate(todayDate()) + ' · Sample data';

    if (role === 'admissions') {
      html += panel('p-5', 'At a glance', '', '<ul class="stats">' + statsHTML([
        ['Follow-ups due', String(due.length), 'today or late'],
        ['New this week', String(weekAgo.length), 'all sources'],
        ['Visits booked', String(inquiries().filter(function (q) { return q.stage === 'visit'; }).length), 'campus visits'],
        ['Enrolled', String(inquiries().filter(function (q) { return q.stage === 'enrolled'; }).length), 'from inquiries']
      ]) + '</ul>');
      html += panel('p-7', 'Follow up today', '<a class="btn btn--text" href="/portal/admin-inquiries">All inquiries</a>',
        due.length ? inquiryRowsHTML(due) : emptyHTML('No follow-ups due', 'Everyone has been contacted.'));
      html += panel('p-12', 'Absent today: call the guardians', 'From the academic office',
        absent.length ? absentRowsHTML(absent) : emptyHTML('No absences recorded today'));
    } else if (role === 'accounts') {
      html += panel('p-5', 'At a glance', 'Sample figures', '<ul class="stats">' + statsHTML([
        ['Collected today', fmtBDT(sumReceipts(0)), plural(receipts().filter(function (r) { return daysUntil(r.date) === 0; }).length, 'receipt', 'receipts')],
        ['Last 30 days', fmtBDT(sumReceipts(30)), 'all methods'],
        ['Outstanding', fmtBDT(outstanding()), plural(owing().length, 'student', 'students') + ' with dues'],
        ['Overdue', String(od.length), 'need a reminder']
      ]) + '</ul>');
      html += panel('p-7', 'Overdue: send a reminder', '<a class="btn btn--text" href="/portal/admin-fees">All dues</a>',
        od.length ? overdueRowsHTML(od) : emptyHTML('Nothing overdue'));
      html += panel('p-12', 'Latest receipts', '<a class="btn btn--text" href="/portal/admin-fees">Record a payment</a>',
        receiptsTableHTML(receipts().slice(0, 5)));
    } else if (role === 'academic') {
      var entry = dayEntry(DAYS[new Date().getDay()]);
      html += panel('p-5', 'At a glance', '', '<ul class="stats">' + statsHTML([
        ['Classes today', String(entry ? entry.slots.length : 0), 'LLB Year 2 timetable'],
        ['Attendance today', pct == null ? '-' : pct + '%', 'batches taken so far'],
        ['Absent today', String(absent.length), 'guardians to message'],
        ['Notices on the board', String(allNotices().length), plural(state.added.length, 'posted today', 'posted today')]
      ]) + '</ul>');
      html += panel('p-7', 'Classes today', 'LLB Year 2 (sample)', todayClassesHTML());
      html += panel('p-12', 'Absent today', '<a class="btn btn--text" href="/portal/admin-attendance">Take attendance</a>',
        absent.length ? absentRowsHTML(absent) : emptyHTML('No absences recorded today'));
    } else {
      html += panel('p-12', 'At a glance', 'Sample figures', '<ul class="stats stats--wide">' + statsHTML([
        ['Students', String(students().length), plural(batches().length, 'batch', 'batches')],
        ['Collected, 30 days', fmtBDT(sumReceipts(30)), fmtBDT(sumReceipts(0)) + ' today'],
        ['Outstanding', fmtBDT(outstanding()), od.length + ' overdue'],
        ['Attendance today', pct == null ? '-' : pct + '%', absent.length + ' absent'],
        ['Open inquiries', String(open.length), due.length + ' follow-ups due']
      ]) + '</ul>');
      var depts = [
        ['Admissions', [['Open inquiries', open.length], ['Follow-ups due', due.length], ['Enrolled', inquiries().filter(function (q) { return q.stage === 'enrolled'; }).length]]],
        ['Accounts', [['Collected today', fmtBDT(sumReceipts(0))], ['Outstanding', fmtBDT(outstanding())], ['Overdue students', od.length]]],
        ['Academic', [['Attendance today', pct == null ? '-' : pct + '%'], ['Absent today', absent.length], ['Notices on the board', allNotices().length]]]
      ];
      html += depts.map(function (d) {
        return panel('p-4', d[0], '', '<dl class="kv">' + d[1].map(function (kv) {
          return '<dt>' + kv[0] + '</dt><dd class="kv__num">' + kv[1] + '</dd>';
        }).join('') + '</dl>');
      }).join('');
      var late = due.filter(function (q) { return daysUntil(q.followUp) < 0; });
      var attention = late.map(function (q) { return ['Admissions', q.name + ': inquiry follow-up ' + plural(-daysUntil(q.followUp), 'day', 'days') + ' late']; })
        .concat(od.filter(function (s) { return (s.overdueDays || 0) >= 14; }).map(function (s) { return ['Accounts', s.name + ': fee ' + s.overdueDays + ' days overdue']; }))
        .concat(absent.filter(function (s) { return s.attendance < 80; }).map(function (s) { return ['Academic', s.name + ': absent today, attendance ' + s.attendance + '%']; }));
      html += panel('p-12', 'Needs attention', plural(attention.length, 'item', 'items'), attention.length
        ? '<ul class="rows">' + attention.map(function (a) {
            return '<li class="row"><div class="row__main"><p class="row__title">' + esc(a[1]) + '</p></div><div class="row__side"><span class="badge">' + a[0] + '</span></div></li>';
          }).join('') + '</ul>'
        : emptyHTML('Nothing needs attention'));
    }
    $('[data-mount="today"]').innerHTML = html;
  };

  /* Inquiries (Admissions) ------------------------------------------------------ */
  var stageFilter = 'all';
  R['admin-inquiries'] = function () {
    var all = inquiries();
    $('[data-mount="pipeline"]').innerHTML = [['all', 'All']].concat(STAGES).map(function (st) {
      var n = st[0] === 'all' ? all.length : all.filter(function (q) { return q.stage === st[0]; }).length;
      return '<li><button type="button" class="pipeline__step" data-stage-filter="' + st[0] + '" aria-pressed="' + (stageFilter === st[0]) + '">' +
        '<span class="pipeline__n">' + n + '</span><span class="pipeline__label">' + st[1] + '</span></button></li>';
    }).join('');
    var list = all.filter(function (q) { return stageFilter === 'all' || q.stage === stageFilter; });
    $('[data-count]').textContent = plural(list.length, 'inquiry', 'inquiries');
    $('[data-mount="inquiries"]').innerHTML = list.length
      ? '<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Programme</th><th class="num">Received</th><th>Follow up</th><th>Stage</th><th></th></tr></thead><tbody>' +
        list.map(function (q) {
          return '<tr data-id="' + esc(q.id) + '"><td>' + esc(q.name) + '<span class="data__sub">' + esc(prettyPhone(q.phone)) + '</span></td>' +
            '<td>' + esc(q.programme) + '<span class="data__sub">' + esc(q.source) + (q.note ? ' · ' + esc(q.note) : '') + '</span></td>' +
            '<td class="num">' + fmtDate(q.date) + '</td><td>' + followUpTag(q) + '</td>' +
            '<td><label class="visually-hidden" for="st-' + esc(q.id) + '">Stage for ' + esc(q.name) + '</label>' +
            '<select class="field__input field__input--sm" id="st-' + esc(q.id) + '" data-stage-for="' + esc(q.id) + '">' +
            STAGES.map(function (st) { return '<option value="' + st[0] + '"' + (st[0] === q.stage ? ' selected' : '') + '>' + st[1] + '</option>'; }).join('') +
            '</select></td><td>' + waBtn(q.phone, followUpText(q), q.name) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : emptyHTML('No inquiries at this stage');
    var sel = $('[data-programme-options]');
    if (sel && !sel.options.length) {
      var progs = [];
      SEED.students.forEach(function (s) { if (progs.indexOf(s.programme) === -1) { progs.push(s.programme); } });
      sel.innerHTML = progs.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('');
    }
  };

  /* Fees and receipts (Accounts) ------------------------------------------------- */
  var lastReceipt = null;
  R['admin-fees'] = function () {
    var owe = owing().sort(function (a, b) {
      var rank = { overdue: 0, due: 1 };
      return (rank[a.feeStatus] - rank[b.feeStatus]) || ((b.overdueDays || 0) - (a.overdueDays || 0));
    });
    $('[data-mount="fee-stats"]').innerHTML = statsHTML([
      ['Collected today', fmtBDT(sumReceipts(0)), 'sample figures'],
      ['Last 30 days', fmtBDT(sumReceipts(30)), plural(receipts().filter(function (r) { return daysUntil(r.date) >= -30; }).length, 'receipt', 'receipts')],
      ['Outstanding', fmtBDT(outstanding()), plural(owe.length, 'student', 'students') + ' with dues']
    ]);
    $('[data-count]').textContent = plural(owe.length, 'student', 'students');
    $('[data-mount="dues"]').innerHTML = owe.length
      ? '<div class="table-wrap"><table class="data"><thead><tr><th>Student</th><th>Batch</th><th>Status</th><th class="num">Amount</th><th></th></tr></thead><tbody>' +
        owe.map(function (s) {
          var status = s.fresh ? '<span class="badge badge--warn">First instalment</span>' : badge(s.feeStatus);
          var when = s.overdueDays ? plural(s.overdueDays, 'day', 'days') + ' overdue' : s.fresh ? 'New admission' : 'Due this month';
          return '<tr><td>' + esc(s.name) + '<span class="data__sub">' + esc(s.id) + '</span></td><td>' + esc(s.batch) +
            '<span class="data__sub">' + esc(s.programme) + '</span></td><td>' + status + '<span class="data__sub">' + when + '</span></td>' +
            '<td class="num">' + (s.dueAmount ? fmtBDT(s.dueAmount) : 'Not set yet') + '</td><td>' + waBtn(s.phone, reminderText(s), s.name, 'Send reminder') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : emptyHTML('No dues', 'Every student is paid up.');
    var list = receipts();
    $('[data-mount="receipt-total"]').textContent = fmtBDT(sumReceipts(0)) + ' today';
    $('[data-mount="receipts"]').innerHTML = receiptsTableHTML(list);
    if (lastReceipt) {
      var row = $('[data-id="' + lastReceipt + '"]');
      lastReceipt = null;
      if (row) { row.classList.add('is-new'); setTimeout(function () { row.classList.remove('is-new'); }, 1400); }
    }
    var sel = $('[data-student-options]'), keep = sel.value;
    sel.innerHTML = '<optgroup label="With dues">' + owe.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + ' · ' + esc(s.id) + '</option>';
    }).join('') + '</optgroup><optgroup label="Paid up">' + students().filter(function (s) { return s.feeStatus === 'paid'; }).map(function (s) {
      return '<option value="' + esc(s.id) + '">' + esc(s.name) + ' · ' + esc(s.id) + '</option>';
    }).join('') + '</optgroup>';
    if (keep && studentById(keep) && studentById(keep).feeStatus !== 'paid') { sel.value = keep; }
    prefillAmount();
  };
  function prefillAmount() {
    var sel = $('[data-student-options]'), amt = $('#pay-amount');
    if (!sel || !amt) { return; }
    var s = studentById(sel.value);
    amt.value = s && s.dueAmount ? s.dueAmount : '';
  }

  /* Attendance (Academic) ------------------------------------------------------------ */
  var attBatch = null, attDraft = {};
  R['admin-attendance'] = function () {
    var all = batches();
    if (!attBatch) { attBatch = all[0].batch; }
    var sel = $('[data-batch-options]');
    if (!sel.options.length) {
      sel.innerHTML = all.map(function (b) { return '<option value="' + esc(b.batch) + '">' + esc(b.batch) + ' · ' + esc(b.programme) + '</option>'; }).join('');
    }
    sel.value = attBatch;
    if (!attDraft[attBatch]) { attDraft[attBatch] = absentIds(attBatch).slice(); }
    var draft = attDraft[attBatch], roll = batchStudents(attBatch);
    $('[data-mount="att-date"]').textContent = DAYS[new Date().getDay()] + ', ' + fmtDate(todayDate()) + '. Mark who is absent, then save. Sample students.';
    $('[data-count]').textContent = plural(roll.length, 'student', 'students') + ' · ' + (isTaken(attBatch) ? 'taken' : 'not taken yet');
    $('[data-mount="roll"]').innerHTML = '<ul class="rows">' + roll.map(function (s) {
      var abs = draft.indexOf(s.id) !== -1;
      return '<li class="row"><div class="row__main"><p class="row__title">' + esc(s.name) + '</p><p class="row__sub">' + esc(s.id) +
        ' · term attendance ' + s.attendance + '%</p></div><div class="row__side"><div class="pa" role="group" aria-label="' + esc(s.name) + '">' +
        '<button type="button" data-pa="' + esc(s.id) + '" data-val="p" aria-pressed="' + !abs + '">Present</button>' +
        '<button type="button" data-pa="' + esc(s.id) + '" data-val="a" aria-pressed="' + abs + '">Absent</button></div></div></li>';
    }).join('') + '</ul>';
    var absent = absentToday();
    $('[data-mount="absent-count"]').textContent = plural(absent.length, 'student', 'students');
    $('[data-mount="absent"]').innerHTML = absent.length ? absentRowsHTML(absent) : emptyHTML('No absences recorded today');
    $('[data-mount="batches"]').innerHTML = '<div class="table-wrap"><table class="data"><thead><tr><th>Batch</th><th>Programme</th>' +
      '<th class="num">Students</th><th class="num">Present</th><th class="num">Absent</th><th>Status</th></tr></thead><tbody>' +
      all.map(function (b) {
        var n = batchStudents(b.batch).length, a = absentIds(b.batch).length, taken = isTaken(b.batch);
        return '<tr><td class="mono">' + esc(b.batch) + '</td><td>' + esc(b.programme) + '</td><td class="num">' + n + '</td>' +
          '<td class="num">' + (taken ? n - a : '-') + '</td><td class="num">' + (taken ? a : '-') + '</td>' +
          '<td>' + (taken ? '<span class="badge badge--ok">Taken</span>' : '<span class="badge">Not taken yet</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  /* Students (shared list, columns by department) ------------------------------------ */
  var progFilter = 'all';
  R['admin-students'] = function () {
    var role = state.role, money = role === 'accounts' || role === 'principal', contact = role !== 'accounts';
    var input = $('#student-search'), q = input ? input.value.trim().toLowerCase() : '';
    var all = students(), progs = [];
    all.forEach(function (s) { var p = s.programme.split(',')[0]; if (progs.indexOf(p) === -1) { progs.push(p); } });
    var chips = $('[data-mount="prog-chips"]');
    if (!chips) {
      chips = document.createElement('div');
      chips.className = 'tabs chips';
      chips.setAttribute('data-mount', 'prog-chips');
      $('.search').insertAdjacentElement('afterend', chips);
    }
    chips.innerHTML = ['all'].concat(progs).map(function (p) {
      return '<button type="button" data-prog-filter="' + esc(p) + '" aria-pressed="' + (progFilter === p) + '">' + (p === 'all' ? 'All programmes' : esc(p)) + '</button>';
    }).join('');
    var rows = all.filter(function (s) {
      return (progFilter === 'all' || s.programme.split(',')[0] === progFilter) &&
        (!q || (s.name + ' ' + s.id + ' ' + s.programme + ' ' + s.batch).toLowerCase().indexOf(q) !== -1);
    });
    var due = rows.filter(function (s) { return s.feeStatus !== 'paid'; }).length;
    $('[data-count]').textContent = rows.length + ' of ' + all.length + ' students' + (money ? ' · ' + due + ' with dues' : '');
    var head = '<th>ID</th><th>Name</th><th>Batch</th><th class="num">Attendance</th>' + (money ? '<th>Fees</th><th class="num">Balance</th>' : '') +
      (contact ? '<th>Guardian</th>' : '') + '<th>Phone</th>';
    $('[data-mount="students"]').innerHTML = rows.length
      ? '<div class="table-wrap"><table class="data"><thead><tr>' + head + '</tr></thead><tbody>' +
        rows.map(function (s) {
          var g = s.guardian;
          return '<tr><td class="mono">' + esc(s.id) + '</td><td>' + esc(s.name) + (s.fresh ? ' <span class="notice__new">New</span>' : '') +
            '<span class="data__sub">' + esc(s.programme) + '</span></td><td class="mono">' + esc(s.batch) + '</td>' +
            '<td class="num">' + (s.attendance == null ? '-' : s.attendance + '%') + '</td>' +
            (money ? '<td>' + (s.fresh && s.feeStatus !== 'paid' ? '<span class="badge badge--warn">First instalment</span>' : badge(s.feeStatus)) + '</td>' +
              '<td class="num">' + (s.feeStatus === 'paid' ? fmtBDT(0) : s.dueAmount ? fmtBDT(s.dueAmount) : 'Not set') + '</td>' : '') +
            (contact ? '<td>' + (g ? esc(g.relation) + '<span class="data__sub">' + esc(prettyPhone(g.phone)) + '</span>' : '<span class="muted">-</span>') + '</td>' : '') +
            '<td class="mono">' + esc(prettyPhone(s.phone)) + ' ' + waBtn(s.phone, '', s.name) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : emptyHTML('No student matches “' + esc(input.value.trim()) + '”', 'Try a name, an ID such as BA-25, or a programme.');
  };

  /* Notices (Admissions and Academic) ------------------------------------------------- */
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

  /* Shell ------------------------------------------------------------------ */
  var nav = document.body.getAttribute('data-nav') || '';
  var office = nav.indexOf('admin') === 0;
  if (office && !ROLES[state.role]) { window.location.replace('/portal/staff'); return; }
  var ROLE = office ? ROLES[state.role] : null;
  var allowed = !office || ROLE.pages.indexOf(nav) !== -1;

  function fillShell() {
    if (office) {
      $$('[data-staff-name]').forEach(function (el) { el.textContent = ROLE.label; });
      $$('[data-role-label]').forEach(function (el) { el.textContent = ROLE.name + ' · Staff portal'; });
      $$('[data-office-nav] [data-page]').forEach(function (a) {
        if (ROLE.pages.indexOf(a.getAttribute('data-page')) === -1) { a.remove(); }
        else if (a.getAttribute('data-page') === 'admin-dashboard' && state.role === 'principal') { a.textContent = 'Overview'; }
      });
      if (nav === 'admin-dashboard' && state.role === 'principal') {
        var tt = $('[data-topbar-title]');
        if (tt) { tt.textContent = 'Overview'; }
        document.title = 'Overview | Bhuiyan Academy';
      }
    } else {
      $$('[data-student-name]').forEach(function (el) { el.textContent = SEED.student.name; });
      $$('[data-student-id]').forEach(function (el) { el.textContent = SEED.student.id; });
    }
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
    if (!allowed) {
      var main = $('#main');
      if (main && !$('[data-not-yours]')) {
        main.innerHTML = '<section data-not-yours>' + emptyHTML('This page belongs to ' + esc(PAGE_OWNER[nav] || 'another department'),
          'You are signed in as ' + esc(ROLE.label) + '. Sign out and choose that department to use this page.') +
          '<p style="margin-top:1rem"><a class="btn btn--secondary" href="/portal/admin-dashboard">Back to ' + (state.role === 'principal' ? 'Overview' : 'Today') + '</a></p></section>';
      }
    } else if (R[nav]) { R[nav](); }
    fillShell();
  }

  /* Events ----------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-toggle-read],[data-remove-notice],[data-mark-all],[data-reset],[data-enter],[data-signout],[data-filter],[data-stage-filter],[data-prog-filter],[data-pa],[data-save-attendance],[aria-disabled="true"]') : null;
    if (!t) { return; }

    if (t.hasAttribute('data-enter')) {
      state.role = t.getAttribute('data-enter');
      save();
      return;                                         // let the link navigate
    }
    if (t.hasAttribute('data-signout')) {
      state.role = null;
      save();
      return;
    }
    if (t.hasAttribute('data-reset')) {
      var keepRole = state.role;
      rawClear();
      state = blank();
      state.role = keepRole;
      save();
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
    if (t.hasAttribute('data-filter')) { resFilter = t.getAttribute('data-filter'); render(); return; }
    if (t.hasAttribute('data-stage-filter')) { stageFilter = t.getAttribute('data-stage-filter'); render(); return; }
    if (t.hasAttribute('data-prog-filter')) { progFilter = t.getAttribute('data-prog-filter'); render(); return; }
    if (t.hasAttribute('data-pa')) {
      var sid = t.getAttribute('data-pa'), d = attDraft[attBatch], at = d.indexOf(sid);
      if (t.getAttribute('data-val') === 'a' && at === -1) { d.push(sid); }
      if (t.getAttribute('data-val') === 'p' && at !== -1) { d.splice(at, 1); }
      render();
      return;
    }
    if (t.hasAttribute('data-save-attendance')) {
      var day = toISO(todayDate());
      state.att[day] = state.att[day] || {};
      state.att[day][attBatch] = attDraft[attBatch].slice();
      save(); render();
      toast('Attendance saved for ' + attBatch + '. Absent students now show for Admissions and the Principal.');
      return;
    }
    if (t.getAttribute('aria-disabled') === 'true' && t.tagName === 'A') {
      e.preventDefault();
      toast('This is disabled in the demonstration.');
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-stage-for')) {
      state.stage[t.getAttribute('data-stage-for')] = t.value;
      save(); render();
      toast(t.value === 'enrolled' ? 'Enrolled. The student now appears in Students, and Accounts sees the first instalment.' : 'Stage updated.');
      return;
    }
    if (t.id === 'att-batch') { attBatch = t.value; render(); return; }
    if (t.id === 'pay-student') { prefillAmount(); }
  });

  function check(form, rules) {
    var ok = true, first = null;
    rules.forEach(function (r) {
      var el = form.elements[r[0]], err = $('[data-error-for="' + r[0] + '"]', form), bad = !r[1](el.value.trim());
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (err) { err.textContent = r[2]; err.hidden = !bad; }
      if (bad) { ok = false; first = first || el; }
    });
    if (first) { first.focus(); }
    return ok;
  }
  function filled(v) { return !!v; }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.hasAttribute('data-form-notice')) {
      e.preventDefault();
      if (!check(form, [['title', filled, 'Add a title.'], ['body', filled, 'Write the notice text.']])) { return; }
      var n = {
        id: 'N-local-' + Date.now(),
        date: form.elements.date.value || toISO(todayDate()),
        title: form.elements.title.value.trim(),
        body: form.elements.body.value.trim(),
        pinned: form.elements.pinned.checked,
        addedAt: Date.now()
      };
      state.added.unshift(n);
      save();
      highlightId = n.id;
      form.elements.title.value = ''; form.elements.body.value = ''; form.elements.pinned.checked = false;
      form.elements.date.value = toISO(todayDate());
      render();
      toast('Posted. Students see it on their notice board now.');
      return;
    }
    if (form.hasAttribute('data-form-inquiry')) {
      e.preventDefault();
      if (!check(form, [['name', filled, 'Add the name.'],
        ['phone', function (v) { return v.replace(/\D/g, '').length >= 10; }, 'Add a phone number, for example 01712-345678.']])) { return; }
      state.inq.unshift({
        id: 'Q-L' + Date.now(), local: true, name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(),
        programme: form.elements.programme.value, source: form.elements.source.value, note: form.elements.note.value.trim(),
        date: toISO(todayDate()), followUp: isoOffset(1), stage: 'new'
      });
      save();
      form.reset();
      stageFilter = 'all';
      render();
      toast('Inquiry added. Follow-up set for tomorrow.');
      return;
    }
    if (form.hasAttribute('data-form-payment')) {
      e.preventDefault();
      if (!check(form, [['amount', function (v) { return +v > 0; }, 'Enter the amount received.']])) { return; }
      var no = 'BA/REC/2026/' + (1185 + state.payments.length);
      state.payments.push({ no: no, studentId: form.elements.student.value, amount: Math.round(+form.elements.amount.value),
        method: form.elements.method.value, date: toISO(todayDate()), at: Date.now() });
      save();
      lastReceipt = no;
      render();
      toast('Receipt ' + no + ' made. The student shows as paid for every department.');
      return;
    }
    if (form.hasAttribute('data-form-request')) {
      e.preventDefault();
      if (!check(form, [['what', filled, 'Say what you need.']])) { return; }
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

  // A change made in another tab shows up here without a reload.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { state = load(); render(); }
  });

  render();
})();
