import { discordInviteUrl } from "@/lib/site-config";

const repo = "https://github.com/logizel/takoyaki";

export function Footer() {
  return (
    <footer className="site-footer">
      <span className="footer-watermark" data-footer-mark aria-hidden="true">たこやき</span>
      <div className="footer-inner">
        <h2 className="footer-headline">never miss a commit again</h2>
        <p className="footer-sub">pings, stats &amp; leaderboards — right in your Discord</p>

        <div className="footer-cta">
          <a className="footer-button" href={discordInviteUrl} target="_blank" rel="noreferrer">
            <span>Add Takoyaki to your server</span>
          </a>
          <span className="footer-status">
            <span className="footer-dot" aria-hidden="true" /> bot online
          </span>
        </div>

        <div className="footer-rule" />

        <div className="footer-columns">
          <div className="footer-col">
            <h3>Product</h3>
            <a className="footer-link footer-link--accent" href="#home"><span>Home</span></a>
            <a className="footer-link" href="#features"><span>Features</span></a>
            <a className="footer-link" href="#commands"><span>Commands</span></a>
          </div>
          <div className="footer-col">
            <h3>Open source</h3>
            <a className="footer-link" href={repo} target="_blank" rel="noreferrer"><span>GitHub repo</span></a>
            <a className="footer-link" href={repo} target="_blank" rel="noreferrer"><span>Star the repo</span></a>
          </div>
          <div className="footer-col">
            <h3>Connect</h3>
            <a className="footer-link" href={repo} target="_blank" rel="noreferrer"><span>GitHub</span></a>
            <a className="footer-link" href={discordInviteUrl} target="_blank" rel="noreferrer"><span>Add to Discord</span></a>
          </div>
        </div>

        <div className="footer-rule" />

        <div className="footer-bottom">
          <span className="footer-brand">
            <span className="footer-mark" aria-hidden="true">たこやき</span> takoyaki
          </span>
          <span className="footer-status">
            <span className="footer-dot" aria-hidden="true" /> bot online
          </span>
          <span className="footer-meta">pings in real time</span>
          <span className="footer-meta">© 2026</span>
          <span className="footer-meta">made with love, hot off the grill</span>
        </div>
      </div>
    </footer>
  );
}
