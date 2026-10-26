import "server-only";

import { unstable_cache } from "next/cache";

export interface KenyaBank {
  name: string;
  code: string;
  codes: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function loadKenyanBanks(): Promise<KenyaBank[]> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.paystack.co/bank?country=kenya&perPage=100",
    {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(10_000),
    },
  );

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Paystack returned invalid bank directory JSON.");
  }

  if (
    !response.ok ||
    !isRecord(body) ||
    body.status !== true ||
    !Array.isArray(body.data)
  ) {
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : "Invalid Paystack bank directory response.";
    throw new Error(message);
  }

  const uniqueBanks = new Map<
    string,
    { name: string; codes: Set<string>; preferredCode: string; active: boolean }
  >();
  for (const bank of body.data) {
    if (
      !isRecord(bank) ||
      typeof bank.name !== "string" ||
      typeof bank.code !== "string" ||
      bank.code.length === 0
    ) {
      continue;
    }

    const name = bank.name.trim();
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!name || !key) continue;

    if (bank.is_deleted === true) continue;

    const current = uniqueBanks.get(key);
    const isActive = bank.active !== false;
    if (!current) {
      uniqueBanks.set(key, {
        name,
        codes: new Set([bank.code]),
        preferredCode: bank.code,
        active: isActive,
      });
      continue;
    }

    current.codes.add(bank.code);
    if (isActive && !current.active) {
      current.name = name;
      current.preferredCode = bank.code;
      current.active = true;
    }
  }

  const banks = [...uniqueBanks.values()]
    .map(({ name, codes, preferredCode }) => ({
      name,
      code: preferredCode,
      codes: [...codes],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (banks.length === 0) {
    throw new Error("Paystack returned no Kenyan bank entries.");
  }
  return banks;
}

export const getKenyanBanks = unstable_cache(loadKenyanBanks, ["kenyan-banks"], {
  revalidate: 60 * 60 * 24 * 90,
});
