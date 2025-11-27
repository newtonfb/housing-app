const threadStorageKey = 'housing-talk-threads-v1';

const elements = {
  form: document.querySelector('#thread-form'),
  list: document.querySelector('#thread-list'),
  refresh: document.querySelector('#refresh-threads'),
};

function loadThreads() {
  try {
    const stored = localStorage.getItem(threadStorageKey);
    if (stored) return JSON.parse(stored);
    return [];
  } catch (error) {
    console.error('Unable to load threads', error);
    return [];
  }
}

function saveThreads(threads) {
  localStorage.setItem(threadStorageKey, JSON.stringify(threads));
}

function renderThreads() {
  const threads = loadThreads().sort((a, b) => b.timestamp - a.timestamp);

  elements.list.innerHTML = threads
    .map(
      (thread) => `
        <li class="activity-item">
          <div>
            <p class="label">${thread.topic}</p>
            <p class="activity-title">${thread.body}</p>
            <p class="muted">Started by ${thread.author}</p>
          </div>
          <span class="timestamp">${new Date(thread.timestamp).toLocaleString()}</span>
        </li>
      `,
    )
    .join('');

  if (threads.length === 0) {
    elements.list.innerHTML = '<li class="muted">No threads yet. Start the first conversation.</li>';
  }
}

function attachEvents() {
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.form);
    const author = formData.get('author').trim();
    const topic = formData.get('topic').trim();
    const body = formData.get('body').trim();
    if (!author || !topic || !body) return;

    const newThread = {
      author,
      topic,
      body,
      timestamp: Date.now(),
    };

    const threads = [newThread, ...loadThreads()];
    saveThreads(threads);
    elements.form.reset();
    renderThreads();
  });

  elements.refresh.addEventListener('click', renderThreads);
}

function init() {
  attachEvents();
  renderThreads();
}

init();
