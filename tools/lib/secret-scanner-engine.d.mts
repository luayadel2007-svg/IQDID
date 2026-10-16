// Types for the dependency-free scanner engine (consumed by tests only).
export function isPng(b: Buffer): boolean;
export function inspectPng(path: string, b: Buffer, maxOutputLength: number, find: (rule: string, line: number) => void): void;
export function scanRepository(options: { repo: string; mode?: 'staged' | 'all-index'; base?: string; paths?: string[] }): {
  schema: 1; status: 'PASS' | 'FAIL' | 'BLOCKED'; exit_code: 0 | 1 | 2; mode: string; scanned_files: number;
  findings: Array<{ path: string; rule: string; line: number }>; errors: Array<{ path?: string; code: string }>;
};
