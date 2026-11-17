import { getStore } from "@netlify/blobs"
import type { Config, Context } from "@netlify/functions"

const AKADEMISI = new Set(["a1", "a2", "a3", "a4", "a6", "a7", "a8", "a9", "a10", "a11"])
const HAKIM = new Set(["h1", "h2", "h3", "h4"])
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/

type Vote = {
  nama: string
  jabatan: string
  usulan: string
  akademisi: string[]
  hakim: string[]
  createdAt: string
  at: string
}

const store = () => getStore({ name: "votes", consistency: "strong" })
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } })

async function allVotes(): Promise<{ id: string; v: Vote }[]> {
  const s = store()
  const { blobs } = await s.list()
  const rows = await Promise.all(
    blobs.map(async (b) => ({ id: b.key, v: (await s.get(b.key, { type: "json" })) as Vote | null })),
  )
  return rows.filter((r): r is { id: string; v: Vote } => r.v !== null)
}

let cache: { at: number; body: unknown } | null = null
async function results() {
  if (cache && Date.now() - cache.at < 2500) return cache.body
  const votes = await allVotes()
  const counts: Record<string, number> = {}
  for (const id of [...AKADEMISI, ...HAKIM]) counts[id] = 0
  for (const { v } of votes) for (const id of [...v.akademisi, ...v.hakim]) if (id in counts) counts[id]++
  const body = { total: votes.length, counts }
  cache = { at: Date.now(), body }
  return body
}

function checkPassword(given: unknown): boolean {
  const expected = Netlify.env.get("ADMIN_PASSWORD") ?? ""
  if (!expected || typeof given !== "string" || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

const clean = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "")

function pick(list: unknown, allowed: Set<string>, max: number): string[] | null {
  if (!Array.isArray(list)) return null
  const uniq = [...new Set(list.filter((x): x is string => typeof x === "string"))]
  if (uniq.length > max || uniq.some((x) => !allowed.has(x))) return null
  return uniq
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url)
  const route = url.pathname.replace(/^\/api\/?/, "")

  try {
    if (route === "results" && req.method === "GET") {
      return json(await results())
    }

    if (route === "myvote" && req.method === "GET") {
      const id = url.searchParams.get("id") ?? ""
      if (!ID_RE.test(id)) return json({ vote: null })
      const v = (await store().get(id, { type: "json" })) as Vote | null
      return json({ vote: v })
    }

    if (route === "vote" && req.method === "POST") {
      const b = await readBody(req)
      const id = typeof b.voterId === "string" ? b.voterId : ""
      if (!ID_RE.test(id)) return json({ error: "Identitas perangkat tidak valid. Muat ulang halaman." }, 400)
      const nama = clean(b.nama, 120)
      const jabatan = clean(b.jabatan, 160)
      const akademisi = pick(b.akademisi, AKADEMISI, 3)
      const hakim = pick(b.hakim, HAKIM, 1)
      if (!akademisi || !hakim) return json({ error: "Pilihan tidak valid: maksimal 3 akademisi dan 1 hakim." }, 400)
      if (akademisi.length + hakim.length === 0) return json({ error: "Pilih minimal satu nama." }, 400)
      const s = store()
      const prev = (await s.get(id, { type: "json" })) as Vote | null
      const now = new Date().toISOString()
      const vote: Vote = {
        nama, jabatan, usulan: clean(b.usulan, 1500), akademisi, hakim,
        createdAt: prev?.createdAt ?? now, at: now,
      }
      await s.setJSON(id, vote)
      cache = null
      return json({ ok: true, updated: !!prev, ...(await results() as object) })
    }

    if (route === "admin" && req.method === "POST") {
      const b = await readBody(req)
      if (!checkPassword(b.password)) return json({ error: "Kata sandi salah." }, 401)
      const votes = await allVotes()
      votes.sort((a, z) => a.v.createdAt.localeCompare(z.v.createdAt))
      return json({ votes: votes.map(({ id, v }) => ({ id, ...v })) })
    }

    if (route === "admin/delete" && req.method === "POST") {
      const b = await readBody(req)
      if (!checkPassword(b.password)) return json({ error: "Kata sandi salah." }, 401)
      const id = typeof b.voterId === "string" ? b.voterId : ""
      if (!ID_RE.test(id)) return json({ error: "Data tidak ditemukan." }, 400)
      await store().delete(id)
      cache = null
      return json({ ok: true })
    }

    return json({ error: "Tidak ditemukan." }, 404)
  } catch (e) {
    console.error(e)
    return json({ error: "Server sedang bermasalah. Coba lagi sebentar." }, 500)
  }
}

export const config: Config = { path: "/api/*" }
