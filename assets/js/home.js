/* الصفحة الرئيسية — تشغيل الأقسام */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const esc = Lib.escapeHTML;
  const arNum = Lib.arNum;

  /* ---------- ذرات الغبار ---------- */
  function makeDust() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#dust');
    if (!box) return;
    let html = '';
    for (let i = 0; i < 22; i++) {
      const x = (Math.random() * 100).toFixed(1);
      const dur = (11 + Math.random() * 17).toFixed(1);
      const dl = (-Math.random() * 22).toFixed(1);
      const dx = ((Math.random() - .5) * 160).toFixed(0);
      const sz = (2.5 + Math.random() * 4).toFixed(1);
      html += `<i style="--x:${x}%;--dur:${dur}s;--dl:${dl}s;--dx:${dx}px;width:${sz}px;height:${sz}px"></i>`;
    }
    box.innerHTML = html;
  }

  /* ---------- الامتحانات ---------- */
  function renderExams() {
    const wrap = $('#exams-body');
    const exams = (Lib.site().exams || [])
      .map(e => ({ e, st: Lib.examStatus(e) }))
      .sort((a, b) => {
        const rank = s => s.state === 'running' ? 0 : s.state === 'upcoming' ? 1 : 2;
        if (rank(a.st) !== rank(b.st)) return rank(a.st) - rank(b.st);
        return new Date(a.e.datetime) - new Date(b.e.datetime);
      });

    if (!exams.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="big">📅</span>
        لم تُعلَن مواعيد الامتحانات بعد.<br>
        <span style="font-size:15px">فور إضافتها من لوحة الإدارة ستظهر هنا تلقائيًا مع العدّ التنازلي المباشر.</span></div>`;
      return;
    }

    wrap.innerHTML = `<div class="exams-grid">` + exams.map(({ e, st }) => {
      const stateHtml =
        st.state === 'running' ? `<div class="exam-state">⏳ الامتحان جارٍ الآن</div><div class="countdown" data-exam="${esc(e.id)}"></div>` :
        st.state === 'finished' ? `<div class="exam-state exam-finished">انتهى الامتحان</div>` :
        `<div class="countdown" data-exam="${esc(e.id)}"></div>`;
      return `<div class="paper-card exam-card">
        <div class="exam-course">${esc(e.course || 'مقرر عام')}</div>
        <h3>${esc(e.name)}</h3>
        <div class="exam-date">🗓 ${Lib.arDate(e.datetime)}</div>
        ${stateHtml}
      </div>`;
    }).join('') + `</div>`;

    tickCountdowns();
  }

  function tickCountdowns() {
    document.querySelectorAll('.countdown[data-exam]').forEach(cd => {
      const id = cd.getAttribute('data-exam');
      const exam = Lib.site().exams.find(x => String(x.id) === String(id));
      if (!exam) return;
      const st = Lib.examStatus(exam);
      if (st.state === 'finished') { cd.outerHTML = `<div class="exam-state exam-finished">انتهى الامتحان</div>`; return; }
      if (st.state === 'running') { cd.innerHTML = `<div class="exam-state">⏳ الامتحان بدأ</div>`; return; }
      const d = Lib.splitDiff(st.diff);
      cd.innerHTML = `
        <div class="cell"><b>${arNum(d.seconds)}</b><span>ثانية</span></div>
        <div class="cell"><b>${arNum(d.minutes)}</b><span>دقيقة</span></div>
        <div class="cell"><b>${arNum(d.hours)}</b><span>ساعة</span></div>
        <div class="cell"><b>${arNum(d.days)}</b><span>يوم</span></div>`;
      cd.dataset.ticking = '1';
    });
  }

  /* ---------- جدول المحاضرات ---------- */
  function renderLectures() {
    const wrap = $('#lectures-body');
    const lecs = Lib.site().lectures || [];
    if (!lecs.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="big">🗓</span>
        جدول المحاضرات فارغ حاليًا.<br>
        <span style="font-size:15px">تُضاف مواعيد ومحاضرات الأسبوع من لوحة الإدارة وتظهر هنا فورًا.</span></div>`;
      return;
    }
    const order = { 'السبت': 0, 'الأحد': 1, 'الاثنين': 2, 'الثلاثاء': 3, 'الأربعاء': 4, 'الخميس': 5, 'الجمعة': 6 };
    const rows = lecs.slice().sort((a, b) => (order[a.day] ?? 9) - (order[b.day] ?? 9) || String(a.from || '').localeCompare(String(b.from || '')));
    wrap.innerHTML = `<div class="table-wrap"><table class="lectures">
      <thead><tr><th>اليوم</th><th>المادة</th><th>من</th><th>إلى</th><th>القاعة</th><th>المحاضر</th><th>ملاحظات</th></tr></thead>
      <tbody>${rows.map(l => `<tr>
        <td><span class="day-chip">${esc(l.day || '—')}</span></td>
        <td><b>${esc(l.subject || '—')}</b></td>
        <td>${esc(l.from || '—')}</td>
        <td>${esc(l.to || '—')}</td>
        <td>${esc(l.hall || '—')}</td>
        <td>${esc(l.doctor || '—')}</td>
        <td>${esc(l.notes || '')}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- المقررات ---------- */
  function renderCourses() {
    const wrap = $('#courses-body');
    const courses = Lib.site().courses || [];
    if (!courses.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="big">📖</span>
        لم تُضف مقررات بعد.<br>
        <span style="font-size:15px">من لوحة الإدارة يمكن تعريف المقررات وربطها بكتب المكتبة ومدى الصفحات المطلوبة.</span></div>`;
      return;
    }
    wrap.innerHTML = `<div class="courses-grid">` + courses.map(c => {
      const ranges = (c.ranges || []).map(r => {
        const b = Lib.bookById(r.bookId);
        const bTitle = b ? b.title : (r.bookTitle || r.bookId || 'كتاب');
        return `<li><b>${esc(bTitle)}</b> — من صفحة ${arNum(r.from)} إلى صفحة ${arNum(r.to)}${r.note ? ' • ' + esc(r.note) : ''}</li>`;
      }).join('');
      const firstRange = (c.ranges || [])[0];
      const openLink = firstRange && Lib.bookById(firstRange.bookId)
        ? `<a class="mini-btn" href="${Lib.routeFor('/book', { id: firstRange.bookId, p: firstRange.from })}">📕 فتح المنهج</a>` : '';
      return `<div class="paper-card course-card">
        <h3>${esc(c.name)}</h3>
        <div class="c-doc">${esc(c.doctor || '')}</div>
        ${c.notes ? `<div style="color:#4c3a28;font-size:15px;margin-bottom:8px">${esc(c.notes)}</div>` : ''}
        <ul class="ranges">${ranges || '<li>لم تُحدد مادة بعد</li>'}</ul>
        <div class="actions">${openLink}</div>
      </div>`;
    }).join('') + `</div>`;
  }

  /* ---------- المكتبة ---------- */
  const CAT_ORDER = ['الملكية الفكرية', 'القانون الدولي الخاص', 'القانون المدني', 'المرافعات', 'الشريعة الإسلامية'];
  function renderLibrary() {
    const wrap = $('#library-body');
    const books = Lib.books();
    if (!books.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="big">📚</span>
        ${Lib.dataOk() ? 'لا توجد كتب بعد.' :
          'تعذر تحميل بيانات المكتبة من هذه المعاينة المنفردة.<br><span style="font-size:15px">افتح <b>المعاينة الحية</b> (Live Preview) لمشاهدة الكتب التسعة كاملة والبحث داخلها.</span>'}
      </div>`;
      return;
    }

    const groups = new Map();
    for (const b of books) {
      const cat = b.category || 'عام';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(b);
    }
    const cats = [...groups.keys()].sort((a, b) => {
      const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'ar');
    });

    wrap.innerHTML = cats.map(cat => {
      const list = groups.get(cat);
      return `<div class="cat-block">
        <div class="cat-title"><span>❖</span> ${esc(cat)} <span class="count">${arNum(list.length)} ${list.length === 1 ? 'كتاب' : list.length === 2 ? 'كتابان' : 'كتب'}</span><span class="line"></span></div>
        <div class="books-grid">${list.map(bookCard).join('')}</div>
      </div>`;
    }).join('');
  }

  function bookCard(b) {
    const hue = b.hue ?? 28;
    const pattern = 'pattern-' + ((b.pattern ?? 1));
    const ocrPages = (b.extraction && b.extraction.ocr) || 0;
    const badge = ocrPages === 0
      ? `<span class="txt">نص مباشر</span>`
      : (ocrPages >= b.pages * .9 ? `<span class="ocr">OCR عربي</span>` : `<span class="ocr">نص + OCR</span>`);
    const topics = Lib.topicsOf(b);
    return `<a class="book-card ${pattern}" style="--hue:${hue}" href="${Lib.routeFor('/book', { id: b.id })}">
      <div class="book-cover">
        <span class="frame"></span>
        <h4>${esc(b.title)}</h4>
        <div class="b-author">${esc(b.author || 'مكتبة الدبلوم')}</div>
        <span class="b-band">${esc(b.category || 'عام')}</span>
      </div>
      <div class="book-meta">
        <h5>${esc(b.title)}</h5>
        <div class="stats">
          <span>📄 ${arNum(b.pages)} صفحة</span>
          <span>🗂 ${arNum(topics.length)} موضوعًا</span>
          ${badge}
        </div>
      </div>
    </a>`;
  }

  /* ---------- أسئلة المراجعة بالمادة ---------- */
  let quizCat = '';

  function renderQuizShell() {
    const card = $('#quiz-card');
    if (!card) return;
    const cats = Lib.quizCategories();
    const chips = [`<button type="button" data-cat="" class="${quizCat === '' ? 'on' : ''}">كل المواد</button>`]
      .concat(cats.map(c => `<button type="button" data-cat="${esc(c)}" class="${quizCat === c ? 'on' : ''}">${esc(c)}</button>`));
    card.innerHTML = `
      <div class="quiz-cats">${chips.join('')}</div>
      <div id="quiz-body"></div>`;
    card.querySelectorAll('.quiz-cats button').forEach(b => {
      b.onclick = () => { quizCat = b.dataset.cat; renderQuizShell(); };
    });
    newQuestion();
  }

  const SRC_LABEL = {
    'bank': 'من بنك الأسئلة',
    'auto-elements': 'من عناصر الموضوعات',
    'auto-discuss': 'مناقشة — من فهرس الكتاب',
  };

  function newQuestion() {
    const body = $('#quiz-body');
    if (!body) return;
    const q = Lib.randomQuestion(quizCat || null);
    if (!q) {
      body.innerHTML = `<div class="empty-state" style="border:none;background:none;padding:22px">
        ${quizCat ? `لا توجد أسئلة جاهزة لمادة «${esc(quizCat)}» بعد — أضف أسئلة من لوحة الإدارة أو سجّل عناصر لموضوعات كتبها.`
                  : 'لا توجد أسئلة متاحة بعد — أضف أسئلة من لوحة الإدارة.'}</div>`;
      return;
    }
    const optsHtml = q.options ? `<div class="quiz-options">` + q.options.map(o =>
      `<button type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('') + `</div>` : '';
    const answerHtml = q.answer != null
      ? `<b>الإجابة:</b><br>${esc(q.answer).replace(/\n/g, '<br>')}`
      : `<b>الإجابة النموذجية:</b> داخل الكتاب في موضوع السؤال مباشرة — افتحه من الزر بالأسفل وراجع نفسك.`;
    const openBtn = q.openLink
      ? `<a class="mini-btn" href="${Lib.routeFor('/book', { id: q.openLink.bookId, p: q.openLink.page })}">📖 فتح الموضوع في الكتاب (صفحة ${arNum(q.openLink.page)})</a>` : '';
    body.innerHTML = `
      <div class="q-label">${SRC_LABEL[q.source] || ''}${q.category ? ' — ' + esc(q.category) : ''}</div>
      <div class="q-text">${esc(q.question)}</div>
      ${optsHtml}
      <div class="quiz-answer" id="quiz-ans">${answerHtml}</div>
      <div class="quiz-src">المصدر: ${q.meta.map(m => `<b>${esc(m)}</b>`).join(' • ')}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${q.options ? '' : `<button class="mini-btn" id="quiz-show">👁 إظهار الإجابة</button>`}
        ${openBtn}
        <button class="mini-btn" id="quiz-new">🎲 سؤال آخر</button>
      </div>`;

    const ansBox = body.querySelector('#quiz-ans');
    const showBtn = body.querySelector('#quiz-show');
    if (showBtn) showBtn.onclick = () => { ansBox.classList.add('show'); showBtn.remove(); };
    body.querySelector('#quiz-new').onclick = newQuestion;
    body.querySelectorAll('.quiz-options button').forEach(btn => {
      btn.onclick = () => {
        const correct = btn.dataset.opt === q.answer;
        body.querySelectorAll('.quiz-options button').forEach(b2 => {
          b2.disabled = true;
          if (b2.dataset.opt === q.answer) b2.classList.add('correct');
        });
        if (!correct) btn.classList.add('wrong');
        ansBox.classList.add('show');
      };
    });
  }

  /* ---------- تشغيل ---------- */
  let _tickReg = false;
  async function start() {
    try { await Lib.init(); }
    catch (e) { console.error(e); }
    Lib.showDataWarningIfNeeded();
    makeDust();
    renderExams();
    renderLectures();
    renderCourses();
    renderLibrary();
    renderQuizShell();
    if (!_tickReg) {
      _tickReg = true;
      setInterval(() => {
        if (document.querySelector('.countdown[data-ticking="1"], .countdown[data-exam]')) tickCountdowns();
      }, 1000);
    }
  }
  window.PageInits = window.PageInits || {};
  window.PageInits.home = start;
  if (!window.__SPA__) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
