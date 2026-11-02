const cache = new Map<string, unknown>();
const missing = new Set<string>();

const DATA_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`;

/**
 * 读取构建时生成的静态快照。
 * 不存在或无法解析时返回 undefined，调用方回退到实时 API。
 */
export async function readSnapshot<T>(relPath: string): Promise<T | undefined> {
  if (cache.has(relPath)) return cache.get(relPath) as T;
  if (missing.has(relPath)) return undefined;

  try {
    const res = await fetch(`${DATA_BASE}/${relPath}`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('json')) {
      missing.add(relPath);
      return undefined;
    }
    const data = (await res.json()) as T;
    cache.set(relPath, data);
    return data;
  } catch {
    missing.add(relPath);
    return undefined;
  }
}

export function hasSnapshot(relPath: string): boolean {
  return cache.has(relPath);
}
