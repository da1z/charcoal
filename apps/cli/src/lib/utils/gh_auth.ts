import { execFileSync } from 'child_process';

export const getGithubAuthorizationStatus = (): boolean => {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
