import { z } from "zod";

/** Checked charity facts. Do not invent values. */
export const verifiedSchema = z.object({
  scholarshipsAwarded: z.string(), boardMembers: z.string(), ein: z.string(), is501c3: z.boolean(),
  contactEmail: z.string().email(), applicationCycle: z.string(), applicationDeadline: z.string(),
});
