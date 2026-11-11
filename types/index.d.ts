export type GitInfo = { branch: string; subject: string; when: string }

declare module 'claude-code' {
  interface PluginState {
    'gsb': { git: GitInfo | null }
  }
}
