import Script from 'next/script'

const META_PIXEL_ID_PATTERN = /^\d{5,30}$/
const GA4_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,20}$/

function safeIdentifier(value, pattern) {
  const normalized = String(value || '').trim().toUpperCase()
  return pattern.test(normalized) ? normalized : ''
}

export default function LpTrackingScripts({ config }) {
  const metaPixelId = safeIdentifier(config?.integracoes?.metaPixelId, META_PIXEL_ID_PATTERN)
  const ga4MeasurementId = safeIdentifier(config?.integracoes?.ga4MeasurementId, GA4_ID_PATTERN)
  const googleTagManagerId = safeIdentifier(config?.integracoes?.googleTagManagerId, GTM_ID_PATTERN)

  return (
    <>
      {ga4MeasurementId ? (
        <>
          <Script
            id={`lp-ga4-library-${ga4MeasurementId}`}
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id={`lp-ga4-config-${ga4MeasurementId}`} strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              window.gtag('js', new Date());
              window.gtag('config', '${ga4MeasurementId}');
            `}
          </Script>
        </>
      ) : null}

      {googleTagManagerId ? (
        <Script id={`lp-gtm-${googleTagManagerId}`} strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${googleTagManagerId}');
          `}
        </Script>
      ) : null}

      {metaPixelId ? (
        <Script id={`lp-meta-pixel-${metaPixelId}`} strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){
              if(f.fbq)return;
              n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
              t=b.createElement(e);t.async=!0;t.src=v;
              s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
            }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  )
}
