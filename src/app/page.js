import { headers } from 'next/headers'
import LandingPageRoot from '@/components/LandingPageRoot'
import GeneratedLandingPage from '@/components/lp-generator/GeneratedLandingPage'
import LpTrackingScripts from '@/components/lp-generator/LpTrackingScripts'
import { getLpByCustomDomain } from '@/lib/lp-custom-domain'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const requestHeaders = await headers()
  const host = requestHeaders.get('host') || ''
  let customDomainPage = null

  try {
    customDomainPage = await getLpByCustomDomain(host)
  } catch (error) {
    console.error('Erro ao resolver dominio personalizado de LP:', error)
  }

  if (customDomainPage) {
    return (
      <>
        <LpTrackingScripts config={customDomainPage.config} />
        <GeneratedLandingPage page={customDomainPage} config={customDomainPage.config} />
      </>
    )
  }

  return <LandingPageRoot />
}
