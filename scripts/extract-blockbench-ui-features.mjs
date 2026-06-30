#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'reference/blockbench-source');
const lang = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lang/en.json'), 'utf8'));
const outputPath = path.join(repoRoot, 'reference/blockbench-ui-feature-list.html');
const wikiOutputDir = path.join(repoRoot, 'reference/blockbench-ui-features');
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
const barItemDefinitions = new Map();
const dialogDefinitionsByVar = new Map();
const toolbarDefinitions = new Map();
const panelDefinitions = [];
const panelContents = [];
const panelContentKeys = new Set();
const inlineMenuItems = [];
const sourceFiles = listSourceFiles(path.join(sourceRoot, 'js'))
  .concat(listSourceFiles(path.join(sourceRoot, 'scripts')))
  .filter(file => /\.(js|ts|vue)$/.test(file));

main();

function main() {
  for (const file of sourceFiles) {
    extractDialogs(file);
    extractToolbars(file);
    extractConstructors(file);
  }
  extractMainMenus();
  extractKnownRuntimeMenus();
  applySyntheticRoutes();
  applyPanelToolbarRoutes();
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
    panel_content_count: panelContents.length,
    panel_contents: panelContents,
    features,
  }, null, 2));
  renderWiki(features, panelContents);
  fs.writeFileSync(outputPath, renderLegacyRedirect());
  console.log(`Wrote ${path.relative(repoRoot, wikiOutputDir)} with ${features.length} UI-reachable features`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} as the legacy entry point`);
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

function extractDialogs(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);
  for (const match of findConstructors(src, 'Dialog')) {
    const args = splitTopLevel(match.args);
    if (!args.length) continue;
    const objectArg = args.find(arg => arg.trim().startsWith('{')) || '';
    if (!objectArg) continue;
    const id = constructorId(args) || literalProp(objectArg, 'id');
    if (!id) continue;
    const rel = relative(file);
    const line = lineNumber(raw, match.index);
    const variable = assignedVariableBefore(src, match.index);
    const dialog = {
      id,
      variable,
      name: resolveName(literalProp(objectArg, 'title')) || titleCase(id),
      fields: formFields(rawTopLevelProp(objectArg, 'form')),
      source: `${rel}:${line}`,
    };
    if (variable) dialogDefinitionsByVar.set(variable, dialog);
  }
}

function extractToolbars(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);
  for (const match of findConstructors(src, 'Toolbar')) {
    const args = splitTopLevel(match.args);
    const definition = toolbarDefinitionFromArgs(args, relative(file), lineNumber(raw, match.index));
    if (!definition.id) continue;
    toolbarDefinitions.set(definition.id, definition);
  }
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
      barItemDefinitions.set(id, {
        id,
        type: typeNames[type],
        objectArg,
        source: feature.source,
      });
      if (type === 'Panel') {
        panelDefinitions.push({
          id,
          name: feature.name,
          objectArg,
          source: feature.source,
        });
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
      panel: {id: 'uv', name: 'UV'},
    },
    {
      file: path.join(sourceRoot, 'js/animations/timeline.js'),
      marker: 'menu: new Menu(',
      route: ['Timeline'],
      panel: {id: 'timeline', name: 'Timeline'},
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
      if (spec.panel) {
        parsePanelMenuArray(
          args[0],
          spec.panel,
          ['View', 'Panels', spec.panel.name, 'Panel Menu'],
          relative(spec.file),
          lineNumber(raw, index)
        );
      }
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

function applyPanelToolbarRoutes() {
  for (const panel of panelDefinitions) {
    const toolbarArray = arrayProp(panel.objectArg, 'toolbars');
    if (toolbarArray) {
      for (const token of splitTopLevel(trimWrapper(toolbarArray.trim(), '[', ']'))) {
        const toolbar = toolbarDefinitionFromToken(token.trim());
        if (!toolbar?.children?.length) continue;
        for (const childId of toolbar.children) {
          if (!childId || childId === '_' || childId === '+') continue;
          const controlName = labelForId(childId);
          const route = ['View', 'Panels', panel.name, controlName];
          addRoute(childId, route);
          addPanelContent({
            panel_id: panel.id,
            panel_name: panel.name,
            control_id: childId,
            control_name: controlName,
            control_type: featureTypeById(childId) || 'Panel control',
            ui_path: route.join(' > '),
            source: toolbar.source || panel.source,
          });
          expandNestedControlRoutes(childId, route, panel, toolbar.source || panel.source);
        }
      }
    }
    const menuProp = rawTopLevelProp(panel.objectArg, 'menu');
    if (menuProp?.startsWith('new Menu')) {
      const paren = menuProp.indexOf('(');
      const end = findMatching(menuProp, paren, '(', ')');
      if (paren !== -1 && end !== -1) {
        const args = splitTopLevel(menuProp.slice(paren + 1, end));
        if (args[0]?.trim().startsWith('[')) {
          parsePanelMenuArray(
            args[0],
            panel,
            ['View', 'Panels', panel.name, 'Panel Menu'],
            panel.source.split(':')[0],
            Number(panel.source.split(':').at(-1))
          );
        }
      }
    }
  }
  panelContents.sort((a, b) => {
    const panel = a.panel_name.localeCompare(b.panel_name);
    if (panel) return panel;
    return a.control_name.localeCompare(b.control_name);
  });
}

function expandNestedControlRoutes(controlId, routePrefix, panel, fallbackSource, stack = []) {
  if (stack.includes(controlId)) return;
  const definition = barItemDefinitions.get(controlId);
  if (!definition?.objectArg) return;
  const nestedMenus = staticNestedMenuArrays(definition.objectArg);
  for (const nestedArray of nestedMenus) {
    for (const item of staticMenuEntries(nestedArray)) {
      const route = [...routePrefix, item.name];
      if (item.id) addRoute(item.id, route);
      addPanelContent({
        panel_id: panel.id,
        panel_name: panel.name,
        control_id: item.id || route.join('/'),
        control_name: item.name,
        control_type: item.children ? 'Panel menu group' : (featureTypeById(item.id) || 'Panel menu item'),
        ui_path: route.join(' > '),
        source: item.source || definition.source || fallbackSource,
      });
      if (item.children) {
        expandStaticMenuEntries(item.children, route, panel, item.source || definition.source || fallbackSource);
      }
      if (item.id) {
        expandNestedControlRoutes(item.id, route, panel, item.source || definition.source || fallbackSource, [...stack, controlId]);
      }
    }
  }
  expandDialogRoutes(controlId, routePrefix, panel, definition, fallbackSource);
}

function expandDialogRoutes(controlId, routePrefix, panel, definition, fallbackSource) {
  const clickSource = rawTopLevelProp(definition.objectArg, 'click') || rawTopLevelMethod(definition.objectArg, 'click');
  if (!clickSource) return;
  const variables = [...clickSource.matchAll(/\b([A-Za-z_$][\w$]*)\.show\s*\(/g)].map(match => match[1]);
  for (const variable of variables) {
    const dialog = dialogDefinitionsByVar.get(variable);
    if (!dialog?.fields.length) continue;
    const popupRoute = [...routePrefix, 'Popup', dialog.name];
    addPanelContent({
      panel_id: panel.id,
      panel_name: panel.name,
      control_id: dialog.id,
      control_name: dialog.name,
      control_type: 'Popup',
      ui_path: popupRoute.join(' > '),
      source: dialog.source || fallbackSource,
    });
    for (const field of dialog.fields) {
      const fieldRoute = [...popupRoute, field.name];
      addPanelContent({
        panel_id: panel.id,
        panel_name: panel.name,
        control_id: `${dialog.id}.${field.id}`,
        control_name: field.name,
        control_type: field.type ? `Popup field (${field.type})` : 'Popup field',
        ui_path: fieldRoute.join(' > '),
        source: dialog.source || fallbackSource,
      });
      for (const option of field.options) {
        addPanelContent({
          panel_id: panel.id,
          panel_name: panel.name,
          control_id: `${dialog.id}.${field.id}.${option.id}`,
          control_name: option.name,
          control_type: 'Popup option',
          ui_path: [...fieldRoute, option.name].join(' > '),
          source: dialog.source || fallbackSource,
        });
      }
    }
  }
}

function expandStaticMenuEntries(arrayText, routePrefix, panel, source) {
  for (const item of staticMenuEntries(arrayText)) {
    const route = [...routePrefix, item.name];
    if (item.id) addRoute(item.id, route);
    addPanelContent({
      panel_id: panel.id,
      panel_name: panel.name,
      control_id: item.id || route.join('/'),
      control_name: item.name,
      control_type: item.children ? 'Panel menu group' : (featureTypeById(item.id) || 'Panel menu item'),
      ui_path: route.join(' > '),
      source,
    });
    if (item.children) expandStaticMenuEntries(item.children, route, panel, source);
  }
}

function staticNestedMenuArrays(objectArg) {
  const arrays = [];
  const children = arrayProp(objectArg, 'children');
  if (children) arrays.push(children);
  const sideMenu = rawTopLevelProp(objectArg, 'side_menu');
  const sideMenuArray = staticMenuArrayFromNewMenu(sideMenu);
  if (sideMenuArray) arrays.push(sideMenuArray);
  return arrays;
}

function staticMenuArrayFromNewMenu(value) {
  if (!value?.trim().startsWith('new Menu')) return '';
  const paren = value.indexOf('(');
  const end = findMatching(value, paren, '(', ')');
  if (paren === -1 || end === -1) return '';
  const args = splitTopLevel(value.slice(paren + 1, end));
  return args.find(arg => arg.trim().startsWith('['))?.trim() || '';
}

function staticMenuEntries(arrayText) {
  const entries = [];
  const body = trimWrapper(arrayText.trim(), '[', ']');
  for (const token of splitTopLevel(body)) {
    const item = token.trim();
    if (!item || item === '_' || item === '+' || item.startsWith('new MenuSeparator')) continue;
    if (/^['"`]/.test(item)) {
      const id = stringLiteral(item);
      if (id && id !== '_' && id !== '+') {
        entries.push({id, name: labelForId(id)});
      }
      continue;
    }
    if (item.startsWith('{')) {
      const id = literalProp(item, 'id');
      const name = resolveName(literalProp(item, 'name')) || (id ? labelForId(id) : 'Menu Item');
      const children = arrayProp(item, 'children');
      entries.push({id, name, children});
    }
  }
  return entries;
}

function parsePanelMenuArray(arrayText, panel, routePrefix, sourceFile, sourceLine) {
  const body = trimWrapper(arrayText.trim(), '[', ']');
  for (const token of splitTopLevel(body)) {
    const item = token.trim();
    if (!item || item === '_' || item.startsWith('new MenuSeparator')) continue;
    if (/^['"`]/.test(item)) {
      const id = stringLiteral(item);
      if (!id || id === '_') continue;
      const controlName = labelForId(id);
      const route = [...routePrefix, controlName];
      addRoute(id, route);
      addPanelContent({
        panel_id: panel.id,
        panel_name: panel.name,
        control_id: id,
        control_name: controlName,
        control_type: featureTypeById(id) || 'Panel menu item',
        ui_path: route.join(' > '),
        source: `${sourceFile}:${sourceLine}`,
      });
      continue;
    }
    if (item.startsWith('{')) {
      const id = literalProp(item, 'id');
      const name = resolveName(literalProp(item, 'name')) || (id ? labelForId(id) : 'Menu Item');
      const route = [...routePrefix, name];
      const childrenArray = arrayProp(item, 'children');
      const hasClick = /\bclick\s*\(/.test(item) || /\bclick\s*:/.test(item);
      if (id) addRoute(id, route);
      if (id || childrenArray || hasClick) {
        addPanelContent({
          panel_id: panel.id,
          panel_name: panel.name,
          control_id: id || route.join('/'),
          control_name: name,
          control_type: childrenArray ? 'Panel menu group' : (featureTypeById(id) || 'Panel menu item'),
          ui_path: route.join(' > '),
          source: `${sourceFile}:${sourceLine}`,
        });
      }
      if (childrenArray) parsePanelMenuArray(childrenArray, panel, route, sourceFile, sourceLine);
    }
  }
}

function addPanelContent(item) {
  const key = `${item.panel_id}:${item.control_id}:${item.ui_path}`;
  if (panelContentKeys.has(key)) return;
  panelContentKeys.add(key);
  panelContents.push(item);
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

function toolbarDefinitionFromToken(token) {
  if (!token) return null;
  if (token.startsWith('new Toolbar')) {
    const paren = token.indexOf('(');
    const end = findMatching(token, paren, '(', ')');
    if (paren !== -1 && end !== -1) {
      return toolbarDefinitionFromArgs(splitTopLevel(token.slice(paren + 1, end)), '', 0);
    }
  }
  const ref = token.match(/^Toolbars\.([A-Za-z0-9_]+)/);
  if (ref) return toolbarDefinitions.get(ref[1]) || null;
  return null;
}

function toolbarDefinitionFromArgs(args, sourceFile, sourceLine) {
  const id = constructorId(args);
  const objectArg = args.find(arg => arg.trim().startsWith('{')) || '';
  const children = stringArrayProp(objectArg, 'children');
  return {
    id,
    children,
    source: sourceFile ? `${sourceFile}:${sourceLine}` : '',
  };
}

function stringArrayProp(objectText, prop) {
  const array = arrayProp(objectText, prop);
  if (!array) return [];
  return splitTopLevel(trimWrapper(array.trim(), '[', ']'))
    .map(token => stringLiteral(token.trim()))
    .filter(Boolean);
}

function featureTypeById(id) {
  for (const feature of featureByKey.values()) {
    if (feature.id === id) return feature.type;
  }
  return '';
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
  const value = rawTopLevelProp(objectText, prop) || rawTopLevelMethod(objectText, prop);
  return staticArrayFromValue(value);
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

function rawTopLevelMethod(objectText, prop) {
  if (!objectText) return '';
  const body = trimWrapper(objectText.trim(), '{', '}');
  for (const part of splitTopLevel(body)) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${prop}(`)) continue;
    const brace = trimmed.indexOf('{');
    if (brace === -1) continue;
    const end = findMatching(trimmed, brace, '{', '}');
    if (end !== -1) return trimmed.slice(brace, end + 1);
  }
  return '';
}

function formFields(formText) {
  const form = formText?.trim() || '';
  if (!form.startsWith('{')) return [];
  const fields = [];
  const body = trimWrapper(form, '{', '}');
  for (const part of splitTopLevel(body)) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const id = part.slice(0, colon).trim().replace(/^['"`]|['"`]$/g, '');
    if (!id || id === '_' || id.startsWith('_')) continue;
    const value = part.slice(colon + 1).trim();
    if (!value.startsWith('{')) continue;
    const label = resolveName(literalProp(value, 'label')) || titleCase(id);
    const type = literalProp(value, 'type') || 'control';
    fields.push({
      id,
      name: label,
      type,
      options: formOptions(rawTopLevelProp(value, 'options')),
    });
  }
  return fields;
}

function formOptions(optionsText) {
  const options = optionsText?.trim() || '';
  if (!options.startsWith('{')) return [];
  const entries = [];
  const body = trimWrapper(options, '{', '}');
  for (const part of splitTopLevel(body)) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const id = part.slice(0, colon).trim().replace(/^['"`]|['"`]$/g, '');
    const value = part.slice(colon + 1).trim();
    const name = resolveName(stringLiteral(value) || literalProp(value, 'name')) || titleCase(id);
    entries.push({id, name});
  }
  return entries;
}

function assignedVariableBefore(src, index) {
  const prefix = src.slice(Math.max(0, index - 160), index);
  const match = prefix.match(/(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/);
  return match ? match[1] : '';
}

function staticArrayFromValue(value) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (trimmed.startsWith('[')) return trimmed;
  const returnIndex = trimmed.indexOf('return');
  if (returnIndex === -1) return '';
  const bracket = trimmed.indexOf('[', returnIndex);
  if (bracket === -1) return '';
  const end = findMatching(trimmed, bracket, '[', ']');
  return end === -1 ? '' : trimmed.slice(bracket, end + 1);
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

function groupBy(list, keyFn) {
  return list.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderWiki(features, panelContents) {
  fs.rmSync(wikiOutputDir, {recursive: true, force: true});
  fs.mkdirSync(wikiOutputDir, {recursive: true});

  const areas = uiAreas(features, panelContents);
  const areaPages = areas.map(area => ({
    ...area,
    file: `${slugify(area.name)}.html`,
  }));

  fs.writeFileSync(path.join(wikiOutputDir, 'wiki.css'), wikiCss());
  fs.writeFileSync(path.join(wikiOutputDir, 'index.html'), renderWikiIndex(areaPages, features, panelContents));
  for (const area of areaPages) {
    fs.writeFileSync(path.join(wikiOutputDir, area.file), renderAreaPage(area, areaPages));
  }
}

function renderLegacyRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=blockbench-ui-features/index.html">
  <title>Blockbench UI Feature Wiki</title>
</head>
<body>
  <p>The Blockbench UI feature list has moved to <a href="blockbench-ui-features/index.html">the UI feature wiki</a>.</p>
</body>
</html>
`;
}

function uiAreas(features, panelContents) {
  const byArea = new Map();

  for (const feature of features) {
    const routesByArea = groupRoutesByArea(feature.routes);
    for (const [areaName, routes] of routesByArea) {
      const area = ensureArea(byArea, areaName);
      area.features.push({...feature, area_routes: routes});
    }
  }

  for (const item of panelContents) {
    const areaName = routeArea(item.ui_path);
    const area = ensureArea(byArea, areaName);
    area.panel_contents.push(item);
  }

  return [...byArea.values()].sort((a, b) => {
    const count = b.features.length + b.panel_contents.length - (a.features.length + a.panel_contents.length);
    if (count) return count;
    return a.name.localeCompare(b.name);
  });
}

function ensureArea(byArea, name) {
  if (!byArea.has(name)) {
    byArea.set(name, {name, features: [], panel_contents: []});
  }
  return byArea.get(name);
}

function groupRoutesByArea(routes) {
  const byArea = new Map();
  for (const route of routes) {
    const area = routeArea(route);
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area).push(route);
  }
  return byArea;
}

function routeArea(route) {
  return route.split(' > ')[0] || 'Other';
}

function routeSection(route) {
  const parts = route.split(' > ');
  return parts[1] || 'Direct';
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'other';
}

function renderWikiIndex(areas, features, panelContents) {
  const rows = areas.map(area => `<tr>
      <td><a href="${escapeHtml(area.file)}">${escapeHtml(area.name)}</a></td>
      <td>${area.features.length}</td>
      <td>${area.panel_contents.length}</td>
    </tr>`).join('\n');
  const areaLinks = areas.map(area => `<a href="${escapeHtml(area.file)}">${escapeHtml(area.name)}</a>`).join('');

  return renderPage({
    title: 'Blockbench UI Feature Wiki',
    subtitle: `Generated from reference/blockbench-source. ${features.length} UI-reachable features and ${panelContents.length} panel controls are organized by the visible Blockbench UI area that begins each path.`,
    nav: `<a href="../../index.html">Course Home</a><a href="../blockbench-ui-feature-list.json">JSON Data</a>`,
    body: `
    <section class="note">
      Routes through toolbox, panels, modes, project formats, loaders, and settings are inferred from Blockbench's standard UI registration points. Menu routes are extracted from source menu registrations. Features with routes in multiple UI areas appear on each matching page.
    </section>
    <nav class="area-links">${areaLinks}</nav>
    <table>
      <thead>
        <tr>
          <th>UI Area</th>
          <th>Features</th>
          <th>Panel Controls</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`,
  });
}

function renderAreaPage(area, areas) {
  const rowsBySection = groupFeatureRowsBySection(area.features);
  const featureSections = Object.keys(rowsBySection).sort()
    .map(section => renderFeatureSection(section, rowsBySection[section]))
    .join('');
  const panelSection = area.panel_contents.length
    ? renderPanelContentSection(area.panel_contents)
    : '';
  const areaLinks = areas.map(item => item.name === area.name
    ? `<strong>${escapeHtml(item.name)}</strong>`
    : `<a href="${escapeHtml(item.file)}">${escapeHtml(item.name)}</a>`).join('');
  const body = `
    <section class="summary">
      <div><strong>${area.features.length}</strong><span>features</span></div>
      <div><strong>${area.panel_contents.length}</strong><span>panel controls</span></div>
    </section>
    <nav class="area-links">${areaLinks}</nav>
    <div class="controls">
      <input id="search" type="search" placeholder="Search this UI area">
    </div>
    ${featureSections || '<p>No UI-reachable features found for this area.</p>'}
    ${panelSection}
    ${filterScript()}`;

  return renderPage({
    title: `${area.name} UI Features`,
    subtitle: `Features whose UI path starts in ${area.name}. Rows show all known UI paths for each feature, even when a feature also appears on another area page.`,
    nav: `<a href="index.html">Feature Wiki</a><a href="../blockbench-ui-feature-list.json">JSON Data</a>`,
    body,
  });
}

function groupFeatureRowsBySection(features) {
  return features.reduce((groups, feature) => {
    const sections = unique(feature.area_routes.map(routeSection));
    for (const section of sections) {
      if (!groups[section]) groups[section] = [];
      groups[section].push(feature);
    }
    return groups;
  }, {});
}

function renderFeatureSection(section, features) {
  const rows = features
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(renderFeatureRow)
    .join('\n');
  return `<section class="feature-section">
      <h2>${escapeHtml(section)} <span>${features.length} features</span></h2>
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
    </section>`;
}

function renderFeatureRow(feature) {
  const routes = feature.routes
    .map(route => `<li>${escapeHtml(route)}</li>`)
    .join('');
  return `<tr data-search="${escapeHtml(`${feature.name} ${feature.type} ${feature.id} ${feature.routes.join(' ')} ${feature.description}`.toLowerCase())}">
      <td class="feature"><strong>${escapeHtml(feature.name)}</strong><span>${escapeHtml(feature.id)}</span></td>
      <td><span class="pill">${escapeHtml(feature.type)}</span></td>
      <td class="route"><ul class="routes">${routes}</ul></td>
      <td>${escapeHtml(feature.description)}</td>
      <td><code>${escapeHtml(feature.source)}</code></td>
    </tr>`;
}

function renderPanelContentSection(panelContents) {
  const panelGroups = groupBy(panelContents, item => item.panel_name);
  const sections = Object.keys(panelGroups).sort()
    .map(panelName => {
      const items = panelGroups[panelName];
      const rows = items.map(item => `<tr data-search="${escapeHtml(`${item.control_name} ${item.control_id} ${item.control_type} ${item.ui_path}`.toLowerCase())}">
        <td class="feature"><strong>${escapeHtml(item.control_name)}</strong><span>${escapeHtml(item.control_id)}</span></td>
        <td><span class="pill">${escapeHtml(item.control_type)}</span></td>
        <td class="route">${escapeHtml(item.ui_path)}</td>
        <td><code>${escapeHtml(item.source)}</code></td>
      </tr>`).join('');
      return `<section class="feature-section">
        <h2>${escapeHtml(panelName)} Panel Controls <span>${items.length} controls</span></h2>
        <table>
          <thead>
            <tr>
              <th>Control</th>
              <th>Type</th>
              <th>UI Path</th>
              <th>Toolbar Source</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');
  return `<h2>Panel Contents</h2>${sections}`;
}

function renderPage({title, subtitle, nav, body}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="wiki.css">
</head>
<body>
  <header>
    <nav class="top">${nav}</nav>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
  </header>
  <main>${body}</main>
</body>
</html>
`;
}

function filterScript() {
  return `<script>
    const search = document.querySelector('#search');
    const rows = [...document.querySelectorAll('tbody tr')];
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      for (const row of rows) row.hidden = q && !row.dataset.search.includes(q);
    });
  </script>`;
}

function wikiCss() {
  return `
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
      padding: 22px 32px 18px;
      border-bottom: 1px solid var(--line);
      background: #f8fafb;
    }
    main { padding: 22px 32px 36px; }
    h1 { margin: 14px 0 8px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 26px 0 8px; font-size: 20px; letter-spacing: 0; }
    h2 span { color: var(--muted); font-weight: 500; font-size: 13px; }
    p { margin: 0; color: var(--muted); max-width: 980px; }
    .top, .area-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .top a, .area-links a, .area-links strong {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 9px;
      background: white;
      color: var(--ink);
      text-decoration: none;
      font-weight: 600;
    }
    .area-links { margin: 18px 0; }
    .area-links strong { background: var(--band); }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      margin-bottom: 18px;
    }
    .summary div, .note {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px 12px;
      background: var(--band);
    }
    .summary strong { display: block; font-size: 22px; }
    .summary span { color: var(--muted); }
    .note {
      border-left: 3px solid var(--warn);
      background: #fff8ed;
      color: #57380a;
    }
    .controls {
      margin: 18px 0 12px;
      max-width: 620px;
    }
    input {
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
    .routes {
      margin: 0;
      padding-left: 16px;
    }
    .routes li + li { margin-top: 4px; }
    .feature-section { margin: 18px 0 26px; }
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
    @media (max-width: 760px) {
      header, main { padding-left: 16px; padding-right: 16px; }
      table { display: block; overflow-x: auto; white-space: nowrap; }
      td:nth-child(4) { white-space: normal; min-width: 280px; }
    }
  `;
}
