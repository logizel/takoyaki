import { getOAuthState, deleteOAuthState, setUser } from './database.js';

const DARK_THEME = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #0d1117; color: #c9d1d9;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; margin: 0;
    }
    .card {
      background: #161b22; padding: 48px; border-radius: 8px;
      border: 1px solid #30363d; text-align: center;
      max-width: 480px; width: 90%;
    }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #8b949e; line-height: 1.6; margin-bottom: 8px; }
    .success { color: #3fb950; }
    .error { color: #f85149; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    code { background: #0d1117; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
  </style>
`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function renderPage({ title, icon, iconTone = '', heading, paragraphs, footer = '' }) {
  const body = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n          ');
  return `<!DOCTYPE html>
      <html><head><title>${title}</title>${DARK_THEME}</head>
      <body>
        <div class="card">
          <div class="icon ${iconTone}">${icon}</div>
          <h1>${heading}</h1>
          ${body}
          ${footer}
        </div>
      </body></html>`;
}

function renderSetupPage(setupAction, installationId) {
  const safeInstallationId = installationId ? escapeHtml(installationId) : null;

  if (setupAction === 'request') {
    return renderPage({
      title: 'Installation Pending Approval',
      icon: '⏳',
      heading: 'Installation Request Submitted',
      paragraphs: [
        'An organization owner needs to approve the Takoyaki GitHub App installation.',
        'Once approved, events from the organization will start posting in Discord.',
        'You can close this tab and return to Discord.',
      ],
    });
  }

  return renderPage({
    title: 'GitHub App Installed',
    icon: '✅',
    iconTone: 'success',
    heading: 'GitHub App Installed',
    paragraphs: [
      'Takoyaki is installed and ready to receive GitHub events.',
      'You can close this tab and return to Discord.',
    ],
    footer: safeInstallationId
      ? `<p><small>Installation ID: <code>${safeInstallationId}</code></small></p>`
      : '',
  });
}

async function sendEphemeralFollowup(token, content) {
  try {
    await fetch(`https://discord.com/api/webhooks/${process.env.DISCORD_CLIENT_ID}/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        flags: 64,
      }),
    });
  } catch (err) {
    console.warn('Failed to send ephemeral followup:', err.message);
  }
}

export function setupCallbackHandler(req, res) {
  const installationId = typeof req.query.installation_id === 'string' ? req.query.installation_id : null;
  const setupAction = typeof req.query.setup_action === 'string' ? req.query.setup_action : null;
  console.log(
    `GitHub App setup redirect: setup_action=${setupAction || 'unknown'} installation_id=${installationId || 'unknown'}`
  );
  return res.send(renderSetupPage(setupAction, installationId));
}

export async function oauthCallbackHandler(req, res) {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const state = typeof req.query.state === 'string' ? req.query.state : null;
  const installationId = typeof req.query.installation_id === 'string' ? req.query.installation_id : null;
  const setupAction = typeof req.query.setup_action === 'string' ? req.query.setup_action : null;

  // GitHub also redirects App installations here when the App's Setup URL
  // points at this route. That is not an OAuth callback, so it has no code
  // (and may not have a state). Show the install result instead of an error.
  if (!code && (installationId || setupAction)) {
    console.log(
      `GitHub App install redirected to /auth/callback: setup_action=${setupAction || 'unknown'} installation_id=${installationId || 'unknown'}`
    );
    return res.send(renderSetupPage(setupAction, installationId));
  }

  const stateData = await getOAuthState(state);
  if (!stateData) {
    return res.send(renderPage({
      title: 'Authentication Expired',
      icon: '❌',
      iconTone: 'error',
      heading: 'Authentication Expired',
      paragraphs: [
        'The OAuth state has expired or is invalid.',
        'Please run <code>/github link</code> again in Discord.',
      ],
    }));
  }

  const token = stateData.interaction_token;

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || 'Failed to exchange code for token');

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();
    if (!userData.login) throw new Error('Failed to fetch GitHub user');

    const safeLogin = escapeHtml(userData.login);

    await setUser(stateData.discord_id, { githubLogin: userData.login, accessToken: tokenData.access_token });
    await deleteOAuthState(state);

    await sendEphemeralFollowup(token, `✅ **Takoyaki** successfully linked your Discord to GitHub account: **@${userData.login}**`);

    try {
      const client = global.discordClient;
      if (client) {
        const user = await client.users.fetch(stateData.discord_id);
        await user.send(`✅ **Takoyaki** has successfully linked your Discord to GitHub account: **@${userData.login}**`);
      }
    } catch (dmError) {
      console.warn(`Failed to send DM to ${stateData.discord_id}:`, dmError.message);
    }

    return res.send(renderPage({
      title: 'Success',
      icon: '✅',
      iconTone: 'success',
      heading: 'Successfully Linked!',
      paragraphs: [
        `Your Discord account has been linked to <strong>@${safeLogin}</strong>.`,
        'You can close this tab and return to Discord.',
      ],
    }));
  } catch (error) {
    console.error('OAuth callback error:', error);
    await sendEphemeralFollowup(token, `❌ **Takoyaki** failed to link your GitHub account. Please try \`/github link\` again.`);
    return res.send(renderPage({
      title: 'Authentication Failed',
      icon: '❌',
      iconTone: 'error',
      heading: 'Authentication Failed',
      paragraphs: [
        'Something went wrong during authentication.',
        'Please run <code>/github link</code> again in Discord.',
      ],
    }));
  }
}
