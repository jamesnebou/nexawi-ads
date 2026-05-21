import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLpConfig } from '@/lib/lp-generator-defaults'
import GeneratedLandingPage from '@/components/lp-generator/GeneratedLandingPage'

export const dynamic = 'force-dynamic'

async function getPage(slug) {
  const { data, error } = await supabaseAdmin
    .from('lp_generator_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function generateMetadata({ params }) {
  const page = await getPage(params.slug)

  if (!page) {
    return {
      title: 'Landing page nao encontrada',
    }
  }

  const config = getLpConfig(page.config || {})

  return {
    title: config.seo.title || page.name,
    description: config.seo.description || '',
  }
}

export default async function PublicLpPage({ params }) {
  const page = await getPage(params.slug)

  if (!page) notFound()

  return (
    <GeneratedLandingPage
      page={page}
      config={getLpConfig(page.config || {})}
    />
  )
}
