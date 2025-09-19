const FREEWORK_HOST_SUFFIX = "free-work.com";

export function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch (error) {
    return null;
  }
}

export function isFreeWorkDomain(url: URL): boolean {
  return url.hostname.endsWith(FREEWORK_HOST_SUFFIX);
}

export function toAbsoluteUrl(href: string, base: URL): string | null {
  try {
    return new URL(href, base).toString();
  } catch (error) {
    return null;
  }
}
