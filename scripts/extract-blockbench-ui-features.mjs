#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'reference/blockbench-source');
const lang = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lang/en.json'), 'utf8'));
const outputPath = path.join(repoRoot, 'reference/blockbench-ui-feature-list.html');
const jsonOutputPath = path.join(repoRoot, 'reference/blockbench-ui-feature-list.json');

const constructorTypes = [
  'Action',
  'Toggle',
  'Tool',
  'BarSelect',
  'BarSlider',
  'NumSlider',
  'ColorPicker',
  'BarText',
  'Panel',
  'Mode',
  'ModelFormat',
  'ModelLoader',
  'Setting',
];

const typeNames = {
  Action: 'Action',
  Toggle: 'Toggle',
  Tool: 'Tool',
  BarSelect: 'Toolbar select',
  BarSlider: 'Toolbar slider',
  NumSlider: 'Numeric control',
  ColorPicker: 'Color picker',
  BarText: 'Toolbar text',
  Panel: 'Panel',
  Mode: 'Mode',
  ModelFormat: 'Project format',
  ModelLoader: 'Project loader',
  Setting: 'Setting',
};

const topMenuIds = new Set([
  'file',
  'edit',
  'transform',
  'mesh',
  'skin',
  'uv',
  'image',
  'animation',
  'keyframe',
  'timeline',
  'display',
  'tools',
  'view',
  'help',
]);

const featureByKey = new Map();
const routesById = new Map();
const inlineMenuItems = [];
const sourceFiles = listSourceFiles(path.join(sourceRoot, 'js'))
  .concat(listSourceFiles(path.join(sourceRoot, 'scripts')))
  .filter(file => /\.(js|ts|vue)$/.test(file));

main();

function main() {
  for (const file of sourceFiles) {
    extractConstructors(file);
  }
  extractMainMenus();
  extractKnownRuntimeMenus();
  applySyntheticRoutes();
  mergeInlineMenuItems();

  const features = [...featureByKey.values()]
    .filter(feature => feature.routes.length > 0)
    .sort((a, b) => {
      const route = a.routes[0].localeCompare(b.routes[0]);
      if (route) return route;
      return a.name.localeCompare(b.name);
    });

  fs.writeFileSync(jsonOutputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    source_root: path.relative(repoRoot, sourceRoot),
    count: features.length,
    features,
  }, null, 2));
  fs.writeFileSync(outputPath, renderHtml(features));
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${features.length} UI-reachable features`);
  console.log(`Wrote ${path.relative(repoRoot, jsonOutputPath)} for machine-readable review`);
}

function listSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listSourceFiles(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

function extractConstructors(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);
  for (const type of constructorTypes) {
    for (const match of findConstructors(src, type)) {
      const args = splitTopLevel(match.args);
      if (!args.length) continue;
      const id = constructorId(args);
      if (!id || id === 'new_panel') continue;
      const objectArg = args.find(arg => arg.trim().startsWith('{')) || '';
      const rel = relative(file);
      const line = lineNumber(raw, match.index);
      const feature = {
        id,
        name: resolveConstructorName(type, id, objectArg),
        type: typeNames[type],
        description: resolveConstructorDescription(type, id, objectArg),
        routes: [],
        source: `${rel}:${line}`,
        source_file: rel,
        source_line: line,
        extracted_from: `new ${type}`,
      };
      if (type === 'Setting') {
        feature.category = literalProp(objectArg, 'category') || 'general';
      }
      upsertFeature(`${type}:${id}`, feature);
    }
  }
}

function extractMainMenus() {
  const file = path.join(sourceRoot, 'js/interface/menu_bar.js');
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);
  for (const match of findConstructors(src, 'BarMenu')) {
    const args = splitTopLevel(match.args);
    const menuId = stringLiteral(args[0]);
    if (!menuId || !topMenuIds.has(menuId)) continue;
    const menuLabel = menuName(menuId);
    if (!args[1]?.trim().startsWith('[')) continue;
    parseMenuArray(args[1], [menuLabel], relative(file), lineNumber(raw, match.index));
  }
}

function extractKnownRuntimeMenus() {
  const runtimeMenus = [
    {
      file: path.join(sourceRoot, 'js/uv/uv.js'),
      marker: 'menu: new Menu(',
      route: [menuName('uv')],
    },
    {
      file: path.join(sourceRoot, 'js/animations/timeline.js'),
      marker: 'menu: new Menu(',
      route: ['Timeline'],
    },
  ];
  for (const spec of runtimeMenus) {
    const raw = fs.readFileSync(spec.file, 'utf8');
    const src = stripComments(raw);
    const index = src.indexOf(spec.marker);
    if (index === -1) continue;
    const paren = src.indexOf('(', index);
    const end = findMatching(src, paren, '(', ')');
    const args = splitTopLevel(src.slice(paren + 1, end));
    if (args[0]?.trim().startsWith('[')) {
      parseMenuArray(args[0], spec.route, relative(spec.file), lineNumber(raw, index));
    }
  }
}

function applySyntheticRoutes() {
  for (const feature of featureByKey.values()) {
    switch (feature.type) {
      case 'Tool':
        addRoute(feature.id, ['Tools', 'Main Tools', feature.name]);
        break;
      case 'Panel':
        addRoute(feature.id, ['View', 'Panels', feature.name]);
        break;
      case 'Mode':
        addRoute(feature.id, ['Mode Switcher', feature.name]);
        break;
      case 'Project format':
        addRoute(feature.id, ['File', 'New', feature.name]);
        break;
      case 'Project loader':
        addRoute(feature.id, ['File', 'New', 'Loaders', feature.name]);
        break;
      case 'Setting': {
        const category = titleCase(feature.category || 'general');
        addRoute(feature.id, ['File', 'Preferences', 'Settings', category, feature.name]);
        break;
      }
    }
  }
  addRoute('settings_window', ['File', 'Preferences', 'Settings']);
  addRoute('keybindings_window', ['File', 'Preferences', 'Keybindings']);
  addRoute('theme_window', ['File', 'Preferences', 'Theme']);
  addRoute('plugins_window', ['File', 'Plugins']);
  addRoute('action_control', ['Tools', 'Action Control']);
}

function mergeInlineMenuItems() {
  for (const item of inlineMenuItems) {
    const id = item.id || item.route.join('/');
    upsertFeature(`Menu:${id}`, {
      id,
      name: item.name,
      type: item.children ? 'Menu group' : 'Menu item',
      description: item.description || '',
      routes: [item.route.join(' > ')],
      source: item.source,
      source_file: item.source.split(':')[0],
      source_line: Number(item.source.split(':').at(-1)),
      extracted_from: 'menu item',
    });
  }
}

function parseMenuArray(arrayText, routePrefix, sourceFile, sourceLine) {
  const body = trimWrapper(arrayText.trim(), '[', ']');
  for (const token of splitTopLevel(body)) {
    const item = token.trim();
    if (!item || item === '_' || item.startsWith('new MenuSeparator')) continue;
    if (/^['"`]/.test(item)) {
      const id = stringLiteral(item);
      if (id && id !== '_') addRoute(id, [...routePrefix, labelForId(id)]);
      continue;
    }
    if (item.startsWith('{')) {
      const id = literalProp(item, 'id');
      const name = resolveName(literalProp(item, 'name')) || (id ? labelForId(id) : 'Menu Item');
      const route = [...routePrefix, name];
      const description = resolveName(literalProp(item, 'description'));
      const childrenArray = arrayProp(item, 'children');
      const hasClick = /\bclick\s*\(/.test(item) || /\bclick\s*:/.test(item);
      if (id) addRoute(id, route);
      if (id || hasClick || childrenArray) {
        inlineMenuItems.push({
          id,
          name,
          description,
          route,
          children: !!childrenArray,
          source: `${sourceFile}:${sourceLine}`,
        });
      }
      if (childrenArray) parseMenuArray(childrenArray, route, sourceFile, sourceLine);
    }
  }
}

function upsertFeature(key, feature) {
  const existing = featureByKey.get(key);
  if (existing) {
    existing.routes = unique(existing.routes.concat(feature.routes || []));
    return existing;
  }
  feature.routes = unique(feature.routes || []);
  featureByKey.set(key, feature);
  return feature;
}

function addRoute(id, parts) {
  if (!id) return;
  const route = parts.filter(Boolean).join(' > ');
  if (!route) return;
  if (!routesById.has(id)) routesById.set(id, new Set());
  routesById.get(id).add(route);
  for (const feature of featureByKey.values()) {
    if (feature.id === id) feature.routes = unique(feature.routes.concat(route));
  }
}

function findConstructors(src, type) {
  const out = [];
  const needle = `new ${type}`;
  let index = 0;
  while ((index = src.indexOf(needle, index)) !== -1) {
    const before = src[index - 1] || '';
    const after = src[index + needle.length] || '';
    if ((before && /[\w$]/.test(before)) || (after && /[\w$]/.test(after))) {
      index += needle.length;
      continue;
    }
    const paren = src.indexOf('(', index + needle.length);
    if (paren === -1) break;
    const end = findMatching(src, paren, '(', ')');
    if (end !== -1) out.push({index, args: src.slice(paren + 1, end)});
    index = end === -1 ? index + needle.length : end + 1;
  }
  return out;
}

function findMatching(src, start, open, close) {
  let depth = 0;
  let quote = '';
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(text) {
  const result = [];
  let start = 0;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(') depthParen++;
    if (ch === ')') depthParen--;
    if (ch === '{') depthBrace++;
    if (ch === '}') depthBrace--;
    if (ch === '[') depthBracket++;
    if (ch === ']') depthBracket--;
    if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      result.push(text.slice(start, i));
      start = i + 1;
    }
  }
  const tail = text.slice(start);
  if (tail.trim()) result.push(tail);
  return result;
}

function constructorId(args) {
  const first = args[0]?.trim();
  if (!first) return '';
  if (/^['"`]/.test(first)) return stringLiteral(first);
  if (first.startsWith('{')) return literalProp(first, 'id');
  return '';
}

function literalProp(objectText, prop) {
  const value = rawTopLevelProp(objectText, prop);
  if (!value) return '';
  return stringLiteral(value) || tlCall(value) || bareIdentifier(value);
}

function arrayProp(objectText, prop) {
  const value = rawTopLevelProp(objectText, prop);
  return value?.trim().startsWith('[') ? value.trim() : '';
}

function rawTopLevelProp(objectText, prop) {
  if (!objectText) return '';
  const body = trimWrapper(objectText.trim(), '{', '}');
  for (const part of splitTopLevel(body)) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim().replace(/^['"`]|['"`]$/g, '');
    if (key === prop) return part.slice(colon + 1).trim();
  }
  return '';
}

function stringLiteral(value) {
  const trimmed = value?.trim() || '';
  const quote = trimmed[0];
  if (!['"', "'", '`'].includes(quote)) return '';
  let out = '';
  for (let i = 1; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === quote && trimmed[i - 1] !== '\\') return out;
    out += ch;
  }
  return '';
}

function tlCall(value) {
  const match = value.match(/^tl\(\s*(['"`])([^'"`]+)\1/);
  return match ? match[2] : '';
}

function bareIdentifier(value) {
  const cleaned = value.trim();
  if (/^[a-zA-Z0-9_.-]+$/.test(cleaned) && cleaned.includes('.')) return cleaned;
  return '';
}

function resolveConstructorName(type, id, objectArg) {
  const explicit = resolveName(literalProp(objectArg, 'name'));
  if (explicit) return explicit;
  if (type === 'Panel') return translate(`panel.${id}`) || titleCase(id);
  if (type === 'Mode') return translate(`mode.${id}`) || titleCase(id);
  if (type === 'Setting') return translate(`settings.${id}`) || titleCase(id);
  if (type === 'ModelFormat' || type === 'ModelLoader') return titleCase(id);
  return translate(`action.${id}`) || titleCase(id);
}

function resolveConstructorDescription(type, id, objectArg) {
  const explicit = resolveName(literalProp(objectArg, 'description'));
  if (explicit) return explicit;
  if (type === 'Panel') return translate(`panel.${id}.desc`) || '';
  if (type === 'Mode') return translate(`mode.${id}.desc`) || '';
  if (type === 'Setting') return translate(`settings.${id}.desc`) || '';
  return translate(`action.${id}.desc`) || '';
}

function resolveName(value) {
  if (!value) return '';
  return translate(value) || (value.includes('.') ? titleCase(value.split('.').at(-1)) : value);
}

function labelForId(id) {
  return translate(`action.${id}`)
    || translate(`menu.${id}`)
    || translate(`settings.${id}`)
    || translate(`data.${id}`)
    || titleCase(id);
}

function menuName(id) {
  return translate(`menu.${id}`) || titleCase(id);
}

function translate(key) {
  if (!key) return '';
  if (lang[key]) return lang[key];
  return '';
}

function titleCase(id) {
  return String(id)
    .replace(/^action\./, '')
    .replace(/^settings\./, '')
    .replace(/[_./-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function stripComments(src) {
  let out = '';
  let state = 'normal';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    const prev = src[i - 1];
    if (state === 'line') {
      if (ch === '\n') {
        state = 'normal';
        out += ch;
      } else {
        out += ' ';
      }
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        out += '  ';
        i++;
        state = 'normal';
      } else {
        out += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (state !== 'normal') {
      out += ch;
      if (ch === state && prev !== '\\') state = 'normal';
      continue;
    }
    if (ch === '/' && next === '/') {
      out += '  ';
      i++;
      state = 'line';
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i++;
      state = 'block';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') state = ch;
    out += ch;
  }
  return out;
}

function trimWrapper(text, open, close) {
  const trimmed = text.trim();
  return trimmed.startsWith(open) && trimmed.endsWith(close)
    ? trimmed.slice(1, -1)
    : trimmed;
}

function lineNumber(raw, index) {
  return raw.slice(0, index).split('\n').length;
}

function relative(file) {
  return path.relative(repoRoot, file);
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(features) {
  const counts = features.reduce((acc, feature) => {
    acc[feature.type] = (acc[feature.type] || 0) + 1;
    return acc;
  }, {});
  const typeOptions = Object.keys(counts).sort()
    .map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)} (${counts[type]})</option>`)
    .join('');
  const rows = features.map(feature => {
    const route = feature.routes[0] || '';
    return `<tr data-type="${escapeHtml(feature.type)}" data-search="${escapeHtml(`${feature.name} ${feature.type} ${feature.id} ${feature.routes.join(' ')} ${feature.description}`.toLowerCase())}">
      <td class="feature"><strong>${escapeHtml(feature.name)}</strong><span>${escapeHtml(feature.id)}</span></td>
      <td><span class="pill">${escapeHtml(feature.type)}</span></td>
      <td class="route">${escapeHtml(route)}</td>
      <td>${escapeHtml(feature.description)}</td>
      <td><code>${escapeHtml(feature.source)}</code></td>
    </tr>`;
  }).join('\n');
  const countCards = Object.keys(counts).sort()
    .map(type => `<div><strong>${counts[type]}</strong><span>${escapeHtml(type)}</span></div>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blockbench UI-Reachable Feature List</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172026;
      --muted: #65717b;
      --line: #d9e0e5;
      --band: #f5f7f9;
      --accent: #0f766e;
      --accent-2: #7c3aed;
      --warn: #b45309;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: white;
    }
    header {
      padding: 28px 32px 18px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fff, #f8fafb);
    }
    h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); max-width: 980px; }
    main { padding: 22px 32px 36px; }
    .counts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      margin: 18px 0;
    }
    .counts div {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px 12px;
      background: var(--band);
    }
    .counts strong { display: block; font-size: 22px; }
    .counts span { color: var(--muted); }
    .controls {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) 240px;
      gap: 10px;
      margin: 18px 0 12px;
    }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px 11px;
      font: inherit;
      background: white;
      color: var(--ink);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #eef3f6;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #40505c;
      letter-spacing: .04em;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 9px 10px;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #fbfcfd; }
    .feature strong { display: block; }
    .feature span { color: var(--muted); font-size: 12px; }
    .route { min-width: 260px; color: var(--accent); font-weight: 600; }
    .pill {
      display: inline-block;
      border: 1px solid #c9d4dc;
      border-radius: 999px;
      padding: 2px 8px;
      white-space: nowrap;
      background: white;
      color: #26343d;
      font-size: 12px;
    }
    code { color: var(--accent-2); font-size: 12px; }
    .note {
      margin: 14px 0;
      padding: 10px 12px;
      border-left: 3px solid var(--warn);
      background: #fff8ed;
      color: #57380a;
    }
    @media (max-width: 760px) {
      header, main { padding-left: 16px; padding-right: 16px; }
      .controls { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; white-space: nowrap; }
      td:nth-child(4) { white-space: normal; min-width: 280px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Blockbench UI-Reachable Feature List</h1>
    <p>Generated from <code>reference/blockbench-source</code>. A feature is included when the source exposes a visible route through menus, toolbox, panels, mode switcher, format picker, or settings.</p>
  </header>
  <main>
    <div class="counts">${countCards}</div>
    <p class="note">Routes marked through toolbox, panels, modes, project formats, loaders, and settings are inferred from Blockbench's standard UI registration points. Menu routes are extracted from menu registrations in source.</p>
    <div class="controls">
      <input id="search" type="search" placeholder="Search feature, UI path, id, description">
      <select id="type">
        <option value="">All feature types (${features.length})</option>
        ${typeOptions}
      </select>
    </div>
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Type</th>
          <th>UI Path</th>
          <th>Description</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
  <script>
    const search = document.querySelector('#search');
    const type = document.querySelector('#type');
    const rows = [...document.querySelectorAll('tbody tr')];
    function applyFilters() {
      const q = search.value.trim().toLowerCase();
      const t = type.value;
      for (const row of rows) {
        const matchSearch = !q || row.dataset.search.includes(q);
        const matchType = !t || row.dataset.type === t;
        row.hidden = !(matchSearch && matchType);
      }
    }
    search.addEventListener('input', applyFilters);
    type.addEventListener('change', applyFilters);
  </script>
</body>
</html>
`;
}
