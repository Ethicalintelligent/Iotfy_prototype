// ESLint rule: a product may use another product only through that product's index.ts.
//
// A "product" is any folder under products/ that holds a manifest.ts. Product folders
// nest (an edition lives inside its base), so the owner of a file is its *nearest*
// ancestor folder with a manifest.ts. eslint-plugin-boundaries handles the layer rules
// (apps / products / packages); this rule covers privacy between products.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PRODUCTS = path.join(ROOT, 'products');
const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const ownerCache = new Map();

/** Nearest folder at or above `dir` (inside products/) that holds a manifest.ts. */
function ownerOf(file) {
  let dir = path.dirname(file);
  const seen = [];
  while (dir.startsWith(PRODUCTS) && dir !== PRODUCTS) {
    if (ownerCache.has(dir)) break;
    seen.push(dir);
    if (fs.existsSync(path.join(dir, 'manifest.ts'))) {
      seen.forEach((d) => ownerCache.set(d, dir));
      return dir;
    }
    dir = path.dirname(dir);
  }
  const found = ownerCache.get(dir) ?? null;
  seen.forEach((d) => ownerCache.set(d, found));
  return found;
}

function resolveTarget(fromFile, source) {
  let base;
  if (source.startsWith('.')) base = path.resolve(path.dirname(fromFile), source);
  else if (source.startsWith('@products/'))
    base = path.join(PRODUCTS, source.slice('@products/'.length));
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return base;
}

/** @type {import('eslint').Rule.RuleModule} */
export const productPublicApi = {
  meta: {
    type: 'problem',
    docs: { description: 'Apps and products use a product only through their index.ts' },
    messages: {
      private:
        'Import "{{source}}" reaches inside a product ({{target}}). Import from that product\'s index.ts instead (CLAUDE.md §2).',
    },
    schema: [],
  },
  create(context) {
    const file = path.resolve(context.filename);
    // Applies to products and apps (apps also use products only through index.ts).
    if (!file.startsWith(PRODUCTS) && !file.startsWith(path.join(ROOT, 'apps'))) return {};
    const own = file.startsWith(PRODUCTS) ? ownerOf(file) : null;

    function check(node) {
      const source = node.source?.value;
      if (typeof source !== 'string') return;
      const target = resolveTarget(file, source);
      if (!target || !target.startsWith(PRODUCTS)) return;
      const targetOwner = ownerOf(target);
      if (!targetOwner || targetOwner === own) return;
      const isIndex =
        /^index\.tsx?$/.test(path.basename(target)) && path.dirname(target) === targetOwner;
      if (!isIndex) {
        context.report({
          node: node.source,
          messageId: 'private',
          data: { source, target: path.relative(ROOT, targetOwner).replaceAll('\\', '/') },
        });
      }
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

export default { rules: { 'product-public-api': productPublicApi } };
