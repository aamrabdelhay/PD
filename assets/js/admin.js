/* لوحة الإدارة — بدون كلمة مرور */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = Lib.escapeHTML;
  const arNum = Lib.arNum;
  let W = null;            // نسخة العمل من بيانات الموقع
  let editingBook = null;  // الكتاب قيد التحرير
  let workingTopics = null;

  const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  function notify(id, msg = 'تم الحفظ ✓') {
    const el = $(id); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  function save() {
    const ok = Lib.lsSet(Lib.LS.site, W);
    Lib.reloadSiteFromStorage();
    W = Lib.deepClone(Lib.site());
    if (!ok) {
      const n = $('#quota-note');
      if (n) {
        n.style.display = 'block';
        n.textContent = 'تنبيه: مساحة تخزين المتصفح ممتلئة تقريبًا — استخدم «تصدير البيانات» لتفادي فقدان التعديلات.';
      }
    }
    return ok;
  }

  /* ================= نظرة عامة ================= */
  function renderOverview() {
    const stats = [
      ['📚 الكتب', Lib.books().length],
      ['📄 إجمالي الصفحات', Lib.books().reduce((a, b) => a + (b.pages || 0), 0)],
      ['🗓 محاضرات', W.lectures.length],
      ['⏰ امتحانات', W.exams.length],
      ['📖 مقررات', W.courses.length],
      ['❓ أسئلة', W.questions.length],
    ];
    $('#overview-stats').innerHTML = stats.map(([k, v]) =>
      `<div style="background:rgba(200,137,46,.1);border:1px solid rgba(138,106,61,.35);border-radius:10px;padding:12px 16px;text-align:center">
        <div style="font-size:13px;color:#71562c">${k}</div>
        <div style="font-size:26px;font-weight:700">${arNum(v)}</div></div>`).join('');
  }

  /* ================= جدول المحاضرات ================= */
  function renderLectures() {
    const tb = $('#lec-table tbody');
    tb.innerHTML = W.lectures.map(l => `<tr>
      <td>${esc(l.day)}</td><td>${esc(l.subject)}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td>
      <td>${esc(l.hall)}</td><td>${esc(l.doctor)}</td><td>${esc(l.notes || '')}</td>
      <td class="row-actions"><button data-del="${l.id}" class="del">حذف</button></td></tr>`).join('')
      || '<tr><td colspan="8" class="center" style="color:#93763e">لا توجد محاضرات بعد</td></tr>';
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      W.lectures = W.lectures.filter(x => x.id !== b.dataset.del);
      save(); renderLectures();
    });
  }

  /* ================= الامتحانات ================= */
  function renderExams() {
    const tb = $('#ex-table tbody');
    tb.innerHTML = W.exams.map(e => {
      const st = Lib.examStatus(e).state;
      const stTxt = st === 'upcoming' ? 'قادم' : st === 'running' ? 'جارٍ الآن' : 'انتهى';
      return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.course || '')}</td>
        <td>${Lib.arDate(e.datetime)}</td><td>${arNum(e.durationMin || 120)} دقيقة</td>
        <td>${stTxt}</td>
        <td class="row-actions"><button data-del="${e.id}" class="del">حذف</button></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="center" style="color:#93763e">لا توجد امتحانات بعد</td></tr>';
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      W.exams = W.exams.filter(x => x.id !== b.dataset.del);
      save(); renderExams();
    });
  }

  /* ================= المقررات ================= */
  function rangeRow(r = {}) {
    const div = document.createElement('div');
    div.className = 'form-grid';
    div.style.cssText = 'background:rgba(200,137,46,.07);border:1px dashed rgba(138,106,61,.4);border-radius:10px;padding:10px;margin-bottom:8px';
    const bookOpts = Lib.books().map(b =>
      `<option value="${esc(b.id)}" ${r.bookId === b.id ? 'selected' : ''}>${esc(b.title)}</option>`).join('');
    div.innerHTML = `
      <div class="field"><label>الكتاب</label><select class="co-book"><option value="">— اختر —</option>${bookOpts}</select></div>
      <div class="field"><label>من صفحة</label><input class="co-from" type="number" min="1" value="${r.from || 1}"></div>
      <div class="field"><label>إلى صفحة</label><input class="co-to" type="number" min="1" value="${r.to || 10}"></div>
      <div class="field"><label>ملاحظة</label><input class="co-rnote" value="${esc(r.note || '')}"></div>
      <div class="field" style="align-self:end"><button type="button" class="mini-btn co-del" style="color:#8b2f1d">حذف المدى</button></div>`;
    div.querySelector('.co-del').onclick = () => div.remove();
    return div;
  }
  function renderCourses() {
    const tb = $('#co-table tbody');
    tb.innerHTML = W.courses.map(c => `<tr>
      <td><b>${esc(c.name)}</b></td><td>${esc(c.doctor || '')}</td>
      <td>${(c.ranges || []).map(r => {
        const b = Lib.bookById(r.bookId);
        return `<div style="font-size:13.5px">${esc(b ? b.title : r.bookId)}: ${arNum(r.from)}→${arNum(r.to)}</div>`;
      }).join('') || '—'}</td>
      <td class="row-actions"><button data-del="${c.id}" class="del">حذف</button></td></tr>`).join('')
      || '<tr><td colspan="4" class="center" style="color:#93763e">لا توجد مقررات بعد</td></tr>';
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      W.courses = W.courses.filter(x => x.id !== b.dataset.del);
      save(); renderCourses();
    });
  }

  /* ================= بنك الأسئلة ================= */
  function renderQuestions() {
    const tb = $('#qu-table tbody');
    tb.innerHTML = W.questions.map(q => {
      const b = q.bookId ? Lib.bookById(q.bookId) : null;
      return `<tr><td>${esc(q.question.slice(0, 80))}${q.question.length > 80 ? '…' : ''}</td>
        <td>${q.type === 'mcq' ? 'اختيارات' : 'مقالي'}</td><td>${b ? esc(b.title.slice(0, 30)) : '—'}</td>
        <td>${esc(q.topic || '')}</td>
        <td class="row-actions"><button data-del="${q.id}" class="del">حذف</button></td></tr>`;
    }).join('') || '<tr><td colspan="5" class="center" style="color:#93763e">لا توجد أسئلة بعد</td></tr>';
    tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      W.questions = W.questions.filter(x => x.id !== b.dataset.del);
      save(); renderQuestions();
    });
  }

  /* ================= الكتب ================= */
  function renderBooks() {
    const tb = $('#books-table tbody');
    tb.innerHTML = Lib.books().map(b => {
      const ocr = (b.extraction && b.extraction.ocr) || 0;
      const meth = ocr === 0 ? 'نص مباشر' : ocr >= b.pages * .9 ? 'OCR عربي' : `نص + OCR (${arNum(ocr)} ص)`;
      return `<tr><td><b>${esc(b.title)}</b><div style="font-size:13px;color:#93763e">${esc(b.author || '')}</div></td>
        <td>${esc(b.category || 'عام')}</td><td>${arNum(b.pages)}</td><td>${meth}</td>
        <td class="row-actions">
          <button data-open="${esc(b.id)}">فتح</button>
          <button data-edit="${esc(b.id)}">تحرير</button>
        </td></tr>`;
    }).join('');
    tb.querySelectorAll('[data-open]').forEach(x => x.onclick = () => window.open(Lib.routeFor('/book', { id: x.dataset.open }), '_blank'));
    tb.querySelectorAll('[data-edit]').forEach(x => x.onclick = () => openBookEditor(x.dataset.edit));
    const cats = [...new Set(Lib.books().map(b => b.category || 'عام'))];
    const dl = cats.map(c => `<option value="${esc(c)}">`).join('');
    $('#cats-list').innerHTML = dl; $('#cats-list2').innerHTML = dl;
    const bk = $('#qu-book');
    bk.innerHTML = '<option value="">—</option>' + Lib.books().map(b => `<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('');
  }

  function openBookEditor(id) {
    const b = Lib.bookById(id);
    if (!b) return;
    editingBook = id;
    workingTopics = Lib.deepClone(Lib.topicsOf(b));
    $('#book-editor').style.display = '';
    $('#be-title-h').textContent = b.title;
    $('#be-title').value = b.title;
    $('#be-author').value = b.author || '';
    $('#be-category').value = b.category || 'عام';
    $('#be-description').value = b.description || '';
    renderTopicsEditor();
    $('#book-editor').scrollIntoView({ behavior: 'smooth' });
  }

  function renderTopicsEditor() {
    const wrap = $('#be-topics');
    wrap.innerHTML = '';
    workingTopics.forEach((t, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'background:rgba(255,255,255,.3);border:1px solid rgba(138,106,61,.35);border-radius:10px;padding:12px;margin-bottom:10px';
      div.innerHTML = `
        <div class="form-grid" style="margin-bottom:8px">
          <div class="field"><label>عنوان الموضوع</label><input class="t-title" value="${esc(t.title)}"></div>
          <div class="field"><label>من صفحة</label><input class="t-from" type="number" min="1" value="${t.pageFrom}"></div>
          <div class="field"><label>إلى صفحة</label><input class="t-to" type="number" min="1" value="${t.pageTo}"></div>
          <div class="field" style="align-self:end"><button type="button" class="mini-btn t-del" style="color:#8b2f1d">حذف الموضوع</button></div>
        </div>
        <div class="field"><label>عناصر الموضوع (سطر لكل عنصر)</label>
        <textarea class="t-elements" rows="3">${esc((t.elements || []).join('\n'))}</textarea></div>`;
      div.querySelector('.t-del').onclick = () => { workingTopics.splice(i, 1); renderTopicsEditor(); };
      wrap.appendChild(div);
    });
  }

  /* ============================================================
     إضافة كتاب — خط الأنابيب داخل المتصفح:
     PDF → استخراج → فحص جودة → OCR عربي → تنظيف → فهرسة → حفظ
     ============================================================ */
  let abCancel = false;

  function abLog(msg) {
    const log = $('#ab-log');
    log.style.display = 'block';
    log.textContent += msg + '\n';
    log.scrollTop = log.scrollHeight;
  }
  function abSetStep(onIdx, doneIdx = onIdx - 1) {
    $$('#ab-steps span').forEach(s => {
      const i = +s.dataset.step;
      s.classList.toggle('on', i === onIdx);
      s.classList.toggle('done', i <= doneIdx);
    });
    $('#ab-steps').style.display = 'flex';
  }
  function abProgress(done, total) {
    $('#ab-bar-wrap').style.display = '';
    const pct = total ? Math.round(100 * done / total) : 0;
    $('#ab-bar').style.width = pct + '%';
    $('#ab-pct').textContent = `تمت معالجة ${arNum(done)} من ${arNum(total)} صفحة — ${arNum(pct)}٪`;
  }

  function normalizeArabicSoft(s) {
    return (s || '').normalize('NFKC')
      .replace(/[‎‏‪-‮­؜]/g, '')
      .replace(/ـ/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  function qualityScore(text) {
    if (!text.trim()) return 0;
    const total = text.length;
    const repl = (text.match(/�/g) || []).length;
    const arabic = (text.match(/[؀-ۿݐ-ݿ]/g) || []).length;
    const latin = (text.match(/[a-zA-Z]/g) || []).length;
    const digits = (text.match(/[0-9٠-٩]/g) || []).length;
    const control = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    let score = 100;
    score -= (repl / total) * 200;
    score -= (control / total) * 150;
    const meaningful = (arabic + latin + digits) / total;
    if (meaningful < 0.5) score -= (0.5 - meaningful) * 100;
    if (/(.)\1{6,}/.test(text)) score -= 20;
    const moji = (text.match(/[∫◊Î«°ùÉód¿ƒ≤∏ŸΩ©Ø¢πõæ]/g) || []).length;
    if (moji > 15 && arabic < latin + moji) score -= 60;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  async function loadEngine(urls) {
    for (const u of urls) {
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = u; s.onload = res; s.onerror = () => rej(new Error('فشل تحميل ' + u));
          document.head.appendChild(s);
        });
        return u;
      } catch (e) { /* جرّب التالي */ }
    }
    throw new Error('تعذر تحميل محركات المعالجة (تحتاج اتصالًا بالإنترنت لأول مرة لجلب pdf.js/tesseract.js).');
  }

  /* ================= ربط الأحداث — يُستدعى بعد تركيب عرض الإدارة ================= */
  function bindEvents() {
    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
      $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-' + b.dataset.tab));
    });

    $('#btn-export').onclick = () => {
      const blob = new Blob([Lib.exportSiteData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'site.json';
      a.click();
      URL.revokeObjectURL(a.href);
      notify('#overview-note', 'تم تنزيل site.json — ارفعه إلى مجلد data/ على الاستضافة');
    };
    $('#inp-import').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        W = Object.assign({ settings: {}, lectures: [], exams: [], courses: [], questions: [] }, data);
        save(); renderAll(); notify('#overview-note', 'تم الاستيراد ✓');
      } catch (err) { alert('ملف غير صالح: ' + err.message); }
      e.target.value = '';
    };
    $('#btn-reset').onclick = () => {
      if (!confirm('سيؤدي هذا إلى حذف كل تعديلاتك المحلية (محاضرات/امتحانات/مقررات/أسئلة) والعودة للبيانات الأصلية. متابعة؟')) return;
      localStorage.removeItem(Lib.LS.site);
      Lib.reloadSiteFromStorage();
      W = Lib.deepClone(Lib.site());
      renderAll(); notify('#overview-note', 'تمت إعادة التعيين');
    };

    $('#lec-add').onclick = () => {
      const l = {
        id: uid(), day: $('#lec-day').value, subject: $('#lec-subject').value.trim(),
        from: $('#lec-from').value, to: $('#lec-to').value, hall: $('#lec-hall').value.trim(),
        doctor: $('#lec-doctor').value.trim(), notes: $('#lec-notes').value.trim(),
      };
      if (!l.subject) return alert('اكتب اسم المادة');
      W.lectures.push(l); save(); renderLectures(); notify('#lec-note');
      ['#lec-subject', '#lec-hall', '#lec-doctor', '#lec-notes'].forEach(id => $(id).value = '');
    };

    $('#ex-add').onclick = () => {
      const name = $('#ex-name').value.trim();
      const dtLocal = $('#ex-datetime').value;
      const secs = Math.min(59, Math.max(0, +$('#ex-seconds').value || 0));
      if (!name) return alert('اكتب اسم الامتحان');
      if (!dtLocal) return alert('حدد تاريخ ووقت الامتحان');
      const d = new Date(dtLocal); d.setSeconds(secs);
      W.exams.push({
        id: uid(), name, course: $('#ex-course').value.trim(),
        datetime: d.toISOString(), durationMin: Math.max(15, +$('#ex-duration').value || 120),
      });
      save(); renderExams(); notify('#ex-note');
      $('#ex-name').value = ''; $('#ex-course').value = ''; $('#ex-seconds').value = '0';
    };

    $('#co-range-add').onclick = () => $('#co-ranges').appendChild(rangeRow());
    $('#co-add').onclick = () => {
      const name = $('#co-name').value.trim();
      if (!name) return alert('اكتب اسم المقرر');
      const ranges = [...$('#co-ranges').children].map(div => ({
        bookId: div.querySelector('.co-book').value,
        from: +div.querySelector('.co-from').value || 1,
        to: +div.querySelector('.co-to').value || 1,
        note: div.querySelector('.co-rnote').value.trim(),
      })).filter(r => r.bookId);
      W.courses.push({ id: uid(), name, doctor: $('#co-doctor').value.trim(), notes: $('#co-notes').value.trim(), ranges });
      save(); renderCourses(); notify('#co-note');
      $('#co-name').value = ''; $('#co-doctor').value = ''; $('#co-notes').value = ''; $('#co-ranges').innerHTML = '';
    };

    $('#qu-type').onchange = () => {
      $('#qu-options-wrap').style.display = $('#qu-type').value === 'mcq' ? '' : 'none';
    };
    $('#qu-add').onclick = () => {
      const question = $('#qu-question').value.trim();
      const answer = $('#qu-answer').value.trim();
      if (!question || !answer) return alert('اكتب السؤال والإجابة');
      const type = $('#qu-type').value;
      const options = type === 'mcq'
        ? $('#qu-options').value.split('\n').map(s => s.trim()).filter(Boolean) : [];
      if (type === 'mcq' && (options.length < 2 || !options.includes(answer)))
        return alert('لأسئلة الاختيارات: اكتب اختيارين على الأقل، ويجب أن تطابق الإجابة الصحيحة أحد الاختيارات حرفيًا.');
      W.questions.push({
        id: uid(), type, question, options, answer,
        bookId: $('#qu-book').value || null,
        topic: $('#qu-topic').value.trim() || null,
        page: +$('#qu-page').value || null,
      });
      save(); renderQuestions(); notify('#qu-note');
      ['#qu-question', '#qu-options', '#qu-answer', '#qu-topic', '#qu-page'].forEach(id => $(id).value = '');
    };

    $('#be-save-meta').onclick = () => {
      const over = Lib.lsGet(Lib.LS.bookMeta, {});
      over[editingBook] = {
        title: $('#be-title').value.trim() || undefined,
        author: $('#be-author').value.trim(),
        category: $('#be-category').value.trim() || 'عام',
        description: $('#be-description').value.trim(),
      };
      Lib.lsSet(Lib.LS.bookMeta, over);
      renderBooks(); renderOverview(); notify('#be-note');
    };
    $('#be-topic-add').onclick = () => {
      workingTopics.push({ id: uid(), title: 'موضوع جديد', pageFrom: 1, pageTo: 1, elements: [] });
      renderTopicsEditor();
    };
    $('#be-save-topics').onclick = () => {
      $$('#be-topics > div').forEach((div, i) => {
        const t = workingTopics[i];
        if (!t) return;
        t.title = div.querySelector('.t-title').value.trim();
        t.pageFrom = Math.max(1, +div.querySelector('.t-from').value || 1);
        t.pageTo = Math.max(t.pageFrom, +div.querySelector('.t-to').value || t.pageFrom);
        t.elements = div.querySelector('.t-elements').value.split('\n').map(s => s.trim()).filter(Boolean);
      });
      Lib.lsSet(Lib.LS.topics(editingBook), workingTopics);
      notify('#be-note', 'تم حفظ الموضوعات ✓');
    };
    $('#be-reset-topics').onclick = () => {
      if (!confirm('استعادة الموضوعات من الفهرس الأصلي للكتاب؟ ستفقد تعديلات الموضوعات.')) return;
      localStorage.removeItem(Lib.LS.topics(editingBook));
      workingTopics = Lib.deepClone(Lib.topicsOf(Lib.bookById(editingBook)));
      renderTopicsEditor();
    };

    /* ---------- إضافة كتاب ---------- */
    $('#ab-start').onclick = async () => {
      const file = $('#ab-file').files[0];
      const title = $('#ab-title').value.trim();
      if (!file) return alert('اختر ملف PDF');
      if (!title) return alert('اكتب العنوان الحقيقي للكتاب');
      const THRESH = Math.min(90, Math.max(20, +$('#ab-thresh').value || 55));

      abCancel = false;
      $('#ab-cancel').style.display = '';
      $('#ab-log').textContent = ''; $('#ab-done').innerHTML = '';
      abSetStep(0, -1);
      abProgress(0, 1);

      let pdfjsLib, Tesseract, worker = null, ocrCount = 0, schedulerErr = 0;
      try {
        abLog('جاري تحميل محركات المعالجة داخل المتصفح…');
        await loadEngine([
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
        ]);
        pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      } catch (e) {
        abLog('✕ ' + e.message);
        abSetStep(0, -1);
        $('#ab-cancel').style.display = 'none';
        return;
      }

      const id = 'user-' + Date.now().toString(36);
      const pages = [];
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const total = pdf.numPages;
        abLog(`الكتاب: ${arNum(total)} صفحة. بدء استخراج النص وفحص الجودة…`);
        abProgress(0, total * 2);

        const needsOCR = [];
        for (let i = 1; i <= total; i++) {
          if (abCancel) throw new Error('ألغيت العملية.');
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = normalizeArabicSoft(content.items.map(it => it.str).join(' '));
          const q = qualityScore(text);
          if (q >= THRESH && text.length > 30) {
            pages.push({ n: i, text, src: 'pdf-text' });
          } else {
            pages.push({ n: i, text: '', src: 'pending-ocr' });
            needsOCR.push(i);
            abLog(`صفحة ${arNum(i)}: نص تالف أو غير واضح (جودة ${arNum(q)}) — ستُقرأ بالـ OCR`);
          }
          if (i % 5 === 0) abProgress(i, total * 2);
          abSetStep(1);
        }
        abLog(`انتهى الفحص: ${arNum(needsOCR.length)} صفحة تحتاج OCR عربي من أصل ${arNum(total)}.`);

        if (needsOCR.length) {
          abSetStep(2);
          abLog('تشغيل OCR عربي داخل المتصفح (قد يستغرق دقائق للكتب الكبيرة)…');
          try {
            await loadEngine([
              'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
              'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
            ]);
            Tesseract = window.Tesseract;
            worker = await Tesseract.createWorker('ara', 1, { logger: () => {} });
            abLog('محرك الـ OCR جاهز.');
          } catch (e) {
            abLog('⚠ تعذر تشغيل الـ OCR: ' + e.message + ' — ستُحفظ الصفحات التالفة فارغة مع علامة OCR_ERROR.');
            schedulerErr = 1;
          }
          let ocrdone = 0;
          for (const i of needsOCR) {
            if (abCancel) throw new Error('ألغيت العملية.');
            if (!worker) { pages[i - 1] = { n: i, text: '', src: 'ocr-error' }; continue; }
            try {
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width; canvas.height = viewport.height;
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              const { data } = await worker.recognize(canvas);
              pages[i - 1] = { n: i, text: normalizeArabicSoft(data.text), src: 'ocr', conf: Math.round(data.confidence) };
              ocrCount++;
            } catch (err) {
              pages[i - 1] = { n: i, text: '', src: 'ocr-error' };
              abLog(`⚠ فشل OCR في صفحة ${arNum(i)} — تستمر باقي الصفحات.`);
            }
            ocrdone++;
            abProgress(total + ocrdone, total * 2);
            if (ocrdone % 5 === 0) abLog(`… OCR: ${arNum(ocrdone)}/${arNum(needsOCR.length)}`);
          }
          if (worker) { await worker.terminate(); }
        }

        abSetStep(3);
        abProgress(total * 1.6, total * 2);
        await new Promise(r => setTimeout(r, 250));

        let chapters = [];
        try {
          const outline = await pdf.getOutline();
          if (outline) {
            for (const it of outline.slice(0, 80)) {
              try {
                const dest = typeof it.dest === 'string' ? await pdf.getDestination(it.dest) : it.dest;
                if (dest && dest[0]) {
                  const idx = await pdf.getPageIndex(dest[0]);
                  chapters.push({ title: normalizeArabicSoft(it.title).slice(0, 120), page: idx + 1, lvl: 1 });
                }
              } catch (e) { /* تجاهل العنصر */ }
            }
          }
        } catch (e) { /* لا يوجد فهرس مضمَّن */ }

        abSetStep(4);
        const recs = pages.map(p => [id, p.n, Lib.norm(p.text)]);
        const hue = (Math.floor(Math.random() * 24) * 15) % 360;
        const meta = {
          id, title, author: $('#ab-author').value.trim(), category: $('#ab-category').value.trim() || 'عام',
          description: 'أُضيف من لوحة الإدارة', year: new Date().getFullYear().toString(),
          hue, pattern: 1 + (id.length % 4),
          pages: pages.length, extraction: { ocr: ocrCount },
          chapters: chapters.sort((a, b) => a.page - b.page),
        };
        const stored = Object.assign({}, meta, {
          pages: pages,
          extraction: { 'pdf-text': pages.length - ocrCount - pages.filter(p => p.src === 'ocr-error').length, ocr: ocrCount, errors: pages.filter(p => p.src === 'ocr-error').length },
        });

        const userBooks = Lib.lsGet(Lib.LS.userBooks, []);
        userBooks.push(stored);
        const okB = Lib.lsSet(Lib.LS.userBooks, userBooks);
        const userIndex = Lib.lsGet(Lib.LS.userIndex, []);
        const okI = Lib.lsSet(Lib.LS.userIndex, userIndex.concat(recs));

        abSetStep(5);
        abProgress(total * 2, total * 2);
        abLog(`✓ اكتمل: ${arNum(pages.length)} صفحة (${arNum(pages.length - ocrCount)} نص مباشر + ${arNum(ocrCount)} OCR).`);
        if (schedulerErr) abLog('⚠ تعطل الـ OCR: راجع الاتصال بالإنترنت وأعد المحاولة.');

        const blob = new Blob([JSON.stringify(stored)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        $('#ab-done').innerHTML = `<div class="notice" style="color:#2c5d2c;background:rgba(78,140,78,.12);border-color:rgba(78,140,78,.4)">
          ✓ أصبح الكتاب «${esc(title)}» جزءًا من مكتبتك داخل هذا المتصفح —
          <a href="${Lib.routeFor('/book', { id })}">فتح الكتاب</a> •
          <a href="${Lib.routeFor('/search')}">جرّب البحث</a>
          <div style="margin-top:8px">لنشره لكل الزوار: <a href="${url}" download="book-${id}.json"><b>تنزيل book-${id}.json</b></a>
          ثم ضعه في مجلد <code>library/</code> على الاستضافة وأضف بياناته لفهرس الكتب.</div>
          ${(!okB || !okI) ? '<div style="color:#8b2f1d;margin-top:6px">⚠ مساحة المتصفح لا تتسع لهذا الكتاب — استخدم التنزيل والرفع للاستضافة.</div>' : ''}
        </div>`;
        renderBooks(); renderOverview();
      } catch (err) {
        if (worker) { try { await worker.terminate(); } catch (e) {} }
        abLog('✕ ' + err.message);
      }
      $('#ab-cancel').style.display = 'none';
    };
    $('#ab-cancel').onclick = () => { abCancel = true; };
  }

  /* ================= تشغيل ================= */
  function renderAll() {
    renderOverview(); renderLectures(); renderExams(); renderCourses(); renderQuestions(); renderBooks();
  }

  const boot = async () => {
    await Lib.init();
    Lib.showDataWarningIfNeeded();
    bindEvents();
    W = Lib.deepClone(Lib.site());
    renderAll();
  };
  window.PageInits = window.PageInits || {};
  window.PageInits.admin = boot;
  if (!window.__SPA__) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
