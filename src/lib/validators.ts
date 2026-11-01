import { z } from 'zod';
import { PAIRING_CODE_PATTERN } from '../../convex/lib/desktopPairing';

export const desktopSessionBodySchema = z.object({
  oneTimeToken: z.string().min(1).max(256)
});

export const desktopSignInBodySchema = z.object({
  pairingCode: z.string().regex(PAIRING_CODE_PATTERN)
});
