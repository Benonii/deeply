import { getPublicEnv } from '@farm.js/core/env';

const measurementID = getPublicEnv('FARM_GA_MEASUREMENT_ID') ?? '';

function pushToDataLayer() {
  window.dataLayer?.push(arguments);
}

function loadGoogleAnalytics() {
  if (!measurementID || window.gtag) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = pushToDataLayer;
  window.gtag('js', new Date());
  window.gtag('config', measurementID, { send_page_view: false });
}

export function trackPageView(path: string) {
  if (!measurementID) return;
  loadGoogleAnalytics();
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: `${location.origin}${path}`,
    page_title: document.title
  });
}
