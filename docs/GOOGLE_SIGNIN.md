# Sign in with Google

The "Continue with Google" button only appears when the server has both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`. Without them the site behaves exactly as before.

## How it behaves

- New Google user: an account is created (role `USER`, or `PHOTOGRAPHER` when they came from
  "Sign up" and picked photographer; the choice travels in the short-lived `cma-signup-role` cookie),
  email marked verified, no password.
- Existing account with the same email: Google is attached to it, role and password are untouched.
- Existing account whose email was **never verified**: it is verified and its password is removed
  (someone could have registered the address with a password before the real owner showed up).
  The owner can set a new password through "Forgot password".
- Google must report `email_verified: true`, otherwise sign-in is refused (`/login?error=GoogleUnverified`).
- Accounts without a password: no password prompts in Settings. Switching photographer/athlete only needs the
  signed-in session; deleting the account asks to type the account email.
- Rules live in `src/lib/google-auth.ts` (unit-tested), wiring in `src/lib/auth.ts` (`signIn` and `jwt` callbacks).

## One-time setup (Google Cloud Console)

1. https://console.cloud.google.com/ -> create a project (e.g. "CatchMyAction").
2. APIs & Services -> OAuth consent screen (Google Auth Platform -> Branding):
   - User type: External. App name: CatchMyAction. Support email: yours.
   - Authorized domain: `catchmyactions.com`. Add links to `/privacy` and `/terms`.
   - Scopes: only `openid`, `email`, `profile` (no verification review needed for these).
   - Publishing status: **In production** (in "Testing" only listed test users can sign in and sessions expire after 7 days).
3. Credentials -> Create credentials -> OAuth client ID -> Web application:
   - Authorized JavaScript origins: `https://catchmyactions.com`
   - Authorized redirect URIs: `https://catchmyactions.com/api/auth/callback/google`
   - (Optional, for local testing) `http://localhost:3000` and `http://localhost:3000/api/auth/callback/google`
4. Copy the client ID and secret.

## Put the keys on the server

Do this yourself; do not paste the secret into chat or commit it. On the EC2 host:

```bash
ssh -i ~/.ssh/kiro-cma-deploy ec2-user@52.39.186.224
cd ~/app
cp .env.production .env.production.bak.$(date +%Y%m%d%H%M%S)
read -r -p "Client ID: " GID
read -r -s -p "Client secret: " GSEC; echo
printf 'GOOGLE_CLIENT_ID=%s\nGOOGLE_CLIENT_SECRET=%s\n' "$GID" "$GSEC" >> .env.production
unset GID GSEC
chmod 600 .env.production
```

`.env.production` is passed to the container through `env_file`, so no compose change is needed. The container must be
**recreated** to read new variables (a plain `docker restart` keeps the old environment):

```bash
docker compose -f docker-compose.production.yml up -d app
```

`NEXTAUTH_URL` must be `https://catchmyactions.com` (check with `grep ^NEXTAUTH_URL .env.production`), otherwise Google
returns `redirect_uri_mismatch`.

## Checks after enabling

- `https://catchmyactions.com/api/auth/providers` lists `google`.
- Sign in with a Google account that has no CatchMyAction account: lands signed in, verified, role athlete.
- Sign in with a Google account whose email already has a password account: same account, no duplicate.
- Settings for a Google-only account: no "Change Password"; delete asks for the email.
