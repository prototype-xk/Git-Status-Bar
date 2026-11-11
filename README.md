# Git Status Bar (GSB)

![GSB: the current branch and the last commit, as a small pill at the right of the bar](docs/preview.svg)

A mod for the Claude desktop app. It adds a small pill at the right of the bar above the prompt, so you always see where you are in git without asking:

- **The current branch**, in red on `main` or `master` and in blue everywhere else.
- **The last commit message** on that branch, shortened to fit.
- **How long ago** it was made (`4min`, `2h`, `3j`).

Hover the pill to read the full branch name and commit message.

It follows the working directory of your session and refreshes every 8 seconds, at the end of each turn, and right after any git command Claude runs. Outside a git repository the pill is simply not drawn. It sizes itself to its content and to the room left by whatever else is in the bar, and drops out when there is too little.

GSB sits on the same row as other bars drawn above the prompt (for example [CSB](https://github.com/prototype-xk/Claude-Status-Bar)): it takes what they drew and pushes it to the left. It only reads: it never changes a repository.

It needs `git` on your PATH, and a surface that can draw images (the desktop app). It does not draw in the terminal.

## Install

In a terminal session of Claude Code:

```
/plugin install gsb --marketplace prototype-xk/Git-Status-Bar
```

Answer `y` to add the marketplace, then pick a scope.

## License

MIT, see [LICENSE](LICENSE). Not affiliated with or endorsed by Anthropic.
