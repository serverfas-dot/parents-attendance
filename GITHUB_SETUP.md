# Parents Attendance — GitHub Pages Setup Guide

## Step 1: Create a GitHub Repository

1. Go to https://github.com and click the **+** icon → **New repository**
2. Name it (e.g. `parents-attendance`)
3. Set it to **Public** (required for free GitHub Pages)
4. Click **Create repository**

## Step 2: Push Your Code

```bash
git init
git add .
git commit -m "Parents Attendance app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/parents-attendance.git
git push -u origin main
```

## Step 3: Add the GitHub Actions Workflow

The workflow file must be inside this exact folder path:

    .github/workflows/deploy.yml

In the repository file list, it should appear as `.github` → `workflows` → `deploy.yml`.
A `deploy.yml` file at the repository root will not run automatically because GitHub
only recognizes workflow files inside `.github/workflows/`.

If the repository already contains a folder path such as
`.github/workflows/.github/workflows`, it is nested incorrectly. Return to the
repository root first, then use **Add file → Create new file** and enter
`.github/workflows/deploy.yml` exactly once as the filename. Do not create it while
already inside the `.github/workflows` folder. The repository should show only one
`.github` folder, then `workflows`, then `deploy.yml`.

If `deploy.yml` is currently at the repository root, open it, copy its contents, then
create the correctly placed file above. The root copy can be removed afterward.

## Step 4: Add Secret Variables (Required)

The app needs two secret values to connect to the database. These are kept
secret so nobody can see them in your code.

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these two:

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: (the URL from your `.env` file, looks like `https://xxxx.supabase.co`)

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: (the long key from your `.env` file)

## Step 4: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. The deployment workflow (`.github/workflows/deploy.yml`) will run automatically
   on every push to `main`

## Step 5: Access Your Live Site

After the first push, GitHub Actions will build and deploy your site.
Your live URL will be:

    https://YOUR_USERNAME.github.io/parents-attendance/

## Admin Login

- Visit `https://YOUR_USERNAME.github.io/parents-attendance/#admin`
- Username: `admin@parentsattendance.school`
- Password: `ParentAdmin@2026`

## Public Form

The main page (without `#admin`) is the public attendance form that parents fill out.
