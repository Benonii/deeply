import { useEffect } from 'react';
import { anyApi } from 'convex/server';
import { usePathname } from '@farm.js/core/navigation';
import { requestSignIn } from '../account/host';
import { registerSimplifier, type SimplifyResult } from '../engine/simplify';
import { trackPageView } from '../lib/analytics';
import { redirectLegacyHashURL } from './legacyRedirect';
import { useConvexClient } from './convexClient';

function useReveal(dependency: unknown) {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    elements.forEach((element) => observer.observe(element));
    const mutationObserver = new MutationObserver(() =>
      document.querySelectorAll('.reveal:not(.in)').forEach((element) => observer.observe(element))
    );
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [dependency]);
}

export function AppEffects() {
  const route = usePathname();
  const client = useConvexClient();
  useReveal(route);
  useEffect(() => redirectLegacyHashURL(), []);
  useEffect(() => trackPageView(route), [route]);
  useEffect(() => {
    registerSimplifier(
      client ? (args) => client.action(anyApi.simplify.simplify, args) as Promise<SimplifyResult> : null,
      { onAuth: () => requestSignIn({ reason: 'Sign in to simplify explanations.' }) }
    );
  }, [client]);
  return null;
}
