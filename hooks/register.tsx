import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GitInfo } from '../types'

const git = atom({ plugin: 'gsb', key: 'git' } as const, null, { shape: 'git-1' })

let isReading = false

// The current branch and the last commit, read from the session's working directory.
async function readGit($: EngineInterface) {
  if (isReading) return
  isReading = true
  try {
    const r = await $.process.run(['git', 'log', '-1', '--pretty=format:%D%x09%s%x09%ar'], { timeoutMs: 8000 })
    let next: GitInfo | null = null
    if (r.exitCode === 0) {
      const [dec = '', subject = '', when = ''] = r.stdout.split('\t')
      const m = /HEAD -> ([^,]+)/.exec(dec)
      next = { branch: m ? m[1].trim() : '(HEAD détachée)', subject, when }
    }
    const cur = await read($, git)
    if (cur?.branch !== next?.branch || cur?.subject !== next?.subject || cur?.when !== next?.when) await update($, git, () => next)
  } catch {
    // git missing: keep what is shown
  } finally {
    isReading = false
  }
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const trunc = (v: string, n: number) => (v.length > n ? v.slice(0, Math.max(1, n - 1)) + '…' : v)
const shortAgo = (w: string) =>
  w
    .replace(/ seconds? ago/, 's')
    .replace(/ minutes? ago/, 'min')
    .replace(/ hours? ago/, 'h')
    .replace(/ days? ago/, 'j')
    .replace(/ weeks? ago/, 'sem')
    .replace(/ months? ago/, ' mois')
    .replace(/ years? ago/, ' an')

// A dark pill sized to its content: branch icon, branch name (red on main, blue elsewhere), last commit message, how long ago.
const pill = (g: GitInfo, maxW: number): { svg: string; w: number } => {
  const main = /^(main|master)$/.test(g.branch)
  const nameColor = main ? '#ef4444' : '#60a5fa'
  const when = shortAgo(g.when)
  const name = trunc(g.branch, 18)
  const nameW = name.length * 7
  const timeW = when.length * 6
  const fixed = 34 + nameW + 12 + timeW + 14 // icon, name, gap, time, padding
  const subMax = Math.max(0, Math.min(28, Math.floor((maxW - fixed - 12) / 6.4)))
  const sub = subMax >= 6 ? trunc(g.subject, subMax) : ''
  const w = Math.round(fixed + (sub ? 12 + sub.length * 6.4 : 0))
  const xSub = 34 + nameW + 12
  const icon = `fill="none" stroke="#f3f1ea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 34" width="${w}" height="34">` +
    `<rect x="0" y="1" width="${w}" height="32" rx="16" fill="#1f1e1d"/>` +
    `<circle cx="16" cy="11" r="2.2" ${icon}/><circle cx="16" cy="23" r="2.2" ${icon}/><circle cx="23" cy="15" r="2.2" ${icon}/><path d="M16 13.2 V20.8 M23 17.2 C23 20.5 16 18.5 16 20.8" ${icon}/>` +
    `<text x="34" y="22" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${nameColor}"><title>${esc(g.branch)}</title>${esc(name)}</text>` +
    (sub ? `<text x="${xSub.toFixed(1)}" y="22" font-family="system-ui,sans-serif" font-size="12.5" fill="#f3f1ea" fill-opacity="0.78"><title>${esc(g.subject)}</title>${esc(sub)}</text>` : '') +
    `<text x="${w - 14}" y="22" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="#f3f1ea" fill-opacity="0.55">${esc(when)}</text>` +
    `</svg>`
  return { svg, w }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    void readGit($)
    $.clock.every(8000, () => {
      void readGit($)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => (void readGit($), next(e)))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const cmd = (e as { command?: unknown }).command
    if ((e.tool === 'Bash' || e.tool === 'PowerShell') && typeof cmd === 'string' && /\bgit\b/.test(cmd)) void readGit($)
    return ran
  }).catch(($, e, next) => next(e))

  // On the same row as whatever band is already drawn (the csb bar, say), pushed to the right; alone, on the right of its own row.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey || e.surface === 'terminal') return below
    const g = await read($, git)
    if (g === null) return below

    const { Box, Svg } = $.ui.resolve(e) as unknown as Record<'Box' | 'Svg', (p: any) => unknown>
    const cols = e.viewport?.columns
    const reserved = below ? 470 : 0 // about what a band drawn by another mod takes on the left
    const gw = Math.min(340, cols ? Math.round(cols * 9.8) - reserved - 24 : 340)
    if (gw < 130) return below
    const pl = pill(g, gw)
    const el = <Svg source={pl.svg} alt={`Branche ${g.branch}, dernier commit : ${g.subject}, ${g.when}`} width={pl.w} height={34} />

    return below ? (
      <Box width="100%" justifyContent="space-between">
        <Box>{below}</Box>
        {el}
      </Box>
    ) : (
      <Box width="100%" justifyContent="flex-end">
        {el}
      </Box>
    )
  })
}
