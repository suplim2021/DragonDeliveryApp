# Dragon Delivery App

Dragon Delivery App is a web-based delivery management system built to help manage shipping, packing and delivery tasks. It was created with assistance from **Codex-ChatGPT** to demonstrate a Firebase-powered single page application.

## Project Purpose

The project showcases how to build a logistics dashboard using standard web technologies (HTML, CSS and JavaScript) together with Firebase services. Pages in the `js/` folder illustrate login, admin control, operator tools and supervisor views.

## Dependencies

- [Firebase](https://firebase.google.com/) is used for authentication, real-time database and storage.
- The app expects Firebase configuration values in `js/config.js` which must match your Firebase project.
- [Firebase CLI](https://firebase.google.com/docs/cli) is required to deploy the site to Firebase Hosting.

## Deployment

1. Install the Firebase CLI: `npm install -g firebase-tools`.
2. Sign in to Firebase: `firebase login`.
3. Verify `firebase.json` contains the desired hosting configuration.
4. Deploy to Firebase Hosting with:
   ```bash
   firebase deploy --only hosting
   ```

After deployment the app will be hosted on your Firebase project's hosting URL.

## License

This repository is released under the terms of the MIT License. See [LICENSE](LICENSE) for details.

