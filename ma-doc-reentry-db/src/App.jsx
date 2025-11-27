import { useEffect, useMemo, useState } from 'react'
import { PublicClientApplication } from '@azure/msal-browser'
import { loginRequest, msalConfig } from './authConfig'
import programsCsv from './data/programs.csv?raw'
import './App.css'

const parseProgramsCsv = (raw) => {
  return raw
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line, index) => {
      const parts = line.split(',')
      while (parts.length < 10) {
        parts.push('')
      }
      const [name, type, gender, address, town, county, beds, contactName, phone, email] = parts
      return {
        id: `${index}-${name}`,
        name: name.trim(),
        type: type.trim(),
        gender: gender.trim(),
        address: address.trim(),
        town: town.trim(),
        county: county.trim(),
        beds: beds ? Number(beds) || null : null,
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      }
    })
}

const feedItems = [
  {
    id: 'f1',
    type: 'add',
    title: 'New house added: Canal Haven',
    detail: 'Boston · Women · 18 beds',
    by: 'Alicia Mendez',
    when: '10 min ago',
  },
  {
    id: 'f2',
    type: 'edit',
    title: 'Updated bed count for Elm Bridge House',
    detail: 'Beds set to 24 · Added co-ed tag',
    by: 'Jordan Lee',
    when: '1 hr ago',
  },
  {
    id: 'f3',
    type: 'comment',
    title: 'Comment on Harbor Light',
    detail: '“Waitlist cleared for next week arrivals.”',
    by: 'Samira Khan',
    when: 'Yesterday',
  },
]

const initialThreads = [
  {
    id: 'd1',
    title: 'Transportation options near Canal Haven?',
    body: 'Looking for reliable shuttle partners for early releases.',
    author: 'Jordan (Ops)',
    when: '2h ago',
    replies: 3,
  },
  {
    id: 'd2',
    title: 'Shared intake packet template',
    body: 'Uploaded the latest DPH intake packet to Teams—feel free to adapt.',
    author: 'Samira',
    when: 'Yesterday',
    replies: 1,
  },
]

function App() {
  const msalInstance = useMemo(() => new PublicClientApplication(msalConfig), [])
  const [programs, setPrograms] = useState(() => parseProgramsCsv(programsCsv))
  const [account, setAccount] = useState(null)
  const [authStatus, setAuthStatus] = useState('idle')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('All Counties')
  const [type, setType] = useState('All Types')
  const [activeTab, setActiveTab] = useState('directory')
  const [threads, setThreads] = useState(initialThreads)
  const [newThread, setNewThread] = useState({ title: '', body: '' })
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [editProgram, setEditProgram] = useState(null)
  const [comments, setComments] = useState({})
  const [commentDraft, setCommentDraft] = useState('')

  useEffect(() => {
    let mounted = true

    msalInstance.initialize().then(() => {
      const existing = msalInstance.getAllAccounts()
      if (existing.length && mounted) {
        msalInstance.setActiveAccount(existing[0])
        setAccount(existing[0])
      }
    })

    return () => {
      mounted = false
    }
  }, [msalInstance])

  const handleLogin = async () => {
    setAuthStatus('signing-in')
    setError('')
    try {
      const response = await msalInstance.loginPopup(loginRequest)
      msalInstance.setActiveAccount(response.account)
      setAccount(response.account)
      setAuthStatus('signed-in')
    } catch (err) {
      setError(err.message || 'Unable to sign in right now.')
      setAuthStatus('error')
    }
  }

  const handleLogout = async () => {
    setAuthStatus('signing-out')
    setError('')
    try {
      const activeAccount = account || msalInstance.getActiveAccount()
      await msalInstance.logoutPopup({ account: activeAccount || undefined })
      setAccount(null)
      setAuthStatus('idle')
    } catch (err) {
      setError(err.message || 'Unable to sign out right now.')
      setAuthStatus('error')
    }
  }

  const isConfigured = Boolean(msalConfig.auth.clientId)
  const counties = useMemo(
    () => ['All Counties', ...new Set(programs.map((program) => program.county || 'Unspecified'))].sort(),
    [programs],
  )
  const types = useMemo(
    () => ['All Types', ...new Set(programs.map((program) => program.type || 'Unspecified'))].sort(),
    [programs],
  )

  const filteredPrograms = useMemo(() => {
    const term = search.toLowerCase().trim()
    return programs.filter((program) => {
      const matchesCounty = county === 'All Counties' || program.county === county
      const matchesType = type === 'All Types' || program.type === type
      const matchesSearch =
        !term ||
        program.name.toLowerCase().includes(term) ||
        program.town.toLowerCase().includes(term) ||
        program.county.toLowerCase().includes(term) ||
        program.contactName.toLowerCase().includes(term)
      return matchesCounty && matchesType && matchesSearch
    })
  }, [county, type, search, programs])

  const handleThreadPost = () => {
    const title = newThread.title.trim()
    const body = newThread.body.trim()
    if (!title || !body) return

    const author = account?.name || account?.username || 'Guest'
    const when = 'Just now'
    setThreads((prev) => [
      { id: crypto.randomUUID(), title, body, author, when, replies: 0 },
      ...prev,
    ])
    setNewThread({ title: '', body: '' })
  }

  const tabButton = (id, label, icon) => (
    <button
      className={`tab ${activeTab === id ? 'active' : 'ghost'}`}
      onClick={() => setActiveTab(id)}
    >
      <span className="tab-icon">{icon}</span>
      {label}
    </button>
  )

  const typeClass = (value) => {
    const key = (value || '').toLowerCase()
    if (key.includes('ltrp')) return 'pill-type-ltrp'
    if (key.includes('halfway')) return 'pill-type-half'
    if (key.includes('shelter')) return 'pill-type-shelter'
    return 'pill-type'
  }

  const genderClass = (value) => {
    const key = (value || '').toLowerCase()
    if (key.startsWith('male')) return 'pill-gender-male'
    if (key.startsWith('female')) return 'pill-gender-female'
    if (key.startsWith('co')) return 'pill-gender-coed'
    return 'pill-gender'
  }

  const openProgram = (program) => {
    setSelectedProgram(program)
    setEditProgram({ ...program })
    setCommentDraft('')
  }

  const handleAddProgram = () => {
    const blank = {
      id: crypto.randomUUID(),
      name: '',
      town: '',
      county: '',
      type: 'Sober',
      gender: 'Co-ed',
      beds: null,
      contactName: '',
      phone: '',
      email: '',
      status: 'Active',
    }
    openProgram(blank)
  }

  const handleSaveProgram = () => {
    if (!editProgram?.name) return
    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === editProgram.id)
      if (exists) {
        return prev.map((p) => (p.id === editProgram.id ? editProgram : p))
      }
      return [editProgram, ...prev]
    })
    setSelectedProgram(null)
    setEditProgram(null)
  }

  const handleAddComment = () => {
    if (!selectedProgram || !commentDraft.trim()) return
    const entry = {
      id: crypto.randomUUID(),
      author: account?.name || account?.username || 'Guest',
      text: commentDraft.trim(),
      timestamp: new Date().toLocaleString(),
    }
    setComments((prev) => ({
      ...prev,
      [selectedProgram.id]: [entry, ...(prev[selectedProgram.id] || [])],
    }))
    setCommentDraft('')
  }

  useEffect(() => {
    setPage(1)
  }, [search, county, type])

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">MA</div>
          <div>
            <p className="eyebrow">MA DOC</p>
            <h1>Reentry Database</h1>
          </div>
        </div>
        <nav className="tabs">
          {tabButton('directory', 'Directory', '📋')}
          {tabButton('activity', 'Activity Feed', '⚡')}
          {tabButton('talk', 'Housing Talk', '💬')}
        </nav>
        <div className="actions">
          <button className="ghost">Import CSV</button>
          <div className="user-chip">
            <div className="avatar">{account ? account.name?.[0] || 'U' : 'G'}</div>
            <div className="user-meta">
              <p className="label">{account ? account.name || account.username : 'Guest'}</p>
              <button
                className="link"
                onClick={account ? handleLogout : handleLogin}
                disabled={!isConfigured && !account}
              >
                {account ? 'Sign Out' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {activeTab === 'directory' && (
        <>
          <section className="controls">
            <div className="search">
              <span className="icon modern-search" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="6" />
                  <line x1="16.5" y1="16.5" x2="21" y2="21" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search programs, cities..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="select-row">
              <select value={county} onChange={(event) => setCounty(event.target.value)}>
                {counties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button className="primary" onClick={handleAddProgram}>
                <span className="btn-icon">＋</span>
                <span>Add Program</span>
              </button>
            </div>
          </section>

          <section className="table-card">
            <div className="table-head">
              <p className="muted">Program Name</p>
              <p className="muted">Town</p>
              <p className="muted">County</p>
              <p className="muted">Type</p>
              <p className="muted">Gender</p>
              <p className="muted">Beds</p>
              <p className="muted">Contact</p>
              <p className="muted">Phone</p>
              <p className="muted">Email</p>
              <p className="muted">Status</p>
            </div>
            <div className="table-body">
              {filteredPrograms.length === 0 ? (
                <div className="empty">
                  <p>No programs found. Try importing your data via CSV.</p>
                </div>
              ) : (
                filteredPrograms.slice((page - 1) * pageSize, page * pageSize).map((program) => {
                  const status = 'Active'
                  return (
                    <div key={program.id} className="row clickable" onClick={() => openProgram(program)}>
                      <div className="cell">
                        <p className="program-name">{program.name}</p>
                      </div>
                      <div className="cell">{program.town}</div>
                      <div className="cell">{program.county}</div>
                      <div className="cell">
                        <span className={`pill ${typeClass(program.type)}`}>{program.type || '—'}</span>
                      </div>
                      <div className="cell">
                        <span className={`pill ${genderClass(program.gender)}`}>{program.gender || '—'}</span>
                      </div>
                      <div className="cell">{program.beds ?? '—'}</div>
                      <div className="cell">{program.contactName}</div>
                      <div className="cell">{program.phone}</div>
                      <div className="cell">
                        {program.email ? (
                          <a className="email-link" href={`mailto:${program.email}`}>
                            Email
                          </a>
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="cell">
                        <span className="pill status success">{status}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

            <div className="table-footer">
              <p className="muted">
                Showing {Math.min((page - 1) * pageSize + 1, filteredPrograms.length)} to{' '}
                {Math.min(page * pageSize, filteredPrograms.length)} of {filteredPrograms.length}{' '}
                results
              </p>
              <div className="pager">
                <button
                  className="ghost square"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span className="muted">Page {page} of {Math.max(1, Math.ceil(filteredPrograms.length / pageSize))}</span>
              <button
                className="ghost square"
                onClick={() =>
                  setPage((prev) =>
                    Math.min(Math.ceil(filteredPrograms.length / pageSize) || 1, prev + 1),
                  )
                }
                disabled={page >= Math.ceil(filteredPrograms.length / pageSize)}
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'activity' && (
        <section className="panel">
          <div className="panel-head">
            <div className="title-row">
              <span className="spark">~</span>
              <h2>Activity Feed</h2>
            </div>
            <p className="muted">The feed starts fresh from now.</p>
          </div>
          {feedItems.length === 0 ? (
            <div className="empty-box">
              <p className="muted">No recent activity. Try adding a house or a note.</p>
            </div>
          ) : (
            <div className="feed-list">
              {feedItems.map((item) => (
                <div key={item.id} className="feed-card">
                  <div className="feed-meta">
                    <span className={`dot ${item.type}`} />
                    <p className="label">{item.by}</p>
                    <span className="muted">{item.when}</span>
                  </div>
                  <p className="feed-title">{item.title}</p>
                  <p className="muted">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'talk' && (
        <section className="talk">
          <div className="talk-form">
            <div className="title-row">
              <span className="bubble">💬</span>
              <h3>Start Discussion</h3>
            </div>
            <input
              type="text"
              placeholder="Topic Title"
              value={newThread.title}
              onChange={(event) => setNewThread((prev) => ({ ...prev, title: event.target.value }))}
            />
            <textarea
              rows="4"
              placeholder="What's on your mind?"
              value={newThread.body}
              onChange={(event) => setNewThread((prev) => ({ ...prev, body: event.target.value }))}
            />
            <button className="primary" onClick={handleThreadPost} disabled={!newThread.title.trim() || !newThread.body.trim()}>
              Post
            </button>
          </div>
          <div className="talk-list">
            {threads.length === 0 ? (
              <p className="empty">No discussions yet. Be the first!</p>
            ) : (
              threads.map((thread) => (
                <div key={thread.id} className="thread-card">
                  <p className="program-name">{thread.title}</p>
                  <p className="muted">{thread.body}</p>
                  <div className="thread-meta">
                    <span className="muted">By {thread.author}</span>
                    <span className="muted">{thread.when}</span>
                    <span className="pill subtle">{thread.replies} replies</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {!isConfigured && (
        <div className="alert inline">
          Set `VITE_AZURE_CLIENT_ID` to enable Microsoft sign-in for named comments.
        </div>
      )}
      {error && <div className="alert error inline">Error: {error}</div>}

      {selectedProgram && editProgram && (
        <div className="drawer">
          <div className="drawer-overlay" onClick={() => setSelectedProgram(null)} />
          <div className="drawer-panel">
            <div className="drawer-head">
              <h3>{editProgram.name ? 'Edit Program' : 'Add Program'}</h3>
              <button className="ghost square" onClick={() => setSelectedProgram(null)}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                <span>Program Name</span>
                <input
                  value={editProgram.name}
                  onChange={(e) => setEditProgram({ ...editProgram, name: e.target.value })}
                />
              </label>
              <label>
                <span>Town</span>
                <input
                  value={editProgram.town}
                  onChange={(e) => setEditProgram({ ...editProgram, town: e.target.value })}
                />
              </label>
              <label>
                <span>County</span>
                <input
                  value={editProgram.county}
                  onChange={(e) => setEditProgram({ ...editProgram, county: e.target.value })}
                />
              </label>
              <label>
                <span>Type</span>
                <input
                  value={editProgram.type}
                  onChange={(e) => setEditProgram({ ...editProgram, type: e.target.value })}
                />
              </label>
              <label>
                <span>Gender</span>
                <input
                  value={editProgram.gender}
                  onChange={(e) => setEditProgram({ ...editProgram, gender: e.target.value })}
                />
              </label>
              <label>
                <span>Beds</span>
                <input
                  type="number"
                  value={editProgram.beds ?? ''}
                  onChange={(e) =>
                    setEditProgram({ ...editProgram, beds: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </label>
              <label>
                <span>Contact</span>
                <input
                  value={editProgram.contactName}
                  onChange={(e) =>
                    setEditProgram({ ...editProgram, contactName: e.target.value })
                  }
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  value={editProgram.phone}
                  onChange={(e) => setEditProgram({ ...editProgram, phone: e.target.value })}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  value={editProgram.email}
                  onChange={(e) => setEditProgram({ ...editProgram, email: e.target.value })}
                />
              </label>
            </div>

            <div className="drawer-actions">
              <button className="primary" onClick={handleSaveProgram}>
                Save
              </button>
              <button className="ghost" onClick={() => setSelectedProgram(null)}>
                Cancel
              </button>
            </div>

            <div className="comments-panel">
              <div className="comments-head">
                <h4>Comments</h4>
                <span className="muted">
                  {(comments[selectedProgram.id] || []).length} update
                  {(comments[selectedProgram.id] || []).length === 1 ? '' : 's'}
                </span>
              </div>
              <textarea
                rows="3"
                placeholder="Add a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
              />
              <div className="comment-actions">
                <span className="muted">
                  Posting as {account?.name || account?.username || 'Guest'}
                </span>
                <button className="primary" onClick={handleAddComment} disabled={!commentDraft.trim()}>
                  Comment
                </button>
              </div>
              <div className="comment-list">
                {(comments[selectedProgram.id] || []).map((c) => (
                  <div key={c.id} className="comment">
                    <div className="comment-meta">
                      <strong>{c.author}</strong>
                      <span className="muted">{c.timestamp}</span>
                    </div>
                    <p>{c.text}</p>
                  </div>
                ))}
                {(comments[selectedProgram.id] || []).length === 0 && (
                  <p className="muted">No comments yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
