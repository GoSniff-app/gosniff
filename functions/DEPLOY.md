# Deploying GoSniff Cloud Functions

⚠️ **Deploy from your own Terminal — not from Claude Code.**

Claude Code's environment cannot authenticate the Firebase CLI: `firebase login`
needs a browser, and the session is non-interactive, so every
`firebase deploy` from inside Claude Code fails with
`Authentication Error: Your credentials are no longer valid`.

## How to deploy

Open a real Terminal window (Terminal.app / iTerm) and run:

```bash
cd ~/Desktop/GoSniff

# Only needed if credentials have expired:
firebase login --reauth

# Deploy all functions (uses Node 22, which Firebase Functions requires):
PATH="/opt/homebrew/opt/node@22/bin:$PATH" firebase deploy --only functions
```

To deploy a single function instead of all of them:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" firebase deploy --only functions:sendPasswordResetEmail
```

## Notes

- All functions are deployed to region **us-central1**.
- The Node 22 PATH prefix matters: `functions/package.json` pins `"node": "22"`,
  and deploying with a different Node version can fail or produce warnings.
- After deploying, check logs with:
  `PATH="/opt/homebrew/opt/node@22/bin:$PATH" firebase functions:log`
