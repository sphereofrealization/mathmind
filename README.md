**Welcome to your Base44 project** 

**About**

View and Edit your app on [Base44.com](http://Base44.com).

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to this repo can be reflected in the Base44 Builder.

**Prerequisites**

1. Clone the repository using this project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables.

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

# example
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app locally:

```bash
npm run dev
```

## GitHub ↔ Base44 workflow (yes, this will work)

If this repository is connected to your Base44 app integration, your normal flow is:

1. Make code changes in this repo.
2. Commit changes.
3. Push to GitHub.
4. Open Base44 and click **Publish** to push the updated app live.

That is the propagation path: **local repo → GitHub repo → Base44 publish**.

## Repository notes

- `social-archive` is a separate repository (`sphereofrealization/social-archive`).
- It is not included in this `mathmind` working tree by default.
- Clone it separately only when you specifically need that codebase.

**Docs & Support**

- Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
- Support: [https://app.base44.com/support](https://app.base44.com/support)
