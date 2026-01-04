import tmp from 'tmp';
import { emptyDirSync } from './fs_utils';

export function performInTmpDir<T>(handler: (dirPath: string) => T): T {
  const tmpDir = tmp.dirSync();
  const result: T = handler(tmpDir.name);
  emptyDirSync(tmpDir.name);
  tmpDir.removeCallback();
  return result;
}
