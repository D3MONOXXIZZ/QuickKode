export class DriveFilter {
  private customPatterns: string[] = [];

  static readonly DEFAULT_IGNORED: string[] = [
    'node_modules',
    '.git',
    '.next',
    '.expo',
    'dist',
    'build',
    'out',
    'coverage',
    '.venv',
    'venv',
    '__pycache__',
    '.turbo',
    '.cache',
    '.DS_Store',
    'Thumbs.db',
  ];

  constructor(customIgnoreContent?: string) {
    if (customIgnoreContent) {
      this.parseIgnoreContent(customIgnoreContent);
    }
  }

  parseIgnoreContent(content: string): void {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      this.customPatterns.push(trimmed);
    }
  }

  isIgnored(relativePath: string): boolean {
    const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = cleanPath.split('/');

    // Check directory segments against exact ignore words
    for (const segment of segments) {
      if (DriveFilter.DEFAULT_IGNORED.includes(segment)) {
        return true;
      }
    }

    // Check wildcards and extensions
    const fileName = segments[segments.length - 1] ?? '';
    if (fileName.endsWith('.log') || fileName.endsWith('.tmp') || fileName.startsWith('.env.')) {
      return true;
    }

    // Check custom patterns
    for (const pattern of this.customPatterns) {
      if (this.matchesPattern(cleanPath, fileName, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(fullPath: string, fileName: string, pattern: string): boolean {
    const cleanPattern = pattern.replace(/^\/+/, '').replace(/\/+$/, '');

    // Exact directory or file match
    if (fullPath === cleanPattern || fileName === cleanPattern) {
      return true;
    }

    // Simple wildcard match (e.g. *.tar.gz, test-*)
    if (cleanPattern.includes('*')) {
      const regexStr = '^' + cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexStr);
      return regex.test(fileName) || regex.test(fullPath);
    }

    return fullPath.startsWith(cleanPattern + '/') || fullPath.includes('/' + cleanPattern + '/');
  }
}
