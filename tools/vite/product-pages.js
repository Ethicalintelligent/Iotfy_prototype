// Serves a product's own finished HTML pages exactly as they are (no Vite transform, no hashed
// names), so the pages can keep linking to each other by file name.
//
//   products/<path>/screens/pages/<file>  →  /product-pages/<path>/<file>
//
// Dev: answered before Vite's own HTML handling. Build: copied into the output at the same path.
// Used by GPS Vehicle Tracking (IT-0026: the approved EIT Smart Track pages).
import fs from 'node:fs';
import path from 'node:path';

const PREFIX = '/product-pages/';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

/** Every products/**\/screens/pages folder, as [product path, folder]. */
function pageFolders(products) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      const pages = path.join(full, 'screens', 'pages');
      if (fs.existsSync(pages)) out.push([path.relative(products, full).split(path.sep).join('/'), pages]);
      walk(full);
    }
  };
  walk(products);
  return out;
}

/** @param {string} root repository root */
export function productPages(root) {
  const products = path.join(root, 'products');
  return {
    name: 'iotify-product-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        const at = url.indexOf(PREFIX);
        if (at < 0) return next();
        const rest = url.slice(at + PREFIX.length);
        const slash = rest.lastIndexOf('/');
        if (slash < 0) return next();
        const file = path.join(products, rest.slice(0, slash), 'screens', 'pages', rest.slice(slash + 1));
        if (!file.startsWith(products) || !fs.existsSync(file) || !fs.statSync(file).isFile())
          return next();
        res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    },
    generateBundle() {
      for (const [rel, dir] of pageFolders(products))
        for (const name of fs.readdirSync(dir))
          this.emitFile({
            type: 'asset',
            fileName: `product-pages/${rel}/${name}`,
            source: fs.readFileSync(path.join(dir, name)),
          });
    },
  };
}
