/* ============================================================
   وضع الملف الواحد (SPA) — موجّه الصفحات داخل ملف HTML واحد
   routes: #/  #/search  #/book  #/admin
   ============================================================ */
'use strict';

(() => {
  const app = () => document.getElementById('app');

  const ORN = '<svg class="ornament" viewBox="0 0 340 20"><g stroke="#b08d57" stroke-width="1.2" fill="none"><path d="M6 10 H140 M200 10 H334" opacity=".7"/><path d="M158 10 l12 -6 12 6 -12 6 Z" fill="#c8892e" stroke="#8a6a3d"/></g></svg>';

  const templates = {
    home: `
<section class="hero" id="top">
  <div class="lamp-glow" aria-hidden="true"></div>
  <div class="beam" aria-hidden="true"></div>
  <div class="dust" id="dust" aria-hidden="true"></div>
  <div class="crest" aria-hidden="true">
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M14 18c0-3.3 2.7-6 6-6h9v40h-9a6 6 0 0 0-6 6V18Z" fill="#2c1e14"/>
      <path d="M50 18c0-3.3-2.7-6-6-6h-9v40h9a6 6 0 0 1 6 6V18Z" fill="#3a2817"/>
      <path d="M29 12h6v40h-6z" fill="#f7e7bd"/>
      <path d="M22 22h4M22 28h4M38 22h4M38 28h4" stroke="#8a6a3d" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="12" r="4.5" fill="#ffd98f"/>
    </svg>
  </div>
  <h1>مكتبتك الذكية</h1>
  <p class="sub">ابحث، اقرأ، واكتشف المعرفة داخل كتبك — نصوص الكتب كاملة بين يديك</p>
  <svg class="ornament" viewBox="0 0 420 24" aria-hidden="true">
    <g stroke="#b08d57" stroke-width="1.4" fill="none">
      <path d="M8 12 H182 M238 12 H412" opacity=".8"/>
      <path d="M196 12 l14 -7 14 7 -14 7 Z" fill="#c8892e" stroke="#8a6a3d"/>
      <circle cx="188" cy="12" r="2.4" fill="#e6ac4f" stroke="none"/>
      <circle cx="232" cy="12" r="2.4" fill="#e6ac4f" stroke="none"/>
    </g>
  </svg>
  <form class="searchbox" id="hero-form" role="search">
    <input type="search" name="q" id="hero-q" placeholder="ابحث في مكتبتك أو اسأل عن موضوع… (مثال: عناصر أركان الجريمة — أو 148)" autocomplete="off">
    <button class="btn btn-amber" type="submit">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="10.5" cy="10.5" r="7"/><path d="m20 20-4.3-4.3" stroke-linecap="round"/></svg>
      ابحث
    </button>
  </form>
  <div class="cta-row">
    <a class="btn btn-ghost" href="#library">📚 تصفح الكتب</a>
    <a class="btn btn-ghost" href="#/search">🔎 البحث المتقدم</a>
  </div>
  <div class="shelfstage" aria-hidden="true">
    <div class="shelf"></div>
    <div class="plank"></div>
  </div>
</section>

<section class="sect" id="exams">
  <div class="sect-head"><div class="kicker">EXAMS</div><h2>مواعيد الامتحانات</h2>${ORN}</div>
  <div id="exams-body"><div class="empty-state">جاري التحميل…</div></div>
</section>

<section class="sect" id="lectures">
  <div class="sect-head"><div class="kicker">SCHEDULE</div><h2>جدول المحاضرات</h2>${ORN}</div>
  <div id="lectures-body"><div class="empty-state">جاري التحميل…</div></div>
</section>

<section class="sect" id="courses">
  <div class="sect-head"><div class="kicker">COURSES</div><h2>المقررات</h2>${ORN}</div>
  <div id="courses-body"><div class="empty-state">جاري التحميل…</div></div>
</section>

<section class="sect" id="library">
  <div class="sect-head">
    <div class="kicker">THE LIBRARY</div>
    <h2>كتب المكتبة</h2>
    <p class="sub2">نصوص الكتب كاملة — اضغط على أي كتاب لتقرأه داخل الموقع بتصميمه الخاص</p>
  </div>
  <div id="library-body"><div class="empty-state">جاري التحميل…</div></div>
</section>

<section class="sect" id="quiz">
  <div class="sect-head">
    <div class="kicker">QUIZ</div>
    <h2>أسئلة المراجعة</h2>
    <p class="sub2">اختر المادة ثم أجب على أسئلة محتوى حقيقية من كتبها</p>
  </div>
  <div class="paper-card quiz-card" id="quiz-card"><div class="empty-state">جاري التحميل…</div></div>
</section>`,

    search: `
<div class="results-wrap">
  <div class="sect-head" style="margin-bottom:22px">
    <div class="kicker">SMART RETRIEVAL</div>
    <h2>البحث في المكتبة</h2>
    <p class="sub2">عبارات • كلمات • أرقام صفحات • «عناصر…» • «موضوع كذا من صفحة كام»</p>
  </div>
  <form class="searchbox" id="search-form" role="search" style="margin:0 auto 6px">
    <input type="search" name="q" id="q" placeholder="اكتب عبارة أو سؤالًا…" autocomplete="off">
    <button class="btn btn-amber" type="submit">ابحث</button>
  </form>
  <div class="adv-row">
    <select id="f-book"><option value="">كل الكتب</option></select>
    <select id="f-cat"><option value="">كل الأقسام</option></select>
  </div>
  <div id="results-summary" class="center muted" style="margin:26px 0 6px;font-size:16px"></div>
  <div id="special"></div>
  <div id="results"></div>
</div>`,

    book: `
<div class="reader-shell" id="reader-shell">
  <div class="reader-bar" id="reader-bar">
    <button class="r-btn" id="btn-toc" title="فهرس المحتويات">☰ الفهرس</button>
    <span class="r-title" id="r-title">جاري تحميل الكتاب…</span>
    <span class="r-ctl">
      <button id="btn-prev" title="الصفحة السابقة">السابقة ◂</button>
      <span id="r-page-label">—</span>
      <button id="btn-next" title="الصفحة التالية">▸ التالية</button>
    </span>
    <span class="r-ctl">
      <span>صفحة</span>
      <input type="number" id="r-goto" min="1" value="1" style="width:70px">
      <button id="btn-goto">انتقال</button>
    </span>
    <span class="r-ctl r-search-ctl">
      <input type="search" id="r-search" placeholder="بحث داخل الكتاب…">
      <button id="btn-find">بحث</button>
    </span>
    <span class="r-ctl">
      <button id="btn-spread" title="التبديل بين صفحة واحدة وصفحتين">📖 صفحة</button>
      <button id="btn-bookmark" title="حفظ علامة مرجعية">🔖</button>
      <button id="btn-font-plus" title="تكبير الخط">أ+</button>
      <button id="btn-font-minus" title="تصغير الخط">أ−</button>
    </span>
  </div>
  <div class="progress-track"><i id="r-progress"></i></div>
  <div class="page-stage single" id="page-stage"></div>
</div>
<div class="drawer-overlay" id="drawer-overlay"></div>
<aside class="toc-drawer" id="toc-drawer">
  <button class="r-btn toc-close" id="btn-toc-close">✕ إغلاق</button>
  <h3>📜 فهرس المحتويات</h3>
  <div id="toc-list"></div>
</aside>`,

    admin: `
<div class="admin-shell">
  <div class="admin-tabs" id="tabs">
    <button data-tab="overview" class="on">🏠 نظرة عامة</button>
    <button data-tab="lectures">🗓 جدول المحاضرات</button>
    <button data-tab="exams">⏰ الامتحانات</button>
    <button data-tab="courses">📖 المقررات</button>
    <button data-tab="questions">❓ بنك الأسئلة</button>
    <button data-tab="books">📚 الكتب</button>
    <button data-tab="addbook">⬆️ إضافة كتاب</button>
  </div>

  <div class="panel on" id="panel-overview">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:10px">أهلًا بك في لوحة الإدارة</h2>
      <div class="notice">
        هذه اللوحة بدون كلمة مرور كما طلبت. التعديلات هنا <b>تُحفظ داخل متصفحك</b> وتظهر فورًا على صفحات الموقع.
        لمشاركة التعديلات مع كل الزوار: اضغط <b>«تصدير البيانات»</b> واستبدل ملف <code style="background:rgba(0,0,0,.06);padding:2px 8px;border-radius:6px">data/site.json</code> على الاستضافة بالملف المُصدَّر (أو أعد رفعه).
      </div>
      <div class="notice warn" id="quota-note" style="display:none"></div>
      <h3 style="color:var(--ink);margin:14px 0 8px">الإحصاءات</h3>
      <div id="overview-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;color:var(--ink)"></div>
      <h3 style="color:var(--ink);margin:20px 0 8px">بيانات الموقع</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="mini-btn" id="btn-export">⬇️ تصدير البيانات (JSON)</button>
        <label class="mini-btn" style="cursor:pointer">⬆️ استيراد البيانات<input type="file" id="inp-import" accept="application/json" style="display:none"></label>
        <button class="mini-btn" id="btn-reset" style="color:#8b2f1d">🗑 إعادة تعيين كل التعديلات</button>
        <span class="save-note" id="overview-note"></span>
      </div>
    </div>
  </div>

  <div class="panel" id="panel-lectures">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">جدول المحاضرات</h2>
      <div class="form-grid">
        <div class="field"><label>اليوم</label>
          <select id="lec-day"><option>السبت</option><option>الأحد</option><option selected>الاثنين</option><option>الثلاثاء</option><option>الأربعاء</option><option>الخميس</option><option>الجمعة</option></select></div>
        <div class="field"><label>المادة</label><input id="lec-subject" placeholder="مثال: القانون المدني"></div>
        <div class="field"><label>من</label><input id="lec-from" type="time"></div>
        <div class="field"><label>إلى</label><input id="lec-to" type="time"></div>
        <div class="field"><label>القاعة</label><input id="lec-hall" placeholder="مثال: قاعة 3"></div>
        <div class="field"><label>المحاضر</label><input id="lec-doctor" placeholder="مثال: د. أحمد"></div>
        <div class="field"><label>ملاحظات</label><input id="lec-notes" placeholder="اختياري"></div>
      </div>
      <button class="mini-btn" id="lec-add">＋ إضافة محاضرة</button>
      <span class="save-note" id="lec-note"></span>
      <table class="admin-table" id="lec-table">
        <thead><tr><th>اليوم</th><th>المادة</th><th>من</th><th>إلى</th><th>القاعة</th><th>المحاضر</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <div class="panel" id="panel-exams">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">الامتحانات</h2>
      <div class="notice">يظهر كل امتحان تضيفه على الصفحة الرئيسية تلقائيًا مع عدّ تنازلي حي (يوم : ساعة : دقيقة : ثانية)، مرتَّبة من الأقرب للأبعد.</div>
      <div class="form-grid">
        <div class="field"><label>اسم الامتحان</label><input id="ex-name" placeholder="مثال: امتحان القانون المدني"></div>
        <div class="field"><label>المقرر</label><input id="ex-course" placeholder="مثال: القانون المدني"></div>
        <div class="field"><label>التاريخ والساعة</label><input id="ex-datetime" type="datetime-local"></div>
        <div class="field"><label>الثواني</label><input id="ex-seconds" type="number" min="0" max="59" value="0"></div>
        <div class="field"><label>مدة الامتحان (دقيقة)</label><input id="ex-duration" type="number" min="15" value="120"></div>
      </div>
      <button class="mini-btn" id="ex-add">＋ إضافة امتحان</button>
      <span class="save-note" id="ex-note"></span>
      <table class="admin-table" id="ex-table">
        <thead><tr><th>الامتحان</th><th>المقرر</th><th>الموعد</th><th>المدة</th><th>الحالة</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <div class="panel" id="panel-courses">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">المقررات</h2>
      <div class="form-grid">
        <div class="field"><label>اسم المقرر</label><input id="co-name" placeholder="مثال: الملكية الفكرية"></div>
        <div class="field"><label>المحاضر</label><input id="co-doctor" placeholder="اختياري"></div>
        <div class="field" style="grid-column:1/-1"><label>ملاحظات</label><input id="co-notes" placeholder="اختياري"></div>
      </div>
      <h4 style="color:#71562c;margin:8px 0">المادة المطلوبة (مدى صفحات من كتب المكتبة)</h4>
      <div id="co-ranges"></div>
      <button class="mini-btn" id="co-range-add">＋ إضافة مدى صفحات</button>
      <div style="margin-top:12px">
        <button class="mini-btn" id="co-add">💾 حفظ المقرر</button>
        <span class="save-note" id="co-note"></span>
      </div>
      <table class="admin-table" id="co-table">
        <thead><tr><th>المقرر</th><th>المحاضر</th><th>المادة</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <div class="panel" id="panel-questions">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">بنك الأسئلة</h2>
      <div class="form-grid">
        <div class="field"><label>النوع</label><select id="qu-type"><option value="mcq">اختيار من متعدد</option><option value="essay">سؤال مقالي/مباشر</option></select></div>
        <div class="field"><label>الكتاب المرتبط</label><select id="qu-book"><option value="">—</option></select></div>
        <div class="field"><label>الموضوع</label><input id="qu-topic" placeholder="اختياري"></div>
        <div class="field"><label>رقم الصفحة</label><input id="qu-page" type="number" min="1" placeholder="اختياري"></div>
        <div class="field" style="grid-column:1/-1"><label>نص السؤال</label><textarea id="qu-question"></textarea></div>
        <div class="field" style="grid-column:1/-1" id="qu-options-wrap"><label>الاختيارات (سطر لكل اختيار) — للاختيار من متعدد</label><textarea id="qu-options"></textarea></div>
        <div class="field" style="grid-column:1/-1"><label>الإجابة الصحيحة</label><textarea id="qu-answer" style="min-height:60px"></textarea></div>
      </div>
      <button class="mini-btn" id="qu-add">＋ إضافة سؤال</button>
      <span class="save-note" id="qu-note"></span>
      <table class="admin-table" id="qu-table">
        <thead><tr><th>السؤال</th><th>النوع</th><th>الكتاب</th><th>الموضوع</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <div class="panel" id="panel-books">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">الكتب</h2>
      <div class="notice">الكتب مضمَّنة كنصوص داخل الموقع. يمكنك هنا تعديل البيانات (العنوان الحقيقي، المؤلف، القسم) وإدارة <b>الموضوعات وعناصرها</b> التي يستخدمها البحث الذكي ومحرك الأسئلة.</div>
      <table class="admin-table" id="books-table">
        <thead><tr><th>الكتاب</th><th>القسم</th><th>الصفحات</th><th>الاستخراج</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
      <div id="book-editor" style="display:none;margin-top:22px;border-top:2px solid rgba(138,106,61,.3);padding-top:18px">
        <h3 style="color:var(--ink);margin-bottom:10px">تحرير: <span id="be-title-h"></span></h3>
        <div class="form-grid">
          <div class="field"><label>العنوان الحقيقي</label><input id="be-title"></div>
          <div class="field"><label>المؤلف</label><input id="be-author"></div>
          <div class="field"><label>القسم</label><input id="be-category" list="cats-list"><datalist id="cats-list"></datalist></div>
          <div class="field"><label>الوصف</label><input id="be-description"></div>
        </div>
        <button class="mini-btn" id="be-save-meta">💾 حفظ البيانات</button>
        <span class="save-note" id="be-note"></span>
        <h4 style="color:#71562c;margin:18px 0 8px">الموضوعات والعناصر
          <button class="mini-btn" id="be-reset-topics" style="font-size:12.5px;padding:4px 10px">↩ استعادة من الفهرس الأصلي</button>
        </h4>
        <div class="notice" style="font-size:13.5px">لكل موضوع: عنوانه، صفحة البداية، صفحة النهاية، وعناصره (كل عنصر في سطر). «عناصر» هي ما يظهر عندما يسأل الطالب «عناصر موضوع…».</div>
        <div id="be-topics"></div>
        <button class="mini-btn" id="be-topic-add">＋ إضافة موضوع</button>
        <div style="margin-top:12px"><button class="mini-btn" id="be-save-topics">💾 حفظ الموضوعات</button></div>
      </div>
    </div>
  </div>

  <div class="panel" id="panel-addbook">
    <div class="paper-card">
      <h2 style="font-family:var(--font-display);color:var(--ink);margin-bottom:14px">إضافة كتاب جديد (PDF → نص)</h2>
      <div class="notice warn" id="ab-engine-note">
        يعمل هذا المُحوِّل <b>داخل المتصفح بالكامل</b> بدون أي خوادم أو مفاتيح API: يستخرج نص الـ PDF، ويكتشف تلقائيًا الصفحات ذات النص التالف (ترميز قديم/خطوط مكسورة/مستند ممسوح)، ويعيد قراءتها بـ <b>OCR عربي</b> من صورة الصفحة نفسها.
        <br>الكتاب الناتج يُحفظ في متصفحك ويكون قابلًا للبحث فورًا، ويمكنك تصديره كملف <code>book-*.json</code> لإضافته إلى مجلد <code>library/</code> على الاستضافة ليظهر للجميع.
      </div>
      <div class="form-grid">
        <div class="field" style="grid-column:1/-1"><label>ملف الـ PDF</label><input type="file" id="ab-file" accept="application/pdf"></div>
        <div class="field"><label>العنوان الحقيقي للكتاب</label><input id="ab-title" placeholder="إلزامي — سيظهر هذا الاسم لا اسم الملف"></div>
        <div class="field"><label>المؤلف</label><input id="ab-author" placeholder="اختياري"></div>
        <div class="field"><label>القسم</label><input id="ab-category" list="cats-list2" placeholder="مثال: القانون المدني"><datalist id="cats-list2"></datalist></div>
        <div class="field"><label>عتبة جودة النص (0–100)</label><input id="ab-thresh" type="number" min="20" max="90" value="55"></div>
      </div>
      <button class="mini-btn" id="ab-start">🚀 بدء التحويل</button>
      <button class="mini-btn" id="ab-cancel" style="display:none">⛔ إلغاء</button>
      <div class="proc-steps" id="ab-steps" style="display:none">
        <span data-step="0">استخراج النص</span>
        <span data-step="1">تحليل الجودة</span>
        <span data-step="2">OCR عربي للصفحات التالفة</span>
        <span data-step="3">تنظيف النص</span>
        <span data-step="4">فهرسة البحث</span>
        <span data-step="5">جاهز</span>
      </div>
      <div class="proc-bar" id="ab-bar-wrap" style="display:none"><i id="ab-bar"></i></div>
      <div class="center" id="ab-pct" style="font-size:14px;color:#71562c"></div>
      <div class="proc-log" id="ab-log" style="display:none;direction:rtl"></div>
      <div id="ab-done" style="margin-top:14px"></div>
    </div>
  </div>
</div>`
  };

  const TITLES = {
    home: 'مكتبتك الذكية — مكتبة دبلوم القانون الخاص الرقمية',
    search: 'البحث في المكتبة — مكتبتك الذكية',
    book: 'قارئ الكتاب — مكتبة دبلوم القانون الخاص',
    admin: 'لوحة الإدارة — مكتبة دبلوم القانون الخاص',
  };

  let pendingAnchor = null;

  function parseHash() {
    const h = (location.hash || '#/').slice(1);
    const q = h.indexOf('?');
    return { path: (q >= 0 ? h.slice(0, q) : h) || '/', qs: new URLSearchParams(q >= 0 ? h.slice(q + 1) : '') };
  }
  function currentRoute() {
    const { path } = parseHash();
    if (path === '/' || path === '') return 'home';
    if (path === '/search') return 'search';
    if (path === '/book') return 'book';
    if (path === '/admin') return 'admin';
    return 'home';
  }

  /* تحويل الروابط الداخلية لوضع الملف الواحد */
  function rewriteLinks(root) {
    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('data:') || href.startsWith('blob:')) return;
      if (href.startsWith('#/')) return; // راوتر جاهز
      if (href.startsWith('#')) {        // مرساة داخل الرئيسية
        a.addEventListener('click', e => {
          e.preventDefault();
          const id = href.slice(1);
          if (currentRoute() === 'home') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          } else {
            pendingAnchor = id;
            location.hash = '#/';
          }
        });
        return;
      }
      const m = href.match(/^(index|search|book|admin)\.html(\?[^#]*)?(#.*)?$/);
      if (m) {
        const name = m[1]; const qs = (m[2] || '').replace(/^\?/, '');
        const anchor = m[3] || '';
        a.setAttribute('href', '#/' + (name === 'index' ? '' : name) + (qs ? '?' + qs : '') + anchor);
      }
    });
  }

  /* استمارات البحث (الرئيسية) تعمل بالراوتر */
  function wireForms(root) {
    const heroForm = root.querySelector('#hero-form');
    if (heroForm) {
      heroForm.addEventListener('submit', e => {
        e.preventDefault();
        const v = heroForm.querySelector('#hero-q').value.trim();
        if (v) location.hash = '#/search?q=' + encodeURIComponent(v);
      });
    }
  }

  function setActiveNav(name) {
    document.querySelectorAll('.topbar nav a[data-route]').forEach(a =>
      a.classList.toggle('nav-cta', a.dataset.route === name));
  }

  async function mount(name) {
    const el = app();
    el.innerHTML = templates[name] || templates.home;
    document.title = TITLES[name] || TITLES.home;
    rewriteLinks(el);
    wireForms(el);
    const inits = (window.PageInits || {});
    if (typeof inits[name] === 'function') {
      try { await inits[name](); } catch (e) { console.error(e); }
    }
    window.scrollTo(0, 0);
    setActiveNav(name);
    if (pendingAnchor) {
      const a = pendingAnchor; pendingAnchor = null;
      setTimeout(() => document.getElementById(a)?.scrollIntoView({ behavior: 'smooth' }), 350);
    }
  }

  let current = null;
  function route() {
    const name = currentRoute();
    /* نفس العرض + تغيّر المعاملات فقط (مثل q في البحث أو id في الكتاب) → أعد التحميل أيضًا */
    if (name !== current) current = name;
    mount(name);
  }

  window.addEventListener('hashchange', route);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route);
  else route();
})();
