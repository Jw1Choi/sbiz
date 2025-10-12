/* ========================================================================
   ./js/main.js
   - 모든 인터랙션/효과를 한 파일로 통합
   - 각 블록은 IIFE로 스코프 분리, 널가드 철저
   - 스크롤로 화면에서 벗났다 다시 들어와도 효과 재적용
   ======================================================================== */

/* 유틸: DOM 준비 */
(function ready(fn){
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn, { once:true });
})(function(){

  /* ================================================================
     0) 앵커 스무스 스크롤 (+ 고정 헤더 높이 보정)
  ================================================================ */
  (function(){
    function getHeaderOffset(){
      const bar = document.querySelector('#stickyTopbar .topbar');
      return bar ? (bar.getBoundingClientRect().height + 8) : 0;
    }
    function smoothScrollTo(targetEl){
      const headerOffset = getHeaderOffset();
      const rect = targetEl.getBoundingClientRect();
      const absoluteY = rect.top + window.pageYOffset;
      const to = Math.max(absoluteY - headerOffset, 0);
      window.scrollTo({ top: to, behavior: 'smooth' });
    }
    document.addEventListener('click', (e)=>{
      const a = e.target.closest('a[href^="#"]');
      if(!a) return;
      const hash = a.getAttribute('href');
      if(!hash || hash === '#') return;
      const el = document.querySelector(hash);
      if(!el) return;
      e.preventDefault();
      smoothScrollTo(el);
      // 포커스 이동(접근성)
      el.setAttribute('tabindex','-1');
      el.focus({ preventScroll:true });
      el.addEventListener('blur', ()=> el.removeAttribute('tabindex'), { once:true });
    }, { passive:false });
  })();


  /* ================================================================
     1) Sticky Topbar (헤더 공간 보정 + 스크롤 방향에 따른 숨김/표시)
         + 로테이트 텍스트: 뷰포트 재진입/탭 전환 시 재시작
  ================================================================ */
  (function(){
    const headerSec = document.getElementById('stickyTopbar');
    if(!headerSec) return;

    const bar = headerSec.querySelector('.topbar');
    const rotator = headerSec.querySelector('.fade-rotator');
    const hero = document.querySelector('#legalDBHero');

    // 헤더 높이에 맞춰 히어로 여백 변수 보정
    function setHeroHeaderSpace(){
      if(!hero || !bar) return;
      const h = bar.getBoundingClientRect().height;
      hero.style.setProperty('--hdr-space', (h + 20) + 'px');
    }
    setHeroHeaderSpace();
    window.addEventListener('resize', setHeroHeaderSpace, { passive:true });

    // 스크롤 방향에 따라 헤더 숨김/표시
    let lastY = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;
    const threshold = 8;
    const minShowTop = 10;

    function onScroll(){
      const y = window.pageYOffset || document.documentElement.scrollTop;
      const dy = y - lastY;

      if(Math.abs(dy) > threshold){
        if(dy > 0 && y > (bar?.offsetHeight || 0) + 10){
          if (bar) bar.style.transform = 'translate(-50%, -120%)'; // 아래로 스크롤 → 숨김
        }else{
          if (bar) bar.style.transform = 'translate(-50%, 0)';     // 위로 스크롤/상단 → 표시
        }
        lastY = y;
      }
      if(y <= minShowTop && bar) bar.style.transform = 'translate(-50%, 0)';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if(!ticking){ requestAnimationFrame(onScroll); ticking = true; }
    }, { passive:true });

    // 회전 텍스트 재생/정지
    function playRotate(){ rotator && rotator.classList.add('play'); }
    function stopRotate(){ rotator && rotator.classList.remove('play'); }

    if('IntersectionObserver' in window && rotator && bar){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(ent => {
          if(ent.isIntersecting) playRotate();
          else stopRotate();
        });
      }, { root:null, threshold:0.01 });
      io.observe(bar);
    }else{
      playRotate(); // 폴백
    }

    // 탭 전환 대응
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) stopRotate();
      else {
        stopRotate();
        requestAnimationFrame(playRotate);
      }
    });
  })();


  /* ================================================================
     2) Hero DB 스택 티커 (Intersection 진입 시만 동작, 재진입 재시작)
  ================================================================ */
  (function(){
    const root = document.querySelector('#legalDBHero');
    if(!root) return;
    const track = root.querySelector('.dbTrack');
    const stack = root.querySelector('.dbStack');
    if(!track || !stack) return;

    const VISIBLE = 5, GAP = 10, INTERVAL = 2600;

    const DB_LIST = [
      { city:'서울', age:34, overdue:'연체 3개월', debt:'채무 7,800만원', memo:'회생 상담 희망', time:'오늘 13:42' },
      { city:'부산', age:41, overdue:'연체 1개월', debt:'채무 5,200만원', memo:'파산 상담 문의', time:'오늘 13:55' },
      { city:'대구', age:29, overdue:'연체 없음', debt:'채무 3,900만원', memo:'채무조정 가능 여부', time:'오늘 14:10' },
      { city:'수원', age:38, overdue:'연체 2개월', debt:'채무 9,100만원', memo:'회생/파산 비교 문의', time:'오늘 14:22' },
      { city:'인천', age:33, overdue:'연체 4개월', debt:'채무 1억 1,000만원', memo:'급한 상담 요청', time:'오늘 14:35' },
      { city:'대전', age:36, overdue:'연체 1개월', debt:'채무 6,400만원', memo:'회생 자격 문의', time:'오늘 14:48' },
      { city:'창원', age:45, overdue:'연체 5개월', debt:'채무 1억 3,000만원', memo:'급히 상담 요청', time:'오늘 15:02' }
    ];

    function createCard(data){
      const el = document.createElement('div');
      el.className = 'db-card enter';
      el.innerHTML = `
        <div class="db-avatar"></div>
        <div class="db-main">
          <p class="db-title">${data.city} · ${data.age}세 · ${data.overdue}</p>
          <p class="db-sub">${data.debt} · ${data.memo} <span style="color:var(--muted);font-size:.9em">(${data.time})</span></p>
        </div>`;
      requestAnimationFrame(()=> el.classList.add('is-in'));
      return el;
    }

    function shiftUp(by){
      track.classList.add('is-shifting');
      track.style.transform = `translateY(-${by}px)`;
      return new Promise(res=>{
        const onEnd = ()=>{ track.removeEventListener('transitionend', onEnd); res(); };
        track.addEventListener('transitionend', onEnd, { once:true });
      }).then(()=>{
        track.classList.remove('is-shifting');
        track.style.transform = 'translateY(0)';
      });
    }

    let idx = 0, paused = false, timer = null, cardHeight = 78;

    function pushNext(){
      const data = DB_LIST[idx % DB_LIST.length]; idx++;
      const card = createCard(data);
      track.appendChild(card);

      const cards = track.children;
      if(cards.length > VISIBLE){
        const first = cards[0];
        shiftUp(cardHeight + GAP).then(()=> first.remove());
      }
    }

    function prime(){
      const init = Math.min(VISIBLE, DB_LIST.length);
      for(let i=0;i<init;i++) pushNext();
      if(track.children.length) cardHeight = track.children[0].getBoundingClientRect().height;
    }

    function schedule(){
      clearInterval(timer);
      timer = setInterval(()=>{ if(!paused) pushNext(); }, INTERVAL);
    }

    stack.addEventListener('mouseenter',()=> paused = true);
    stack.addEventListener('mouseleave',()=> paused = false);

    if('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if(e.isIntersecting) schedule();
          else clearInterval(timer);
        });
      },{threshold:.2});
      io.observe(stack);
    }else{
      schedule(); // 폴백
    }

    prime();
  })();


  /* ================================================================
     3) 카드 리빌(스크롤 인/아웃 시 효과 재적용)
  ================================================================ */
  (function(){
    const root = document.getElementById('whoCanPartner');
    if(!root || !('IntersectionObserver' in window)) return;
    const targets = root.querySelectorAll('.card.reveal');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add('show'); }
        else{ entry.target.classList.remove('show'); }
      });
    }, { threshold:.18, rootMargin:'0px 0px -5% 0px' });
    targets.forEach(el=> io.observe(el));
  })();


  /* ================================================================
     4) 이벤트 리스트: 2초마다 강조 순환
  ================================================================ */
  (function(){
    const items = document.querySelectorAll('#eventList .item');
    if(!items.length) return;
    let idx = -1;
    setInterval(()=>{
      items.forEach(i=>i.classList.remove('active'));
      idx = (idx+1) % items.length;
      items[idx].classList.add('active');
    }, 2000);
  })();


  /* ================================================================
     5) 신청 폼: 약관 모달 생성/제어 + Select 화살표 보완
  ================================================================ */
  (function(){
    const root = document.querySelector('#applyMintForm');
    const form = root?.querySelector('#applyForm');
    if(!root || !form) return;

    const agreeBox = form.querySelector('#agree');
    const agreeTextSpan = form.querySelector('.agree span');

    // '자세히 보기' 버튼 삽입
    const termsBtn = document.createElement('button');
    termsBtn.type = 'button';
    termsBtn.className = 'terms-link';
    termsBtn.textContent = '자세히 보기';
    termsBtn.setAttribute('aria-haspopup','dialog');
    if(agreeTextSpan){
      agreeTextSpan.appendChild(document.createTextNode(' '));
      agreeTextSpan.appendChild(termsBtn);
    }

    // 모달 DOM
    const overlay = document.createElement('div');
    overlay.className = 'terms-overlay';
    overlay.setAttribute('hidden','');
    overlay.innerHTML = `
      <div class="terms-sheet" role="dialog" aria-modal="true" aria-labelledby="termsTitle" tabindex="-1">
        <div class="terms-header">
          <h3 id="termsTitle" class="terms-title">개인정보 처리방침</h3>
          <button type="button" class="terms-close-x" aria-label="닫기">✕</button>
        </div>
        <div class="terms-body" id="termsBody">
          ${document.querySelector('#applyMintFormTermsSource')?.innerHTML || '' }
        </div>
        <div class="terms-footer">
          <label class="agree-mini">
            <input type="checkbox" id="termsInlineAgree">
            <span>상기 개인정보 처리 안내를 확인했습니다.</span>
          </label>
          <div style="display:flex; gap:8px; margin-left:auto; width:auto;">
            <button type="button" class="btn btn-outline terms-cancel">닫기</button>
            <button type="button" class="btn btn-fill terms-accept">동의하고 계속</button>
          </div>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    const sheet = overlay.querySelector('.terms-sheet');
    const closeX = overlay.querySelector('.terms-close-x');
    const cancelBtn = overlay.querySelector('.terms-cancel');
    const acceptBtn = overlay.querySelector('.terms-accept');
    const inlineAgree = overlay.querySelector('#termsInlineAgree');

    let prevFocus = null;

    function openTerms(){
      prevFocus = document.activeElement;
      root.setAttribute('data-modal-open','true');
      overlay.hidden = false;
      sheet.focus();
      document.addEventListener('keydown', onKeydown, true);
      overlay.addEventListener('click', onBackdrop);
    }
    function closeTerms(){
      overlay.hidden = true;
      root.removeAttribute('data-modal-open');
      document.removeEventListener('keydown', onKeydown, true);
      overlay.removeEventListener('click', onBackdrop);
      if(prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    }
    function onBackdrop(e){
      if(e.target === overlay) closeTerms();
    }
    function onKeydown(e){
      if(e.key === 'Escape'){ e.preventDefault(); closeTerms(); }
      if(e.key === 'Tab'){
        const f = sheet.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
        const focusables = Array.prototype.slice.call(f);
        if(!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }

    termsBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); openTerms(); });
    closeX.addEventListener('click', (e)=>{ e.preventDefault(); closeTerms(); });
    cancelBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeTerms(); });

    // 동의하고 계속: 자동 동의 + 제출 버튼 활성화 트리거
    acceptBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      if(inlineAgree) inlineAgree.checked = true;
      if(agreeBox){
        agreeBox.checked = true;
        agreeBox.dispatchEvent(new Event('change', { bubbles:true }));
      }
      acceptBtn.blur();
      closeTerms();
    });

    // 미동 안내 애니메이션 스타일 주입
    const css = document.createElement('style');
    css.textContent = `
      #applyMintForm .terms-sheet.shake{ animation: applyShake .3s; }
      @keyframes applyShake{
        10%{ transform:translateY(0) translateX(-2px) }
        20%{ transform:translateY(0) translateX(2px) }
        30%{ transform:translateY(0) translateX(-2px) }
        40%{ transform:translateY(0) translateX(2px) }
        50%{ transform:translateY(0) translateX(-1px) }
        60%{ transform:translateY(0) translateX(1px) }
        100%{ transform:translateY(0) translateX(0) }
      }
    `;
    root.appendChild(css);

    // 셀렉트 화살표 보완(래퍼 + open 상태 클래스)
    (function(){
      const selects = root.querySelectorAll('select');
      selects.forEach(sel=>{
        if (sel.closest('.select-wrap')) return;
        const wrap = document.createElement('div');
        wrap.className = 'select-wrap';
        sel.parentNode.insertBefore(wrap, sel);
        wrap.appendChild(sel);

        const open = ()=> wrap.classList.add('open');
        const close = ()=> wrap.classList.remove('open');

        sel.addEventListener('focus', open);
        sel.addEventListener('click', open);
        sel.addEventListener('mousedown', open);
        sel.addEventListener('touchstart', open, { passive:true });
        sel.addEventListener('blur', close);
        sel.addEventListener('change', close);
        sel.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
      });
    })();
  })();


  /* ================================================================
     6) 카카오 플로팅 버튼: 재진입 시 펄스 애니메이션 재시작
  ================================================================ */
  (function(){
    const root = document.getElementById('kakaoFloating');
    const btn  = root?.querySelector('.fab');
    if(!root || !btn || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          // 펄스 애니메이션 재시작 트릭
          btn.style.animation = 'none';
          void btn.offsetHeight; // 강제 리플로우
          btn.style.animation = '';
        }
      });
    }, { threshold: 0.01 });

    observer.observe(root);
  })();


  /* ================================================================
     7) maxlength 강제 준수(IME/붙여넣기 포함 모든 경로)
  ================================================================ */
  (function(){
    const TEXTUAL_TYPES = new Set(['', 'text', 'search', 'tel', 'password', 'url', 'email']);
    const composing = new WeakMap(); // 각 필드의 IME 조합 상태 저장

    function isTextual(el){
      return el?.tagName === 'TEXTAREA' ||
             (el?.tagName === 'INPUT' && TEXTUAL_TYPES.has((el.type||'').toLowerCase()));
    }

    function attach(el){
      if (!isTextual(el)) return;
      if (!el.hasAttribute('maxlength')) return;

      const getMAX = () => {
        const n = parseInt(el.getAttribute('maxlength'), 10);
        return Number.isFinite(n) ? n : Infinity;
        };

      // IME(한글 조합) 상태 관리
      el.addEventListener('compositionstart', () => composing.set(el, true));
      el.addEventListener('compositionend',  () => { composing.set(el, false); truncate(el, getMAX()); });

      // 키 타이핑 초과 입력 방지 (붙여넣기는 input에서 자름)
      el.addEventListener('beforeinput', (e) => {
        if (composing.get(el)) return;
        if (e.inputType !== 'insertText') return; // paste 등은 아래 input 핸들러에서 처리
        const MAX = getMAX();
        if (!isFinite(MAX)) return;

        const { value, selectionStart, selectionEnd } = el;
        const replacing = Math.max(0, (selectionEnd ?? value.length) - (selectionStart ?? value.length));
        const inserting  = (e.data || '').length;
        const nextLen    = value.length - replacing + inserting;

        if (nextLen > MAX) e.preventDefault();
      });

      // 붙여넣기/드래그 교체/프로그램적 변경 등 모든 케이스에서 최종 길이 보정
      el.addEventListener('input', () => {
        if (composing.get(el)) return;
        truncate(el, getMAX());
      });
    }

    function truncate(el, MAX){
      if (!isFinite(MAX)) return;
      const v = el.value || '';
      if (v.length > MAX){
        const pos = el.selectionStart;
        el.value = v.slice(0, MAX);
        const p = Math.min(typeof pos === 'number' ? pos : MAX, MAX);
        el.setSelectionRange?.(p, p);
      }
    }

    // 초기 문서 내 모든 대상에 적용
    document.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(attach);

    // 동적 추가/속성 변경에도 자동 적용
    const mo = new MutationObserver((mutations)=>{
      for (const m of mutations){
        // 새 노드 추가
        m.addedNodes && m.addedNodes.forEach(node=>{
          if (!(node instanceof Element)) return;
          if (node.matches?.('input[maxlength], textarea[maxlength]')) attach(node);
          node.querySelectorAll?.('input[maxlength], textarea[maxlength]').forEach(attach);
        });
        // 기존 노드에 maxlength 속성 추가/변경
        if (m.type === 'attributes' && m.attributeName === 'maxlength' &&
            m.target instanceof Element &&
            m.target.matches('input[maxlength], textarea[maxlength]')) {
          attach(m.target);
        }
      }
    });
    mo.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['maxlength'] });
  })();


  /* ================================================================
     8) 푸터: 연도 자동/맨 위로/약관 링크 연동
  ================================================================ */
  (function(){
    const footer = document.getElementById('siteFooter');
    if(!footer) return;

    // 연도 자동 갱신
    const y = footer.querySelector('#footerYear');
    if(y) y.textContent = new Date().getFullYear();

    // 맨 위로
    const toTop = footer.querySelector('#footerToTop');
    if(toTop){
      toTop.addEventListener('click', (e)=>{
        e.preventDefault();
        try{
          document.querySelector('#stickyTopbar')?.scrollIntoView({behavior:'smooth'});
        }catch(_){
          window.scrollTo({ top:0, behavior:'smooth' });
        }
      });
    }

    // 약관/정책 링크 → 기존 약관 모달(#applyMintForm) 연동
    function openTerms(){
      const btn = document.querySelector('#applyMintForm .terms-link');
      if(btn) { btn.click(); return true; }
      return false;
    }
    footer.querySelectorAll('[data-open-terms]').forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); if(!openTerms()) location.hash = '#applyMintForm'; });
    });
  })();

}); // DOM Ready 끝
