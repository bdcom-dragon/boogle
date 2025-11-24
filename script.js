// script.js - improved and safe version

let data = [];

// Utility: escape text for insertion into HTML (returns text node or safe text)
function escapeHtml(text) {
  // We will set textContent on elements instead of using innerHTML
  return text == null ? '' : String(text);
}

async function loadDatabase() {
  try {
    const resp = await fetch('database.json', {cache: "no-store"});
    if (!resp.ok) throw new Error('Network response was not ok');
    const json = await resp.json();
    // Normalize items: ensure we have title, description, url
    data = json.map(item => ({
      title: item.title || '',
      description: item.description || item.content || '',
      url: item.url || ''
    }));
    // Optionally show initial results or count
    // displayResults([]); // leave empty until user types
  } catch (err) {
    console.error('Database load error:', err);
    const resultsEl = document.getElementById('results');
    if (resultsEl) resultsEl.textContent = 'Failed to load database.';
  }
}

// Simple debounce
function debounce(fn, wait = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function search(query) {
  query = (query || '').trim().toLowerCase();
  if (!query) {
    // clear or show default
    document.getElementById('results').textContent = 'Type to search...';
    return;
  }
  const results = data.filter(item => {
    return item.title.toLowerCase().includes(query) ||
           item.description.toLowerCase().includes(query);
  });
  displayResults(results, query);
}

function displayResults(results, query = '') {
  const resultContainer = document.getElementById('results');
  resultContainer.innerHTML = ''; // clear

  if (!results || results.length === 0) {
    resultContainer.textContent = 'No results found.';
    return;
  }

  results.forEach(result => {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-item';

    const title = document.createElement('h3');
    title.textContent = escapeHtml(result.title);

    const p = document.createElement('p');
    p.textContent = escapeHtml(result.description);

    const a = document.createElement('a');
    a.href = result.url || '#';
    a.textContent = result.url ? result.url : 'No URL';
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');

    wrapper.appendChild(title);
    wrapper.appendChild(p);
    wrapper.appendChild(a);
    resultContainer.appendChild(wrapper);
  });
}

// Hook up DOM
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();

  const input = document.getElementById('searchInput') || document.getElementById('searchBox');
  const button = document.getElementById('searchButton');

  const debouncedSearch = debounce(evt => search(evt.target.value), 200);

  if (input) {
    input.addEventListener('input', debouncedSearch);
    // optional: support enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') search(e.target.value);
    });
  }

  if (button) {
    button.addEventListener('click', () => {
      const q = input ? input.value : '';
      search(q);
    });
  }
});
