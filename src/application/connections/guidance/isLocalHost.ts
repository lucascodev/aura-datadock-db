const LOCAL_NAMES = new Set(['localhost', '::1', '[::1]', '0.0.0.0']);
const LOOPBACK_IPV4 = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function isLocalHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return LOCAL_NAMES.has(normalized) || LOOPBACK_IPV4.test(normalized);
}
