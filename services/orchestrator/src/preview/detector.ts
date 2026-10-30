import type { ISandbox } from '../sandbox/types.js';
import type { DetectedProjectType } from './types.js';

export class ProjectTypeDetector {
  constructor(private sandbox: ISandbox) {}

  async detect(): Promise<DetectedProjectType> {
    // 1. Check for Node / JavaScript / TypeScript projects
    try {
      const pkgStr = await this.sandbox.readFile('package.json');
      const pkg = JSON.parse(pkgStr) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Expo / React Native
      if (deps['expo']) {
        return {
          mode: 'expo',
          framework: 'expo',
          defaultPort: 8081,
          startCommand: 'npx expo start --tunnel',
        };
      }

      // Next.js
      if (deps['next']) {
        return {
          mode: 'web',
          framework: 'nextjs',
          defaultPort: 3000,
          startCommand: 'npm run dev',
        };
      }

      // Vite
      if (deps['vite']) {
        return {
          mode: 'web',
          framework: 'vite',
          defaultPort: 5173,
          startCommand: 'npm run dev -- --host',
        };
      }

      // Express / Backend Node APIs
      if (deps['express'] || deps['fastify'] || deps['@nestjs/core'] || deps['koa']) {
        return {
          mode: 'api',
          framework: 'express',
          defaultPort: 3000,
          startCommand: pkg.scripts?.['start'] ? 'npm start' : 'npm run dev',
        };
      }

      // Create React App / Standard React
      if (deps['react-scripts']) {
        return {
          mode: 'web',
          framework: 'cra',
          defaultPort: 3000,
          startCommand: 'npm start',
        };
      }
    } catch {
      // package.json not found
    }

    // 2. Check for Flutter
    try {
      const pubspec = await this.sandbox.readFile('pubspec.yaml');
      if (pubspec.includes('flutter:')) {
        return {
          mode: 'web',
          framework: 'flutter',
          defaultPort: 8080,
          startCommand: 'flutter run -d web-server --web-port=8080',
        };
      }
    } catch {
      // pubspec.yaml not found
    }

    // 3. Check for Python FastAPI / Flask
    try {
      const mainPy = await this.sandbox.readFile('main.py').catch(() => '');
      const appPy = await this.sandbox.readFile('app.py').catch(() => '');
      const pyContent = mainPy + appPy;

      if (pyContent.includes('FastAPI')) {
        return {
          mode: 'api',
          framework: 'fastapi',
          defaultPort: 8000,
          startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        };
      }
    } catch {
      // Python files not found
    }

    // Default Fallback
    return {
      mode: 'web',
      framework: 'generic',
      defaultPort: 3000,
      startCommand: 'npm run dev',
    };
  }
}
