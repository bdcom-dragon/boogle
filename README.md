# Boogle Search Engine

https://bdcom-dragon.github.io/boogle

## Project Description
Boogle is a search engine project designed to facilitate quick and efficient searching of various online resources. It aims to deliver a reliable and user-friendly experience for finding information on the web.

## Features
- Fast and responsive search functionality
- User-friendly interface
- Ability to search through a comprehensive database of links
- Robust algorithm for ranking search results

## Run Locally

Do not open `index.html` directly from disk. Browsers block the app's
`fetch('database.json')` request when the page uses the `file://` protocol.

From PowerShell, run:

```powershell
.\start-server.ps1
```

Then open [http://localhost:8000](http://localhost:8000). To use another port,
run `./start-server.ps1 -Port 8080` and open the matching localhost URL.

## Usage Instructions

Enter a search term in the search bar and press Enter. Relevant links appear
below the search box.

## How to Add Links to the Database
To add a link to the Boogle database, follow these steps:
1. Navigate to the links management section of the admin panel.
2. Click on the "Add New Link" button.
3. Fill in the required fields: URL, Title, and Description.
4. Click "Save" to add the link to the database.

Thank you for using Boogle!
