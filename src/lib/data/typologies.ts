import { DEFAULT_TYPOLOGIES } from "./clients";
import type { CallRow } from "./reference";

/** Typologies of a given call, else of any call that lists them, else the usual ones. */
export function typologyOptions(calls: CallRow[], callId?: string | null) {
  const call = calls.find((c) => c.id === callId) ?? calls.find((c) => c.rules.typologies?.length);
  return call?.rules.typologies?.map((t) => t.name) ?? DEFAULT_TYPOLOGIES;
}
