import {
  saveSubscription,
  upsertRepository,
  upsertUser
} from "../db/queries";
import { repoInputToFullName } from "../utils/validation";

export async function subscribeUserToRepo(
  telegramId: number,
  repoInput: string
) {
  const repoFullName = repoInputToFullName(repoInput);

  const userId = await upsertUser(telegramId);
  const repoId = await upsertRepository(repoFullName);
  const subscription = await saveSubscription(userId, repoId, {});

  console.log(`User ${telegramId} subscribed to ${repoFullName}`);

  return { repoFullName, subscription };
}
