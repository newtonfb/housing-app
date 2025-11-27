# Housing Resource Search

A modern, single-page housing inventory experience inspired by Airtable. It includes rich filters, sortable columns, quick capacity snapshots, a collaborative comment feed for each program, a unified activity feed, and a Housing Talk forum for open discussion.

## Features
- Filter by city, county, program type, specialization, gender, or free-text search
- Sort columns to quickly surface relevant programs
- Inline capacity and contact info for at-a-glance triage
- Detail drawer with notes plus a comment stream stored in the browser for quick team coordination
- Activity feed that highlights the most recent properties added and comment updates
- Housing Talk forum page for threads and Q&A

## Getting started
1. Open `index.html` in your browser. No build step required.
2. Use the filters or click any column heading to sort.
3. Select **View** on a row to see program details and post team updates. Comments persist locally in `localStorage` and are reflected in the activity feed.
4. Visit `talk.html` for the Housing Talk forum to create and view internal threads.

## Data
Sample program data lives in `data.js`. Replace or extend the array to wire in your own housing resources.
