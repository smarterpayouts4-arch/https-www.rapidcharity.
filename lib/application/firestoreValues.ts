export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values: FirestoreValue[] } };

export function encodeFirestore(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeFirestore(item)) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) fields[key] = encodeFirestore(child);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function decodeFirestore(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value.mapValue.fields ?? {})) {
      out[key] = decodeFirestore(child);
    }
    return out;
  }
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((item) => decodeFirestore(item));
  return null;
}
