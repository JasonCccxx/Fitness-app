import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocation, normalizeState, makeUrl, searchContent, changeType, changeTheme, toGlobalSearch, navigationContext, returnTarget, themeDestination } from '../dist/core.js';

// Artificial fixtures are test-only. They are never included in the public catalogue.
const content = [
  { id: 'a', title: '测试条目甲', aliases: ['Alpha Test'], summary: 'fixture only', content_type: 'exercise', publication_status: 'published', theme_links: [{ theme: 'gym', sections: ['strength'] }, { theme: 'outdoor', sections: ['bodyweight'] }], discipline_ids: ['strength'], equipment_ids: ['dumbbell'], primary_muscle_ids: ['chest'], secondary_muscle_ids: ['arms'], display_order: 2 },
  { id: 'b', title: '测试条目乙', aliases: [], summary: 'fixture only', content_type: 'exercise', publication_status: 'published', theme_links: [{ theme: 'gym', sections: ['cardio'] }], discipline_ids: ['rowing'], equipment_ids: ['none'], primary_muscle_ids: ['back'], display_order: 1 },
  { id: 'c', title: '测试指南', aliases: [], content_type: 'guide', publication_status: 'published', theme_links: [{ theme: 'outdoor', sections: ['running'] }], discipline_ids: ['running'] },
  { id: 'draft', title: 'Alpha draft', content_type: 'exercise', publication_status: 'draft', theme_links: [{ theme: 'gym', sections: ['strength'] }] },
  { id: 'unknown-equipment', title: '测试缺失字段', content_type: 'exercise', publication_status: 'published', theme_links: [{ theme: 'functional', sections: ['circuit'] }] },
];

test('theme deep links preserve valid search state and multi-select values', () => {
  const state = parseLocation('/explore/gym', '?section=strength&type=exercise&q=Alpha&equipment=dumbbell,barbell&muscles=chest');
  assert.equal(state.page, 'theme');
  assert.equal(state.theme, 'gym');
  assert.equal(state.section, 'strength');
  assert.deepEqual(state.equipment, ['barbell', 'dumbbell']);
  assert.equal(state.q, 'Alpha');
});
test('unknown themes and paths produce a not-found route', () => {
  assert.equal(parseLocation('/explore/missing', '').page, 'not-found');
  assert.equal(parseLocation('/unknown', '').page, 'not-found');
});
test('invalid known query values are removed and reported', () => {
  const state = parseLocation('/explore/gym', '?section=running&type=unknown&equipment=bad');
  assert.equal(state.type, 'all');
  assert.equal(state.section, 'all');
  assert.deepEqual(state.equipment, []);
  assert.equal(state.invalid, true);
});
test('URL serialization survives refresh without losing effective conditions', () => {
  const initial = normalizeState({ page: 'library', theme: 'outdoor', type: 'exercise', q: '  测试  ', equipment: ['none'], disciplines: ['running'] });
  const url = new URL(makeUrl(initial), 'http://localhost');
  const restored = parseLocation(url.pathname, url.search);
  for (const key of ['page', 'theme', 'type', 'q', 'section', 'equipment', 'disciplines']) assert.deepEqual(restored[key], initial[key]);
});
test('filters use OR within a dimension, AND between dimensions, and preserve publication rules', () => {
  const result = searchContent(content, normalizeState({ page: 'library', theme: 'gym', type: 'exercise', equipment: ['dumbbell', 'none'], muscles: ['chest'] }));
  assert.deepEqual(result.items.map(item => item.id), ['a']);
  assert.equal(result.scopeCount, 2);
});
test('aliases are searchable with case and full-width normalization', () => {
  const result = searchContent(content, normalizeState({ page: 'library', q: 'ＡＬＰＨＡ' }));
  assert.deepEqual(result.items.map(item => item.id), ['a']);
});
test('secondary muscles also match a muscle filter', () => {
  assert.deepEqual(searchContent(content, normalizeState({ type: 'exercise', muscles: ['arms'] })).items.map(item => item.id), ['a']);
});
test('theme and section scope cannot leak results from other areas', () => {
  const result = searchContent(content, normalizeState({ page: 'theme', theme: 'gym', section: 'cardio' }));
  assert.deepEqual(result.items.map(item => item.id), ['b']);
});
test('shared content has one identity and appears once across themes', () => {
  assert.equal(searchContent(content, normalizeState({})).items.filter(item => item.id === 'a').length, 1);
});
test('a missing equipment field does not mean no equipment', () => {
  const result = searchContent(content, normalizeState({ type: 'exercise', equipment: ['none'] }));
  assert.deepEqual(result.items.map(item => item.id), ['b']);
});
test('pending content and a genuine no-result search are different states', () => {
  assert.equal(searchContent([], normalizeState({ q: 'anything' })).status, 'pending');
  assert.equal(searchContent(content, normalizeState({ theme: 'gym', q: 'not-found' })).status, 'no-results');
});
test('switching away from exercise removes equipment and muscle filters', () => {
  const next = changeType(normalizeState({ type: 'exercise', equipment: ['barbell'], muscles: ['chest'], q: 'test' }), 'guide');
  assert.deepEqual(next.equipment, []);
  assert.deepEqual(next.muscles, []);
  assert.equal(next.q, 'test');
});
test('switching themes resets only section and preserves meaningful conditions', () => {
  const next = changeTheme(normalizeState({ page: 'theme', theme: 'gym', section: 'strength', type: 'exercise', equipment: ['none'] }), 'outdoor');
  assert.equal(next.section, 'all');
  assert.equal(next.theme, 'outdoor');
  assert.deepEqual(next.equipment, ['none']);
});
test('expanding local search to global removes only theme and section scope', () => {
  const next = toGlobalSearch(normalizeState({ page: 'theme', theme: 'gym', section: 'strength', type: 'exercise', q: 'test', equipment: ['barbell'] }));
  assert.equal(next.page, 'library');
  assert.equal(next.theme, 'all');
  assert.equal(next.section, 'all');
  assert.equal(next.q, 'test');
  assert.deepEqual(next.equipment, ['barbell']);
});
test('detail previews have explicit routes, not fake published content IDs', () => {
  assert.equal(parseLocation('/preview/exercise', '').page, 'preview');
  assert.equal(parseLocation('/preview/fake', '').page, 'not-found');
  assert.equal(parseLocation('/exercises/unpublished', '').page, 'detail');
});
test('returning from content preserves the original list position across preview switches', () => {
  const source = navigationContext('theme', '/explore/gym?type=exercise', 255.5, {});
  const switched = navigationContext('preview', '/preview/exercise', 0, source);
  assert.deepEqual(returnTarget(switched), { href: '/explore/gym?type=exercise', scroll: 255.5 });
});
test('direct detail visits fall back to the library and reject external return locations', () => {
  assert.deepEqual(returnTarget({}), { href: '/library', scroll: 0 });
  assert.deepEqual(returnTarget({ from: '//other.example', fromScroll: 100 }), { href: '/library', scroll: 0 });
  assert.deepEqual(returnTarget({ from: '/preview/exercise', fromScroll: 100 }), { href: '/library', scroll: 0 });
});
test('theme navigation preserves catalogue conditions but homepage entry starts fresh', () => {
  const source = normalizeState({ page: 'theme', theme: 'gym', section: 'strength', type: 'exercise', q: 'test', equipment: ['dumbbell'] });
  const url = new URL(themeDestination(source, 'outdoor'), 'http://localhost');
  const next = parseLocation(url.pathname, url.search);
  assert.equal(next.theme, 'outdoor');
  assert.equal(next.section, 'all');
  assert.equal(next.type, 'exercise');
  assert.equal(next.q, 'test');
  assert.deepEqual(next.equipment, ['dumbbell']);
  assert.equal(themeDestination(normalizeState({ page: 'home', q: 'unused' }), 'gym'), '/explore/gym');
});
