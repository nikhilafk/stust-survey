/*
 * STUST 學生思考研究 — survey engine + interface motion. Survey by Nikky.
 * The question set, answer values and submission payload are identical to the
 * previous version, so the Google Apps Script receiver (apps-script/Code.gs)
 * does not change. The only network request is the final anonymous submission.
 */
'use strict';
(() => {
  /* ------------------------------------------------------------------ config */
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwG7RT7e33k-DRqizSGzE3Pn4SSZs7kWlXz-Vo8r3HfJ5jb8FKsu8QHtg7PPlmR0orQ6g/exec';
  const DRAFT_KEY = 'stustSurveyDraft_v4';
  const SUBMITTED_KEY = 'stustSubmitted_v1';
  const LOADER_KEY = 'stustLoaderSeen';
  const EASE = 'cubic-bezier(.76,0,.24,1)';
  const EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toText = v => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim();

  /* ------------------------------------------------------------------ survey content (unchanged) */
  const SECTIONS = [
    { key: 'profile', no: '01', kick: '第一部分', title: '關於你與 AI 的使用情況', en: 'You, first.', label: '基本資料', labelEn: 'Background', sub: '先了解你的學習背景與 AI 使用習慣。', subEn: 'A few details about your learning context.' },
    { key: 'depend', no: '02', kick: '第二部分', title: '你有多依賴 AI？', en: 'Rely on AI?', label: 'AI 依賴', labelEn: 'AI dependence', sub: '三個問題，依實際經驗回答即可。', subEn: 'Three questions. No judgment, just your experience.', scale: 'agree' },
    { key: 'critical', no: '03', kick: '第三部分', title: '你的批判性思考習慣', en: 'Ask why.', label: '批判性思考', labelEn: 'Critical thinking', sub: '分析能力、開放思考、系統性思考。', subEn: 'Analyticity. Open-mindedness. Systematicity.', scale: 'agree' },
    { key: 'creative', no: '04', kick: '第四部分', title: '你的創意發想習慣', en: 'Ideas grow.', label: '創造力', labelEn: 'Creativity', sub: '六個問題，了解你的日常創意習慣。', subEn: 'Six questions about everyday creative thinking.', scale: 'freq' }
  ];
  const ANCHORS = {
    agree: [['非常不同意', 'Strongly disagree'], ['非常同意', 'Strongly agree']],
    freq: [['幾乎不曾', 'Almost never'], ['幾乎總是', 'Almost always']]
  };
  const Q = [
    { id: 'Q01', type: 'choice', group: 'profile', en: 'What is your current year of study?', zh: '你目前就讀的年級是？', options: [['Year 1', '大一'], ['Year 2', '大二'], ['Year 3', '大三'], ['Year 4', '大四'], ['Graduate', '研究所'], ['Other', '其他']] },
    { id: 'Q02', type: 'text', group: 'profile', en: 'Which STUST department or program do you study in?', zh: '你目前就讀南臺科大哪個系所？', placeholder: '例如：資訊管理系', placeholderEn: 'e.g. Information Management' },
    { id: 'Q03', type: 'choice', group: 'profile', en: 'Have you used generative AI for university coursework?', zh: '你是否曾在課業中使用過生成式 AI？', options: [['Yes', '有'], ['No', '沒有']] },
    { id: 'Q04', type: 'choice', group: 'profile', en: 'How often do you use generative AI for university work?', zh: '你使用生成式 AI 處理課業的頻率為何？', options: [['Less than monthly', '不到每月一次'], ['1–3 times / month', '每月 1–3 次'], ['1–2 days / week', '每週 1–2 天'], ['3–5 days / week', '每週 3–5 天'], ['Daily', '每天']] },
    { id: 'Q05', type: 'choice', group: 'profile', en: 'Which generative AI tool do you use most often?', zh: '你最常使用哪一種生成式 AI 工具？', options: [['ChatGPT', 'ChatGPT'], ['Gemini', 'Gemini'], ['Microsoft Copilot', 'Microsoft Copilot'], ['Claude', 'Claude'], ['Other', '其他']] },
    { id: 'Q06', type: 'scale', group: 'depend', en: 'I rely on generative AI to help complete my course assignments.', zh: '我會依賴生成式 AI 協助完成課堂作業。' },
    { id: 'Q07', type: 'scale', group: 'depend', en: 'Without generative AI, certain university tasks would be difficult for me to complete.', zh: '如果沒有生成式 AI，有些課業任務對我來說會比較難完成。' },
    { id: 'Q08', type: 'scale', group: 'depend', en: 'When a study problem is difficult, I tend to ask AI before exploring solutions myself.', zh: '遇到困難的課業問題時，我通常會先詢問 AI，再自己思考解法。' },
    { id: 'Q09', type: 'scale', group: 'critical', cluster: ['分析能力', 'Analyticity'], en: 'Before using an AI response, I consider the assumptions behind it.', zh: '採用 AI 的回答前，我會思考它依據哪些假設。' },
    { id: 'Q10', type: 'scale', group: 'critical', en: 'I compare information from AI with evidence from other sources.', zh: '我會將 AI 提供的資訊與其他來源的證據進行比較。' },
    { id: 'Q11', type: 'scale', group: 'critical', en: 'I can explain why an AI-generated answer is reasonable or unreasonable.', zh: '我能說明 AI 的回答為何合理或不合理。' },
    { id: 'Q12', type: 'scale', group: 'critical', en: 'I notice when an AI-generated explanation lacks evidence.', zh: '當 AI 的說明缺乏證據時，我通常能察覺。' },
    { id: 'Q13', type: 'scale', group: 'critical', en: 'I distinguish facts from opinions in AI-generated content.', zh: '我會區分 AI 產生內容中的事實與觀點。' },
    { id: 'Q14', type: 'scale', group: 'critical', en: 'I evaluate whether AI suggestions fit the requirements of my assignment.', zh: '我會評估 AI 的建議是否符合實際作業要求。' },
    { id: 'Q15', type: 'scale', group: 'critical', cluster: ['開放思考', 'Open-mindedness'], en: 'I am willing to reconsider my opinion when I see convincing evidence.', zh: '當出現有說服力的證據時，我願意重新思考原本的看法。' },
    { id: 'Q16', type: 'scale', group: 'critical', en: 'I actively look for viewpoints that differ from an AI-generated answer.', zh: '我會主動尋找與 AI 回答不同的觀點。' },
    { id: 'Q17', type: 'scale', group: 'critical', en: 'I can accept that my own interpretation may be incorrect.', zh: '我能接受自己的理解可能有錯。' },
    { id: 'Q18', type: 'scale', group: 'critical', en: 'I consider more than one possible solution to a study problem.', zh: '面對課業問題時，我會考慮不只一種解法。' },
    { id: 'Q19', type: 'scale', group: 'critical', en: 'I listen carefully to classmates whose interpretations differ from mine.', zh: '同學的理解與我不同時，我會認真聆聽。' },
    { id: 'Q20', type: 'scale', group: 'critical', en: 'I change my conclusion when better information becomes available.', zh: '有更可靠的資訊時，我會調整自己的結論。' },
    { id: 'Q21', type: 'scale', group: 'critical', cluster: ['系統性思考', 'Systematicity'], en: 'I break complicated study questions into smaller parts before answering.', zh: '回答複雜的課業問題前，我會先將問題拆解成較小的部分。' },
    { id: 'Q22', type: 'scale', group: 'critical', en: 'I follow a clear sequence of steps when evaluating information.', zh: '評估資訊時，我會按照清楚的步驟進行。' },
    { id: 'Q23', type: 'scale', group: 'critical', en: 'I check whether my final answer follows logically from the evidence.', zh: '我會確認最後的答案是否能由證據合理推導。' },
    { id: 'Q24', type: 'scale', group: 'critical', en: 'I review important details before submitting an AI-assisted assignment.', zh: '繳交 AI 協助完成的作業前，我會再次檢查重要細節。' },
    { id: 'Q25', type: 'scale', group: 'critical', en: 'I organize information from different sources before reaching a conclusion.', zh: '形成結論前，我會整理不同來源的資訊。' },
    { id: 'Q26', type: 'scale', group: 'creative', en: 'I think of original ways to solve everyday problems.', zh: '我會想出有創意的方法來解決日常問題。' },
    { id: 'Q27', type: 'scale', group: 'creative', en: 'I find new uses for familiar objects or ideas.', zh: '我能為熟悉的物品或概念想出新的用途。' },
    { id: 'Q28', type: 'scale', group: 'creative', en: 'I combine different ideas to create something new.', zh: '我會結合不同想法，產生新的點子。' },
    { id: 'Q29', type: 'scale', group: 'creative', en: 'I explore several approaches before choosing one.', zh: '我會探索多種方法後，再決定採用哪一種。' },
    { id: 'Q30', type: 'scale', group: 'creative', en: 'I suggest unconventional ideas in class or group projects.', zh: '在課堂或分組專題中，我會提出不同於一般做法的想法。' },
    { id: 'Q31', type: 'scale', group: 'creative', en: 'I improve existing ideas by adding my own perspective.', zh: '我會加入自己的觀點，改進既有的想法。' }
  ];
  // Carry each critical-thinking sub-dimension forward to the items that follow it.
  let carry = null;
  Q.forEach(q => { if (q.group !== 'critical') { carry = null; return; } if (q.cluster) carry = q.cluster; q.dim = carry; });
  const SEC = Object.fromEntries(SECTIONS.map(s => [s.key, s]));

  const STEPS = [];
  SECTIONS.forEach(s => {
    STEPS.push({ type: 'intro', sec: s });
    Q.filter(q => q.group === s.key).forEach(q => STEPS.push({ type: 'q', q, sec: s }));
  });
  STEPS.push({ type: 'review' });
  const REVIEW_INDEX = STEPS.length - 1;
  const stepOf = id => STEPS.findIndex(s => s.type === 'q' && s.q.id === id);

  /* ------------------------------------------------------------------ state */
  function createId() {
    const a = (window.crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    return 'STUST-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + a.toUpperCase();
  }
  const blankAnswers = () => Object.fromEntries(Q.map(q => [q.id, '']));
  const state = { view: 'landing', step: 0, answers: blankAnswers(), consent: false, respondentId: createId(), returnToReview: false, submitting: false, submitted: null };
  const isAnswered = q => String(state.answers[q.id] || '').trim() !== '';
  const isValid = q => isAnswered(q) && !(q.id === 'Q03' && state.answers.Q03 === 'No');
  const countAnswered = () => Q.filter(isAnswered).length;

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: state.answers, step: state.step, consent: state.consent, respondentId: state.respondentId, savedAt: Date.now() })); } catch (e) { /* storage unavailable: continue without drafts */ }
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d || typeof d !== 'object') return false;
      Q.forEach(q => { if (d.answers && typeof d.answers[q.id] === 'string') state.answers[q.id] = d.answers[q.id]; });
      state.step = Math.min(Math.max(0, d.step | 0), STEPS.length - 1);
      state.consent = !!d.consent;
      if (/^STUST-\d{8}-[A-Z0-9]{4,12}$/.test(d.respondentId || '')) state.respondentId = d.respondentId;
      return true;
    } catch (e) { return false; }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ } }
  const hasProgress = () => countAnswered() > 0 || state.step > 0;
  const submittedBefore = () => { try { return !!localStorage.getItem(SUBMITTED_KEY); } catch (e) { return false; } };

  /* ================================================================== LANDING */
  const html = document.documentElement;
  const landing = $('#landing');

  function ready() { requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('is-ready'))); }

  // Preloader: calm first word, rapid cycle, curved exit (once per session).
  function runLoader(onReveal) {
    const el = $('#loader');
    let seen = false;
    try { seen = !!sessionStorage.getItem(LOADER_KEY); sessionStorage.setItem(LOADER_KEY, '1'); } catch (e) { /* ignore */ }
    if (reduced || seen || location.hash === '#survey') { el.classList.add('is-gone'); onReveal(); return; }
    html.classList.add('is-locked');
    const word = $('#loaderWord');
    const words = [['你好', 'zh-Hant'], ['Hello', 'en'], ['依賴', 'zh-Hant'], ['思考', 'zh-Hant'], ['創造', 'zh-Hant'], ['誰在思考？', 'zh-Hant']];
    let i = 0, exited = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
    const tick = () => {
      if (exited) return;
      i += 1;
      if (i >= words.length) { exit(); return; }
      word.textContent = words[i][0]; word.lang = words[i][1];
      setTimeout(tick, i === words.length - 1 ? 520 : 150);
    };
    setTimeout(tick, 950);
    el.addEventListener('click', () => exit(), { once: true });
    function exit() {
      if (exited) return; exited = true;
      const path = $('#loaderPath');
      const t0 = performance.now();
      const curve = now => {
        const p = Math.min(Math.max((now - t0 - 250) / 700, 0), 1);
        const e = 1 - Math.pow(1 - p, 3);
        path.setAttribute('d', `M0 0 L1000 0 Q500 ${(100 * (1 - e)).toFixed(2)} 0 0 Z`);
        if (p < 1) requestAnimationFrame(curve);
      };
      requestAnimationFrame(curve);
      const a = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(calc(-100% - 23vh))' }], { duration: 900, easing: EASE, fill: 'forwards' });
      setTimeout(onReveal, 180);
      a.onfinish = () => { el.classList.add('is-gone'); html.classList.remove('is-locked'); };
    }
  }

  // Giant marquee: constant drift, direction follows scroll direction, speeds up with scroll velocity.
  function initMarquee() {
    const track = $('#marqueeTrack');
    if (!track) return;
    const unit = track.children[0];
    const ensureWidth = () => {
      const unitW = unit.getBoundingClientRect().width;
      while (track.children.length * unitW < window.innerWidth + unitW * 1.2 && track.children.length < 8) track.appendChild(unit.cloneNode(true));
      return unitW;
    };
    let unitW = ensureWidth();
    if (reduced) return;
    let x = 0, dir = -1, boost = 0, lastY = scrollY, running = true;
    addEventListener('resize', () => { unitW = ensureWidth(); }, { passive: true });
    addEventListener('scroll', () => { const dy = scrollY - lastY; lastY = scrollY; if (dy) { dir = dy > 0 ? -1 : 1; boost = Math.min(boost + Math.abs(dy) * 0.08, 9); } }, { passive: true });
    const hero = $('.hero');
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(loop); }).observe(hero);
    let last = performance.now();
    function loop(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 16.67, 3); last = now;
      boost *= 0.92;
      x += dir * (0.55 + boost) * dt;
      if (x <= -unitW) x += unitW; else if (x > 0) x -= unitW;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Venn parallax (desktop pointer only)
  function initVenn() {
    if (reduced || !finePointer) return;
    const hero = $('.hero'), venn = $('.venn'), circles = $$('.venn-c');
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(step);
    });
    function step() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      venn.style.translate = `${(cx * 26).toFixed(2)}px ${(cy * 18).toFixed(2)}px`;
      circles.forEach((c, i) => { const k = [1, -0.7, 0.8][i]; c.style.translate = `${(cx * 14 * k).toFixed(2)}px ${(cy * 12 * k).toFixed(2)}px`; });
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(step) : 0;
    }
  }

  // Phrase-by-phrase mask reveal (segments are marked with "|")
  function initSplit() {
    $$('[data-split]').forEach(el => {
      $$('.seg', el).forEach((seg, i) => {
        seg.className = 'split-seg';
        seg.innerHTML = `<span style="transition-delay:${i * 90}ms">${seg.innerHTML}</span>`;
      });
    });
  }

  function initReveal() {
    const els = $$('[data-reveal],[data-split]');
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach(e => io.observe(e));
  }

  // Magnetic attraction + liquid fill (desktop pointer only)
  function bindMagnetic(el) {
    if (!finePointer || reduced || el.dataset.boundMag) return;
    el.dataset.boundMag = '1';
    const s = parseFloat(el.dataset.magnetic) || 0.25;
    const label = el.querySelector('.btn-label');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * s, y = (e.clientY - (r.top + r.height / 2)) * s;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (label) label.style.translate = `${(x * 0.45).toFixed(1)}px ${(y * 0.45).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => {
      [el, label].forEach(t => {
        if (!t || !t.style.translate) return;
        const from = t.style.translate;
        t.style.translate = '';
        t.animate([{ translate: from }, { translate: '0px 0px' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
      });
    });
  }
  function bindLiquid(el) {
    const fill = el.querySelector('.btn-fill');
    if (!fill || !finePointer || el.dataset.boundLiquid) return;
    el.dataset.boundLiquid = '1';
    let anim = null;
    el.addEventListener('pointerenter', () => {
      if (el.getAttribute('aria-disabled') === 'true') return;
      if (anim) anim.cancel();
      anim = fill.animate([{ transform: 'translateY(0)', borderRadius: '50%' }, { transform: 'translateY(-76%)', borderRadius: '0%' }], { duration: reduced ? 1 : 520, easing: EASE_OUT, fill: 'forwards' });
    });
    el.addEventListener('pointerleave', () => {
      if (!anim) return;
      const prev = anim; anim = null;
      const out = fill.animate([{ transform: 'translateY(-76%)', borderRadius: '0%' }, { transform: 'translateY(-170%)', borderRadius: '50%' }], { duration: reduced ? 1 : 480, easing: EASE, fill: 'forwards' });
      out.onfinish = () => { prev.cancel(); out.cancel(); };
    });
  }
  const bindButtons = (root = document) => $$('[data-magnetic], .btn-pill', root).forEach(el => { bindMagnetic(el); bindLiquid(el); });

  // Researcher portrait parallax
  function initParallax() {
    if (reduced) return;
    const img = $('#portrait'), frame = $('.researcher-frame');
    if (!img || !frame) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = frame.getBoundingClientRect();
      const p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2 + r.height / 2);
      img.style.transform = `translate3d(0,${(Math.max(-1, Math.min(1, p)) * 6).toFixed(2)}%,0)`;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  function initClock() {
    const el = $('#clock');
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Taipei' }); } catch (e) { return; }
    const tick = () => { el.textContent = fmt.format(new Date()) + ' GMT+8'; };
    tick(); setInterval(tick, 15000);
  }

  function initFloatCta() {
    const btn = $('#floatCta'), hero = $('.hero'), start = $('#start');
    let pastHero = false, atStart = false;
    const sync = () => btn.classList.toggle('on', pastHero && !atStart && state.view === 'landing');
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(hero);
    new IntersectionObserver(([e]) => { atStart = e.isIntersecting; sync(); }, { threshold: 0.05 }).observe(start);
  }

  // Consent + start / resume
  function syncStartUI() {
    const resumable = hasProgress() && state.consent;
    $('#resume').hidden = !resumable;
    $('#resumeCount').textContent = countAnswered();
    $('#startBtnLabel').innerHTML = resumable ? '繼續作答<small lang="en">Continue</small>' : '開始作答<small lang="en">Begin survey</small>';
    $('#consent').checked = state.consent;
    $('#repeatNote').hidden = !submittedBefore();
  }
  function initStart() {
    const box = $('#consentBox'), cb = $('#consent'), msg = $('#consentMsg');
    cb.addEventListener('change', () => { state.consent = cb.checked; if (cb.checked) msg.textContent = ''; if (hasProgress()) saveDraft(); });
    $('#startBtn').addEventListener('click', () => {
      if (!cb.checked) {
        msg.textContent = '請先勾選同意參與，才能開始作答。Please tick the consent box to begin.';
        box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
        cb.focus();
        return;
      }
      state.consent = true;
      openApp();
    });
    $('#resetDraft').addEventListener('click', () => {
      if (!confirm('確定要清除目前的作答進度並重新開始嗎？\nClear your saved answers and start over?')) return;
      state.answers = blankAnswers(); state.step = 0; state.respondentId = createId(); state.returnToReview = false;
      clearDraft(); syncStartUI();
    });
  }

  /* ================================================================== SURVEY APP */
  const app = $('#app'), stage = $('#stage');
  const nextBtn = $('#nextBtn'), backBtn = $('#backBtn');
  let running = [];          // in-flight screen animations
  let autoTimer = 0;         // pending auto-advance
  let viaPointer = false;    // last selection came from a pointer (enables auto-advance)

  function buildSteps() {
    $('#steps').innerHTML = SECTIONS.map(s => `<li data-sec="${s.key}"><span class="step-label">${s.no} ${esc(s.label)}</span><span class="step-bar"><i></i></span></li>`).join('');
  }

  function openApp() {
    state.view = 'app';
    landing.inert = true;
    app.hidden = false;
    html.classList.add('is-locked');
    $('#floatCta').classList.remove('on');
    if (location.hash !== '#survey') history.pushState({ survey: 1 }, '', '#survey');
    saveDraft();
    showStep(state.step, 0);
    if (!reduced) app.animate([{ transform: 'translateY(100%)', borderRadius: '50% 50% 0 0 / 90px 90px 0 0' }, { transform: 'translateY(0)', borderRadius: '0' }], { duration: 900, easing: EASE });
  }

  function closeApp(fromHistory) {
    clearTimeout(autoTimer);
    if (state.view === 'app') saveDraft();
    const wasDone = state.view === 'done';
    state.view = 'landing';
    const finish = () => {
      app.hidden = true; app.classList.remove('is-done', 'is-intro');
      stage.innerHTML = '';
      landing.inert = false;
      html.classList.remove('is-locked');
      if (wasDone) resetAfterSubmit();
      syncStartUI();
      $('#start').scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    if (reduced) finish();
    else app.animate([{ transform: 'translateY(0)', borderRadius: '0' }, { transform: 'translateY(100%)', borderRadius: '50% 50% 0 0 / 90px 90px 0 0' }], { duration: 800, easing: EASE }).onfinish = finish;
    if (!fromHistory && location.hash === '#survey') history.back();
  }

  function resetAfterSubmit() {
    state.answers = blankAnswers(); state.step = 0; state.respondentId = createId();
    state.consent = false; state.returnToReview = false; state.submitted = null;
  }

  /* ---------- screen builders */
  function anchorsFor(sec) { return ANCHORS[sec.scale || 'agree']; }

  function introScreen(sec) {
    const el = document.createElement('section');
    el.className = 'screen intro';
    el.setAttribute('aria-labelledby', 'introTitle');
    const n = Q.filter(q => q.group === sec.key).length;
    const legend = sec.scale ? (() => { const a = anchorsFor(sec); return `<div class="intro-legend" aria-label="作答方式：1 為${a[0][0]}，5 為${a[1][0]}"><i>1</i><span>${a[0][0]}<small lang="en">${a[0][1]}</small></span><span class="dash"></span><i class="hi">5</i><span>${a[1][0]}<small lang="en">${a[1][1]}</small></span></div>`; })() : '';
    el.innerHTML = `<div class="intro-inner">
      <div class="intro-no" aria-hidden="true">${sec.no}<span>.</span></div>
      <div class="intro-body">
        <p class="intro-kicker">${sec.kick}<span lang="en">Section ${sec.no} of 04</span></p>
        <h2 class="intro-title" id="introTitle" tabindex="-1">${esc(sec.title)}</h2>
        <p class="intro-en" lang="en">${esc(sec.en)}</p>
        <p class="intro-sub">${esc(sec.sub)}<span lang="en">${esc(sec.subEn)}</span></p>
        ${legend}
        <div class="intro-meta"><span><b>${n}</b> 題 <span lang="en">questions</span></span><span>${esc(sec.label)} <span lang="en">${esc(sec.labelEn)}</span></span></div>
      </div></div>`;
    return el;
  }

  function questionScreen(step) {
    const { q, sec } = step;
    const el = document.createElement('section');
    el.className = 'screen qs';
    el.dataset.q = q.id;
    const val = String(state.answers[q.id] || '');
    let answer = '';
    if (q.type === 'scale') {
      const a = anchorsFor(sec);
      answer = `<div class="scale">${[1, 2, 3, 4, 5].map(n => `<label class="scale-opt"><input type="radio" name="${q.id}" value="${n}" ${val === String(n) ? 'checked' : ''} aria-label="${n}${n === 1 ? '（' + a[0][0] + '）' : n === 5 ? '（' + a[1][0] + '）' : ''}"><span class="scale-dot" aria-hidden="true">${n}</span></label>`).join('')}</div>
        <div class="scale-anchors" aria-hidden="true"><span>1　${a[0][0]}<small lang="en">${a[0][1]}</small></span><span>${a[1][0]}　5<small lang="en">${a[1][1]}</small></span></div>`;
    } else if (q.type === 'choice') {
      answer = `<div class="choices ${q.options.length === 2 ? 'is-two' : ''}">${q.options.map(([en, zh], i) => {
        const checked = val === en;
        return `<label class="choice ${checked ? 'is-checked' : ''}"><input type="radio" name="${q.id}" value="${esc(en)}" ${checked ? 'checked' : ''}><span class="choice-key" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="choice-text"><span class="choice-zh">${esc(zh)}</span>${zh !== en ? `<span class="choice-en" lang="en">${esc(en)}</span>` : ''}</span><svg class="choice-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" stroke-width="2"/></svg></label>`;
      }).join('')}</div>`;
    } else {
      answer = `<div class="text-field"><input class="q-input" id="in-${q.id}" type="text" name="${q.id}" value="${esc(val)}" maxlength="120" autocomplete="off" placeholder="${esc(q.placeholder)}" aria-labelledby="lg-${q.id}" aria-describedby="tx-${q.id}"><div class="text-meta" id="tx-${q.id}"><span lang="en">${esc(q.placeholderEn)}</span><span class="text-count">${val.length} / 120</span></div></div>`;
    }
    const dim = q.dim ? `<span class="q-cluster">${esc(q.dim[0])}<span lang="en">${esc(q.dim[1])}</span></span>` : '';
    const notice = q.id === 'Q03' ? `<div class="notice" id="screenout" ${state.answers.Q03 === 'No' ? '' : 'hidden'} role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><p>本問卷的研究對象是曾在課業中使用過生成式 AI 的學生，因此無法繼續作答。若選錯了，請改選「有」。謝謝你的時間！<span lang="en">This survey is for students who have used generative AI for coursework, so it can't continue. If you chose this by mistake, select "Yes". Thank you for your time!</span></p></div>` : '';
    el.innerHTML = `<div class="screen-inner"><div class="q">
      <div class="q-meta"><span class="q-no" lang="en">${q.id}</span><span>${sec.no} · ${esc(sec.label)}</span>${dim}</div>
      <fieldset class="q-field" aria-describedby="err-${q.id}">
        <legend class="q-legend" id="lg-${q.id}" tabindex="-1"><span class="q-zh">${esc(q.zh)}</span><span class="q-en" lang="en">${esc(q.en)}</span></legend>
        <div class="q-answer">${answer}</div>
      </fieldset>
      ${notice}
      <p class="q-error" id="err-${q.id}" role="alert"></p>
    </div></div>`;
    bindQuestion(el, q);
    return el;
  }

  function bindQuestion(el, q) {
    const answerBox = $('.q-answer', el);
    if (q.type === 'text') {
      const input = $('input', el), count = $('.text-count', el);
      input.addEventListener('input', () => { setAnswer(q, input.value); count.textContent = input.value.length + ' / 120'; });
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); next(); } });
      return;
    }
    answerBox.addEventListener('pointerdown', () => { viaPointer = true; });
    answerBox.addEventListener('keydown', () => { viaPointer = false; });
    $$('input', el).forEach(input => input.addEventListener('change', () => {
      if (!input.checked) return;
      $$('.choice', el).forEach(c => c.classList.toggle('is-checked', c.contains(input)));
      setAnswer(q, input.value);
      if (viaPointer) scheduleAdvance(q);
      viaPointer = false;
    }));
  }

  function reviewScreen() {
    const el = document.createElement('section');
    el.className = 'screen review';
    const done = countAnswered();
    const answerText = q => {
      const v = String(state.answers[q.id] || '');
      if (!v.trim()) return `<span class="rv-a missing">尚未作答 <span lang="en">Missing</span></span>`;
      if (q.type === 'scale') return `<span class="rv-a">${esc(v)} / 5<span class="dots" aria-hidden="true">${[1, 2, 3, 4, 5].map(n => `<i class="${String(n) === v ? 'on' : ''}"></i>`).join('')}</span></span>`;
      if (q.type === 'choice') { const o = q.options.find(o => o[0] === v); return `<span class="rv-a">${esc(o ? o[1] : v)}</span>`; }
      return `<span class="rv-a">${esc(v)}</span>`;
    };
    el.innerHTML = `<div class="review-inner">
      <div class="review-head"><div>
        <p class="label">最後確認 <span lang="en">Final check</span></p>
        <h2 class="review-title" id="reviewTitle" tabindex="-1">你的想法<i class="dot-end" aria-hidden="true"></i><span lang="en">Your thoughts.</span></h2>
        <p class="review-sub">送出後，答案將匿名傳送給研究者，不包含姓名、學號或任何可識別身分的資訊。點選任一題即可修改。<span lang="en">Answers are sent anonymously, with no name, student ID or identifying information. Select any item to change it.</span></p>
      </div><p class="review-count"><b>${done}</b><span>/ 31 題已作答 <span lang="en">answered</span></span></p></div>
      ${SECTIONS.map(s => {
        const items = Q.filter(q => q.group === s.key);
        const c = items.filter(isAnswered).length;
        return `<div class="rv-group"><div class="rv-group-head"><h3><span lang="en">${s.no}</span>${esc(s.label)}</h3><p>${c} / ${items.length}<span lang="en"> · ${esc(s.labelEn)}</span></p></div>
          <div class="rv-list">${items.map(q => `<button type="button" class="rv-item" data-jump="${q.id}" aria-label="修改 ${q.id}：${esc(q.zh)}"><span class="rv-id" lang="en">${q.id}</span><span class="rv-q">${esc(q.zh)}</span>${answerText(q)}<span class="rv-edit" aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
      }).join('')}
      <div class="rv-error" id="rvError" role="alert"></div>
    </div>`;
    $$('[data-jump]', el).forEach(b => b.addEventListener('click', () => { state.returnToReview = true; go(stepOf(b.dataset.jump), -1); }));
    return el;
  }

  function doneScreen() {
    const el = document.createElement('section');
    el.className = 'screen done';
    const sub = state.submitted || {};
    const t = (sub.at ? new Date(sub.at) : new Date()).toLocaleString('zh-TW', { hour12: false });
    el.innerHTML = `<div class="done-inner">
      <p class="label" style="color:var(--muted-d)">已送出 <span lang="en">Submitted</span></p>
      <h2 class="done-title" id="doneTitle" tabindex="-1">謝謝你<i class="dot-end" aria-hidden="true"></i></h2>
      <p class="done-en" lang="en">Thank you.</p>
      <div class="done-note"><img src="assets/img/nikky-avatar.webp" alt="" width="240" height="240">
        <div><p>你的 31 題答案已匿名送達。謝謝你願意花時間，誠實地回答每一題，這對這份研究非常重要。你現在可以關閉這個頁面。<span lang="en">Your 31 answers have been sent anonymously. Thank you for taking the time to answer honestly. You can close this page now.</span></p><p class="sig">— Nikky・研究者 <span lang="en">Researcher</span></p></div></div>
      <dl class="done-meta"><div><dt>回覆編號 <span lang="en">Response ID</span></dt><dd>${esc(sub.id || '')}</dd></div><div><dt>送出時間 <span lang="en">Submitted</span></dt><dd>${esc(t)}</dd></div></dl>
      <div class="done-actions">
        <button type="button" class="btn-pill" id="doneHome" data-magnetic="0.25"><span class="btn-label">返回首頁 <span lang="en">Back to start</span></span><span class="btn-fill" aria-hidden="true"></span></button>
        <a class="btn-pill" href="https://nikhilafk.github.io/nikkyportfolio/" target="_blank" rel="noopener" data-magnetic="0.25"><span class="btn-label">認識研究者 <span lang="en">About the researcher</span> ↗</span><span class="btn-fill" aria-hidden="true"></span></a>
      </div></div>`;
    $('#doneHome', el).addEventListener('click', () => closeApp(false));
    return el;
  }

  /* ---------- navigation */
  function finishRunning() { running.forEach(a => { try { a.finish(); } catch (e) { /* ignore */ } }); running = []; }

  function showStep(index, dir) {
    clearTimeout(autoTimer);
    finishRunning();
    state.step = index;
    const step = STEPS[index];
    const prev = $('.screen', stage);
    const el = step.type === 'intro' ? introScreen(step.sec) : step.type === 'q' ? questionScreen(step) : reviewScreen();
    swap(prev, el, dir);
    if (state.view === 'app') saveDraft();
    updateChrome();
    announce(step);
  }

  function showDone() {
    state.view = 'done';
    finishRunning();
    const prev = $('.screen', stage);
    app.classList.add('is-done');
    swap(prev, doneScreen(), 1, true);
    bindButtons(stage);
    $('#announcer').textContent = '問卷已送出，謝謝你。Survey submitted. Thank you.';
  }

  function swap(prev, el, dir, curtain) {
    const isIntro = el.classList.contains('intro') || curtain;
    const prevIntro = prev && prev.classList.contains('intro');
    stage.appendChild(el);
    const focusTarget = () => { const f = $('[tabindex="-1"]', el); if (f) f.focus({ preventScroll: true }); };
    if (!prev || reduced || dir === 0) {
      if (prev) prev.remove();
      focusTarget();
      return;
    }
    const opts = { duration: 760, easing: EASE, fill: 'both' };
    const curveTop = '50% 50% 0 0 / 14vh 14vh 0 0', curveBottom = '0 0 50% 50% / 0 0 14vh 14vh';
    let a, b;
    if (isIntro) {
      el.style.zIndex = 2;
      a = el.animate(dir > 0
        ? [{ transform: 'translateY(100%)', borderRadius: curveTop }, { transform: 'translateY(0)', borderRadius: '0' }]
        : [{ transform: 'translateY(-100%)', borderRadius: curveBottom }, { transform: 'translateY(0)', borderRadius: '0' }], opts);
      b = prev.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${dir > 0 ? -12 : 12}vh)` }], opts);
    } else if (prevIntro) {
      prev.style.zIndex = 2;
      b = prev.animate(dir > 0
        ? [{ transform: 'translateY(0)', borderRadius: '0' }, { transform: 'translateY(-100%)', borderRadius: curveBottom }]
        : [{ transform: 'translateY(0)', borderRadius: '0' }, { transform: 'translateY(100%)', borderRadius: curveTop }], opts);
      a = el.animate([{ transform: `translateY(${dir > 0 ? 10 : -10}vh)`, opacity: 0.4 }, { transform: 'translateY(0)', opacity: 1 }], opts);
    } else {
      const d = dir > 0 ? 1 : -1;
      b = prev.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-36 * d}px)`, opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'both' });
      a = el.animate([{ transform: `translateY(${48 * d}px)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 620, delay: 230, easing: EASE_OUT, fill: 'both' });
    }
    running = [a, b];
    b.onfinish = () => prev.remove();
    a.onfinish = () => { el.style.zIndex = ''; a.cancel(); };
    setTimeout(focusTarget, 30);
  }

  function go(index, dir) {
    if (index < 0 || index >= STEPS.length) return;
    showStep(index, dir);
  }

  function next() {
    if (state.submitting || state.view !== 'app') return;
    clearTimeout(autoTimer);
    const step = STEPS[state.step];
    if (step.type === 'review') { submit(); return; }
    if (step.type === 'q' && !isValid(step.q)) { flagMissing(step.q); return; }
    if (state.returnToReview && step.type === 'q') { state.returnToReview = false; go(REVIEW_INDEX, 1); return; }
    go(state.step + 1, 1);
  }
  function back() {
    if (state.submitting || state.view !== 'app' || state.step === 0) return;
    go(state.step - 1, -1);
  }

  function scheduleAdvance(q) {
    clearTimeout(autoTimer);
    if (!isValid(q)) return;
    autoTimer = setTimeout(() => { if (STEPS[state.step].type === 'q' && STEPS[state.step].q.id === q.id) next(); }, reduced ? 120 : 460);
  }

  function setAnswer(q, value) {
    state.answers[q.id] = value;
    saveDraft();
    const err = $('#err-' + q.id); if (err) err.textContent = '';
    if (q.id === 'Q03') { const n = $('#screenout'); if (n) n.hidden = value !== 'No'; }
    updateChrome();
  }

  function flagMissing(q) {
    const err = $('#err-' + q.id);
    if (q.id === 'Q03' && state.answers.Q03 === 'No') { const n = $('#screenout'); if (n) { n.hidden = false; n.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 300 }); } return; }
    if (err) err.textContent = '請先作答，再繼續下一題。Please answer this question to continue.';
    const box = $('.q-answer', stage);
    if (box && !reduced) box.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 420 });
    const first = $('.q-answer input', stage); if (first) first.focus();
  }

  function updateChrome() {
    const step = STEPS[state.step];
    const n = countAnswered();
    $('#appCount').textContent = String(n).padStart(2, '0');
    $('#appProgress').style.width = (n / 31 * 100) + '%';
    const secKey = step.type === 'review' ? null : step.sec.key;
    $$('#steps li').forEach(li => {
      const items = Q.filter(q => q.group === li.dataset.sec);
      const c = items.filter(isAnswered).length;
      $('i', li).style.width = (c / items.length * 100) + '%';
      li.classList.toggle('is-current', li.dataset.sec === secKey);
      li.classList.toggle('is-done', c === items.length);
    });
    app.classList.toggle('is-intro', step.type === 'intro');
    backBtn.disabled = state.step === 0;
    let label = '下一題', en = 'Next', disabled = false, submitMode = false, hint = '';
    if (step.type === 'intro') { label = '開始'; en = 'Start'; }
    else if (step.type === 'q') {
      disabled = !isValid(step.q);
      if (state.returnToReview) { label = '回到確認頁'; en = 'Back to review'; }
      else if (state.step === REVIEW_INDEX - 1) { label = '檢查答案'; en = 'Review'; }
      hint = step.q.type === 'scale' ? '按 <kbd>1</kbd>–<kbd>5</kbd> 作答・<kbd>Enter</kbd> 下一題'
        : step.q.type === 'choice' ? `按 <kbd>A</kbd>–<kbd>${String.fromCharCode(64 + step.q.options.length)}</kbd> 選擇・<kbd>Enter</kbd> 下一題`
          : '輸入後按 <kbd>Enter</kbd> 繼續';
    } else if (step.type === 'review') {
      label = '送出問卷'; en = 'Submit'; submitMode = true; disabled = n < 31; hint = '點選任一題即可修改';
    }
    $('#nextLabel').innerHTML = `${label}<small lang="en">${en}</small>`;
    nextBtn.setAttribute('aria-disabled', String(disabled));
    nextBtn.classList.toggle('is-submit', submitMode);
    $('#navHint').innerHTML = finePointer ? hint : '';
  }

  function announce(step) {
    const a = $('#announcer');
    if (step.type === 'intro') a.textContent = `${step.sec.kick}：${step.sec.title}`;
    else if (step.type === 'q') a.textContent = `第 ${Q.indexOf(step.q) + 1} 題，共 31 題`;
    else a.textContent = '最後確認頁';
  }

  /* ---------- keyboard */
  function onKey(e) {
    if (state.view !== 'app' || e.ctrlKey || e.metaKey || e.altKey) return;
    const step = STEPS[state.step];
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' && e.target.type === 'text') return;
    if (step.type === 'q' && step.q.type === 'scale' && /^[1-5]$/.test(e.key)) {
      e.preventDefault(); pick(step.q, e.key); return;
    }
    if (step.type === 'q' && step.q.type === 'choice' && /^[a-z]$/i.test(e.key)) {
      const i = e.key.toUpperCase().charCodeAt(0) - 65;
      if (i >= 0 && i < step.q.options.length) { e.preventDefault(); pick(step.q, step.q.options[i][0]); }
      return;
    }
    if (e.key === 'Enter' && !['BUTTON', 'A', 'TEXTAREA'].includes(tag)) { e.preventDefault(); next(); }
  }
  function pick(q, value) {
    const input = $$(`input[name="${q.id}"]`, stage).find(i => i.value === String(value));
    if (!input) return;
    input.checked = true;
    viaPointer = true; // treat number/letter keys like a tap: auto-advance
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------- submit */
  async function submit() {
    if (state.submitting) return;
    const missing = Q.filter(q => !isValid(q));
    if (missing.length) { state.returnToReview = true; go(stepOf(missing[0].id), -1); return; }
    state.submitting = true;
    nextBtn.classList.add('is-busy'); nextBtn.setAttribute('aria-busy', 'true');
    const errBox = $('#rvError'); if (errBox) errBox.classList.remove('on');
    const ctrl = ('AbortController' in window) ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 25000);
    try {
      const payload = { id: state.respondentId, answers: Object.fromEntries(Q.map(q => [q.id, q.type === 'scale' ? Number(state.answers[q.id]) : toText(state.answers[q.id])])) };
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow', signal: ctrl ? ctrl.signal : undefined });
      const out = await res.json().catch(() => ({ ok: false, error: 'Unexpected response' }));
      if (!res.ok || !out.ok) throw new Error(out.error || ('HTTP ' + res.status));
      state.submitted = { id: payload.id, studentNumber: out.studentNumber, at: new Date().toISOString() };
      clearDraft();
      try { localStorage.setItem(SUBMITTED_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
      showDone();
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'timeout' : e.message;
      if (errBox) {
        errBox.innerHTML = `送出失敗，你的答案仍完整保存在這台裝置。請確認網路連線後再按一次「送出問卷」。<span lang="en">Couldn't submit (${esc(msg)}). Your answers are still saved on this device. Check your connection and press Submit again.</span>`;
        errBox.classList.add('on');
        errBox.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
    } finally {
      clearTimeout(timer);
      state.submitting = false;
      nextBtn.classList.remove('is-busy'); nextBtn.removeAttribute('aria-busy');
    }
  }

  /* ================================================================== boot */
  function boot() {
    const hadDraft = loadDraft();
    initSplit();
    buildSteps();
    initStart();
    syncStartUI();
    initMarquee();
    initVenn();
    initReveal();
    initParallax();
    initClock();
    initFloatCta();
    bindButtons();
    nextBtn.addEventListener('click', next);
    backBtn.addEventListener('click', back);
    $('#exitBtn').addEventListener('click', () => closeApp(false));
    document.addEventListener('keydown', onKey);
    addEventListener('popstate', () => { if (state.view !== 'landing' && !state.submitting) closeApp(true); });

    // Reload while inside the survey: go straight back to the saved question.
    const resumeDirect = location.hash === '#survey' && hadDraft && state.consent;
    if (location.hash === '#survey' && !resumeDirect) history.replaceState(null, '', location.pathname + location.search);
    runLoader(() => {
      ready();
      if (resumeDirect) openApp();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
