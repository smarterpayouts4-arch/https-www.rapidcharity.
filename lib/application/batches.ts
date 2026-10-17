export type BatchStatus = "open" | "closed" | "purged";

export type BatchRecord = {
  cycle: string;
  label: string;
  status: BatchStatus;
  closed_at: string | null;
  exported_at: string | null;
  purged_at: string | null;
  purged_submissions: number;
  purged_files: number;
};

export class BatchClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchClosedError";
  }
}

export function isCycleId(value: string): boolean {
  return /^(spring|fall)-\d{4}$/.test(value);
}

export function cycleLabel(cycle: string): string {
  const [season, year] = cycle.split("-");
  if (!season || !year) return cycle;
  return `${season.charAt(0).toUpperCase()}${season.slice(1)} ${year}`;
}

export function openBatch(cycle: string): BatchRecord {
  return {
    cycle,
    label: cycleLabel(cycle),
    status: "open",
    closed_at: null,
    exported_at: null,
    purged_at: null,
    purged_submissions: 0,
    purged_files: 0,
  };
}

export function closeBatchRecord(batch: BatchRecord, at: string): BatchRecord {
  if (batch.status === "purged") throw new Error("This batch was already archived and purged.");
  if (batch.status === "closed") return batch;
  return { ...batch, status: "closed", closed_at: at, exported_at: null };
}

export function markExportedRecord(batch: BatchRecord, at: string): BatchRecord {
  if (batch.status !== "closed") throw new Error("Close the batch before the final Excel export.");
  return { ...batch, exported_at: at };
}

export function invalidateExportRecord(batch: BatchRecord): BatchRecord {
  if (!batch.exported_at) return batch;
  return { ...batch, exported_at: null };
}

export function purgeAllowed(batch: BatchRecord): string | null {
  if (batch.status === "purged") return "This batch was already archived and purged.";
  if (batch.status !== "closed") return "Close the batch before archiving it.";
  if (!batch.exported_at) return "Download the final Excel export after closing the batch.";
  if (batch.closed_at && batch.exported_at < batch.closed_at) {
    return "Download the final Excel export after closing the batch.";
  }
  return null;
}

export function acceptanceError(batch: BatchRecord | undefined): string | null {
  if (!batch || batch.status === "open") return null;
  if (batch.status === "purged") {
    return `${batch.label} was archived and removed. Applications for this batch are closed.`;
  }
  return `${batch.label} is closed. New applications are not being accepted.`;
}
