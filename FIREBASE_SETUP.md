# Firebase setup for Kflix Hindi

## 1. Copy the existing web app configuration

In Firebase Console, open the existing project **kflix-156f2** and select its existing Web app. Open **Project settings → General → Your apps → SDK setup and configuration → Config**. Copy the configuration values (not service-account credentials) into a new `.env.local` file at the project root, using the names shown in `.env.example`. Keep `VITE_FIREBASE_PROJECT_ID=kflix-156f2`. Do not create another Firebase project or web app just for this integration.

The Firebase web configuration is client configuration, not an authorization mechanism. Firestore access is enforced by `firestore.rules`.

`.env.local` is ignored by Git. Keep the real project settings there and do not commit it.

## 2. Enable Authentication

In **Authentication → Sign-in method**, enable **Email/Password**. Use **Authentication → Users → Add user** to create your own account; public registration is not implemented by this app.

## 3. Authorize the first administrator

After creating the account, open its user details in **Authentication → Users** and copy the **User UID**. In `firestore.rules`, replace the exact string `REPLACE_WITH_INITIAL_ADMIN_UID` in `isAdmin()` with that UID. Do not publish/deploy the rules while the placeholder remains. Only the UID embedded in the deployed rules can write content; no client-side profile can promote itself.

## 4. Apply and test the rules

In **Firestore Database → Rules**, paste the contents of the repository's `firestore.rules`, with the UID replacement, then publish. Multi-field queries use `firestore.indexes.json`. To deploy both files with the Firebase CLI, install the CLI if needed, run `firebase login`, then from this project run `firebase deploy --only firestore:rules,firestore:indexes --project kflix-156f2`. Do not deploy before replacing the admin UID. In Rules Playground or the Emulator Suite, verify:

- Signed-out and non-admin clients cannot create, update, or delete dramas/episodes.
- A signed-out visitor can read published dramas and episodes only when the episode's parent drama is published.
- Drafts and episodes of unpublished dramas are denied to public clients.
- The configured admin UID can create, edit, publish, unpublish, and delete valid records.

Do not use open rules such as `allow read, write: if true`.

## 5. Run locally

Copy `.env.example` to `.env.local`, replace the placeholder values with the existing app configuration, then run:

```sh
npm install
npm run dev
```

Open `/admin/login` and sign in with the account above. Add a drama and choose **Published** to make it public. Add an episode for that drama with an authorized external video/embed URL; choose **Published** to expose it. Published content appears in the homepage catalog/latest episodes and in its drama details page. Episode records also store a rules-validated parent-publication marker; changing a drama's publication status synchronizes that marker so public episode queries cannot expose episodes from draft dramas.

Before deployment, replace the UID in the rules, apply and test the rules against the production project, provide the real `.env` values in the hosting provider, and configure the hosting provider to serve the SPA routes (`/admin`, `/drama/...`, and `/watch/...`) through `index.html`. Review all media/video usage rights. Firebase Console actions, rules deployment, and production testing are manual and have not been performed by this code change.
