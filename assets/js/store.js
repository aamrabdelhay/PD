/* ============================================================
   المكتبة الرقمية — طبقة البيانات + محرك الاسترجاع الحتمي
   Deterministic RAG: لا يعتمد على أي نموذج توليدي
   استعلام → تصنيف → بحث → ترتيب → استرجاع دليل → قاعدة → إجابة
   ============================================================ */
'use strict';

const Lib = (() => {

  /* ---------- التطبيع العربي الموحّد (يُستخدم أيضًا عند بناء الفهرس) ---------- */
  function normalizeArabic(s) {
    return (s || '')
      .normalize('NFKC')
      .replace(/[‎‏‪-‮­؜]/g, '')
      .replace(/[ً-ٰٟـٖ-ٜۖ-ۭ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase()
      .replace(/[^\u0621-\u064a0-9a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const norm = normalizeArabic;

  /* ---------- أرقام عربية ---------- */
  const AR_D = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function arNum(n) { return String(n).replace(/\d/g, d => AR_D[+d]); }
  function toEnNum(s) { return String(s).replace(/[٠-٩]/g, d => AR_D.indexOf(d)); }

  /* ---------- حالة التخزين الداخلية ---------- */
  const LS = {
    site:      'plib.site.v1',        // تعديلات الأدمن على بيانات الموقع (امتحانات/محاضرات/مقررات/أسئلة)
    bookMeta:  'plib.bookmeta.v1',    // تعديلات بيانات الكتب
    topics:    id => `plib.topics.${id}.v1`,
    userBooks: 'plib.userbooks.v1',   // كتب أضيفت من لوحة الإدارة (داخل المتصفح)
    userIndex: 'plib.userindex.v1',   // سجلات بحث الكتب المضافة
    bookmarks: id => `plib.bm.${id}.v1`,
  };
  function lsGet(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('localStorage full', e); return false; } }

  const state = {
    site: null,           // بيانات الموقع المدموجة
    siteBase: null,
    index: null,          // { books: [...], pages: [[bi, page, text], ...] } — text مطبَّع
    userIndex: [],
    bookCache: new Map(),
    ready: null,
    dataOk: false,        // هل نجح تحميل بيانات المكتبة فعلًا؟
  };

  /* ---------- جلب ملفات البيانات (مع دعم النسخة المضمَّنة في ملف واحد) ---------- */
  async function fetchJSON(url) {
    const inl = window.__INLINE_DATA__;
    if (inl) {
      if (/data\/site\.json/.test(url) && inl.site) return inl.site;
      if (/search-index\.json/.test(url) && inl.index) return inl.index;
      const m = url.match(/book-([A-Za-z0-9_-]+)\.json/);
      if (m && inl.books && inl.books[m[1]]) return inl.books[m[1]];
    }
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('تعذر تحميل ' + url);
    return r.json();
  }

  /* ---------- توجيه يعمل في الوضعين: صفحات مستقلة أو ملف واحد (SPA) ---------- */
  function isSPA() { return !!window.__SPA__; }
  function queryParams() {
    if (isSPA()) {
      const h = location.hash || '';
      const qi = h.indexOf('?');
      return new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : '');
    }
    return new URLSearchParams(location.search);
  }
  function routeFor(path, params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    if (isSPA()) return '#' + path + qs;
    if (path === '/') return 'index.html' + qs;
    return path.slice(1) + '.html' + qs;
  }
  function setParams(obj) {
    const cur = queryParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) cur.delete(k); else cur.set(k, String(v));
    }
    if (isSPA()) {
      const base = (location.hash || '#/').split('?')[0];
      history.replaceState(null, '', base + '?' + cur.toString());
    } else {
      const u = new URL(location.href); u.search = cur.toString();
      history.replaceState(null, '', u);
    }
  }

  function mergeSiteData(base) {
    const over = lsGet(LS.site, null);
    const s = over || base;
    return {
      settings: Object.assign({ siteTitle: 'مكتبة دبلوم القانون الخاص' }, base.settings || {}, (s && s.settings) || {}),
      lectures: (s && s.lectures) || [],
      exams:    (s && s.exams)    || [],
      courses:  (s && s.courses)  || [],
      questions:(s && s.questions)|| [],
    };
  }

  /* ---------- بيانات الكتب المعدَّلة (overlay) ---------- */
  function bookMeta(bookBase) {
    const over = lsGet(LS.bookMeta, {});
    return Object.assign({}, bookBase, over[bookBase.id] || {});
  }

  /* موضوعات كتاب: من فصول الفهرس + تعديلات الأدمن (عناصر/مدى صفحات) */
  function topicsOf(bookBase) {
    const b = bookBase;
    const over = lsGet(LS.topics(b.id), null);
    if (over) return over;
    const ch = (b.chapters || []).slice().sort((a, z) => a.page - z.page);
    return ch.map((c, i) => ({
      id: 't' + i,
      title: c.title,
      pageFrom: c.page,
      pageTo: (i + 1 < ch.length ? ch[i + 1].page - 1 : b.pages),
      elements: [],
    }));
  }

  function chapterOf(bookBase, page) {
    const ch = (bookBase.chapters || []).slice().sort((a, z) => a.page - z.page);
    let cur = null;
    for (const c of ch) { if (c.page <= page) cur = c; else break; }
    return cur;
  }

  /* ---------- التهيئة ---------- */
  function init() {
    if (state.ready) return state.ready;
    state.ready = (async () => {
      let siteOk = true, indexOk = true;
      const siteBase = await fetchJSON('data/site.json').catch(() => { siteOk = false; return {}; });
      const index = await fetchJSON('library/search-index.json').catch(() => { indexOk = false; return { books: [], pages: [] }; });
      state.siteBase = siteBase;
      state.site = mergeSiteData(siteBase);
      state.index = index;
      state.userIndex = lsGet(LS.userIndex, []);
      state.dataOk = siteOk && indexOk && (index.books || []).length > 0;
    })();
    return state.ready;
  }

  /* تحذير واضح عند فتح الملف منفردًا بدون سيرفر */
  function showDataWarningIfNeeded() {
    if (state.dataOk) return;
    const isFile = location.protocol === 'file:';
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset-inline:12px;bottom:12px;z-index:999;padding:14px 18px;border-radius:12px;' +
      'background:linear-gradient(180deg,#f3ead6,#e9dcc0);color:#5a3d0c;border:2px solid #c8892e;' +
      'box-shadow:0 14px 40px -10px rgba(0,0,0,.6);font-size:15.5px;line-height:1.9;text-align:center;max-width:760px;margin:0 auto;';
    div.innerHTML = `<b>⚠ الموقع لم يُحمَّل بالكامل.</b><br>` +
      (isFile
        ? `أنت فتحت <b>index.html كملف منفرد</b> — المتصفح يمنع تحميل بيانات الكتب بهذه الطريقة.<br>
           شغّل الموقع عبر خادم ملفات: <code style="background:rgba(0,0,0,.07);padding:1px 8px;border-radius:6px;direction:ltr;display:inline-block">python3 -m http.server 8080</code> داخل مجلد الموقع ثم افتح <code style="background:rgba(0,0,0,.07);padding:1px 8px;border-radius:6px;direction:ltr;display:inline-block">http://localhost:8080</code> — أو ارفع المجلد على أي استضافة.`
        : `أنت تشاهد <b>معاينة الملف المنفردة</b> والتي تمنع تحميل بيانات المكتبة.<br>
           افتح <b>المعاينة الحية (Live Preview)</b> الخاصة بالسيرفر لمشاهدة الموقع كاملًا بالكتب والبحث.`);
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:8px;inset-inline-end:10px;border:none;background:none;font-size:16px;cursor:pointer;color:#8a6a3d';
    close.onclick = () => div.remove();
    div.appendChild(close);
    document.body.appendChild(div);
  }

  /* ---------- واجهة البيانات العامة ---------- */
  function site() { return state.site; }
  function reloadSiteFromStorage() { state.site = mergeSiteData(state.siteBase); }
  function books() {
    const base = (state.index.books || []).map(b => bookMeta(b));
    const extra = lsGet(LS.userBooks, []).map(ub => bookMeta(ub));
    return base.concat(extra);
  }
  function bookById(id) { return books().find(b => b.id === id) || null; }

  /* تحميل كتاب كامل (صفحات) — للقارئ */
  async function getBook(id) {
    if (state.bookCache.has(id)) return state.bookCache.get(id);
    const p = (async () => {
      const ub = lsGet(LS.userBooks, []).find(b => b.id === id);
      if (ub) return ub;
      return fetchJSON(`library/book-${id}.json`);
    })();
    state.bookCache.set(id, p);
    return p;
  }

  /* ============================================================
     محرك الاسترجاع الحتمي
     ============================================================ */

  /* تصنيف الاستعلام */
  function classifyQuery(qRaw) {
    const q = qRaw.trim();
    const qn = norm(toEnNum(q));
    const num = qn.match(/^(\d{1,4})$/);
    if (num) return { type: 'page-number', page: +num[1], qn };

    const m = q.match(/(?:عناصر|اركان|أركان|مكونات|مقومات|شروط)\s+(.+)/);
    if (m) return { type: 'elements', subject: m[1].trim(), qn: norm(m[1]) };

    const pg = q.match(/(.+?)\s+(?:من|يبدأ من|تبدأ من)?\s*صفحه?\s*(كام|كم|رقم كم)\s*[؟?]?$/);
    if (pg && norm(pg[1]).length > 2) return { type: 'page-range', subject: pg[1].trim(), qn: norm(pg[1]) };

    const def = q.match(/^(?:ما هو|ما هي|ماذا تعني|عرف|عرّف)\s+(.+?)\s*[؟?]?$/);
    if (def) return { type: 'definition', subject: def[1].trim(), qn: norm(def[1]) };

    return { type: 'fulltext', qn };
  }

  function allSearchRecords() {
    const base = state.index.pages || [];
    return base.concat(state.userIndex || []);
  }

  function findTopicInBooks(qnSubject) {
    let best = null;
    for (const b of books()) {
      for (const t of topicsOf(b)) {
        const tn = norm(t.title);
        if (!tn) continue;
        if (tn === qnSubject || tn.includes(qnSubject) || qnSubject.includes(tn)) {
          const score = tn === qnSubject ? 3 : (tn.includes(qnSubject) ? 2 : 1);
          if (!best || score > best.score) best = { book: b, topic: t, score };
        }
      }
    }
    return best;
  }

  function makeSnippet(text, needle, width = 170) {
    const i = text.indexOf(needle);
    if (i === -1) return { html: escapeHTML(text.slice(0, width)) + (text.length > width ? '…' : ''), hit: null };
    const from = Math.max(0, i - Math.floor(width / 2));
    const to = Math.min(text.length, i + needle.length + Math.floor(width / 2));
    const pre = (from > 0 ? '…' : '') + text.slice(from, i);
    const hit = text.slice(i, i + needle.length);
    const post = text.slice(i + needle.length, to) + (to < text.length ? '…' : '');
    return { html: escapeHTML(pre) + '<mark>' + escapeHTML(hit) + '</mark>' + escapeHTML(post), hit };
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function resultRow(book, pageProperty, text, needle, reason) {
    const ch = chapterOf(book, pageProperty);
    const snip = makeSnippet(text, needle);
    return {
      kind: 'page',
      bookId: book.id, bookTitle: book.title, category: book.category,
      chapter: ch ? ch.title : null, page: pageProperty,
      snippet: snip.html, found: !!snip.hit, reason,
    };
  }

  const STOP_WORDS = new Set(['في','من','الي','الى','علي','عن','ما','هو','هي','اذكر','بين','او','ثم','هذا','هذه','ذلك','التي','الذي','لم','لن','قد','كان','كانت','كل','بعد','قبل','عند','مع','ولا','ولم','فيه','فيها','منها','منه','الا','ايه','اية','كام','كم','صفحه','صفحة','موضوع','ماده','مادة']);

  /* البحث الرئيسي */
  function search(qRaw, opts = {}) {
    const q = qRaw.trim();
    if (!q) return { type: 'empty', results: [] };
    const cls = classifyQuery(q);
    const recs = allSearchRecords();
    const out = [];

    if (cls.type === 'page-number') {
      const p = cls.page;
      for (const r of recs) {
        if (r[1] === p) {
          const book = bookById(r[0]);
          if (book) out.push(resultRow(book, p, r[2], recSnippetNeedle(r[2]), `الصفحة رقم ${p} في هذا الكتاب`));
        }
      }
      return { type: 'page', query: q, results: out, note: out.length ? null : `لا توجد صفحة بالرقم ${p} في أي كتاب بالمكتبة.` };
    }

    if (cls.type === 'elements') {
      const hit = findTopicInBooks(cls.qn);
      if (hit) {
        const t = hit.topic;
        if (t.elements && t.elements.length) {
          return { type: 'topic-elements', query: q, book: hit.book, topic: t, results: [] };
        }
        const rows = phraseRows(recs, cls.qn, 8);
        return {
          type: 'topic-noelements', query: q, book: hit.book, topic: t,
          results: rows.map(r => r.row),
        };
      }
      const rows = phraseRows(recs, cls.qn, 12);
      return { type: 'fulltext', query: q, results: rows.map(r => r.row), note: rows.length ? null : 'لم يُعثر على هذا الموضوع في فهارس المكتبة.' };
    }

    if (cls.type === 'page-range') {
      const hit = findTopicInBooks(cls.qn);
      if (hit) return { type: 'topic-range', query: q, book: hit.book, topic: hit.topic, results: [] };
      const rows = phraseRows(recs, cls.qn, 12);
      return { type: 'fulltext', query: q, results: rows.map(r => r.row) };
    }

    /* نص كامل: عبارة ثم كلمات */
    let rows = phraseRows(recs, cls.qn, opts.limit || 30);
    let mode = 'phrase';
    if (rows.length === 0) {
      const terms = cls.qn.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
      if (terms.length) {
        rows = termRows(recs, terms, opts.limit || 30);
        mode = 'terms';
      }
    }
    /* لو النتائج قليلة، ضِف نتائج موضوعات الفهارس */
    const topicHits = [];
    for (const b of books()) {
      for (const t of topicsOf(b)) {
        const tn = norm(t.title);
        if (tn && (tn.includes(cls.qn) || cls.qn.includes(tn))) {
          topicHits.push({ book: b, topic: t });
        }
      }
      if (topicHits.length > 5) break;
    }
    return { type: 'fulltext', mode, query: q, topicHits, results: rows.map(r => r.row),
             note: rows.length || topicHits.length ? null : 'لم يُعثر على نتائج مطابقة داخل كتب المكتبة.' };
  }

  function recSnippetNeedle(text) {
    const w = text.split(' ').filter(x => x.length > 4);
    return w.length ? w[Math.floor(w.length / 2)] : text.slice(0, 6);
  }

  function phraseRows(recs, needle, limit) {
    const rows = [];
    if (needle.length < 2) return rows;
    for (const r of recs) {
      const book = bookById(r[0]); if (!book) continue;
      const text = r[2];
      let idx = 0, count = 0, first = -1;
      while ((idx = text.indexOf(needle, idx)) !== -1 && count < 4) { if (first < 0) first = idx; count++; idx += needle.length; }
      if (count > 0) {
        const ch = chapterOf(book, r[1]);
        let score = count * 10;
        if (ch && norm(ch.title).includes(needle)) score += 25;
        if (first < 300) score += 4;
        rows.push({ score, row: resultRowAt(book, r[1], text, first, needle, `مطابقة عبارة — ${count} موضعًا في الصفحة`) });
      }
      if (rows.length >= 400) break;
    }
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, limit);
  }

  function resultRowAt(book, pageN, text, at, needle, reason) {
    const ch = chapterOf(book, pageN);
    const from = Math.max(0, at - 85);
    const to = Math.min(text.length, at + needle.length + 85);
    const html = escapeHTML((from > 0 ? '…' : '') + text.slice(from, at)) +
                 '<mark>' + escapeHTML(text.slice(at, at + needle.length)) + '</mark>' +
                 escapeHTML(text.slice(at + needle.length, to) + (to < text.length ? '…' : ''));
    return { kind: 'page', bookId: book.id, bookTitle: book.title, category: book.category,
             chapter: ch ? ch.title : null, page: pageN, snippet: html, found: true, reason };
  }

  function termRows(recs, terms, limit) {
    const rows = [];
    for (const r of recs) {
      const book = bookById(r[0]); if (!book) continue;
      const text = r[2];
      let score = 0, hits = 0, firstTerm = null, firstAt = -1;
      for (const t of terms) {
        let idx = 0, c = 0, localFirst = -1;
        while ((idx = text.indexOf(t, idx)) !== -1 && c < 6) { if (localFirst < 0) localFirst = idx; c++; idx += t.length; }
        if (c > 0) { hits++; score += c * (t.length > 4 ? 6 : 3); if (firstAt < 0 || localFirst < firstAt) { firstAt = localFirst; firstTerm = t; } }
      }
      if (hits === terms.length) score += 20; else if (hits < Math.ceil(terms.length / 2)) continue;
      if (score > 0) rows.push({ score, row: resultRowAt(book, r[1], text, Math.max(0, firstAt), firstTerm || terms[0], `مطابقة ${hits} من ${terms.length} كلمات`) });
      if (rows.length >= 500) break;
    }
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, limit);
  }

  /* ============================================================
     محرك الأسئلة القاعدي — أسئلة محتوى حقيقية بالمادة المختارة:
     بنك الأسئلة | «اذكر عناصر …» من عناصر الموضوعات | «اشرح/ناقش …»
     لا يولّد أسئلة عن أرقام صفحات أو مواضع — محتوى علمي فقط.
     ============================================================ */
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const DISCUSS_FORMS = [
    t => `اشرح موضوع «${t}» شرحًا وافيًا.`,
    t => `ناقش موضوع «${t}» موضحًا أهم ما ورد فيه.`,
    t => `تكلَّم عن «${t}» مع بيان النقاط الجوهرية.`,
    t => `ما أهم ما تناوله الكتاب في موضوع «${t}»؟`,
  ];

  /* عناوين فصول مبهمة لا تصلح سؤال مناقشة مستقل: «الفصل الثاني» بلا أي تخصيص بعده */
  /* عناوين مبهمة لا تصلح سؤال مناقشة: وحدة فهرسة («الفصل/المطلب/المادة»…) متبوعة
     برقم ترتيبي فقط بلا مضمون («الفصل الثاني»، «المادة 56»، «المطلب األول» بتهجئات OCR).
     الطريقة: أجرد وحدة الفهرسة ثم الأرقام الترتيبية؛ فإن لم يبقَ نص ذو معنى فالعنوان عام.
     الجذع يضغط تكرار الحرف ليلتقط «الاول/االول». */
  /* ملحوظ: الكلمات مُطبَّعة (ة→ه) لتطابق ناتج norm() */
  const Q_UNITS = new Set(['الفصل', 'الباب', 'القسم', 'الجزء', 'المدخل', 'المبحث', 'الفرع', 'المطلب', 'الماده', 'القاعده', 'النقطه', 'الشق']);
  /* رقم ترتيبي بحرف عربي بعد التطبيع — يغطي «الأول/األول/الاول/الاولى» وتنويعات OCR */
  const ORD_RE = /^(ا+ل+ا*ول|ا+ل+ا*ول[يىه]?|الاول|الثان[يي]|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي|عشر|عشره)$/;
  function discussableTopic(t) {
    const tn0 = norm(t.title || '');
    if (tn0.length < 6) return false;
    let toks = tn0.split(' ').filter(Boolean);
    if (toks.length && Q_UNITS.has(toks[0])) toks.shift();
    while (toks.length && (ORD_RE.test(toks[0]) || /^\d+$/.test(toks[0]))) toks.shift();
    const rest = toks.join(' ').trim();
    return rest.length >= 4;
  }

  function autoQuestions(category) {
    const qs = [];
    for (const b of books()) {
      if (category && b.category !== category) continue;
      for (const t of topicsOf(b)) {
        if (!t.title || !t.pageFrom || t.pageFrom < 1) continue;
        if (t.elements && t.elements.length >= 2) qs.push({ kind: 'elements', book: b, topic: t });
        else if (b.chapters && b.chapters.length && t.pageFrom > 1 && discussableTopic(t)) qs.push({ kind: 'discuss', book: b, topic: t });
      }
    }
    return qs;
  }
  const _autoQCache = new Map();

  function randomQuestion(category = null) {
    const inCat = b => !category || (b && b.category === category);
    /* 1) بنك الأسئلة (أسئلة صاغها الأدمن أو الأسئلة المرجعية) */
    const bank = (state.site.questions || []).filter(q => {
      if (!q || !q.question) return false;
      if (!category) return true;
      if (q.category === category) return true;
      const b = q.bookId ? bookById(q.bookId) : null;
      return inCat(b);
    });
    const autoList = (() => {
      if (!_autoQCache.has(category)) _autoQCache.set(category, autoQuestions(category));
      return _autoQCache.get(category);
    })();

    const useBank = bank.length && (autoList.length === 0 || Math.random() < Math.min(0.8, bank.length / (autoList.length / 5 + bank.length)));
    if (useBank) {
      const q = pick(bank);
      const b = q.bookId ? bookById(q.bookId) : null;
      return {
        source: 'bank', category: (b && b.category) || q.category || null,
        question: q.question,
        options: q.type === 'mcq' ? shuffle((q.options || []).slice()) : null,
        answer: q.answer || null,
        meta: [b ? b.title : null, q.topic ? `الموضوع: ${q.topic}` : null, q.page && b ? `صفحة ${arNum(q.page)}` : null].filter(Boolean),
        openLink: b && q.page ? { bookId: b.id, page: q.page } : null,
      };
    }

    for (let tries = 0; tries < 40 && autoList.length; tries++) {
      const q = pick(autoList);
      const b = q.book, t = q.topic;
      if (q.kind === 'elements') {
        return {
          source: 'auto-elements', category: b.category,
          question: `اذكر عناصر موضوع «${t.title}».`,
          options: null,
          answer: t.elements.map((e, i) => `${arNum(i + 1)}. ${e}`).join('\n'),
          meta: [b.title, `الموضوع: ${t.title}`, `من صفحة ${arNum(t.pageFrom)} إلى ${arNum(t.pageTo)}`],
          openLink: { bookId: b.id, page: t.pageFrom },
        };
      }
      /* مناقشة موضوع حقيقي من فهرس الكتاب */
      return {
        source: 'auto-discuss', category: b.category,
        question: pick(DISCUSS_FORMS)(t.title),
        options: null,
        answer: null,
        meta: [b.title, `الموضوع: ${t.title}`, `من صفحة ${arNum(t.pageFrom)} إلى ${arNum(t.pageTo)}`],
        openLink: { bookId: b.id, page: t.pageFrom },
      };
    }
    return null;
  }

  /* مواد الامتحان = أقسام الكتب الموجودة */
  function quizCategories() {
    return [...new Set(books().map(b => b.category || 'عام'))];
  }

  /* ============================================================
     الامتحانات والعدّ التنازلي
     ============================================================ */
  function examTimes(exam) {
    const start = new Date(exam.datetime);
    const durMin = exam.durationMin || 120;
    const end = new Date(start.getTime() + durMin * 60000);
    return { start, end };
  }
  function examStatus(exam, now = new Date()) {
    const { start, end } = examTimes(exam);
    if (now < start) return { state: 'upcoming', diff: start - now };
    if (now < end) return { state: 'running' };
    return { state: 'finished' };
  }
  function splitDiff(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
  }

  const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  function arDate(iso) {
    const d = new Date(iso);
    let h = d.getHours(); const m = d.getMinutes();
    const ampm = h < 12 ? 'صباحًا' : 'مساءً';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${arNum(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${arNum(d.getFullYear())} — ${arNum(h12)}:${String(m).padStart(2,'0').replace(/\d/g, x => AR_D[+x])} ${ampm}`;
  }

  const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  /* ============================================================
     تصدير/استيراد بيانات الموقع (للمزامنة مع الاستضافة)
     ============================================================ */
  function exportSiteData() {
    return JSON.stringify(state.site, null, 2);
  }

  return {
    init, site, reloadSiteFromStorage,
    books, bookById, getBook, topicsOf, chapterOf,
    search, randomQuestion, quizCategories,
    examTimes, examStatus, splitDiff, arDate, DAYS_AR,
    normalizeArabic, norm, arNum, toEnNum, escapeHTML,
    lsGet, lsSet, LS, exportSiteData,
    showDataWarningIfNeeded, isSPA, queryParams, routeFor, setParams,
    deepClone: o => JSON.parse(JSON.stringify(o)),
    dataOk: () => state.dataOk,
  };
})();
