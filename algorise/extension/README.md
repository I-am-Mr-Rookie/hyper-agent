# AlgoRise Import Companion

Chromium MV3 Sprint Zero extension for consent-first import of a signed-in user's own submissions and source code.

## Local installation

1. Start AlgoRise at `http://localhost:3000`.
2. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
3. Select this `extension` directory.
4. In AlgoRise settings, create a one-time pairing code; paste it into the popup.
5. Open Codeforces login from the popup and sign in manually.
6. Confirm the detected handle, read and check the consent box, then click **Sync now**.

## Frozen privacy conduct

- No credentials are read, stored, autofilled, or submitted.
- Login is manual on the platform's own page.
- Collection starts only after per-platform consent and a user click.
- Only the confirmed signed-in account is accepted; handle mismatch fails closed.
- Requests are single-concurrency and throttled.
- Imported code is private and deletable.
- LeetCode, AtCoder, and CodeChef remain disabled stubs until founder-account spikes pass.

Codeforces selectors can drift. A failed source-block lookup disables that sync attempt rather than uploading incomplete or unrelated data.
