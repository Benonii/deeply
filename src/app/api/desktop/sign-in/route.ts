import { createEndpoint } from '@farm.js/core/api';
import { isDesktop } from '@/desktop/desktopAuth';
import { openInSystemBrowser } from '@/desktop/openBrowser';
import { buildConnectURL } from '@/lib/desktopPairing';
import { desktopSignInBodySchema } from '@/lib/validators';

export const POST = createEndpoint({ body: desktopSignInBodySchema }, async ({ body }) => {
  if (!isDesktop()) return Response.json({ data: null, message: 'Not found' }, { status: 404 });
  const isOpened = await openInSystemBrowser(buildConnectURL(body.pairingCode));
  if (!isOpened) {
    return Response.json({ data: { isOpened }, message: 'Could not open your browser.' }, { status: 500 });
  }
  return Response.json({ data: { isOpened }, message: 'Opened your browser' });
});
