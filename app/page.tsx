import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginButton } from '@/components/login-button'

type GenericRow = Record<string, unknown>

type TopCaption = {
  captionId: string
  content: string
  imageId: string
  imageUrl: string
  votes: number
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function getValue(row: GenericRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) return row[key]
  }
  return undefined
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

async function signOut() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  gradient
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <article className={`rounded-2xl border border-white/40 ${gradient} p-5 shadow-lg backdrop-blur`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <span className="rounded-xl bg-white/80 p-2 text-slate-700 shadow">{icon}</span>
      </div>
      <p className="text-4xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </article>
  )
}

function SimpleBarChart({ data }: { data: TopCaption[] }) {
  const maxVotes = Math.max(...data.map((item) => item.votes), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Top 5 Most Upvoted Captions</h3>
        <p className="text-sm text-slate-500">Vote count by caption text (truncated)</p>
      </div>

      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">No caption vote data available yet.</p>
        ) : (
          data.map((item) => (
            <div key={item.captionId} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{truncate(item.content || 'Untitled caption', 42)}</p>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    style={{ width: `${(item.votes / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">{item.votes}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="mx-auto mt-16 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-bold">Sign In Required</h1>
        <p className="mt-2 text-slate-600">Please continue with Google to access the admin dashboard.</p>
        <div className="mt-6 flex justify-center">
          <LoginButton />
        </div>
      </main>
    )
  }

  const [profilesRes, imagesRes, captionsRes, votesRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('images').select('*'),
    supabase.from('captions').select('*'),
    supabase.from('caption_votes').select('*')
  ])

  const profileRows = (profilesRes.data ?? []) as GenericRow[]
  const imageRows = (imagesRes.data ?? []) as GenericRow[]
  const captionRows = (captionsRes.data ?? []) as GenericRow[]
  const voteRows = (votesRes.data ?? []) as GenericRow[]

  const imageUrlById = imageRows.reduce<Record<string, string>>((acc, image) => {
    const id = asText(getValue(image, ['id', 'image_id']))
    const url = asText(getValue(image, ['url', 'image_url']))
    if (id) acc[id] = url
    return acc
  }, {})

  const totalUsers = profileRows.length
  const totalImages = imageRows.length
  const averageCaptionsPerImage = totalImages > 0 ? captionRows.length / totalImages : 0

  const voteCountByCaptionId = voteRows.reduce<Record<string, number>>((acc, vote) => {
    const captionId = asText(getValue(vote, ['caption_id', 'captionId', 'captionid']))
    if (!captionId) return acc
    acc[captionId] = (acc[captionId] ?? 0) + 1
    return acc
  }, {})

  const topCaptions: TopCaption[] = captionRows
    .map((caption) => {
      const captionId = asText(getValue(caption, ['id', 'caption_id', 'captionId']))
      const content = asText(getValue(caption, ['content', 'caption', 'text', 'body']))
      const imageId = asText(getValue(caption, ['image_id', 'imageId']))

      return {
        captionId,
        content,
        imageId,
        imageUrl: imageUrlById[imageId] ?? '',
        votes: voteCountByCaptionId[captionId] ?? 0
      }
    })
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5)

  const errors = [
    profilesRes.error && `profiles: ${profilesRes.error.message}`,
    imagesRes.error && `images: ${imagesRes.error.message}`,
    captionsRes.error && `captions: ${captionsRes.error.message}`,
    votesRes.error && `caption_votes: ${votesRes.error.message}`
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-[95%] max-w-7xl items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">The Humor Project Admin</h1>
            <p className="text-sm text-slate-600">Welcome back, {user.email ?? 'Admin'} 👋</p>
          </div>
          <form action={signOut}>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700" type="submit">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-[95%] max-w-7xl py-8">
        {errors.length > 0 && (
          <section className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800">
            <h2 className="text-lg font-semibold">Data diagnostics</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MetricCard
            title="Total Users"
            value={String(totalUsers)}
            subtitle="Profiles in the workspace"
            gradient="bg-gradient-to-br from-indigo-100 to-blue-100"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
            }
          />
          <MetricCard
            title="Total Images"
            value={String(totalImages)}
            subtitle="Assets uploaded"
            gradient="bg-gradient-to-br from-sky-100 to-cyan-100"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            }
          />
          <MetricCard
            title="Avg Captions / Image"
            value={averageCaptionsPerImage.toFixed(2)}
            subtitle="Caption density score"
            gradient="bg-gradient-to-br from-violet-100 to-fuchsia-100"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            }
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <SimpleBarChart data={topCaptions} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Top Captions Gallery</h3>
            <p className="mb-4 text-sm text-slate-500">Best performing captions with image previews</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
              {topCaptions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No top captions yet. Votes will appear here automatically.</p>
              ) : (
                topCaptions.map((caption) => (
                  <article key={caption.captionId} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="absolute right-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow">
                      {caption.votes} votes
                    </div>

                    {caption.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="Caption related" className="h-40 w-full object-cover" src={caption.imageUrl} />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500">
                        No image preview
                      </div>
                    )}

                    <div className="p-4">
                      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Caption</p>
                      <p className="line-clamp-3 text-sm font-bold text-slate-900">{caption.content || 'Untitled caption'}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
