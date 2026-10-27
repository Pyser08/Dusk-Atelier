// 출처: risupot 2.3.0 src/mission-progress.mjs — 원작자 허락을 받아 이식 (tools/pot-split.mjs로 생성, 직접 고치지 말 것)

const STAGES = ['ROUTER', 'DIRECTOR', 'MAIN', 'WRITE', 'SAVE'];
const STATE_COLORS = {
  running: { accent: '#7ec699', border: '#315e49', glow: 'rgba(126,198,153,.20)' },
  success: { accent: '#9fe0bb', border: '#3f8a63', glow: 'rgba(126,198,153,.28)' },
  error: { accent: '#ff8585', border: '#8d4545', glow: 'rgba(255,107,107,.22)' },
  info: { accent: '#8fc0ea', border: '#355777', glow: 'rgba(79,133,192,.22)' },
};

/** V7 (0.10.15): stage failures remain red inside one run and every fresh run clears all older stage state. */
class MissionProgressPanel {
  constructor(api, { scheduler = globalThis } = {}) {
    this.api = api; this.scheduler = scheduler;
    this.state = 'idle'; this.ui = null; this.chain = Promise.resolve(); this.permissionWorker = null;
    this.hideTimer = null; this.watchdogTimer = null; this.tickTimer=null; this.disposed = false;
    this.permissionGranted = false; this.permissionDenied = false; this.listeners = new Set();
    this.sequence = 0; this.activeToken = 0;this.stageNames=[...STAGES];this.failedStages=new Set();
  }
  status() {
    const supported = typeof this.api.getRootDocument === 'function';
    return { state: this.state, supported, permission: this.permissionDenied ? 'denied' : this.permissionGranted ? 'granted' : 'pending', available: !this.disposed && supported && this.permissionGranted && !this.permissionDenied };
  }
  subscribe(listener) { this.listeners.add(listener); listener(this.status()); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) try { listener(this.status()); } catch {} }
  enqueue(task) {
    this.chain = this.chain.then(task).catch(() => { if (!this.disposed) { this.state = 'failed'; this.emit(); } });
    return this.chain;
  }
  clearTimers() {
    if (this.hideTimer !== null) this.scheduler.clearTimeout(this.hideTimer);
    if (this.watchdogTimer !== null) this.scheduler.clearTimeout(this.watchdogTimer);
    if (this.tickTimer !== null) this.scheduler.clearTimeout(this.tickTimer);
    this.hideTimer = null; this.watchdogTimer = null;this.tickTimer=null;
  }
  async ensurePermission() {
    if (this.disposed || this.permissionDenied) return false;
    if (typeof this.api.getRootDocument !== 'function') { this.state = 'unsupported'; this.emit(); return false; }
    if (this.permissionGranted) return true;
    if (this.permissionWorker) return await this.permissionWorker;
    this.permissionWorker = (async () => {
      try {
        if (typeof this.api.requestPluginPermission === 'function' && !await this.api.requestPluginPermission('mainDom')) { this.permissionDenied = true; this.state = 'denied'; this.emit(); return false; }
        if (this.disposed) return false;
        this.permissionGranted = true; this.emit(); return true;
      } catch { if (!this.disposed) { this.state = 'failed'; this.emit(); } return false; }
    })();
    try { return await this.permissionWorker; } finally { this.permissionWorker = null; }
  }
  async removeStale(root) {
    for (let count = 0; count < 4; count++) {
      const stale = await root.querySelector('[x-risupot-mission-panel="1"]');
      if (!stale) break;
      try { await stale.remove(); } catch { break; }
    }
  }
  async build() {
    if (!await this.ensurePermission() || this.disposed) return null;
    const root = await this.api.getRootDocument();
    if (!root) { this.state = 'failed'; this.emit(); return null; }
    await this.removeStale(root);
    const host = await root.querySelector('body') || root;
    const wrap = await root.createElement('div'); await wrap.setAttribute('x-risupot-mission-panel', '1');
    await wrap.setStyleAttribute('position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:998;pointer-events:none;display:none;width:min(370px,calc(100vw - 20px));max-width:calc(100vw - 20px);box-sizing:border-box;font-family:Inter,system-ui,sans-serif;');
    const card = await root.createElement('div');
    await card.setStyleAttribute('width:100%;min-width:0;box-sizing:border-box;padding:12px 14px 11px;border:1px solid #315e49;border-radius:14px;background:linear-gradient(135deg,rgba(14,21,32,.98),rgba(19,31,46,.97));box-shadow:0 12px 32px rgba(0,0,0,.48),0 0 20px rgba(126,198,153,.14);color:#d8eaff;backdrop-filter:blur(9px);');
    const animationStyle=await root.createElement('style');await animationStyle.setTextContent('@keyframes risupot-mission-spin{to{transform:rotate(360deg)}}@keyframes risupot-mission-pulse{0%,100%{opacity:.72}50%{opacity:1}}@keyframes risupot-mission-dot{0%,100%{opacity:.35;transform:scale(.86)}50%{opacity:1;transform:scale(1)}}');
    const eyebrow = await root.createElement('div'); await eyebrow.setTextContent('RISUPOT · MEMORY OPS'); await eyebrow.setStyleAttribute('color:#63778b;font-size:9px;font-weight:800;letter-spacing:.16em;margin-bottom:5px;animation:risupot-mission-pulse 1.8s ease-in-out infinite;');
    const head = await root.createElement('div'); await head.setStyleAttribute('display:flex;align-items:center;gap:9px;');
    const dot = await root.createElement('span'); await dot.setTextContent(''); await dot.setStyleAttribute('display:inline-grid;place-items:center;width:14px;height:14px;flex:0 0 14px;border:2px solid #7ec699;border-right-color:transparent;border-radius:50%;animation:risupot-mission-spin .72s linear infinite;box-shadow:0 0 9px rgba(126,198,153,.32);color:#7ec699;font-size:11px;font-weight:900;line-height:1;');
    const title = await root.createElement('div'); await title.setStyleAttribute('display:flex;align-items:baseline;flex:1;min-width:0;color:#d8eaff;font-size:14px;font-weight:800;letter-spacing:.01em;');
    const titleText = await root.createElement('span');
    const loadingDots = await root.createElement('span');await loadingDots.setStyleAttribute('display:inline-flex;align-items:center;gap:3px;padding-left:8px;flex:0 0 auto;');
    for(let index=0;index<3;index++){const loadingDot=await root.createElement('span');await loadingDot.setTextContent('');await loadingDot.setStyleAttribute(`display:inline-block;width:5px;height:5px;border-radius:50%;background:#7ec699;opacity:.35;animation:risupot-mission-dot 1.2s ease-in-out ${index*.18}s infinite;`);await loadingDots.appendChild(loadingDot);}
    const badge = await root.createElement('div'); await badge.setStyleAttribute('padding:3px 7px;border:1px solid #29405a;border-radius:6px;background:#162536;color:#8fc0ea;font-size:10px;font-weight:800;');
    const detail = await root.createElement('div'); await detail.setStyleAttribute('margin-top:5px;color:#8fa5ba;font-size:11.5px;line-height:1.45;word-break:break-word;');
    const stages = await root.createElement('div'); await stages.setStyleAttribute(`display:grid;grid-template-columns:repeat(${STAGES.length},minmax(0,1fr));gap:4px;margin-top:10px;`);
    const stageNodes = [];
    for (const name of STAGES) { const node = await root.createElement('div'); await node.setTextContent(name); await node.setStyleAttribute('padding:4px 3px;border:1px solid #243246;border-radius:5px;background:#111923;color:#506177;font-size:8.5px;font-weight:800;text-align:center;letter-spacing:.05em;'); await stages.appendChild(node); stageNodes.push(node); }
    const track = await root.createElement('div'); await track.setStyleAttribute('height:3px;margin-top:8px;border-radius:99px;overflow:hidden;background:#1b2838;');
    const fill = await root.createElement('div'); await fill.setStyleAttribute('height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,#4f8568,#8fd3a9);box-shadow:0 0 8px rgba(126,198,153,.48);transition:width .25s ease;');
    await title.appendChild(titleText);await title.appendChild(loadingDots);await head.appendChild(dot); await head.appendChild(title); await head.appendChild(badge); await track.appendChild(fill);
    await card.appendChild(animationStyle);await card.appendChild(eyebrow); await card.appendChild(head); await card.appendChild(detail); await card.appendChild(stages); await card.appendChild(track); await wrap.appendChild(card); await host.appendChild(wrap);
    if (this.disposed) { try { await wrap.remove(); } catch {} return null; }
    return { wrap, card, dot, title, titleText, loadingDots, badge, detail, stageNodes, fill };
  }
  async discard() { const old = this.ui; this.ui = null; if (old) try { await old.wrap.remove(); } catch {} }
  newToken() { this.clearTimers(); const token = ++this.sequence; this.activeToken = token;this.startedAt=Date.now();this.currentDetail=''; return token; }
  elapsed(){const seconds=Math.max(0,Math.floor((Date.now()-(this.startedAt||Date.now()))/1000));return`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  scheduleTick(token){if(this.tickTimer!==null)this.scheduler.clearTimeout(this.tickTimer);this.tickTimer=this.scheduler.setTimeout(()=>{this.tickTimer=null;if(this.disposed||token!==this.activeToken)return;this.enqueue(async()=>{if(this.ui&&token===this.activeToken)await this.ui.detail.setTextContent(`${this.currentDetail}${this.currentDetail?' · ':''}경과 ${this.elapsed()}`);});this.scheduleTick(token);},1000);}
  show(token, stage, title, detail = '', state = 'running', { fresh = false, hideAfter = 0 } = {}) {
    if (this.disposed || token !== this.activeToken) return token;
    this.clearTimers();
    this.enqueue(async () => {
      if (this.disposed || token !== this.activeToken) return;
      if (fresh) await this.discard();
      if (!this.ui) this.ui = await this.build();
      if (!this.ui || this.disposed || token !== this.activeToken) return;
      const index = Math.max(0, Math.min(STAGES.length - 1, Number(stage) || 0));
      const palette = STATE_COLORS[state] || STATE_COLORS.running;
      await this.ui.wrap.setStyle('display', 'block');
      await this.ui.card.setStyle('borderColor', palette.border); await this.ui.card.setStyle('boxShadow', `0 12px 32px rgba(0,0,0,.48),0 0 20px ${palette.glow}`);
      if(state==='success'){await this.ui.dot.setTextContent('✓');await this.ui.dot.setStyleAttribute(`display:inline-grid;place-items:center;width:14px;height:14px;flex:0 0 14px;border:0;border-radius:50%;animation:none;color:${palette.accent};font-size:15px;font-weight:900;line-height:1;text-shadow:0 0 10px ${palette.glow};`);}else if(state==='error'){await this.ui.dot.setTextContent('!');await this.ui.dot.setStyleAttribute(`display:inline-grid;place-items:center;width:14px;height:14px;flex:0 0 14px;border:1px solid ${palette.border};border-radius:50%;animation:none;background:${palette.glow};color:${palette.accent};font-size:11px;font-weight:900;line-height:1;`);}else{await this.ui.dot.setTextContent('');await this.ui.dot.setStyleAttribute(`display:inline-grid;place-items:center;width:14px;height:14px;flex:0 0 14px;border:2px solid ${palette.accent};border-right-color:transparent;border-radius:50%;animation:risupot-mission-spin .72s linear infinite;box-shadow:0 0 9px ${palette.glow};color:${palette.accent};font-size:11px;font-weight:900;line-height:1;`);}const loading=state==='running'||state==='info';await this.ui.titleText.setTextContent(String(title || '리수폿 실행 중').slice(0, 100));await this.ui.loadingDots.setStyle('display',loading?'inline-flex':'none');
      this.currentDetail=String(detail||'').slice(0,180);await this.ui.badge.setTextContent(`${String(index + 1).padStart(2, '0')} / ${String(STAGES.length).padStart(2,'0')}`); await this.ui.detail.setTextContent(`${this.currentDetail}${this.currentDetail?' · ':''}경과 ${this.elapsed()}`);
      for (let indexNode = 0; indexNode < this.ui.stageNodes.length; indexNode++) {
        await this.ui.stageNodes[indexNode].setTextContent(this.stageNames[indexNode]||STAGES[indexNode]);
        const failed=this.failedStages.has(indexNode),successCurrent=state==='success'&&indexNode===index,done=indexNode<index&&!failed,active=indexNode===index&&!successCurrent&&!failed,activePalette=state==='error'?palette:STATE_COLORS.info;
        const base='padding:4px 3px;border-radius:5px;font-size:8.5px;font-weight:800;text-align:center;letter-spacing:.05em;transition:border-color .2s ease,background .2s ease,color .2s ease,box-shadow .2s ease;';
        const stageStyle=failed?base+'border:1px solid #8d4545;background:rgba(255,107,107,.16);color:#ff9a9a;box-shadow:0 0 9px rgba(255,107,107,.18);':successCurrent?base+'border:1px solid #8fc0ea;background:rgba(79,133,192,.24);color:#d8eaff;box-shadow:0 0 11px rgba(79,133,192,.42),inset 0 0 0 1px rgba(143,192,234,.12);':done?base+'border:1px solid #4d8f68;background:linear-gradient(180deg,#203d2e,#172c22);color:#9addb4;box-shadow:inset 0 0 0 1px rgba(126,198,153,.08);':active?base+`border:1px solid ${activePalette.accent};background:${activePalette.glow};color:${activePalette.accent};box-shadow:0 0 10px ${activePalette.glow},inset 0 0 0 1px ${activePalette.glow};`:base+'border:1px solid #243246;background:#101720;color:#4d5d71;box-shadow:none;';
        await this.ui.stageNodes[indexNode].setStyleAttribute(stageStyle);
      }
      await this.ui.fill.setStyle('width', `${state === 'success' ? 100 : Math.round(((index + .55) / STAGES.length) * 100)}%`); await this.ui.fill.setStyle('background', state === 'error' ? 'linear-gradient(90deg,#8d4545,#ff8585)' : 'linear-gradient(90deg,#4f8568,#8fd3a9)');
      if (this.disposed || token !== this.activeToken) return;
      this.state = state; this.emit();
      this.scheduleTick(token);
      if (hideAfter > 0) this.hideTimer = this.scheduler.setTimeout(() => this.hide(token), hideAfter);
      else this.watchdogTimer = this.scheduler.setTimeout(() => this.hide(token), 10 * 60 * 1000);
    });
    return token;
  }
  searchStart(mode) { this.failedStages.clear();this.stageNames=[mode==='router'?'ROUTER':'WIKI',...STAGES.slice(1)];const token=this.newToken(); return this.show(token,0,mode === 'router' ? 'Router 기억 검색 중' : 'Wiki 키워드 검색 중','현재 User와 최근 Chat에서 관련 기억을 찾습니다.','running',{ fresh:true }); }
  searchFailure(token,reason){this.failedStages.add(0);return this.show(token,0,'Router 검색 실패',String(reason||'키워드 검색으로 대체합니다.'),'error');}
  searchFallback(token,count){this.failedStages.delete(0);this.stageNames[0]='KEYWORD';return this.show(token,0,'키워드 대체 검색 완료',`Router 실패 · 이 턴은 키워드로 ${count}개 검색 · 다음 턴은 Router 사용`,'info');}
  waitingForWriter(token){return this.show(token,0,'이전 Wiki 기록 대기 중','직전 RP의 Writer 저장이 끝나기를 잠시 기다립니다.','running');}
  directorStart(token){return this.show(token,1,'Director 판단 중','회수한 Wiki와 최근 Chat에 활성 스킬을 적용합니다.','running');}
  directorFailure(token,reason){this.failedStages.add(1);return this.show(token,1,'Director 판단 실패',String(reason||'Wiki만 Main에 전달합니다.'),'error');}
  mainReady(token,count,titles = [],note = '') { const detail=count?`${count}개 전달 · ${titles.slice(0,3).join(' · ')}`:(note||'관련 Wiki 없이 Main 응답을 진행합니다.'); return this.show(token,2,'Main 응답 대기',detail,'info'); }
  writerStart() { const continuedAt=this.state==='info'?this.startedAt:0;if(!continuedAt)this.failedStages.clear();const token=this.newToken();if(continuedAt)this.startedAt=continuedAt;return this.show(token,3,'Wiki Writer 기록 중','확정 RP에서 생성·수정할 항목을 검증합니다.','running',{fresh:false}); }
  writerBatch(token,index,total){return this.show(token,3,`Wiki Writer 기록 중 · ${index}/${total}`,`문서 묶음 ${index}/${total}을 검증합니다.`,'running');}
  writerSuccess(token,summary = {}) { return this.show(token,4,'Wiki 저장 완료',`생성 ${summary.created||0} · 수정 ${summary.updated||0} · entry ${summary.upsertedEntries||0} · 수치 ${summary.metricOpsApplied||0}`,'success',{ hideAfter:3000 }); }
  writerFailure(token,reason) { return this.show(token,4,'Wiki 기록 실패 · 미반영',String(reason||'Inspector에서 원인을 확인하세요.'),'error',{ hideAfter:6500 }); }
  hide(token = this.activeToken) {
    if (this.disposed || token !== this.activeToken) return;
    this.clearTimers(); this.activeToken = ++this.sequence;
    this.enqueue(async () => { if (this.ui) await this.ui.wrap.setStyle('display','none'); if (!this.disposed) { this.state='idle'; this.emit(); } });
  }
  async dispose() { this.disposed=true; this.clearTimers(); this.activeToken=++this.sequence; await this.enqueue(async()=>await this.discard()); this.listeners.clear(); this.state='disposed'; }
}
