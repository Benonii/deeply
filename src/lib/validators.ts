import { z } from 'zod';

export const desktopSessionBodySchema = z.object({
  oneTimeToken: z.string().min(1).max(256)
});
