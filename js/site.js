/* Bhuiyan Academy preview: site behaviour.
   - mobile menu (full-screen sheet): aria-expanded, Esc / overlay / link closes, focus kept inside
   - current-page marking for nav links (backup to the build-time marking)
   - demo form validation: required fields, Bangladesh mobile pattern, inline errors, success panel.
     Forms never leave the browser. */
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

  $$('form').forEach(function (form) {
    if (form.hasAttribute('data-native')) { return; }
    form.setAttribute('novalidate', '');
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
      var firstBad = null;
      fields.forEach(function (f) {
        var msg = validateField(f);
        if (msg) { setError(f, msg); if (!firstBad) { firstBad = f; } } else { clearError(f); }
      });
      if (firstBad) { firstBad.focus(); return; }

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
