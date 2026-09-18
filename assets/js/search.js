/* صفحة نتائج البحث */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const esc = Lib.escapeHTML;
  const arNum = Lib.arNum;

  let currentQuery = '';

  async function start() {
    await Lib.init();
    Lib.showDataWarningIfNeeded();
    fillFilters();
    const params = Lib.queryParams();
    const q = params.get('q') || '';
    if (q) { $('#q').value = q; run(q); }
    else $('#q').focus();

    $('#search-form').onsubmit = e => {
      e.preventDefault();
      const v = $('#q').value.trim();
      if (!v) return;
      Lib.setParams({ q: v });
      run(v);
    };
    $('#f-book').onchange = () => currentQuery && run(currentQuery);
    $('#f-cat').onchange = () => currentQuery && run(currentQuery);
  }

  function fillFilters() {
    const books = Lib.books();
    const cats = [...new Set(books.map(b => b.category || 'عام'))];
    $('#f-book').innerHTML = '<option value="">كل الكتب</option>' +
      books.map(b => `<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('');
    $('#f-cat').innerHTML = '<option value="">كل الأقسام</option>' +
      cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  function filters() {
    return { book: $('#f-book').value, cat: $('#f-cat').value };
  }
  function passFilters(r, f) {
    if (f.book && r.bookId !== f.book) return false;
    if (f.cat && r.category !== f.cat) return false;
    return true;
  }

  function run(q) {
    currentQuery = q;
    $('#q').value = q;
    const res = Lib.search(q);
    const f = filters();
    const special = $('#special');
    const results = $('#results');
    const summary = $('#results-summary');
    special.innerHTML = '';
    results.innerHTML = '';

    /* بطاقات خاصة (موضوع بعناصر / مدى صفحات) */
    if (res.type === 'topic-elements') {
      const t = res.topic, b = res.book;
      special.innerHTML = `<div class="paper-card topic-card">
        <h3>عناصر موضوع «${esc(t.title)}»</h3>
        <div class="t-meta">📕 ${esc(b.title)} — من صفحة ${arNum(t.pageFrom)} إلى صفحة ${arNum(t.pageTo)}</div>
        <ol class="elements">${t.elements.map(el => `<li>${esc(el)}</li>`).join('')}</ol>
        <a class="mini-btn" href="${Lib.routeFor('/book', { id: b.id, p: t.pageFrom })}">📖 فتح الموضوع في الكتاب</a>
      </div>`;
      summary.textContent = '';
      return;
    }
    if (res.type === 'topic-noelements') {
      const t = res.topic, b = res.book;
      special.innerHTML = `<div class="paper-card topic-card">
        <h3>موضوع «${esc(t.title)}»</h3>
        <div class="t-meta">📕 ${esc(b.title)} — من صفحة ${arNum(t.pageFrom)} إلى صفحة ${arNum(t.pageTo)}</div>
        <p style="color:#7d6030;font-size:15px;margin-bottom:10px">لم تُسجَّل عناصر هذا الموضوع بعد — يمكن تسجيلها من لوحة الإدارة (قسم الكتب ← موضوعات).</p>
        <a class="mini-btn" href="${Lib.routeFor('/book', { id: b.id, p: t.pageFrom })}">📖 فتح الموضوع في الكتاب</a>
      </div>`;
    }
    if (res.type === 'topic-range') {
      const t = res.topic, b = res.book;
      special.innerHTML = `<div class="paper-card topic-card">
        <h3>«${esc(t.title)}»</h3>
        <div class="t-meta">📕 ${esc(b.title)}</div>
        <p style="font-size:19px;color:var(--ink);line-height:2">يبدأ الموضوع من <b>صفحة ${arNum(t.pageFrom)}</b>
        وينتهي عند <b>صفحة ${arNum(t.pageTo)}</b>.</p>
        <a class="mini-btn" href="${Lib.routeFor('/book', { id: b.id, p: t.pageFrom })}">📖 فتح الصفحة ${arNum(t.pageFrom)}</a>
      </div>`;
      summary.textContent = '';
      return;
    }

    let rows = (res.results || []).filter(r => passFilters(r, f));
    /* نتائج الفهارس (الموضوعات المطابقة) */
    let topicsHtml = '';
    if (res.topicHits && res.topicHits.length) {
      topicsHtml = res.topicHits
        .filter(h => passFilters({ bookId: h.book.id, category: h.book.category }, f))
        .map(h => `<a class="result-item paper-card topic-hit" href="${Lib.routeFor('/book', { id: h.book.id, p: h.topic.pageFrom })}">
          <div class="crumb"><span class="badge-reason">موضوع من الفهرس</span><span>${esc(h.book.title)}</span>
          <span class="chip-page">ص ${arNum(h.topic.pageFrom)}–${arNum(h.topic.pageTo)}</span></div>
          <div class="snippet" style="font-size:19px;color:var(--ink)">📚 ${esc(h.topic.title)}</div>
        </a>`).join('');
    }

    if (!rows.length && !topicsHtml) {
      summary.innerHTML = `نتائج البحث عن: «<b style="color:var(--amber-soft)">${esc(q)}</b>»`;
      results.innerHTML = `<div class="empty-state"><span class="big">🔍</span>
        ${esc(res.note || 'لا توجد نتائج.')}<br>
        <span style="font-size:15px">جرّب عبارة أقصر، أو رقم صفحة، أو «عناصر + اسم الموضوع».</span></div>`;
      return;
    }

    summary.innerHTML = `نتائج البحث عن: «<b style="color:var(--amber-soft)">${esc(q)}</b>» — ${arNum(rows.length)} ${rows.length > 2 ? 'نتيجة' : 'نتيجة/نتيجتان'}`;
    results.innerHTML = topicsHtml + rows.map(r => `
      <a class="result-item paper-card" href="${Lib.routeFor('/book', { id: r.bookId, p: r.page, hl: q })}">
        <div class="crumb">
          <span><b>${esc(r.bookTitle)}</b></span>
          ${r.chapter ? `<span class="sep">‹</span><span>${esc(r.chapter)}</span>` : ''}
          <span class="chip-page">صفحة ${arNum(r.page)}</span>
          <span class="badge-reason">${esc(r.reason)}</span>
        </div>
        <div class="snippet">${r.snippet}</div>
      </a>`).join('');
  }

  window.PageInits = window.PageInits || {};
  window.PageInits.search = start;
  if (!window.__SPA__) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
