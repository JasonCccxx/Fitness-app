export const THEMES = [
  { id: 'gym', number: '01', name: '健身房', english: 'GYM TRAINING', short: 'GYM', icon: 'dumbbell', image: '/assets/gym.jpg', description: '从器械到动作，找到适合你的训练方向。', intro: '力量与体能，从这里建立。', sections: [{ id: 'strength', name: '力量训练' }, { id: 'cardio', name: '有氧训练' }], keywords: '力量 · 有氧 · 器械', accent: '#d5fa60' },
  { id: 'outdoor', number: '02', name: '户外', english: 'OUTDOOR', short: 'OUTDOOR', icon: 'mountain', image: '/assets/outdoor.jpg', description: '走出室内，在开放的空间探索身体的可能。', intro: '把天地，变成你的训练场。', sections: [{ id: 'running', name: '跑步' }, { id: 'bodyweight', name: '户外自重训练' }], keywords: '跑步 · 自重 · 户外', accent: '#afd9c0' },
  { id: 'functional', number: '03', name: '功能性训练', english: 'FUNCTIONAL', short: 'FUNCTIONAL', icon: 'activity', image: '/assets/functional.jpg', description: '连接不同动作，探索间歇与循环的训练方式。', intro: '让每一次动作，有所连接。', sections: [{ id: 'interval', name: '间歇训练' }, { id: 'circuit', name: '循环训练' }], keywords: '间歇 · 循环 · 综合体能', accent: '#e5cfaa' },
];
export const TYPES = [{ id: 'all', name: '全部内容' }, { id: 'exercise', name: '动作资料' }, { id: 'guide', name: '训练指南' }, { id: 'workout-template', name: '训练模板' }];
export const FILTERS = {
  disciplines: { name: '运动项目', options: [{ id: 'strength', name: '力量训练' }, { id: 'running', name: '跑步' }, { id: 'cycling', name: '骑行' }, { id: 'rowing', name: '划船' }] },
  equipment: { name: '器械', options: [{ id: 'none', name: '无器械' }, { id: 'dumbbell', name: '哑铃' }, { id: 'barbell', name: '杠铃' }, { id: 'machine', name: '固定器械' }, { id: 'band', name: '弹力带' }] },
  muscles: { name: '肌群', options: [{ id: 'chest', name: '胸部' }, { id: 'back', name: '背部' }, { id: 'legs', name: '腿部' }, { id: 'shoulders', name: '肩部' }, { id: 'arms', name: '手臂' }, { id: 'core', name: '核心' }] },
};
// Deliberately empty: actual instructional content will be authored separately.
export const CONTENT = [];
