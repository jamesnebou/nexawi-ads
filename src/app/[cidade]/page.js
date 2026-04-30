import { notFound } from 'next/navigation'
import LandingPageRoot from '@/components/LandingPageRoot'
import { getLandingCityRecordBySlug } from '@/lib/landing-page-config'

export default async function CidadePage({ params }) {
  const resolvedParams = await params
  const cidade = decodeURIComponent(resolvedParams?.cidade || '')
    .trim()
    .toLowerCase()

  const cityRecord = await getLandingCityRecordBySlug(cidade)

  if (!cityRecord) {
    notFound()
  }

  return <LandingPageRoot />
}