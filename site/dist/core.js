import { THEMES, TYPES, FILTERS } from './data.js';

const themeIds = THEMES.map(theme => theme.id);
const typeIds = TYPES.map(type => type.id);
const defaults = { page: 'library', theme: 'all', section: 'all', type: 'all', q: '', disciplines: [], equipment: [], muscles: [], invalid: false };
const normalizedText = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();

export function normalizeState(input = {}) {
  const state = { ...defaults, ...input };
  state.theme = themeIds.includes(state.theme) ? state.theme : 'all';
  state.type = typeIds.includes(state.type) ? state.type : 'all';
  state.q = String(state.q ?? '').trim().slice(0, 180);
  const sections = THEMES.find(theme => theme.id === state.theme)?.sections.map(section => section.id) ?? [];
  state.section = state.page === 'theme' && sections.includes(state.section) ? state.section : 'all';
  for (const [key, config] of Object.entries(FILTERS)) {
    const allowed = config.options.map(option => option.id);
    const values = Array.isArray(state[key]) ? state[key] : String(state[key] ?? '').split(',');
    state[key] = [...new Set(values.filter(value => allowed.includes(value)))].sort();
  }
  if (state.type !== 'exercise') { state.equipment = []; state.muscles = []; }
  return state;
}

export function parseLocation(pathname, search = '') {
  const path = pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  let route = { page: 'not-found' };
  if (path === '/') route = { page: 'home' };
  if (path === '/library') route = { page: 'library' };
  if (path === '/roadmap') route = { page: 'roadmap' };
  if (parts.length === 2 && parts[0] === 'explore' && themeIds.includes(parts[1])) route = { page: 'theme', theme: parts[1] };
  if (parts.length === 2 && parts[0] === 'preview' && typeIds.includes(parts[1]) && parts[1] !== 'all') route = { page: 'preview', previewType: parts[1] };
  const details = { exercises: 'exercise', guides: 'guide', templates: 'workout-template' };
  if (parts.length === 2 && details[parts[0]]) route = { page: 'detail', detailType: details[parts[0]], slug: parts[1] };
  const params = new URLSearchParams(search);
  const raw = { ...route, q: params.get('q') ?? '', type: params.get('type') ?? 'all', section: params.get('section') ?? 'all' };
  if (route.page === 'library') raw.theme = params.get('theme') ?? 'all';
  for (const key of Object.keys(FILTERS)) raw[key] = (params.get(key) ?? '').split(',').filter(Boolean);
  const state = normalizeState(raw);
  state.invalid = ['theme', 'type', 'section'].some(key => raw[key] !== undefined && raw[key] !== state[key]) || Object.keys(FILTERS).some(key => raw[key].some(value => !state[key].includes(value)));
  return state;
}

export function makeUrl(input) {
  const state = normalizeState(input);
  const path = state.page === 'theme' && state.theme !== 'all' ? `/explore/${state.theme}` : '/library';
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type !== 'all') params.set('type', state.type);
  if (state.page !== 'theme' && state.theme !== 'all') params.set('theme', state.theme);
  if (state.page === 'theme' && state.section !== 'all') params.set('section', state.section);
  for (const key of Object.keys(FILTERS)) if (state[key].length) params.set(key, state[key].join(','));
  return path + (params.size ? `?${params}` : '');
}

export function changeType(state, type) { return normalizeState({ ...state, type }); }
export function changeTheme(state, theme) { return normalizeState({ ...state, theme, section: 'all' }); }
export function themeDestination(state, theme) {
  if (!themeIds.includes(theme)) return '/';
  return ['theme', 'library'].includes(state.page) ? makeUrl(changeTheme({ ...state, page: 'theme' }, theme)) : `/explore/${theme}`;
}
export function toGlobalSearch(state) { return normalizeState({ ...state, page: 'library', theme: 'all', section: 'all' }); }

export function returnTarget(context = {}) {
  const from = context.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.includes('\\') || from.startsWith('/preview')) return { href: '/library', scroll: 0 };
  return { href: from, scroll: Math.max(0, Number(context.fromScroll) || 0) };
}

export function navigationContext(page, url, scrollY, previous = {}) {
  if (['preview', 'detail'].includes(page)) { const target = returnTarget(previous); return { from: target.href, fromScroll: target.scroll }; }
  return { from: url, fromScroll: scrollY };
}

function inScope(item, state) {
  if (item.publication_status !== 'published') return false;
  if (state.type !== 'all' && item.content_type !== state.type) return false;
  if (state.theme !== 'all') {
    const link = item.theme_links?.find(link => link.theme === state.theme);
    if (!link || (state.section !== 'all' && !link.sections?.includes(state.section))) return false;
  }
  return true;
}

export function searchContent(content, input) {
  const state = normalizeState(input);
  const scope = content.filter(item => inScope(item, state));
  const terms = normalizedText(state.q).split(/\s+/).filter(Boolean);
  const items = scope.filter(item => {
    const text = normalizedText([item.title, ...(item.aliases ?? []), item.summary].join(' '));
    if (!terms.every(term => text.includes(term))) return false;
    const values = { disciplines: item.discipline_ids ?? [], equipment: item.equipment_ids ?? [], muscles: [...(item.primary_muscle_ids ?? []), ...(item.secondary_muscle_ids ?? [])] };
    return Object.keys(FILTERS).every(key => !state[key].length || state[key].some(value => values[key].includes(value)));
  }).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.id.localeCompare(b.id));
  return { items, scopeCount: scope.length, status: scope.length === 0 ? 'pending' : items.length === 0 ? 'no-results' : 'results' };
}
