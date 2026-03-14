interface OpenPanelAnalyticsProps {
  clientId: string
  nonce?: string
}

const OPENPANEL_QUEUE_SNIPPET =
  'window.op=window.op||function(){var n=[];return new Proxy(function(){arguments.length&&n.push([].slice.call(arguments))},{get:function(t,r){return"q"===r?n:function(){n.push([r].concat([].slice.call(arguments)))}},has:function(t,r){return"q"===r}})}();'

/**
 * Server-rendered OpenPanel Analytics component that uses a proxy route to
 * avoid ad blockers.  Renders raw {@link HTMLScriptElement} tags with the CSP
 * nonce so the browser allows the inline init code on first paint.
 *
 * @param props - Component properties
 * @param props.clientId - OpenPanel client ID from the dashboard
 * @param props.nonce - CSP nonce for inline scripts
 * @returns Script elements for OpenPanel init and SDK, or null if no clientId
 */
export function OpenPanelAnalyticsComponent({ clientId, nonce }: OpenPanelAnalyticsProps) {
  if (!clientId) {
    return null
  }

  const initOptions = JSON.stringify({
    clientId,
    trackScreenViews: true,
    trackOutgoingLinks: true,
    trackAttributes: true,
    apiUrl: '/api/op',
    sdk: 'nextjs',
    sdkVersion: '1.3.0'
  })

  const globalProps = JSON.stringify({
    environment: process.env.NODE_ENV ?? 'development'
  })

  const initScript = [
    OPENPANEL_QUEUE_SNIPPET,
    `window.op('init',${initOptions});`,
    `window.op('setGlobalProperties',${globalProps});`
  ].join('\n')

  return (
    <>
      <script
        nonce={nonce}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: inline init required for CSP-nonce'd OpenPanel bootstrap; content is fully static
        dangerouslySetInnerHTML={{ __html: initScript }}
      />
      <script src="/api/op/op1.js" async defer nonce={nonce} />
    </>
  )
}
