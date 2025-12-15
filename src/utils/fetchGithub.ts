import { config } from '../config';

export async function fetchGithub(url: string, options: Record<string, any> = {}) {
  const headers = {
    'Authorization': `token ${config.GITHUB_TOKEN}`,
    'User-Agent': 'repopulse-bot',
    ...options.headers
  };
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`[GitHub API] ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}
