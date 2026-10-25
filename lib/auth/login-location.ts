export interface LoginLocation {
  city: string | null;
  state: string | null;
  country: string | null;
}

function decodeLocationHeader(value: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return value.trim() || null;
  }
}

export function getLoginLocation(headers: Headers): LoginLocation {
  return {
    city: decodeLocationHeader(headers.get("x-vercel-ip-city")),
    state: decodeLocationHeader(headers.get("x-vercel-ip-country-region")),
    country: decodeLocationHeader(headers.get("x-vercel-ip-country")),
  };
}
