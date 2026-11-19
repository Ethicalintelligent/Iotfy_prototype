# Setup (Windows) — once per computer

About 15 minutes. After this, you only ever chat with Claude.

## 1. Install Git and Node.js
Open **PowerShell** (Start menu → type "PowerShell") and paste:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

Close PowerShell, open it again, then:

```powershell
corepack enable
```

(That turns on `pnpm`, the package manager this project uses.)

## 2. Open the project in Claude
1. Open the **Claude desktop app** → the **Code** tab.
2. Choose the folder **Documents\iotify-prototype**.
3. Type your first message:

> Read CLAUDE.md and REFACTOR_PLAN.md, then do Step 0 and Step 1. Start the dev server and open the live preview.

Claude installs everything it needs and shows the running app in the preview pane.

## 3. Connect the database (Claude will ask for this in Step 3)
1. Go to **console.neon.tech** → project **iotify-prototypes** → **Connect**.
2. Pick the branch (`main` for the merged development build, or your own `proto/…` branch) and the role.
3. Copy the connection string and paste it into a file called **`.env.local`** in the project folder, as the value of `DATABASE_URL` (Claude will create the file from `.env.example`; you just paste).

Never paste the connection string into a chat, a document or Git. `.env.local` is ignored by Git automatically.

## 4. Everyday use
- Describe what you want; watch the preview.
- "Commit this step" saves a checkpoint. "Undo the last change" goes back.
- Later, when GitHub is set up: "Push my work and open a pull request".

## If something goes wrong
Tell Claude what you see ("the preview is blank", "it says port in use"). It will fix it.
