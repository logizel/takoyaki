# Takoyaki — the poster site

A Japanese street-poster-inspired marketing site for the GitHub-to-Discord bot.
The landing page describes only the working slash commands and webhook alerts;
it does not read visitors’ GitHub data.

Built with Next.js App Router, TypeScript, Tailwind CSS, GSAP, Motion, Lenis,
and a procedural Three.js scene (added in later phases). Dependency versions
are pinned and managed with pnpm.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `NEXT_PUBLIC_DISCORD_INVITE_URL` in `.env.local` to the bot’s Discord
authorization URL. This website is separate from the bot backend.
