/* Playground: builds a control panel, a live element, and generated snippets for one component.
   Usage: Playground.mount(container, 'corner'). Reads flags from ProceduralLines.OPTIONS so the
   controls always match the library. Plain DOM, no framework. */
(function (global) {
  'use strict';
  var P = global.ProceduralLines;
  var GEN = { corner: 'corner4', massing: 'massing3', skyline: 'skyline', truss: 'truss', plan: 'plan' };
  var PRESETS = { responsive: null, mobile: [390, 300], tablet: [834, 480], desktop: [1440, 720] };
  var FAMILY_LABELS = { camera: 'Camera', massing: 'Massing', windows: 'Windows', ornament: 'Ornament', millwork: 'Millwork', street: 'Street', depth: 'Depth', roof: 'Roof', light: 'Light', context: 'Context', web: 'Web', members: 'Members', openings: 'Openings', walls: 'Walls', fixtures: 'Fixtures' };

  /** Create an element with attributes and children. */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === 'text') el.textContent = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k]; else el.setAttribute(k, attrs[k]); }
    (children || []).forEach(function (c) { el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  /** Group a kind's flags by family, preserving first-seen family order. */
  function families(kind) {
    var out = [], seen = {};
    P.OPTIONS[kind].forEach(function (f) { if (!seen[f.family]) { seen[f.family] = { name: f.family, flags: [] }; out.push(seen[f.family]); } seen[f.family].flags.push(f); });
    return out;
  }

  /** The current state of a playground, read from its controls. */
  function readState(pg) {
    var s = { options: {}, size: pg.q('[name=preset]').value, w: +pg.q('[name=width]').value || 0, h: +pg.q('[name=height]').value || 0, aspect: pg.q('[name=aspect]').value };
    pg.root.querySelectorAll('input[data-flag]').forEach(function (c) { s.options[c.dataset.flag] = c.checked; });
    s.seed = pg.q('[name=seed]').value; s.mode = pg.q('[name=mode]').value; s.reseed = pg.q('[name=reseed]').value;
    s.night = pg.q('[name=night]').checked; s.glowOn = pg.q('[name=glowOn]').checked; s.glow = pg.q('[name=glow]').value;
    s.color = pg.q('[name=color]').value; s.page = pg.q('[name=page]').value; s.customColor = pg.q('[name=customColor]').checked;
    return s;
  }

  /** Push a state onto the element's attributes and style. Options carry only the non-default flags. */
  function apply(pg, s) {
    var el = pg.el, diff = P.diffFromDefaults(pg.kind, s.options);
    if (Object.keys(diff).length) el.setAttribute('options', JSON.stringify(diff)); else el.removeAttribute('options');
    if (s.seed !== '') el.setAttribute('seed', s.seed); else el.removeAttribute('seed');
    el.setAttribute('mode', s.mode); el.setAttribute('reseed', s.reseed);
    if (s.night) el.setAttribute('night', ''); else el.removeAttribute('night');
    if (s.glowOn) el.setAttribute('glow', s.glow); else el.removeAttribute('glow');
    if (s.customColor) { el.setAttribute('color', s.color); el.setAttribute('page', s.page); } else { el.removeAttribute('color'); el.removeAttribute('page'); }
    var preset = PRESETS[s.size];
    if (s.size === 'custom') el.setAttribute('style', 'width:' + (s.w || 800) + 'px;height:' + (s.h || 500) + 'px');
    else if (preset) el.setAttribute('style', 'width:' + preset[0] + 'px;height:' + preset[1] + 'px');
    else el.setAttribute('style', 'width:100%;aspect-ratio:' + s.aspect);
    pg.stage.style.background = el.hasAttribute('night') ? '#0E0E10' : (s.customColor ? s.page : '#FFFFFF');
    refreshSnippets(pg, s);
  }

  /** Regenerate the HTML and JS snippets from the element's live state. */
  function refreshSnippets(pg, s) {
    var el = pg.el, box = el.getBoundingClientRect(), W = Math.round(box.width) || 800, Hh = Math.round(box.height) || 500;
    pg.q('[data-snippet=html]').textContent = '<script src="procedural-line-renderings.js"></script>\n' + el.snippet;
    var diff = P.diffFromDefaults(pg.kind, s.options), night = el.hasAttribute('night');
    var color = el.getAttribute('color') || (night ? P.NIGHT.color : '#C4C6CB'), page = el.getAttribute('page') || (night ? P.NIGHT.page : '#FFFFFF');
    var glow = el.getAttribute('glow') || (night ? P.NIGHT.glow : null), prob = night ? P.NIGHT.glowProb : 0.35;
    var seedExpr = s.seed !== '' ? s.seed : "P.clockSeed('" + pg.kind + "')";
    pg.q('[data-snippet=js]').textContent = [
      'var P = ProceduralLines, ctx = canvas.getContext("2d");',
      'var region = { x: 0, y: 0, w: ' + W + ', h: ' + Hh + ' };',
      'var items = P.' + GEN[pg.kind] + '(P.rng(' + seedExpr + '), region, ' + JSON.stringify(diff) + ');',
      'P.' + (s.mode === 'once' ? 'drawIn' : 'bounce') + '(ctx, items, Object.assign({ color: "' + color + '", page: "' + page + '"' + (glow ? ', glow: "' + glow + '", glowProb: ' + prob : '') + ' }, P.speedsFor(items, 7, 4)));'
    ].join('\n');
  }

  /** Copy a snippet's text to the clipboard, with a selection fallback. */
  function copy(pre, btn) {
    var text = pre.textContent, done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { select(pre); });
    else select(pre);
  }
  function select(pre) { var r = document.createRange(); r.selectNodeContents(pre); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }

  /** The checkbox grid for a kind, one fieldset per family. */
  function flagGrid(kind) {
    return h('div', { class: 'pg-flags' }, families(kind).map(function (fam) {
      return h('fieldset', {}, [h('legend', { text: FAMILY_LABELS[fam.name] || fam.name })].concat(fam.flags.map(function (f) {
        var input = h('input', { type: 'checkbox', 'data-flag': f.name, title: f.text });
        input.checked = !!f.def;
        return h('label', { title: f.text }, [input, ' ', f.name]);
      })));
    }));
  }

  /** The size, colour, seed, and mode controls. */
  function panel() {
    return h('div', { class: 'pg-panel' }, [
      h('div', { class: 'pg-row' }, [
        h('label', {}, ['size ', h('select', { name: 'preset', html: '<option value="responsive">responsive</option><option value="mobile">mobile 390 x 300</option><option value="tablet">tablet 834 x 480</option><option value="desktop">desktop 1440 x 720</option><option value="custom">custom</option>' })]),
        h('label', {}, ['aspect ', h('select', { name: 'aspect', html: '<option value="16/9">16:9</option><option value="3/2">3:2</option><option value="4/3">4:3</option><option value="1/1">1:1</option><option value="2/1">2:1</option>' })]),
        h('label', {}, ['width ', h('input', { type: 'number', name: 'width', value: '800', min: '120', step: '10' })]),
        h('label', {}, ['height ', h('input', { type: 'number', name: 'height', value: '500', min: '120', step: '10' })])
      ]),
      h('div', { class: 'pg-row' }, [
        h('label', {}, [h('input', { type: 'checkbox', name: 'night' }), ' night']),
        h('label', {}, [h('input', { type: 'checkbox', name: 'glowOn' }), ' glowing windows ', h('input', { type: 'color', name: 'glow', value: '#F2D08A' })]),
        h('label', {}, [h('input', { type: 'checkbox', name: 'customColor' }), ' custom colours: line ', h('input', { type: 'color', name: 'color', value: '#C4C6CB' }), ' page ', h('input', { type: 'color', name: 'page', value: '#FFFFFF' })])
      ]),
      h('div', { class: 'pg-row' }, [
        h('label', {}, ['seed ', h('input', { type: 'number', name: 'seed', placeholder: 'clock', min: '0' })]),
        h('label', {}, ['mode ', h('select', { name: 'mode', html: '<option value="bounce">bounce</option><option value="once">once</option>' })]),
        h('label', {}, ['reseed ', h('select', { name: 'reseed', html: '<option value="cycle">cycle</option><option value="never">never</option>' })]),
        h('button', { type: 'button', 'data-regen': '', text: 'Regenerate' }),
        h('code', { 'data-seed': '' })
      ])
    ]);
  }

  /** Mount a playground for a kind into a container. Returns the playground object. */
  function mount(container, kind) {
    var el = document.createElement(P.TAGS[kind]);
    var stage = h('div', { class: 'pg-stage' }, [el]);
    var copyHtml = h('button', { type: 'button', text: 'Copy' }), copyJs = h('button', { type: 'button', text: 'Copy' });
    var preHtml = h('pre', { 'data-snippet': 'html' }), preJs = h('pre', { 'data-snippet': 'js' });
    var root = h('div', { class: 'pg' }, [
      flagGrid(kind), panel(), stage,
      h('div', { class: 'pg-snips' }, [
        h('div', {}, [h('div', { class: 'pg-snip-head' }, [h('span', { text: 'HTML' }), copyHtml]), preHtml]),
        h('div', {}, [h('div', { class: 'pg-snip-head' }, [h('span', { text: 'JS' }), copyJs]), preJs])
      ])
    ]);
    container.appendChild(root);
    var pg = { kind: kind, el: el, root: root, stage: stage, q: function (sel) { return root.querySelector(sel); } };
    function update() { apply(pg, readState(pg)); }
    root.querySelectorAll('input, select').forEach(function (c) { c.addEventListener('change', update); });
    pg.q('[data-regen]').addEventListener('click', function () { el.regenerate(); });
    el.addEventListener('seed', function (e) { pg.q('[data-seed]').textContent = 'seed ' + e.detail.seed; refreshSnippets(pg, readState(pg)); });
    copyHtml.addEventListener('click', function () { copy(preHtml, copyHtml); });
    copyJs.addEventListener('click', function () { copy(preJs, copyJs); });
    update();
    return pg;
  }

  /** Fill a table body with a kind's option reference: name, family, default, description. */
  function optionsTable(tbody, kind) {
    P.OPTIONS[kind].forEach(function (f) {
      tbody.appendChild(h('tr', {}, [h('td', {}, [h('code', { text: f.name })]), h('td', { text: FAMILY_LABELS[f.family] || f.family }), h('td', { text: f.def ? 'on' : 'off' }), h('td', { text: f.text })]));
    });
  }

  global.Playground = { mount: mount, optionsTable: optionsTable };
})(window);
