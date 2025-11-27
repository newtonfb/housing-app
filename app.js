import { properties } from './data.js';

const filters = {
  search: '',
  city: 'all',
  county: 'all',
  programType: 'all',
  specialization: 'all',
  gender: 'all',
};

const commentStorageKey = 'housing-app-comments-v1';
const feedStorageKey = 'housing-app-activity-v1';

const state = {
  sortBy: 'programName',
  sortDirection: 'asc',
};

const elements = {
  resultsBody: document.querySelector('#results-body'),
  resultsCount: document.querySelector('#results-count'),
  searchInput: document.querySelector('#search-input'),
  citySelect: document.querySelector('#filter-city'),
  countySelect: document.querySelector('#filter-county'),
  typeSelect: document.querySelector('#filter-type'),
  specializationSelect: document.querySelector('#filter-specialization'),
  genderSelect: document.querySelector('#filter-gender'),
  detailPanel: document.querySelector('#detail-panel'),
  detailContent: document.querySelector('#detail-content'),
  overlay: document.querySelector('#overlay'),
  activityFeed: document.querySelector('#activity-feed'),
  refreshFeed: document.querySelector('#refresh-feed'),
};

function buildFilterOptions() {
  const uniqueValues = (key) => ['all', ...new Set(properties.map((p) => p[key]).sort())];

  populateSelect(elements.citySelect, uniqueValues('city'));
  populateSelect(elements.countySelect, uniqueValues('county'));
  populateSelect(elements.typeSelect, uniqueValues('programType'));
  populateSelect(elements.specializationSelect, uniqueValues('specialization'));
  populateSelect(elements.genderSelect, uniqueValues('gender'));
}

function populateSelect(select, options) {
  select.innerHTML = options
    .map((option) => `<option value="${option}">${option === 'all' ? 'All' : option}</option>`) 
    .join('');
}

function attachEventListeners() {
  elements.searchInput.addEventListener('input', (event) => {
    filters.search = event.target.value.toLowerCase();
    renderTable();
  });

  [
    { element: elements.citySelect, key: 'city' },
    { element: elements.countySelect, key: 'county' },
    { element: elements.typeSelect, key: 'programType' },
    { element: elements.specializationSelect, key: 'specialization' },
    { element: elements.genderSelect, key: 'gender' },
  ].forEach(({ element, key }) => {
    element.addEventListener('change', (event) => {
      filters[key] = event.target.value;
      renderTable();
    });
  });

  document.querySelectorAll('[data-sort]').forEach((header) => {
    header.addEventListener('click', () => {
      const sortField = header.dataset.sort;
      if (state.sortBy === sortField) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = sortField;
        state.sortDirection = 'asc';
      }
      renderTable();
      updateSortIndicators();
    });
  });

  elements.overlay.addEventListener('click', closeDetailPanel);
  document.querySelector('#detail-close').addEventListener('click', closeDetailPanel);

  if (elements.refreshFeed) {
    elements.refreshFeed.addEventListener('click', renderActivityFeed);
  }
}

function updateSortIndicators() {
  document.querySelectorAll('[data-sort]').forEach((header) => {
    const indicator = header.querySelector('.sort-indicator');
    if (header.dataset.sort === state.sortBy) {
      indicator.textContent = state.sortDirection === 'asc' ? '▲' : '▼';
    } else {
      indicator.textContent = '';
    }
  });
}

function applyFilters(data) {
  return data.filter((property) => {
    const matchesSearch = `${property.programName} ${property.city} ${property.county}`
      .toLowerCase()
      .includes(filters.search);

    const matchesCity = filters.city === 'all' || property.city === filters.city;
    const matchesCounty = filters.county === 'all' || property.county === filters.county;
    const matchesType = filters.programType === 'all' || property.programType === filters.programType;
    const matchesSpecialization =
      filters.specialization === 'all' || property.specialization === filters.specialization;
    const matchesGender = filters.gender === 'all' || property.gender === filters.gender;

    return matchesSearch && matchesCity && matchesCounty && matchesType && matchesSpecialization && matchesGender;
  });
}

function applySort(data) {
  const accessor = (item) => {
    const value = item[state.sortBy];
    if (typeof value === 'object' && value !== null) {
      return value.person ?? value.name ?? '';
    }
    return value;
  };

  const sorted = [...data].sort((a, b) => {
    const valueA = accessor(a);
    const valueB = accessor(b);

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return valueA.localeCompare(valueB);
    }

    return valueA - valueB;
  });

  return state.sortDirection === 'asc' ? sorted : sorted.reverse();
}

function renderTable() {
  const filtered = applyFilters(properties);
  const sorted = applySort(filtered);

  elements.resultsCount.textContent = `${sorted.length} match${sorted.length === 1 ? '' : 'es'}`;

  elements.resultsBody.innerHTML = sorted
    .map((property) => {
      return `
        <tr>
          <td>
            <div class="cell-title">${property.programName}</div>
            <div class="cell-subtitle">${property.city}, ${property.county} County</div>
          </td>
          <td>${property.programType}</td>
          <td>${property.specialization}</td>
          <td>${property.gender}</td>
          <td><span class="pill">${property.availableBeds} / ${property.capacity}</span></td>
          <td><span class="pill pill-muted">${property.contact.person}</span></td>
          <td><button class="ghost" data-open="${property.id}">View</button></td>
        </tr>
      `;
    })
    .join('');

  elements.resultsBody.querySelectorAll('button[data-open]').forEach((button) => {
    button.addEventListener('click', () => openDetail(button.dataset.open));
  });
}

function openDetail(id) {
  const property = properties.find((item) => item.id === id);
  if (!property) return;

  const comments = loadComments()[id] || [];

  elements.detailContent.innerHTML = `
    <header class="detail-header">
      <div>
        <p class="detail-kicker">${property.programType}</p>
        <h2>${property.programName}</h2>
        <p class="detail-location">${property.city} · ${property.county} County · ${property.gender}</p>
      </div>
      <div class="detail-capacity">
        <span class="label">Beds</span>
        <span class="value">${property.availableBeds} / ${property.capacity}</span>
      </div>
    </header>
    <section class="detail-grid">
      <div>
        <p class="label">Specialization</p>
        <p>${property.specialization}</p>
      </div>
      <div>
        <p class="label">Contact</p>
        <p>${property.contact.person}</p>
        <p><a href="tel:${property.contact.phone}">${property.contact.phone}</a></p>
        <p><a href="mailto:${property.contact.email}">${property.contact.email}</a></p>
      </div>
      <div>
        <p class="label">Notes</p>
        <p>${property.notes}</p>
      </div>
    </section>
    <section class="comments">
      <div class="comments-header">
        <h3>Team updates</h3>
        <p class="muted">Share the latest intake status, eligibility, or contact changes.</p>
      </div>
      <form id="comment-form" class="comment-form">
        <div class="form-row">
          <label>
            Name
            <input required name="author" placeholder="Your name" />
          </label>
          <label>
            Notes
            <input required name="body" placeholder="What changed?" />
          </label>
          <button type="submit" class="primary">Post</button>
        </div>
      </form>
      <ul class="comment-list">
        ${comments
          .map(
            (comment) => `
              <li>
                <div class="comment-head">
                  <span class="author">${comment.author}</span>
                  <span class="timestamp">${new Date(comment.timestamp).toLocaleString()}</span>
                </div>
                <p>${comment.body}</p>
              </li>
            `,
          )
          .join('')}
        ${comments.length === 0 ? '<li class="muted">No updates yet.</li>' : ''}
      </ul>
    </section>
  `;

  const form = elements.detailContent.querySelector('#comment-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const author = formData.get('author').trim();
    const body = formData.get('body').trim();
    if (!author || !body) return;

    const newComment = {
      author,
      body,
      timestamp: Date.now(),
    };

    const allComments = loadComments();
    allComments[id] = [newComment, ...(allComments[id] || [])];
    saveComments(allComments);
    addActivityEntry({
      type: 'comment',
      title: `${property.programName}`,
      description: `${author} posted an update`,
      timestamp: newComment.timestamp,
    });
    openDetail(id);
  });

  elements.overlay.classList.add('visible');
  elements.detailPanel.classList.add('visible');
}

function closeDetailPanel() {
  elements.overlay.classList.remove('visible');
  elements.detailPanel.classList.remove('visible');
}

function loadComments() {
  try {
    const stored = localStorage.getItem(commentStorageKey);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Unable to load comments', error);
    return {};
  }
}

function saveComments(comments) {
  localStorage.setItem(commentStorageKey, JSON.stringify(comments));
}

function seedFeed() {
  return properties
    .map((property) => ({
      type: 'program',
      title: property.programName,
      description: `${property.city}, ${property.county} County added to inventory`,
      timestamp: new Date(property.createdAt).getTime(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function loadFeed() {
  try {
    const stored = localStorage.getItem(feedStorageKey);
    if (stored) return JSON.parse(stored);
    const seeded = seedFeed();
    saveFeed(seeded);
    return seeded;
  } catch (error) {
    console.error('Unable to load feed', error);
    return seedFeed();
  }
}

function saveFeed(feed) {
  localStorage.setItem(feedStorageKey, JSON.stringify(feed));
}

function addActivityEntry(entry) {
  const feed = [entry, ...loadFeed()];
  saveFeed(feed);
  renderActivityFeed();
}

function renderActivityFeed() {
  if (!elements.activityFeed) return;

  const feed = loadFeed().sort((a, b) => b.timestamp - a.timestamp).slice(0, 25);

  elements.activityFeed.innerHTML = feed
    .map(
      (item) => `
        <li class="activity-item">
          <div>
            <p class="label">${item.type === 'comment' ? 'Comment' : 'Program'}</p>
            <p class="activity-title">${item.title}</p>
            <p class="muted">${item.description}</p>
          </div>
          <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>
        </li>
      `,
    )
    .join('');

  if (feed.length === 0) {
    elements.activityFeed.innerHTML = '<li class="muted">No activity yet.</li>';
  }
}

function init() {
  buildFilterOptions();
  attachEventListeners();
  renderTable();
  updateSortIndicators();
  renderActivityFeed();
}

init();
