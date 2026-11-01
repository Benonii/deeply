import { createEndpoint } from '@farm.js/core/api';
import { isDesktop, signInDesktop } from '@/desktop/desktopAuth';
import { deriveConvexSiteURL, readConvexURL } from '@/lib/deployment';
import { desktopSessionBodySchema } from '@/lib/validators';

export const POST = createEndpoint({ body: desktopSessionBodySchema }, async ({ body }) => {
  if (!isDesktop()) return Response.json({ data: null, message: 'Not found' }, { status: 404 });
  const isSignedIn = await signInDesktop(body.oneTimeToken, deriveConvexSiteURL(readConvexURL()));
  if (!isSignedIn) {
    return Response.json({ data: null, message: 'That sign-in expired. Start again from the app.' }, { status: 401 });
  }
  return Response.json({ data: { isSignedIn }, message: 'Signed in' });
});
