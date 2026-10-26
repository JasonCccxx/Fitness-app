import { THEMES, TYPES, FILTERS, CONTENT } from './data.js';
import { parseLocation, normalizeState, makeUrl, searchContent, changeType, changeTheme, toGlobalSearch, navigationContext, returnTarget, themeDestination } from './core.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  northeast: '<path d="M6 18 18 6M6 6h12v12"/>',
  dumbbell: '<path d="m6 7-3 3 11 11 3-3M7 6l3-3 11 11-3 3M8 16l8-8M3 8l5-5M16 21l5-5"/>',
  mountain: '<path d="m2 20 7-13 4 7 3-5 6 11H2zM7 11l2 2 2-2M17 3h.01"/>',
  activity: '<path d="M2 12h5l3-9 4 18 3-9h5"/>',
  filter: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1zm0 0v15"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h8"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9zM2 15l10 6 10-6M2 12l10 6 10-6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.grid}</svg>`;
const link = (href, text, cls = '') => `<a data-link href="${escape(href)}" class="${cls}">${text}</a>`;
const typeName = type => TYPES.find(item => item.id === type)?.name ?? '内容';
let state = parseLocation(location.pathname, location.search);
let toastTimer;
const newEntryKey = () => `atlas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const scrollPositions = new Map();
let activeEntryKey = history.state?.atlasEntry ?? newEntryKey();
history.replaceState({ ...history.state, atlasEntry: activeEntryKey }, '', location.href);
history.scrollRestoration = 'manual';

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message; node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3500);
}
function currentLabel() {
  return state.page === 'theme' ? THEMES.find(theme => theme.id === state.theme).name : ({ home: '探索首页', library: '训练资料库', preview: '内容结构预览', roadmap: '训练路线', detail: '内容详情', 'not-found': '页面不可用' }[state.page]);
}
function brand() {
  return link('/', '<img src="/assets/favicon.svg" alt="" width="38" height="38"><span class="brand-type"><strong>JY FITNESS</strong><span>ATLAS<span class="brand-dot">.</span></span></span>', 'brand');
}
function sidebar() {
  const navItem = (href, name, glyph, active) => `<a data-link href="${href}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${name}</span>${active ? '<span class="nav-mark"></span>' : ''}</a>`;
  return `<aside class="sidebar" aria-label="主要导航">${brand()}<div class="nav-caption">YOUR TRAINING ATLAS</div><nav>${navItem('/', '探索首页', 'home', state.page === 'home')}${navItem('/library', '训练资料库', 'grid', state.page === 'library')}<a href="/motion-lab/index.html" class="nav-item">${icon('activity')}<span>3D 动作样本</span></a><div class="nav-caption worlds-caption">TRAINING WORLDS</div>${THEMES.map(theme => navItem(themeDestination(state, theme.id), theme.name, theme.icon, state.page === 'theme' && state.theme === theme.id)).join('')}</nav><div class="sidebar-bottom"><div class="next-card"><span class="tiny-label">THE NEXT CHAPTER</span><p>探索，只是起点。</p><span class="muted">你的训练工具，下一步生长。</span>${link('/roadmap', `了解训练路线 ${icon('northeast')}`, 'text-link')}</div><span class="sidebar-signature">EXPLORE. TRAIN. PROGRESS.</span></div></aside>`;
}
function shell(body) {
  return `${sidebar()}<div class="app-main"><header class="topbar"><div class="mobile-brand">${brand()}</div><div class="breadcrumb"><span>ATLAS</span>${icon('chevron')}<span>${escape(currentLabel())}</span></div><div class="topbar-actions"><span class="preview-tag"><i></i>探索预览版</span><button class="top-search" data-action="open-search">${icon('search')}<span>全站搜索</span><kbd>/</kbd></button></div></header><main id="main" tabindex="-1">${body}</main><footer class="footer"><span>JY FITNESS ATLAS <span class="copyright">© 2026</span></span><span>探索更多可能，找到自己的节奏。</span>${link('/roadmap', '训练路线 ↗')}</footer></div><nav class="mobile-nav" aria-label="手机导航">${link('/', `${icon('home')}<span>探索</span>`, state.page === 'home' || state.page === 'theme' ? 'selected' : '')}${link('/library', `${icon('grid')}<span>资料库</span>`, state.page === 'library' || state.page === 'preview' ? 'selected' : '')}</nav>`;
}
function worldCard(theme) {
  return link(`/explore/${theme.id}`, `<img src="${theme.image}" alt="" loading="lazy" width="600" height="440"><span class="world-shade"></span><div class="world-top"><span class="world-number">${theme.number} / TRAINING WORLD</span>${icon('northeast', 'world-arrow')}</div><div class="world-content"><span class="world-en">${theme.short}</span><h3>${theme.name}</h3><p>${theme.keywords}</p></div>`, `world-card world-${theme.id}`);
}
function home() {
  return `<div class="home-page"><section class="hero"><img class="hero-image" src="/assets/gym.jpg" alt="健身房中的器械与训练空间" fetchpriority="high" width="1800" height="1200"><div class="hero-shade"></div><div class="hero-grid"></div><div class="hero-copy"><span class="eyebrow hero-eyebrow"><i></i> A WORLD OF MOVEMENT</span><h1><span class="hero-title-line">FIND YOUR</span><span class="hero-title-line">NEXT MOVE.</span></h1><p class="hero-subtitle">每一种训练，都有你的起点。</p><p class="hero-description">从健身房到户外，从好奇到行动。<br>探索不同训练方式，找到属于你的下一步。</p><div class="hero-actions">${link('/#worlds', `探索训练主题 ${icon('arrow')}`, 'button primary')}${link('/library', '浏览资料库', 'button secondary')}<a href="/motion-lab/index.html" class="button secondary">3D 动作样本 ↗</a></div></div><div class="hero-bottom"><span>EXPLORE / LEARN / EVOLVE</span><span class="hero-coordinate">YOUR JOURNEY STARTS HERE ${icon('northeast')}</span></div></section><section class="world-section" id="worlds" aria-labelledby="worlds-title"><div class="section-heading"><div><span class="eyebrow">CHOOSE YOUR WORLD</span><h2 id="worlds-title">你的训练世界<span class="lime">.</span></h2></div><p>选择一个场景，打开新的可能。</p></div><div class="world-grid">${THEMES.map(worldCard).join('')}</div></section><section class="discovery-strip"><div class="strip-icon">${icon('book')}</div><div><span class="eyebrow">LESS SEARCHING. MORE DISCOVERING.</span><h2>有目标？直接从资料库开始。</h2><p>按运动项目、器械和肌群缩小范围。动作、指南与训练模板，各有自己的位置。</p></div>${link('/library', `打开资料库 ${icon('arrow')}`, 'button outline')}</section><section class="journey-banner"><span class="eyebrow">BUILT FOR WHAT COMES NEXT</span><div><h2>探索之后，<br>让训练成为日常。</h2><p>先找到感兴趣的方向。个人计划、训练记录与进度，<br class="desktop-only">将在接下来的阶段逐步加入。</p></div>${link('/roadmap', `看看下一步 ${icon('northeast')}`, 'text-link')}<span class="journey-word" aria-hidden="true">EVOLVE</span></section></div>`;
}
function filtersMarkup(current, mobile = false) {
  const groups = current.type === 'exercise' ? ['disciplines', 'equipment', 'muscles'] : ['disciplines'];
  let output = '';
  if (current.page === 'library') output += `<label class="theme-select"><span>${mobile ? '主题范围' : ''}</span><select name="theme" aria-label="主题范围"><option value="all">全部主题</option>${THEMES.map(theme => `<option value="${theme.id}" ${current.theme === theme.id ? 'selected' : ''}>${theme.name}</option>`).join('')}</select></label>`;
  return output + groups.map(key => {
    const config = FILTERS[key];
    const options = config.options.map(option => `<label class="filter-option"><input type="checkbox" name="${key}" value="${option.id}" aria-label="${option.name}" ${current[key].includes(option.id) ? 'checked' : ''}><span>${option.name}</span></label>`).join('');
    return mobile ? `<fieldset><legend>${config.name}</legend><div class="filter-options">${options}</div></fieldset>` : `<details class="filter-dropdown" data-menu="${key}"><summary>${config.name}${current[key].length ? ` <span class="small-count">${current[key].length}</span>` : ''}<span class="down-chevron">⌄</span></summary><div class="filter-popover">${options}</div></details>`;
  }).join('');
}
function activeChips() {
  const chips = [];
  if (state.q) chips.push(`<button class="condition-chip" data-action="remove-query">搜索：${escape(state.q)} <span aria-hidden="true">×</span><span class="sr-only">移除关键词</span></button>`);
  for (const [group, config] of Object.entries(FILTERS)) for (const value of state[group]) chips.push(`<button class="condition-chip" data-action="remove-filter" data-group="${group}" data-value="${value}">${config.options.find(option => option.id === value).name}<span aria-hidden="true">×</span><span class="sr-only">移除此条件</span></button>`);
  const hasFieldFilters = Object.keys(FILTERS).some(key => state[key].length);
  const hasConditions = chips.length || state.type !== 'all' || state.section !== 'all' || (state.page === 'library' && state.theme !== 'all');
  return hasConditions ? `<div class="active-conditions ${chips.length ? '' : 'only-mobile-reset'}" aria-label="当前条件">${chips.join('')}${hasFieldFilters ? '<button class="subtle-button" data-action="clear-filters">清除筛选</button>' : ''}<button class="subtle-button mobile-reset-button" data-action="reset-page">重置当前页面</button></div>` : '';
}
function emptyState(result) {
  const pending = result.status === 'pending';
  const description = pending ? '这里将收录动作资料、训练指南与单次训练模板。<br>当前预览版尚未发布训练内容，你可以先体验主题和筛选。' : '当前范围内没有匹配这些条件的内容。<br>试试移除筛选条件，或扩大搜索范围。';
  return `<div class="empty-state"><div class="empty-art"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="empty-symbol">${icon(pending ? 'layers' : 'search')}</span><i></i></div><span class="eyebrow">${pending ? 'A SPACE FOR DISCOVERY' : 'NO MATCHES YET'}</span><h2>${pending ? '内容正在准备中' : '暂时没有找到匹配内容'}</h2><p>${description}</p><div class="empty-actions">${state.page === 'theme' ? '<button class="button outline" data-action="global-scope">浏览全部主题 ↗</button>' : link('/#worlds', '探索训练主题 ↗', 'button outline')}${!pending ? '<button class="button secondary" data-action="reset-page">重置当前页面</button>' : ''}</div><div class="preview-links"><span>也可以先查看内容页的结构</span>${link('/preview/exercise', '动作资料 ↗')}${link('/preview/guide', '训练指南 ↗')}${link('/preview/workout-template', '训练模板 ↗')}</div></div>`;
}
function contentCards(items) {
  const detailPaths = { exercise: 'exercises', guide: 'guides', 'workout-template': 'templates' };
  return `<div class="content-grid">${items.map(item => link(`/${detailPaths[item.content_type]}/${encodeURIComponent(item.slug)}`, `<span class="eyebrow">${typeName(item.content_type)}</span><h3>${escape(item.title)}</h3><p>${escape(item.summary)}</p>${icon('northeast')}`, 'content-card')).join('')}</div>`;
}
function catalogue() {
  const theme = THEMES.find(item => item.id === state.theme);
  const result = searchContent(CONTENT, state);
  const scope = state.page === 'theme' ? `${theme.name}${state.section !== 'all' ? ' · ' + theme.sections.find(section => section.id === state.section).name : ''}` : state.theme === 'all' ? '全部主题' : theme.name;
  const filterCount = Object.keys(FILTERS).reduce((sum, key) => sum + state[key].length, 0) + (state.page === 'library' && state.theme !== 'all' ? 1 : 0);
  const banner = state.page === 'theme' ? `<section class="theme-hero"><img src="${theme.image}" alt="" width="1400" height="700"><div class="theme-hero-shade"></div><div class="theme-hero-content"><span class="eyebrow">${theme.number} / TRAINING WORLD</span><h1>${theme.english}<span>${theme.name}</span></h1><p>${theme.intro}</p></div><div class="theme-switch" aria-label="切换训练主题">${THEMES.map(item => `<button data-action="switch-theme" data-theme="${item.id}" class="${item.id === theme.id ? 'selected' : ''}" aria-pressed="${item.id === theme.id}">${item.name}</button>`).join('')}</div></section>` : `<div class="library-heading"><span class="eyebrow">THE TRAINING LIBRARY</span><h1>让每一次好奇，<span>有迹可循。</span></h1><p>从一个关键词开始，或用条件找到你的训练方向。</p></div>`;
  return `<div class="catalogue-page">${banner}<section class="catalogue-panel" aria-label="训练内容浏览">${state.page === 'theme' ? `<div class="section-tabs" aria-label="主题分区"><button data-action="section" data-value="all" class="${state.section === 'all' ? 'selected' : ''}" aria-pressed="${state.section === 'all'}">全部分区</button>${theme.sections.map(section => `<button data-action="section" data-value="${section.id}" class="${state.section === section.id ? 'selected' : ''}" aria-pressed="${state.section === section.id}">${section.name}</button>`).join('')}</div>` : ''}<div class="type-tabs" aria-label="内容类型">${TYPES.map(type => `<button data-action="type" data-value="${type.id}" class="${state.type === type.id ? 'selected' : ''}" aria-pressed="${state.type === type.id}">${type.name}</button>`).join('')}</div><div class="catalogue-search-row"><form id="catalogue-search" class="catalogue-search">${icon('search')}<label class="sr-only" for="catalogue-query">${escape(scope)}内搜索</label><input id="catalogue-query" type="search" name="q" value="${escape(state.q)}" placeholder="在${escape(scope)}中搜索…" maxlength="180"><button type="submit" aria-label="提交当前范围搜索">${icon('arrow')}</button></form><button class="button outline mobile-filter-button" data-action="open-filters">${icon('filter')}筛选${filterCount ? ` <span class="small-count">${filterCount}</span>` : ''}</button>${state.page === 'theme' ? '<button class="global-scope-button" data-action="global-scope">全站搜索 ↗</button>' : ''}</div><div class="desktop-filters">${icon('filter')}<span class="filter-label">筛选</span>${filtersMarkup(state)}<button class="subtle-button reset-button" data-action="reset-page">重置</button></div>${activeChips()}<div class="results-heading"><span>${escape(scope)} <span class="result-separator">/</span> ${typeName(state.type)}</span><span>${result.items.length} 条已发布内容</span></div><div id="results" aria-live="polite">${result.status === 'results' ? contentCards(result.items) : emptyState(result)}</div></section></div>`;
}
function returnHref() {
  return returnTarget(history.state ?? {}).href;
}
function preview() {
  const type = state.previewType;
  const fields = type === 'exercise' ? ['器械', '主要肌群', '次要肌群', '适用环境'] : type === 'guide' ? ['主题', '运动项目', '来源', '更新时间'] : ['训练目的', '适用说明', '所需器械', '预计时长'];
  const sections = type === 'exercise' ? ['动作步骤', '技术提示', '常见错误', '相关资料'] : type === 'guide' ? ['导语', '正文内容', '关联动作与模板'] : ['训练段与动作顺序', '各训练段参数', '调整说明', '关联动作资料'];
  return `<div class="detail-page">${link(returnHref(), '← 返回来源列表', 'back-link')}<div class="preview-notice">${icon('layers')}<span>页面结构预览 · 具体${typeName(type)}尚未填入，本页不作为教学内容。</span></div><span class="eyebrow">CONTENT STRUCTURE PREVIEW</span><h1>${typeName(type)}<span class="lime"> / </span>详情结构</h1><p class="detail-lead">这里将展示名称、简介及与该内容相关的资料。</p><div class="detail-layout"><div><div class="media-placeholder">${icon(type === 'exercise' ? 'dumbbell' : type === 'guide' ? 'book' : 'route')}<strong>${type === 'exercise' ? '动作示范媒体位置' : type === 'guide' ? '指南封面与内容位置' : '训练安排概览位置'}</strong><span>内容待填充</span></div>${sections.map((title, index) => `<section class="placeholder-section"><div class="placeholder-heading"><span>0${index + 1}</span><h2>${title}</h2></div><div class="skeleton-lines" aria-hidden="true"><i></i><i></i><i></i></div><span class="muted placeholder-label">内容待填充</span></section>`).join('')}</div><aside class="detail-meta"><span class="eyebrow">AT A GLANCE</span><h2>资料信息</h2>${fields.map(field => `<div class="meta-row"><span>${field}</span><span>待填充</span></div>`).join('')}<div class="meta-note">${icon('clock')}<p>训练工具将在后续阶段加入。当前先保留清楚、独立的内容结构。</p></div></aside></div><div class="preview-type-links">其他结构预览：${['exercise', 'guide', 'workout-template'].filter(item => item !== type).map(item => link(`/preview/${item}`, `${typeName(item)} ↗`)).join('')}</div></div>`;
}
function roadmap() {
  return `<div class="roadmap-page"><span class="eyebrow">EXPLORE. TRAIN. PROGRESS.</span><h1>每一步，<br>都离自己的节奏更近。</h1><p class="detail-lead">JY FITNESS ATLAS 从探索开始，逐步连接知识、训练与进步。</p><div class="roadmap-list">${[{ number: '01', label: '当前阶段', title: '发现你的训练世界', text: '主题探索、资料库与内容结构。你现在可以体验导航、搜索范围和筛选流程；具体训练内容正在准备。', active: true }, { number: '02', label: '后续计划', title: '让知识进入训练', text: '在内容准备好后，逐步加入个人计划与单次训练安排。', active: false }, { number: '03', label: '后续计划', title: '看见自己的每一步', text: '根据实际使用需求，继续设计训练记录、历史和进度。', active: false }].map(step => `<section class="roadmap-step ${step.active ? 'current' : ''}"><span class="step-number">${step.number}</span><div><span class="eyebrow">${step.label}</span><h2>${step.title}</h2><p>${step.text}</p></div>${icon(step.active ? 'activity' : 'clock')}</section>`).join('')}</div>${link('/#worlds', `回到探索 ${icon('arrow')}`, 'button primary')}</div>`;
}
function notFound() {
  return `<div class="not-found"><span class="eyebrow">OFF THE MAP</span><div class="error-code">404<span class="lime">.</span></div><h1>这条路线，暂时无法到达。</h1><p>页面不存在，或这份内容尚未发布。</p><div>${link('/library', '前往资料库 ↗', 'button primary')}${link('/', '返回首页', 'button outline')}</div></div>`;
}
function publishedDetail() {
  const item = CONTENT.find(item => item.slug === state.slug && item.content_type === state.detailType && item.publication_status === 'published');
  if (!item) return notFound();
  return `<article class="detail-page">${link(returnHref(), '← 返回来源列表', 'back-link')}<span class="eyebrow">${typeName(item.content_type)}</span><h1>${escape(item.title)}</h1><p class="detail-lead">${escape(item.summary)}</p>${(item.sections ?? []).map(section => `<section class="placeholder-section"><h2>${escape(section.heading)}</h2><p>${escape(section.body)}</p></section>`).join('')}</article>`;
}
function render({ focus = false, scroll = 0, results = false, restore = false } = {}) {
  state = parseLocation(location.pathname, location.search);
  if (state.invalid && ['theme', 'library'].includes(state.page)) { history.replaceState(history.state, '', makeUrl(state)); toast('已移除不适用或无效的筛选条件'); }
  const title = state.page === 'home' ? '探索你的训练世界' : currentLabel();
  document.title = `${title} · JY FITNESS ATLAS`;
  app.innerHTML = shell(state.page === 'home' ? home() : ['theme', 'library'].includes(state.page) ? catalogue() : state.page === 'preview' ? preview() : state.page === 'roadmap' ? roadmap() : state.page === 'detail' ? publishedDetail() : notFound());
  requestAnimationFrame(() => {
    if (focus) document.querySelector('#main').focus({ preventScroll: true });
    if (location.hash === '#worlds' && !restore) document.querySelector('#worlds')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    else if (results && document.querySelector('.catalogue-panel')) document.querySelector('.catalogue-panel').scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollTo({ top: scroll, behavior: 'instant' });
  });
}
function navigate(url, options = {}) {
  scrollPositions.set(activeEntryKey, window.scrollY);
  history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
  const source = navigationContext(state.page, location.pathname + location.search, window.scrollY, history.state ?? {});
  activeEntryKey = newEntryKey();
  history.pushState({ ...source, atlasEntry: activeEntryKey, scrollY: 0 }, '', url);
  render({ focus: true, ...options });
}
function applyState(next, message, results = true) { navigate(makeUrl(next), { results }); if (message) toast(message); }
function openFilters() {
  const dialog = document.querySelector('#filter-dialog');
  dialog.innerHTML = `<form id="mobile-filters"><div class="modal-top"><div><span class="eyebrow">REFINE YOUR EXPLORATION</span><h2 id="filter-title">筛选内容</h2></div><button type="button" class="icon-button" data-close="filter-dialog" aria-label="取消筛选">✕</button></div>${filtersMarkup(state, true)}<div class="filter-modal-actions"><button class="button outline" type="button" data-close="filter-dialog">取消</button><button class="button primary" type="submit">应用筛选 ${icon('check')}</button></div></form>`;
  dialog.showModal();
}

document.addEventListener('click', event => {
  const close = event.target.closest('[data-close]');
  if (close) { document.getElementById(close.dataset.close).close(); return; }
  const anchor = event.target.closest('a[data-link]');
  if (anchor && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); const options = anchor.classList.contains('back-link') ? { scroll: returnTarget(history.state ?? {}).scroll, restore: true } : {}; navigate(anchor.getAttribute('href'), options); return; }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'open-search') { const dialog = document.querySelector('#search-dialog'); dialog.showModal(); document.querySelector('#global-query').focus(); }
  if (action === 'open-filters') openFilters();
  if (action === 'switch-theme') applyState(changeTheme(state, control.dataset.theme), '', false);
  if (action === 'section') applyState({ ...state, section: control.dataset.value });
  if (action === 'type') { const clearing = state.type === 'exercise' && control.dataset.value !== 'exercise' && (state.equipment.length || state.muscles.length); applyState(changeType(state, control.dataset.value), clearing ? '切换内容类型，已清除器械与肌群条件' : ''); }
  if (action === 'global-scope') applyState(toGlobalSearch(state));
  if (action === 'remove-query') applyState({ ...state, q: '' });
  if (action === 'remove-filter') applyState({ ...state, [control.dataset.group]: state[control.dataset.group].filter(value => value !== control.dataset.value) });
  if (action === 'clear-filters') applyState({ ...state, disciplines: [], equipment: [], muscles: [] });
  if (action === 'reset-page') applyState(normalizeState({ page: state.page, theme: state.page === 'theme' ? state.theme : 'all' }));
});
document.addEventListener('submit', event => {
  if (event.target.id === 'global-search-form') { event.preventDefault(); const q = new FormData(event.target).get('q'); document.querySelector('#search-dialog').close(); navigate(makeUrl({ page: 'library', q })); }
  if (event.target.id === 'catalogue-search') { event.preventDefault(); applyState({ ...state, q: new FormData(event.target).get('q') }); }
  if (event.target.id === 'mobile-filters') {
    event.preventDefault(); const form = new FormData(event.target); const next = { ...state };
    if (state.page === 'library') next.theme = form.get('theme');
    for (const key of Object.keys(FILTERS)) next[key] = form.getAll(key);
    document.querySelector('#filter-dialog').close(); applyState(next);
    requestAnimationFrame(() => document.querySelector('[data-action="open-filters"]')?.focus({ preventScroll: true }));
  }
});
document.addEventListener('change', event => {
  if (!event.target.closest('.desktop-filters')) return;
  const control = event.target; const key = control.name;
  if (key === 'theme') { applyState({ ...state, theme: control.value }); return; }
  if (Object.hasOwn(FILTERS, key)) {
    const values = control.checked ? [...state[key], control.value] : state[key].filter(value => value !== control.value);
    applyState({ ...state, [key]: values });
    requestAnimationFrame(() => { const menu = document.querySelector(`[data-menu="${key}"]`); if (menu) { menu.open = true; menu.querySelector(`input[value="${control.value}"]`)?.focus({ preventScroll: true }); } });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); document.querySelector('[data-action="open-search"]').click(); }
  if (event.key === 'Escape') for (const menu of document.querySelectorAll('details[open]')) menu.open = false;
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
window.addEventListener('scroll', () => scrollPositions.set(activeEntryKey, window.scrollY), { passive: true });
window.addEventListener('popstate', event => {
  activeEntryKey = event.state?.atlasEntry ?? newEntryKey();
  if (!event.state?.atlasEntry) history.replaceState({ ...event.state, atlasEntry: activeEntryKey }, '', location.href);
  render({ scroll: scrollPositions.get(activeEntryKey) ?? event.state?.scrollY ?? 0, restore: true });
});
window.addEventListener('beforeunload', () => history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href));
render({ scroll: history.state?.scrollY ?? 0, restore: history.state?.scrollY !== undefined });
