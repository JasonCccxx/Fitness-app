await customElements.whenDefined('model-viewer');
const samples = {
  squat: { title: '徒手深蹲', english: 'BODYWEIGHT SQUAT', pattern: '01 / LOWER BODY', description: '观察髋、膝与躯干在同一次起落中的配合。', tags: ['下肢复合动作', '无器械'], focus: ['从侧面观察髋部下降与回升的路径。', '暂停在底部，比较膝、髋和躯干的位置。', '切换正面，检查双侧动作与脚部接触。'], phases: ['站立', '下蹲中', '底部'], times: [0, 1, 2], view: 'angle', orbit: '35deg 78deg 3.5m' },
  'push-up': { title: '俯卧撑', english: 'PUSH-UP', pattern: '02 / HORIZONTAL PUSH', description: '从侧面与斜侧观察支撑、屈肘和身体起落。', tags: ['水平推动作', '无器械'], focus: ['从侧面观察躯干与下肢的整体起落。', '放慢播放，观察屈肘时上臂的位置变化。', '切换视角，检查手掌和脚尖的接触。'], phases: ['撑起', '下降中', '底部'], times: [0, 1, 2], view: 'side', orbit: '90deg 80deg 3.3m' },
  'dumbbell-curl': { title: '哑铃弯举', english: 'DUMBBELL CURL', pattern: '03 / ELBOW FLEXION', description: '把注意力放在肘部、前臂和器械的相对运动上。', tags: ['单关节负重动作', '哑铃'], focus: ['从侧面观察屈肘和伸肘的完整过程。', '暂停在顶部，比较上臂和躯干的位置。', '检查器械是否随手部运动、两侧是否一致。'], phases: ['起始', '弯举中', '顶部'], times: [0, 1, 2], view: 'angle', orbit: '30deg 78deg 3.5m' },
};
const model = document.querySelector('#model');
const timeline = document.querySelector('#timeline');
const playButton = document.querySelector('#play');
const speed = document.querySelector('#speed');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let active = Object.hasOwn(samples, new URLSearchParams(location.search).get('exercise')) ? new URLSearchParams(location.search).get('exercise') : 'squat';
let ready = false;
let requestId = 0;
let exporting = false;

function setPlayState(playing) {
  if (!ready) return;
  if (playing) model.play(); else model.pause();
  playButton.textContent = playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', playing ? '暂停动画' : '播放动画');
}
function setView(view) {
  const orbit = view === 'front' ? '0deg 78deg 3.9m' : view === 'side' ? '90deg 80deg 3.9m' : samples[active].orbit.replace(/3\.[35]m$/, '3.9m');
  model.removeAttribute('camera-orbit');
  model.setAttribute('camera-orbit', orbit);
  requestAnimationFrame(() => model.jumpCameraToGoal());
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}
function updateTime() {
  if (!ready) return;
  const time = Math.min(4, Math.max(0, model.currentTime || 0));
  timeline.value = time;
  document.querySelector('#time').value = time.toFixed(1);
  const phase = time < .25 || time > 3.75 ? 0 : time < 1.75 ? 1 : time < 2.25 ? 2 : 3;
  document.querySelector('#phase-label').textContent = phase === 3 ? '返回起始' : samples[active].phases[phase];
}
function showSample(id, updateUrl = true) {
  if (exporting) return;
  active = id; const sample = samples[id];
  ready = false; playButton.disabled = true;
  document.querySelector('#export-gif').disabled = true;
  document.querySelector('#export-status').textContent = '';
  document.querySelector('#time').value = '0.0';
  document.querySelector('#phase-label').textContent = sample.phases[0];
  document.querySelector('#stage-error').hidden = true;
  document.querySelector('#load-status').hidden = false;
  document.querySelector('#load-status').textContent = '正在加载 3D 样本…';
  document.querySelector('#exercise-title').textContent = sample.title;
  document.querySelector('#english-title').textContent = sample.english;
  document.querySelector('#pattern').textContent = sample.pattern;
  document.querySelector('#model-label').textContent = sample.pattern;
  document.querySelector('#exercise-description').textContent = sample.description;
  document.querySelector('#tags').replaceChildren(...sample.tags.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
  document.querySelector('#focus-points').replaceChildren(...sample.focus.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  document.querySelector('#phase-buttons').replaceChildren(...sample.phases.map((text, index) => {
    const button = document.createElement('button'); button.textContent = text; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (!ready) return;
      setPlayState(false); model.currentTime = sample.times[index]; updateTime();
      document.querySelectorAll('#phase-buttons button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }); return button;
  }));
  const download = document.querySelector('#download'); download.href = `./assets/${id}.glb`; download.download = `jy-atlas-${id}.glb`;
  document.querySelectorAll('[data-exercise]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.exercise === id)));
  model.alt = `${sample.title}的三维人体动作样本，可旋转和暂停观察`;
  model.setAttribute('camera-target', id === 'push-up' ? '0m 0.32m -0.05m' : '0m 0.85m 0.05m');
  model.setAttribute('src', `./assets/${id}.glb`); setView(sample.view); timeline.value = 0;
  if (updateUrl) history.replaceState(null, '', `?exercise=${id}`);
}
model.addEventListener('load', () => {
  ready = true; playButton.disabled = false;
  document.querySelector('#export-gif').disabled = false;
  document.querySelector('#load-status').hidden = true;
  model.currentTime = 0; model.timeScale = Number(speed.value);
  setPlayState(!reducedMotion); updateTime();
});
model.addEventListener('error', () => {
  ready = false; playButton.disabled = true;
  document.querySelector('#export-gif').disabled = true;
  document.querySelector('#stage-error').hidden = false;
  document.querySelector('#load-status').hidden = true;
});
document.querySelectorAll('[data-exercise]').forEach(button => button.addEventListener('click', () => showSample(button.dataset.exercise)));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
playButton.addEventListener('click', () => setPlayState(model.paused));
timeline.addEventListener('input', () => { if (!ready) return; setPlayState(false); model.currentTime = Number(timeline.value); updateTime(); document.querySelectorAll('#phase-buttons button').forEach(button => button.setAttribute('aria-pressed', 'false')); });
speed.addEventListener('change', () => { model.timeScale = Number(speed.value); });
document.querySelector('#reset').addEventListener('click', () => { if (!ready) return; model.currentTime = 0; speed.value = '1'; model.timeScale = 1; setView(samples[active].view); setPlayState(!reducedMotion); document.querySelectorAll('#phase-buttons button').forEach(button => button.setAttribute('aria-pressed', 'false')); updateTime(); });
document.querySelector('#retry').addEventListener('click', () => { const src = model.src; model.removeAttribute('src'); requestAnimationFrame(() => { model.src = src; }); });
document.querySelector('#export-gif').addEventListener('click', async () => {
  if (!ready || exporting) return;
  exporting = true;
  const button = document.querySelector('#export-gif');
  const status = document.querySelector('#export-status');
  const wasPlaying = !model.paused; const previousTime = model.currentTime;
  const controls = [...document.querySelectorAll('button, select, input')];
  const previousDisabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  model.removeAttribute('camera-controls');
  setPlayState(false);
  try {
    const { GIFEncoder, quantize, applyPalette } = await import('./vendor/gifenc-1.0.3.js');
    const gif = GIFEncoder(); const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    for (let frame = 0; frame < 40; frame++) {
      status.textContent = `正在导出动图 ${Math.round((frame + 1) / 40 * 100)}%…`;
      model.currentTime = frame / 10;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const png = await model.toBlob({ mimeType: 'image/png' });
      const image = await createImageBitmap(png);
      context.fillStyle = '#182017'; context.fillRect(0, 0, 640, 480);
      const scale = Math.min(600 / image.width, 388 / image.height);
      context.drawImage(image, (640 - image.width * scale) / 2, 58 + (388 - image.height * scale) / 2, image.width * scale, image.height * scale);
      image.close();
      context.fillStyle = '#d5fa60'; context.font = '600 20px "Segoe UI", "Microsoft YaHei", sans-serif';
      context.fillText(samples[active].title, 24, 34);
      context.fillStyle = '#a1ad9e'; context.font = '10px Consolas, monospace';
      context.fillText('JY FITNESS ATLAS / MOTION SAMPLE', 24, 465);
      context.fillText('VISUAL PROTOTYPE', 502, 465);
      const rgba = context.getImageData(0, 0, 640, 480).data;
      const palette = quantize(rgba, 128);
      gif.writeFrame(applyPalette(rgba, palette), 640, 480, { palette, delay: 100, repeat: 0 });
    }
    gif.finish();
    const url = URL.createObjectURL(new Blob([gif.bytes()], { type: 'image/gif' }));
    const link = document.createElement('a'); link.href = url; link.download = `jy-atlas-${active}.gif`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = '动图已导出。';
  } catch (error) {
    status.textContent = '导出未完成，请重新尝试；也可以直接下载 GLB 样本。';
    console.error('Motion GIF export failed', error);
  } finally {
    exporting = false;
    controls.forEach((control, index) => { control.disabled = previousDisabled[index]; });
    model.setAttribute('camera-controls', '');
    model.currentTime = previousTime; setPlayState(wasPlaying); updateTime();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(requestId); } else tick(); });
function tick() { cancelAnimationFrame(requestId); updateTime(); if (!document.hidden) requestId = requestAnimationFrame(tick); }
showSample(active, false); tick();
