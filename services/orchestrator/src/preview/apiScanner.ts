import type { ISandbox } from '../sandbox/types.js';
import type { ApiEndpoint } from '@quickkode/shared';

export class ApiScanner {
  constructor(private sandbox: ISandbox) {}

  async scanEndpoints(): Promise<ApiEndpoint[]> {
    // 1. Check for openapi.json or swagger.json
    try {
      const openApiStr = await this.sandbox.readFile('openapi.json').catch(() => '');
      if (openApiStr) {
        const doc = JSON.parse(openApiStr) as { paths?: Record<string, Record<string, { summary?: string }>> };
        return this.parseOpenApiDoc(doc);
      }
    } catch {
      // openapi.json parse failed
    }

    // 2. Fallback: Parse common route patterns from source files
    const endpoints: ApiEndpoint[] = [];
    try {
      const tree = await this.sandbox.listDirectory('.');
      const filesToScan: string[] = [];

      const collectFiles = (node: typeof tree) => {
        if (!node.children) return;
        for (const child of node.children) {
          if (child.isDirectory && (child.name === 'src' || child.name === 'routes' || child.name === 'api')) {
            collectFiles(child);
          } else if (child.name.endsWith('.ts') || child.name.endsWith('.js') || child.name.endsWith('.py')) {
            filesToScan.push(child.path);
          }
        }
      };
      collectFiles(tree);

      for (const filePath of filesToScan.slice(0, 5)) {
        const content = await this.sandbox.readFile(filePath).catch(() => '');
        
        // Express routes: app.get('/users', ...), router.post('/checkout', ...)
        const expressMatches = content.matchAll(/(?:app|router)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/gi);
        for (const m of expressMatches) {
          const method = (m[1]?.toUpperCase() ?? 'GET') as ApiEndpoint['method'];
          const path = m[2] ?? '/';
          if (!endpoints.some((e) => e.path === path && e.method === method)) {
            endpoints.push({
              path,
              method,
              summary: `${method} ${path}`,
            });
          }
        }

        // FastAPI routes: @app.get('/items'), @router.post('/login')
        const pyMatches = content.matchAll(/@(?:app|router)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/gi);
        for (const m of pyMatches) {
          const method = (m[1]?.toUpperCase() ?? 'GET') as ApiEndpoint['method'];
          const path = m[2] ?? '/';
          if (!endpoints.some((e) => e.path === path && e.method === method)) {
            endpoints.push({
              path,
              method,
              summary: `${method} ${path}`,
            });
          }
        }
      }
    } catch {
      // scan error
    }

    if (endpoints.length === 0) {
      endpoints.push({
        path: '/health',
        method: 'GET',
        summary: 'Health check endpoint',
      });
    }

    return endpoints;
  }

  private parseOpenApiDoc(doc: { paths?: Record<string, Record<string, { summary?: string }>> }): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    const paths = doc.paths ?? {};

    for (const [routePath, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods)) {
        const upperMethod = method.toUpperCase() as ApiEndpoint['method'];
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)) {
          endpoints.push({
            path: routePath,
            method: upperMethod,
            summary: details?.summary || `${upperMethod} ${routePath}`,
          });
        }
      }
    }

    return endpoints;
  }
}
