<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1vdYd_Ajce23Au3ytEE1GBlDLgleGsJMi

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set these variables locally:
   `VITE_APP_URL`
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
   `VITE_GEMINI_API_KEY` in [.env.local](.env.local) if you want AI reward generation
   `VITE_ENABLE_DEMO_WORKSPACE` if you explicitly want the demo workspace enabled
3. For Vercel, add the same `VITE_...` variables in Project Settings -> Environment Variables
4. Enable Vercel Web Analytics for the project in the Vercel dashboard
5. This repo includes [vercel.json](vercel.json) so client-side routes are rewritten to `index.html`
6. Run the app:
   `npm run dev`
