# Cookly

A modern web app that generates random recipes using only the ingredients you have. Powered by AI.

---

## What You Need Before Starting

- **A computer** running Windows, Mac, or Linux
- **Python 3.9 or newer** installed
- **A web browser** (Chrome, Edge, Firefox, or Safari)
- **Internet connection** (for first-time setup)

---

## How to Install Python (if you don't have it)

### Windows
1. Go to https://python.org
2. Click the yellow **Download Python** button
3. Open the downloaded file
4. **IMPORTANT:** Check the box that says **"Add Python to PATH"**
5. Click **Install Now**
6. Wait for it to finish, then click **Close**

### Mac
1. Go to https://python.org
2. Click the yellow **Download Python** button
3. Open the downloaded `.pkg` file
4. Follow the installer steps
5. Open **Terminal** (press `Cmd + Space`, type `terminal`, press Enter)
6. Type `python3 --version` and press Enter to verify it installed

### Linux (Ubuntu/Debian)
1. Open **Terminal** (press `Ctrl + Alt + T`)
2. Type: `sudo apt update`
3. Then type: `sudo apt install python3 python3-pip -y`
4. Type `python3 --version` to verify

---

## Step-by-Step: Run Cookly

### Step 1: Open a Terminal

**Windows:**
- Press the **Windows key** on your keyboard
- Type `cmd`
- Press **Enter**

**Mac:**
- Press `Cmd + Space`
- Type `terminal`
- Press **Enter**

**Linux:**
- Press `Ctrl + Alt + T`

### Step 2: Go to the Cookly Folder

Copy and paste this command, then press **Enter**:

```
cd "C:\Users\Remus\Documents\New OpenCode Project\recipe-roulette"
```

**What this does:** It tells your computer to move into the project folder where Cookly's files are stored.

> If you moved the folder somewhere else, use that path instead.

### Step 3: Install the Required Packages

Copy and paste this command, then press **Enter**:

```
pip install -r requirements.txt
```

**What this does:** It downloads and installs all the pieces Cookly needs to run (Flask, SQLAlchemy, etc.).

**If that gives an error**, try this instead:

```
py -m pip install -r requirements.txt
```

**Or if on Mac/Linux:**

```
pip3 install -r requirements.txt
```

Wait until you see a list of package names with "Successfully installed" at the end.

### Step 4: Start Cookly

Copy and paste this command, then press **Enter**:

```
python app.py
```

**What this does:** It starts the Cookly web server.

**If that gives an error**, try:
- `py app.py` (Windows)
- `python3 app.py` (Mac/Linux)

You should see output like:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

**Do not close this terminal window.** Cookly is now running.

### Step 5: Open Cookly in Your Browser

1. Open your web browser (Chrome, Edge, Firefox, etc.)
2. Click the address bar at the top
3. Type exactly: `http://127.0.0.1:5000`
4. Press **Enter**

You should see the Cookly home page with the title "Cookly" and a "Spin the Plate" button.

### Step 6: Stop Cookly (when you're done)

Go back to the terminal window and press:
- **Ctrl + C** on your keyboard (hold Control, press C)

The terminal will return to a normal prompt. You can close the window.

---

## How to Use Cookly

### Generate Your First Recipe

1. On the home page, click **Spin the Plate**
2. In the text box, type an ingredient you have (e.g., `chicken`)
3. Click the **Add** button (or press **Enter**)
4. Repeat with more ingredients (e.g., `rice`, `tomatoes`, `garlic`)
5. Once you have 2+ ingredients, click **Generate Recipe**
6. A loading animation will play
7. Your custom recipe appears! It will only use ingredients you added plus basic staples like salt, pepper, and oil.

### Save a Recipe to Favorites

After generating a recipe:
1. Click **Save to Favorites**
2. A green toast message will confirm "Saved to favorites!"
3. Go to the **Favorites** page (click the heart icon in the nav bar)

### View Recipe History

- Every recipe you generate or click on is automatically saved to history
- Go to the **History** page (click the clock icon in the nav bar)
- Click any history item to view the full recipe again

### Delete a Favorite

1. Go to the **Favorites** page
2. Hover over a recipe card
3. Click the **trash icon** (top-right corner)
4. The recipe is removed from favorites

### Search Recipes

1. Go to **Favorites** or **History** page
2. Type in the search bar
3. Results filter as you type

---

## What Gets Saved Where

| Data | Stored In | Survives... |
|------|-----------|-------------|
| Generated recipes | SQLite database (hard drive) | Restarting the app, restarting your computer |
| Favorites | SQLite database (hard drive) | Restarting the app, restarting your computer |
| History | SQLite database (hard drive) | Restarting the app, restarting your computer |
| Ingredients you typed | Your browser's localStorage | Closing and reopening the browser |

**Your data is always there when you come back.**

---

## Optional: Connect AI for Better Recipes

Cookly works without any setup — it generates recipes using a built-in fallback.

To get AI-powered recipes from OpenAI:

1. Open the `.env` file in the project folder with a text editor
2. Find this line:
   ```
   AI_API_KEY=your_openai_api_key_here
   ```
3. Replace `your_openai_api_key_here` with your actual OpenAI API key
4. Save the file
5. Restart Cookly (press Ctrl+C, then `python app.py` again)

---

## Troubleshooting

### "python is not recognized as a command"

**Fix:** Use `py` instead of `python` on Windows.

### "pip is not recognized"

**Fix:** Use `py -m pip` instead of `pip` on Windows.

### "Address already in use" / Port 5000 is busy

**Fix:** Press Ctrl+C to stop, wait 5 seconds, then start again.

### The page is blank or broken

**Fix:** Look at the terminal window for error messages. Copy the red text and share it.

### Nothing happens when I click Generate

**Fix:** Make sure you added at least 2 ingredients (they appear as tags above the button).

### My ingredients disappeared

**Fix:** Check that your browser allows localStorage. Try clearing your browser cache and refreshing.

---

## Project Files

```
recipe-roulette/
├── app.py              # Starts the server
├── config.py           # Settings
├── .env                # API key (edit this)
├── requirements.txt    # Package list
├── instance/           # Database lives here
├── database/
│   └── schema.py       # Table definitions
├── routes/
│   ├── main.py         # Page routes
│   ├── recipes.py      # Recipe API + AI
│   ├── favorites.py    # Favorites API
│   └── history.py      # History API
├── static/
│   ├── css/
│   │   ├── style.css
│   │   └── animations.css
│   └── js/
│       ├── api.js
│       └── main.js
└── templates/
    ├── base.html
    ├── index.html
    ├── generate.html
    ├── favorites.html
    └── history.html
```
