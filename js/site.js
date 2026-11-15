/* Bhuiyan Academy preview: site behaviour.
   - mobile menu (full-screen sheet): aria-expanded, Esc / overlay / link closes, focus kept inside
   - current-page marking for nav links (backup to the build-time marking)
   - demo form validation: required fields, Bangladesh mobile pattern, inline errors, success panel.
     Forms never leave the browser, except forms marked data-wa: those open WhatsApp (or the
     email app) with the details already written, and the visitor presses Send themselves.
     Forms marked data-stepper show one question per screen (see initStepper).
     Nothing is stored or transmitted by this site. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* 1 · Menu sheet ---------------------------------------------------------- */
  var toggle = $('[data-nav-toggle]');
  var sheet = $('[data-sheet]');

  if (toggle && sheet) {
    var inner = $('.sheet__inner', sheet);
    var focusable = function () {
      return $$('a[href], button:not([disabled])', sheet);
    };
    var setOpen = function (open) {
      sheet.classList.toggle('is-open', open);
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-open', open);
      if (open) {
        var first = focusable()[0];
        if (first) { window.setTimeout(function () { first.focus(); }, 30); }
      } else {
        toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', function () {
      setOpen(!sheet.classList.contains('is-open'));
    });
    $$('[data-nav-close]', sheet).forEach(function (btn) {
      btn.addEventListener('click', function () { setOpen(false); });
    });
    // Click on the blank area of the sheet, or on any link, closes it.
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet || e.target === inner || e.target.closest('a')) { setOpen(false); }
    });
    document.addEventListener('keydown', function (e) {
      if (!sheet.classList.contains('is-open')) { return; }
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab') {
        var items = focusable();
        if (!items.length) { return; }
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches && sheet.classList.contains('is-open')) { setOpen(false); }
    });
  }

  /* 2 · Current nav from location.pathname ---------------------------------- */
  var clean = function (p) {
    return p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  };
  var here = clean(window.location.pathname);
  $$('.nav a[href^="/"], .sheet__nav a[href^="/"]').forEach(function (a) {
    var target = clean(a.getAttribute('href'));
    var current = target !== '/' && (here === target || here.indexOf(target + '/') === 0);
    a.classList.toggle('is-current', current);
    if (current) { a.setAttribute('aria-current', 'page'); }
  });

  /* 3 · Demo forms ------------------------------------------------------------ */
  var BD_PHONE = /^01[3-9]\d{8}$/;
  var SUCCESS_NOTE = 'Demo: on the live site this reaches the admissions inbox. Nothing was sent.';
  var uid = 0;

  function labelFor(field) {
    var label = field.id ? $('label[for="' + field.id + '"]', field.form) : null;
    if (!label) { label = field.closest('.field') && $('.field__label', field.closest('.field')); }
    return label ? label.textContent.replace(/\*|\(required\)|required/gi, '').trim() : 'This field';
  }

  function errorSlot(field) {
    var wrap = field.closest('.field') || field.parentNode;
    var slot = $('.field__error', wrap);
    if (!slot) {
      slot = document.createElement('p');
      slot.className = 'field__error';
      wrap.appendChild(slot);
    }
    if (!slot.id) {
      uid += 1;
      slot.id = (field.id || field.name || 'f') + '-error-' + uid;
    }
    slot.setAttribute('role', 'alert');
    return slot;
  }

  function setError(field, message) {
    var slot = errorSlot(field);
    slot.textContent = message;
    slot.hidden = false;
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', slot.id);
  }

  function clearError(field) {
    var wrap = field.closest('.field') || field.parentNode;
    var slot = $('.field__error', wrap);
    if (slot) { slot.textContent = ''; slot.hidden = true; }
    field.classList.remove('is-invalid');
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }

  function validateField(field) {
    var value = (field.value || '').trim();
    var isPhone = field.type === 'tel' || field.name === 'phone' || field.getAttribute('data-validate') === 'bd-phone';
    var name = labelFor(field);

    if (field.type === 'checkbox') {
      if (field.required && !field.checked) { return 'Please tick this box to continue.'; }
      return '';
    }
    if (field.required && !value) {
      return field.tagName === 'SELECT' ? 'Choose an option.' : name + ' is required.';
    }
    if (value && isPhone) {
      var digits = value.replace(/[\s\-()]/g, '').replace(/^(\+?88)/, '');
      if (!BD_PHONE.test(digits)) { return 'Enter a Bangladesh mobile number, for example 01712345678.'; }
    }
    if (value && field.type === 'email' && field.validity && field.validity.typeMismatch) {
      return 'Enter a valid email address.';
    }
    return '';
  }


  /* 4 · Registration: one question per screen, then hand-off to WhatsApp / email ---- */
  function choiceText(form, name) {
    var r = $('input[name="' + name + '"]:checked', form);
    return r ? (r.getAttribute('data-label') || r.value) : '';
  }

  function legendFor(f) {
    var set = f.closest('fieldset');
    var legend = set && $('legend', set);
    return legend ? legend.textContent.replace(/\?$/, '').trim() : f.name;
  }

  function registrationText(form, fields) {
    var lines = [form.getAttribute('data-wa-heading') || 'Registration', ''];
    fields.forEach(function (f) {
      var v, label;
      if (f.type === 'radio') {
        if (!f.checked) { return; }
        v = f.getAttribute('data-label') || f.value;
        label = f.name === 'programme' ? 'Programme' : f.name === 'qualification' ? 'Highest qualification so far' : legendFor(f);
      } else {
        v = (f.value || '').trim();
        label = labelFor(f);
      }
      if (v) { lines.push(label + ': ' + v); }
    });
    return lines.join('\n');
  }

  function handOff(form, fields) {
    var text = registrationText(form, fields);
    var wa = 'https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(text);
    var email = form.getAttribute('data-wa-email');
    var mail = email ? 'mailto:' + email + '?subject=' +
      encodeURIComponent('Registration: ' + choiceText(form, 'programme')) +
      '&body=' + encodeURIComponent(text) : '';

    var panel = document.createElement('div');
    panel.className = 'form-success';
    panel.setAttribute('role', 'status');
    panel.setAttribute('tabindex', '-1');
    var title = document.createElement('p');
    title.className = 'form-success__title';
    title.textContent = form.getAttribute('data-success-title') || 'Your registration is ready to send.';
    var note = document.createElement('p');
    note.textContent = 'WhatsApp should now be open with your answers written out. Press Send there to register. ' +
      'A counsellor will call you after checking your results. If WhatsApp did not open, use one of the buttons below.';
    var actions = document.createElement('div');
    actions.className = 'link-row';
    actions.style.marginTop = '.5rem';
    var a1 = document.createElement('a');
    a1.className = 'btn btn--primary';
    a1.href = wa; a1.target = '_blank'; a1.rel = 'noopener';
    a1.textContent = 'Open WhatsApp';
    actions.appendChild(a1);
    if (mail) {
      var a2 = document.createElement('a');
      a2.className = 'btn btn--secondary';
      a2.href = mail;
      a2.textContent = 'Send by email instead';
      actions.appendChild(a2);
    }
    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn--text';
    again.textContent = 'Edit answers';
    panel.appendChild(title);
    panel.appendChild(note);
    panel.appendChild(actions);
    panel.appendChild(again);

    form.hidden = true;
    form.parentNode.insertBefore(panel, form.nextSibling);
    panel.focus();
    window.open(wa, '_blank', 'noopener');

    again.addEventListener('click', function () {
      panel.remove();
      form.hidden = false;
      if (form.__q) { form.__q.refocus(); } else if (fields[0]) { fields[0].focus(); }
    });
  }

  /* The stepper only adds classes and behaviour to a plain form. If this script never runs,
     every question simply shows at once and the form still works. */
  function initStepper(form) {
    var all = $$('.q-step', form);
    if (!all.length) { return; }
    var back = $('[data-q-back]', form), next = $('[data-q-next]', form);
    var cur = $('[data-q-current]', form), tot = $('[data-q-total]', form);
    var fill = $('[data-q-fill]', form), restoredNote = $('[data-q-restored]', form);
    var KEY = 'bhuiyan-register-draft';
    var SAVED = ['programme', 'qualification', 'name', 'phone', 'results', 'email', 'message'];
    var order = all.slice();
    var index = 0;

    function store() { try { return window.sessionStorage; } catch (e) { return null; } }

    function save() {
      var ss = store();
      if (!ss) { return; }
      var data = {};
      SAVED.forEach(function (n) {
        var el = form.elements[n];
        if (el) { data[n] = el.value; }
      });
      try { ss.setItem(KEY, JSON.stringify(data)); } catch (e) { /* blocked or full: fine */ }
    }

    // Restore a draft from this browser tab (refresh, or leaving and coming back).
    var restored = false;
    var ss = store();
    var draft = null;
    try { draft = ss ? JSON.parse(ss.getItem(KEY)) : null; } catch (e) { draft = null; }
    if (draft && typeof draft === 'object') {
      SAVED.forEach(function (n) {
        var el = form.elements[n];
        if (el && typeof draft[n] === 'string' && draft[n]) { el.value = draft[n]; restored = true; }
      });
    }

    // ?programme=id from a programme page: the choice is already made, so skip that question.
    var wanted = (new URLSearchParams(window.location.search).get('programme') || '').replace(/[^\w-]/g, '');
    var fromLink = wanted && $('input[name="programme"][value="' + wanted + '"]', form);
    if (fromLink) {
      fromLink.checked = true;
      order = order.filter(function (s) { return s.getAttribute('data-step') !== 'programme'; });
    }

    function answered(step) {
      if (!step.hasAttribute('data-required')) { return false; }
      return !!$('input[type="radio"]:checked', step);
    }

    function checkStep(step) {
      if (step.hasAttribute('data-required')) {
        var slot = $('.field__error', step);
        if (!$('input[type="radio"]:checked', step)) {
          if (slot) { slot.textContent = step.getAttribute('data-required'); slot.hidden = false; slot.setAttribute('role', 'alert'); }
          return false;
        }
        if (slot) { slot.textContent = ''; slot.hidden = true; }
        return true;
      }
      var bad = null;
      $$('input, select, textarea', step).forEach(function (f) {
        var msg = validateField(f);
        if (msg) { setError(f, msg); if (!bad) { bad = f; } } else { clearError(f); }
      });
      if (bad) { bad.focus(); return false; }
      return true;
    }

    function show(i, focusTitle) {
      index = Math.max(0, Math.min(order.length - 1, i));
      all.forEach(function (s) { s.classList.remove('is-current'); });
      var step = order[index];
      step.classList.add('is-current');
      form.classList.toggle('is-first', index === 0);
      form.classList.toggle('is-last', index === order.length - 1);
      if (cur) { cur.textContent = String(index + 1); }
      if (tot) { tot.textContent = String(order.length); }
      if (fill) { fill.style.width = (((index + 1) / order.length) * 100) + '%'; }
      if (focusTitle) {
        var title = $('.q-title', step);
        if (title) { title.focus(); }
      }
    }

    function go(delta) {
      if (delta > 0 && !checkStep(order[index])) { return; }
      form.classList.toggle('is-back', delta < 0);
      show(index + delta, true);
      save();
    }

    form.classList.add('is-stepper');
    all.forEach(function (s) { s.classList.remove('is-current'); });

    // Start at the first question that still needs an answer.
    var startAt = order.length - 1;
    for (var i = 0; i < order.length; i += 1) {
      if (order[i].hasAttribute('data-required') && !answered(order[i])) { startAt = i; break; }
    }
    show(restored ? startAt : 0, false);
    if (restored && restoredNote && startAt > 0) { restoredNote.hidden = false; }

    if (back) { back.addEventListener('click', function () { go(-1); }); }
    if (next) { next.addEventListener('click', function () { go(1); }); }

    // One tap on a choice moves on. Real clicks only (detail > 0): arrow keys inside a radio group don't skip ahead.
    form.addEventListener('click', function (e) {
      var r = e.target;
      if (!r || r.type !== 'radio' || e.detail === 0) { return; }
      var step = r.closest('.q-step');
      if (!step || step !== order[index] || index >= order.length - 1) { return; }
      checkStep(step);
      save();
      window.setTimeout(function () { go(1); }, 220);
    });

    form.addEventListener('input', save);

    // Enter inside a text field moves on until the last question, then sends.
    form.addEventListener('submit', function (e) {
      if (index < order.length - 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        go(1);
      }
    });

    form.__q = {
      refocus: function () { show(order.length - 1, true); },
      checkAll: function () {
        for (var k = 0; k < order.length; k += 1) {
          if (!checkStep(order[k])) { show(k, true); return false; }
        }
        return true;
      }
    };
  }

  $$('form').forEach(function (form) {
    if (form.hasAttribute('data-native')) { return; }
    form.setAttribute('novalidate', '');
    if (form.hasAttribute('data-stepper')) { initStepper(form); }
    var fields = $$('input, select, textarea', form).filter(function (f) {
      return f.type !== 'hidden' && f.type !== 'submit' && f.type !== 'button';
    });

    fields.forEach(function (f) {
      f.addEventListener('input', function () { if (f.classList.contains('is-invalid')) { clearError(f); } });
      f.addEventListener('blur', function () {
        var msg = validateField(f);
        if (msg) { setError(f, msg); } else { clearError(f); }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.__q) {
        if (form.__q.checkAll()) { handOff(form, fields); }
        return;
      }
      var firstBad = null;
      fields.forEach(function (f) {
        var msg = validateField(f);
        if (msg) { setError(f, msg); if (!firstBad) { firstBad = f; } } else { clearError(f); }
      });
      if (firstBad) { firstBad.focus(); return; }

      if (form.hasAttribute('data-wa')) { handOff(form, fields); return; }

      var panel = document.createElement('div');
      panel.className = 'form-success';
      panel.setAttribute('role', 'status');
      panel.setAttribute('tabindex', '-1');
      var title = document.createElement('p');
      title.className = 'form-success__title';
      title.textContent = form.getAttribute('data-success-title') || 'Your details look complete.';
      var note = document.createElement('p');
      note.textContent = SUCCESS_NOTE;
      var again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn btn--text';
      again.textContent = 'Edit details';
      panel.appendChild(title);
      panel.appendChild(note);
      panel.appendChild(again);

      form.hidden = true;
      form.parentNode.insertBefore(panel, form.nextSibling);
      panel.focus();

      again.addEventListener('click', function () {
        panel.remove();
        form.hidden = false;
        if (fields[0]) { fields[0].focus(); }
      });
    });
  });
})();
