/* قارئ الكتاب — نصوص الكتب بتصميم الموقع، نفس ترتيب الكتاب الأصلي
   يدعم: صفحة واحدة / صفحتان متقابلتان — بحث داخل الكتاب — علامات مرجعية */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const esc = Lib.escapeHTML;
  const arNum = Lib.arNum;

  let bookId = null;
  let page = 1;
  let highlight = '';
  let book = null;      // الكتاب الكامل (صفحات)
  let meta = null;      // بيانات الفهرس (من search-index)
  let curFont = 0;      // إزاحة حجم الخط
  let spread = 1;       // 1 = صفحة واحدة، 2 = صفحتان

  const FONT_KEY = id => `plib.font.${id}`;
  const SPREAD_KEY = 'plib.spread.v1';
  const PANES = ['a', 'b'];

  function paneHTML(p) {
    return `<article class="page-paper" id="paper-${p}">
      <div class="page-head"><span class="chap" id="p${p}-chapter"></span><span id="p${p}-src"></span></div>
      <div class="page-text" id="p${p}-text"></div>
      <div class="page-foot"><span id="p${p}-foot-book"></span><span id="p${p}-foot-page"></span></div>
    </article>`;
  }

  /* ---------- تحميل ---------- */
  async function start() {
    const params = Lib.queryParams();
    bookId = params.get('id');
    page = Math.max(1, parseInt(params.get('p') || '1', 10) || 1);
    highlight = Lib.norm(params.get('hl') || '');
    book = null; meta = null;
    await Lib.init();
    Lib.showDataWarningIfNeeded();
    const stage = $('#page-stage');
    stage.innerHTML = paneHTML('a') + paneHTML('b');
    if (!bookId) { failPane('لم يُحدَّد كتاب. <a href="' + Lib.routeFor('/') + '" style="color:#8a5e14">عودة إلى المكتبة</a>'); return; }
    meta = Lib.bookById(bookId);
    if (!meta) { failPane('هذا الكتاب غير موجود في المكتبة — أو أن الموقع فُتح بدون خادم ملفات فلم تُحمَّل بيانات المكتبة. افتح الموقع من المعاينة الحية أو عبر خادم محلي.'); return; }

    try { book = await Lib.getBook(bookId); }
    catch (e) { failPane('تعذر تحميل نص الكتاب: ' + esc(e.message)); return; }

    document.title = `${meta.title} — مكتبة دبلوم القانون الخاص`;
    $('#r-title').textContent = meta.title;
    const foot = meta.author ? `${meta.title} — ${meta.author}` : meta.title;
    $('#pa-foot-book').textContent = foot; $('#pb-foot-book').textContent = foot;
    $('#r-goto').max = book.pages.length;

    /* ثيم الكتاب الخاص */
    const hue = meta.hue ?? 28;
    document.getElementById('reader-shell').style.setProperty('--hue', hue);
    PANES.forEach(p => {
      document.getElementById(`paper-${p}`).style.borderTop = `5px solid hsl(${hue} 55% 40%)`;
    });

    curFont = +(Lib.lsGet(FONT_KEY(bookId), 0) || 0);
    spread = Lib.lsGet(SPREAD_KEY, 1) === 2 ? 2 : 1;
    applyFont();
    applySpreadBtn();
    buildTOC();
    if (page > book.pages.length) page = book.pages.length;
    showPage(page, false);

    $('#btn-prev').onclick = () => showPage(page - spread);
    $('#btn-next').onclick = () => showPage(page + spread);
    $('#btn-goto').onclick = () => showPage(parseInt($('#r-goto').value, 10) || 1);
    $('#r-goto').addEventListener('keydown', e => { if (e.key === 'Enter') showPage(parseInt(e.target.value, 10) || 1); });
    $('#btn-find').onclick = findInBook;
    $('#r-search').addEventListener('keydown', e => { if (e.key === 'Enter') findInBook(); });
    $('#btn-spread').onclick = () => { spread = spread === 2 ? 1 : 2; Lib.lsSet(SPREAD_KEY, spread); applySpreadBtn(); showPage(page, false); };
    $('#btn-bookmark').onclick = toggleBookmark;
    $('#btn-font-plus').onclick = () => { curFont = Math.min(6, curFont + 1); applyFont(); };
    $('#btn-font-minus').onclick = () => { curFont = Math.max(-4, curFont - 1); applyFont(); };
    $('#btn-toc').onclick = () => setDrawer(true);
    $('#btn-toc-close').onclick = () => setDrawer(false);
    $('#drawer-overlay').onclick = () => setDrawer(false);
    document.addEventListener('keydown', e => {
      if (!book) return;
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') showPage(page + spread);
      if (e.key === 'ArrowRight') showPage(page - spread);
    });
    window.scrollTo(0, 0);
  }

  function applySpreadBtn() {
    const b = $('#btn-spread');
    b.innerHTML = spread === 2 ? '📖📖 صفحتان' : '📖 صفحة';
    b.classList.toggle('on', spread === 2);
    $('#page-stage').classList.toggle('single', spread === 1);
  }

  function failPane(html) {
    const t = $('#pa-text'); if (t) t.innerHTML = html;
    const t2 = $('#paper-b'); if (t2) t2.style.display = 'none';
    $('#r-title').textContent = 'خطأ';
  }

  function applyFont() {
    PANES.forEach(p => {
      const el = document.getElementById(`p${p}-text`);
      if (el) el.style.fontSize = `calc(clamp(18px, 2.2vw, 21.5px) + ${curFont}px)`;
    });
    Lib.lsSet(FONT_KEY(bookId), curFont);
  }

  /* ---------- عرض الصفحة ---------- */
  function pageRec(n) { return book.pages.find(p => p.n === n) || null; }

  function paintPane(p, rec) {
    const paper = document.getElementById(`paper-${p}`);
    if (!rec) { paper.classList.add('hidden-pane'); return; }
    paper.classList.remove('hidden-pane');
    const text = rec.text || '';
    let html;
    if (!text.trim()) {
      html = '<span style="color:#93763e">[صفحة بدون نص — غالبًا صورة أو صفحة فاصلة في الأصل]</span>';
    } else {
      html = highlight && highlight.length > 2 ? highlightHTML(text, highlight) : esc(text);
    }
    document.getElementById(`p${p}-text`).innerHTML = html;
    const ch = Lib.chapterOf(meta, rec.n);
    document.getElementById(`p${p}-chapter`).textContent = ch ? ch.title : '';
    document.getElementById(`p${p}-src`).textContent = rec.src === 'ocr'
      ? `نص مستخرج بتقنية OCR عربي${rec.conf ? ' (دقة ' + arNum(Math.round(rec.conf)) + '٪)' : ''}`
      : 'نص الكتاب الأصلي';
    document.getElementById(`p${p}-foot-page`).textContent = `صفحة ${arNum(rec.n)}`;
  }

  function showPage(n, push = true) {
    if (!book) return;
    n = Math.max(1, Math.min(book.pages.length, n));
    /* في وضع الصفحتين: ابدأ بصفحة فردية الترتيب ضمن الزوج الحالي */
    page = n;
    const recA = pageRec(page);
    if (!recA) return;
    const recB = spread === 2 ? pageRec(page + 1) : null;

    paintPane('a', recA);
    paintPane('b', recB);

    const lastShown = recB ? page + 1 : page;
    $('#r-page-label').textContent = recB
      ? `${arNum(page)}–${arNum(page + 1)} / ${arNum(book.pages.length)}`
      : `${arNum(page)} / ${arNum(book.pages.length)}`;
    $('#r-goto').value = page;
    $('#r-progress').style.width = (100 * lastShown / book.pages.length) + '%';
    $('#btn-prev').disabled = page <= 1;
    $('#btn-next').disabled = lastShown >= book.pages.length;

    const bm = bookmarks();
    $('#btn-bookmark').style.background = bm.includes(page) ? 'rgba(230,172,79,.45)' : '';

    if (push) Lib.setParams({ p: page });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const firstMark = document.querySelector('#pa-text mark, #pb-text mark');
    if (firstMark) firstMark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* تظليل needle داخل النص الخام — صيغة نمطية تتسامح مع التشكيل وصور الحروف */
  function flexRegexFromNorm(needle) {
    const DIAC = '[ً-ْٰـ]*';
    const mapChar = c => {
      if ('اأإآٱ'.includes(c)) return '[اأإآٱ]';
      if (c === 'ه') return '[هة]';
      if ('يىئ'.includes(c)) return '[يىئ]';
      if ('وؤ'.includes(c)) return '[وؤ]';
      if (/\s/.test(c)) return '\\s+';
      return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    return new RegExp('(' + needle.split('').map(mapChar).join(DIAC) + ')', 'g');
  }
  function highlightHTML(raw, needle) {
    const terms = needle.trim().split(/\s+/).filter(w => w.length > 1);
    if (needle.trim().length > 2) terms.unshift(needle.trim());
    let html = esc(raw);
    for (const t of terms.slice(0, 5)) {
      try {
        const rx = flexRegexFromNorm(t);
        html = html.replace(rx, '<mark>$1</mark>');
      } catch (e) { /* تجاهل */ }
    }
    return html;
  }

  /* ---------- البحث داخل الكتاب ---------- */
  function findInBook() {
    const q = $('#r-search').value.trim();
    if (!q) return;
    const qn = Lib.norm(q);
    if (!qn) return;
    const startIdx = book.pages.findIndex(p => p.n === page);
    const seq = book.pages.slice(startIdx).concat(book.pages.slice(0, startIdx));
    for (const rec of seq) {
      if (Lib.norm(rec.text || '').includes(qn)) {
        highlight = qn;
        Lib.setParams({ hl: q });
        showPage(rec.n);
        return;
      }
    }
    highlight = '';
    alert('لا توجد نتائج أخرى لهذه العبارة داخل الكتاب.');
  }

  /* ---------- الفهرس ---------- */
  function buildTOC() {
    const list = $('#toc-list');
    const topics = Lib.topicsOf(meta);
    let html = '';
    html += `<a class="toc-item" href="#" data-page="1"><span>⬆ بداية الكتاب</span><span class="p">١</span></a>`;
    for (const t of topics) {
      html += `<a class="toc-item" href="#" data-page="${t.pageFrom}">
        <span>${esc(t.title)}</span><span class="p">${arNum(t.pageFrom)}</span></a>`;
    }
    const bm = bookmarks();
    if (bm.length) {
      html += `<h3 style="margin-top:22px">🔖 علاماتك المرجعية</h3>` +
        bm.map(p => `<a class="toc-item lvl-2" href="#" data-page="${p}"><span>علامة — صفحة ${arNum(p)}</span><span class="p">${arNum(p)}</span></a>`).join('');
    }
    list.innerHTML = html;
    list.querySelectorAll('.toc-item').forEach(a => {
      a.onclick = e => {
        e.preventDefault();
        setDrawer(false);
        showPage(+a.dataset.page);
      };
    });
  }

  function setDrawer(open) {
    $('#toc-drawer').classList.toggle('open', open);
    $('#drawer-overlay').classList.toggle('show', open);
  }

  /* ---------- العلامات المرجعية ---------- */
  function bookmarks() { return Lib.lsGet(Lib.LS.bookmarks(bookId), []); }
  function toggleBookmark() {
    let bm = bookmarks();
    if (bm.includes(page)) bm = bm.filter(p => p !== page);
    else { bm.push(page); bm.sort((a, b) => a - b); }
    Lib.lsSet(Lib.LS.bookmarks(bookId), bm);
    showPage(page, false);
    buildTOC();
  }

  window.PageInits = window.PageInits || {};
  window.PageInits.book = start;
  if (!window.__SPA__) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
