import { createHash } from "node:crypto"
import { getStore } from "@netlify/blobs"
import type { Config, Context } from "@netlify/functions"

const AKADEMISI = new Set(["a1", "a2", "a3", "a4", "a6", "a7", "a8", "a9", "a10"])
const HAKIM = new Set(["h1", "h2", "h3", "h4"])
const ID_RE = /^[a-zA-Z0-9-]{16,64}$/

type Vote = {
  nama: string
  usulan: string
  akademisi: string[]
  hakim: string[]
  ipHash: string
  createdAt: string
  at: string
}

const store = () => getStore({ name: "votes", consistency: "strong" })
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } })

/** Batas suara per alamat IP; bisa diubah lewat variabel MAX_PER_IP di Netlify. */
const maxPerIp = () => {
  const n = Number(Netlify.env.get("MAX_PER_IP") ?? "2")
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2
}

/** IP tidak disimpan mentah: hanya sidik jari SHA-256 bergaram, cukup untuk menghitung. */
const hashIp = (ip: string) =>
  createHash("sha256").update((Netlify.env.get("ADMIN_PASSWORD") ?? "salt") + "|" + ip).digest("hex")

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

async function ipUsed(ipHash: string) {
  const votes = await allVotes()
  return votes.filter(({ v }) => v.ipHash === ipHash).length
}

function checkPassword(given: unknown): boolean {
  const expected = Netlify.env.get("ADMIN_PASSWORD") ?? ""
  if (!expected || typeof given !== "string" || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

const clean = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "")

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

const publicVote = (v: Vote) => ({ akademisi: v.akademisi, hakim: v.hakim, at: v.at })

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const route = url.pathname.replace(/^\/api\/?/, "")

  try {
    if (route === "results" && req.method === "GET") {
      return json(await results())
    }

    // Status pengunjung: sudah memilih dari perangkat ini? sisa jatah jaringan berapa?
    if (route === "me" && req.method === "GET") {
      const id = url.searchParams.get("id") ?? ""
      const v = ID_RE.test(id) ? ((await store().get(id, { type: "json" })) as Vote | null) : null
      const used = await ipUsed(hashIp(context.ip ?? ""))
      return json({ vote: v ? publicVote(v) : null, ipUsed: used, ipMax: maxPerIp() })
    }

    if (route === "vote" && req.method === "POST") {
      const b = await readBody(req)
      const id = typeof b.voterId === "string" ? b.voterId : ""
      if (!ID_RE.test(id)) return json({ error: "Halaman perlu dimuat ulang. Silakan muat ulang lalu coba lagi." }, 400)
      const nama = clean(b.nama, 80)
      if (nama.length < 2) return json({ error: "Tulis nama Anda terlebih dahulu." }, 400)
      const akademisi = pick(b.akademisi, AKADEMISI, 3)
      const hakim = pick(b.hakim, HAKIM, 1)
      if (!akademisi || !hakim) return json({ error: "Pilihan tidak sesuai. Maksimal 3 akademisi dan 1 hakim." }, 400)
      if (akademisi.length + hakim.length === 0) return json({ error: "Pilih minimal satu nama." }, 400)

      const s = store()
      if (await s.get(id)) return json({ code: "already", error: "Suara dari perangkat ini sudah tercatat." }, 409)
      const ipHash = hashIp(context.ip ?? "")
      const used = await ipUsed(ipHash)
      if (used >= maxPerIp()) return json({ code: "ip_limit", ipUsed: used, ipMax: maxPerIp(), error: "Jatah suara dari jaringan ini sudah habis." }, 429)

      const now = new Date().toISOString()
      const vote: Vote = { nama, usulan: clean(b.usulan, 1500), akademisi, hakim, ipHash, createdAt: now, at: now }
      const { modified } = await s.setJSON(id, vote, { onlyIfNew: true })
      if (!modified) return json({ code: "already", error: "Suara dari perangkat ini sudah tercatat." }, 409)
      cache = null
      return json({ ok: true, ...(await results() as object) })
    }

    if (route === "admin" && req.method === "POST") {
      const b = await readBody(req)
      if (!checkPassword(b.password)) return json({ error: "Kata sandi salah." }, 401)
      const votes = await allVotes()
      votes.sort((a, z) => a.v.createdAt.localeCompare(z.v.createdAt))
      return json({
        ipMax: maxPerIp(),
        votes: votes.map(({ id, v }) => ({
          id, nama: v.nama ?? "", usulan: v.usulan, akademisi: v.akademisi, hakim: v.hakim, at: v.at,
          jaringan: (v.ipHash ?? "").slice(0, 6).toUpperCase(),
        })),
      })
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
