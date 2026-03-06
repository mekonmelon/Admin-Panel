import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function createImage(formData: FormData) {
  'use server'
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const url = String(formData.get('url') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!url) {
    return
  }

  await supabase.from('images').insert({
    url,
    description,
    user_id: user.id
  })

  revalidatePath('/')
}

async function updateImageDescription(formData: FormData) {
  'use server'
  const supabase = createClient()
  const id = String(formData.get('id') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()

  if (!id) {
    return
  }

  await supabase.from('images').update({ description }).eq('id', id)
  revalidatePath('/')
}

async function deleteImage(formData: FormData) {
  'use server'
  const supabase = createClient()
  const id = String(formData.get('id') ?? '').trim()

  if (!id) {
    return
  }

  await supabase.from('images').delete().eq('id', id)
  revalidatePath('/')
}

async function signOut() {
  'use server'
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  const { data: images } = await supabase.from('images').select('*').order('created_at', { ascending: false })

  const { data: captions } = await supabase
    .from('captions')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <h1>The Humor Project Admin</h1>
          <p>Signed in as {user?.email ?? 'Unknown user'}.</p>
        </div>
        <form action={signOut}>
          <button style={{ background: '#ef4444', color: '#fff' }} type="submit">
            Sign out
          </button>
        </form>
      </div>

      <section id="users" style={{ marginTop: '2rem' }}>
        <h2>Users (profiles)</h2>
        <p>Read-only view of all rows in the profiles table.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Email</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Is Superadmin</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={String(profile.id)}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(profile.id ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(profile.email ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                    {profile.is_superadmin ? 'true' : 'false'}
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>
                    {String(profile.created_at ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="images" style={{ marginTop: '2rem' }}>
        <h2>Images</h2>
        <p>View all images, add a new image URL, edit descriptions, and delete images.</p>

        <form action={createImage} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <input name="url" placeholder="https://example.com/image.jpg" required style={{ padding: '0.7rem' }} />
          <textarea name="description" placeholder="Image description" rows={3} style={{ padding: '0.7rem' }} />
          <button style={{ background: '#111', color: '#fff', width: 'fit-content' }} type="submit">
            Upload New Image
          </button>
        </form>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {(images ?? []).map((image) => (
            <article key={String(image.id)} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#444' }}>Image ID: {String(image.id ?? '')}</p>
              <p style={{ margin: '0 0 0.5rem' }}>
                URL:{' '}
                <a href={String(image.url ?? '')} target="_blank" rel="noreferrer">
                  {String(image.url ?? '')}
                </a>
              </p>

              <form action={updateImageDescription} style={{ display: 'grid', gap: '0.5rem' }}>
                <input type="hidden" name="id" value={String(image.id ?? '')} />
                <textarea
                  name="description"
                  defaultValue={String(image.description ?? '')}
                  rows={3}
                  style={{ padding: '0.6rem' }}
                />
                <button style={{ background: '#2563eb', color: '#fff', width: 'fit-content' }} type="submit">
                  Save Description
                </button>
              </form>

              <form action={deleteImage} style={{ marginTop: '0.75rem' }}>
                <input type="hidden" name="id" value={String(image.id ?? '')} />
                <button style={{ background: '#b91c1c', color: '#fff' }} type="submit">
                  Delete Image
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section id="captions" style={{ marginTop: '2rem' }}>
        <h2>Captions</h2>
        <p>Read-only list of all captions in the captions table.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Image ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Author ID</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Content</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '0.5rem' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {(captions ?? []).map((caption) => (
                <tr key={String(caption.id)}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(caption.id ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(caption.image_id ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(caption.author_id ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(caption.content ?? '')}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '0.5rem' }}>{String(caption.created_at ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
