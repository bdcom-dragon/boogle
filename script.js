// script.js - improved and safe version

let data = [];
let databaseContent = '';
let databaseReady = Promise.resolve();
let aiMode = false;

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_KEY_DOMAIN = 'boogle.ai.bdcom.dedyn.io';
const DNS_TXT_LOOKUP_URL = `https://dns.google/resolve?name=${encodeURIComponent(GEMINI_KEY_DOMAIN)}&type=TXT`;
const GEMINI_SYSTEM_PROMPT = 'You are Boogle AI. You will answer the query from user in short MD answer with links and explanations. As short and to-the-point as possible, but provide correct URL, so that user can click and visit site.';

// Utility: escape text for insertion into HTML (returns text node or safe text)
function escapeHtml(text) {
  // We will set textContent on elements instead of using innerHTML
  return text == null ? '' : String(text);
}

function escapeMarkup(text) {
  return escapeHtml(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadDatabase() {
  try {
    const resp = await fetch('database.json', {cache: "no-store"});
    if (!resp.ok) throw new Error('Network response was not ok');
    databaseContent = await resp.text();
    const json = JSON.parse(databaseContent);
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

function setAiAnswer(html, show = true) {
  const answerEl = document.getElementById('aiAnswer');
  if (!answerEl) return;
  answerEl.hidden = !show;
  answerEl.innerHTML = html;
}

function parseDnsTxtRecord(record) {
  const value = (record || '').trim();
  const quotedParts = value.match(/"((?:[^"\\]|\\.)*)"/g);

  if (!quotedParts) return value;

  return quotedParts
    .map(part => part.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'))
    .join('')
    .trim();
}

async function resolveGeminiApiKey() {
  const resp = await fetch(DNS_TXT_LOOKUP_URL, {cache: 'no-store'});
  if (!resp.ok) throw new Error('Failed to lookup Gemini API key.');

  const json = await resp.json();
  const apiKey = json.Answer
    ?.filter(answer => answer.type === 16)
    .map(answer => parseDnsTxtRecord(answer.data))
    .find(Boolean);

  if (!apiKey) throw new Error('Gemini API key TXT record not found.');
  return apiKey;
}

function renderMarkdown(markdown) {
  const escaped = escapeMarkup(markdown);

  return escaped
    .split(/\n{2,}/)
    .map(block => {
      const lines = block.split('\n').filter(Boolean);
      const isList = lines.every(line => /^\s*[-*]\s+/.test(line));
      const body = lines
        .map(line => line
          .replace(/^\s*[-*]\s+/, '')
          .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code>$1</code>'))
        .join('<br>');

      if (isList) {
        return `<ul>${body.split('<br>').map(item => `<li>${item}</li>`).join('')}</ul>`;
      }
      return `<p>${body}</p>`;
    })
    .join('');
}

async function askGemini(query, button) {
  query = (query || '').trim();
  if (!query) {
    setAiAnswer('<p>Type a prompt first.</p>');
    return;
  }

  setAiAnswer('<p>Asking Gemini...</p>');
  if (button) {
    button.disabled = true;
    button.textContent = 'Asking...';
  }

  try {
    await databaseReady;
    const apiKey = await resolveGeminiApiKey();
    const payloadText = `User query:\n${query}\n\nDatabase JSON file content:\n${databaseContent}`;
    const resp = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_PROMPT }]
        },
        contents: [{
          parts: [{ text: payloadText }]
        }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2
        }
      })
    });

    const json = await resp.json();
    if (resp.status === 429) {
      throw new Error('Please ask one minute later.');
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Invalid Gemini API key.');
    }
    if (!resp.ok) {
      throw new Error(json.error?.message || 'Gemini request failed');
    }

    const text = json.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    setAiAnswer(text ? renderMarkdown(text) : '<p>No answer returned.</p>');
  } catch (err) {
    console.error('Gemini API error:', err);
    setAiAnswer(`<p>${escapeMarkup(err.message || 'Gemini request failed.')}</p>`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Ask';
    }
  }
}

function setAiMode(enabled, input, button) {
  aiMode = enabled;
  if (input) {
    input.type = enabled ? 'text' : 'search';
    input.placeholder = enabled ? 'Ask Boogle AI...' : 'Search Boogle...';
  }
  if (button) button.textContent = enabled ? 'Ask' : 'Search';

  const resultsEl = document.getElementById('results');
  if (resultsEl) resultsEl.textContent = '';
  setAiAnswer('', false);
}

// Hook up DOM
document.addEventListener('DOMContentLoaded', () => {
  databaseReady = loadDatabase();

  const input = document.getElementById('searchInput') || document.getElementById('searchBox');
  const button = document.getElementById('searchButton');
  const aiToggle = document.getElementById('aiModeToggle');

  const debouncedSearch = debounce(evt => {
    if (!aiMode) search(evt.target.value);
  }, 200);

  if (input) {
    input.addEventListener('input', debouncedSearch);
    // optional: support enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (aiMode) askGemini(e.target.value, button);
        else search(e.target.value);
      }
    });
  }

  if (button) {
    button.addEventListener('click', () => {
      const q = input ? input.value : '';
      if (aiMode) askGemini(q, button);
      else search(q);
    });
  }

  if (aiToggle) {
    aiToggle.addEventListener('change', () => setAiMode(aiToggle.checked, input, button));
  }
});
