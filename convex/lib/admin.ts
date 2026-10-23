import type { GenericCtx } from '@convex-dev/better-auth';
import { authComponent } from '../auth';

import type { DataModel } from '../_generated/dataModel';

function readAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && readAdminEmails().includes(email.toLowerCase());
}

export async function isAdminUser(context: GenericCtx<DataModel>, userID: string): Promise<boolean> {
  const user = await authComponent.getAnyUserById(context, userID);
  return isAdminEmail(user?.email);
}
