import { enqueueEmail, type EnqueueEmailArgs, type EnqueueEmailResult } from "./enqueue";

export async function notifyEmail(args: EnqueueEmailArgs): Promise<EnqueueEmailResult> {
  try {
    return await enqueueEmail(args);
  } catch (error) {
    console.error("[email] queue delivery failed:", error);
    return { id: "" };
  }
}
