<svelte:head>
  <title>Redis Job Box</title>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap"
  />
</svelte:head>

<script>
  import { onMount } from 'svelte';

  let jobs = [];
  let loading = true;
  let submitting = false;
  let error = '';
  let type = 'send-email';
  let payloadText = '{\n  "to": "demo@example.com"\n}';

  async function loadJobs() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      jobs = data.jobs ?? [];
    } catch (err) {
      error = 'Failed to load jobs. Is the API running?';
    } finally {
      loading = false;
    }
  }

  async function submitJob(event) {
    event.preventDefault();
    submitting = true;
    error = '';

    let payload = null;
    if (payloadText.trim()) {
      try {
        payload = JSON.parse(payloadText);
      } catch (err) {
        error = 'Payload must be valid JSON.';
        submitting = false;
        return;
      }
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to enqueue job.');
      }

      payloadText = payloadText.trim() ? payloadText : '{\n  "to": "demo@example.com"\n}';
      await loadJobs();
    } catch (err) {
      error = err.message || 'Failed to enqueue job.';
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    loadJobs();

    const source = new EventSource('/api/stream/jobs');
    source.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!payload?.id) return;

      const index = jobs.findIndex((job) => job.id === payload.id);

      if (index === -1) {
        if (payload.type && payload.createdAt) {
          jobs = [
            {
              id: payload.id,
              type: payload.type,
              status: payload.status || 'queued',
              createdAt: payload.createdAt,
              updatedAt: payload.updatedAt || payload.createdAt,
              payload: payload.payload || null
            },
            ...jobs
          ];
        } else {
          loadJobs();
        }
        return;
      }

      const existing = jobs[index];
      const updated = {
        ...existing,
        status: payload.status || existing.status,
        updatedAt: payload.updatedAt || existing.updatedAt
      };
      jobs = [...jobs.slice(0, index), updated, ...jobs.slice(index + 1)];
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  });
</script>

<main>
  <header>
    <div>
      <p class="eyebrow">Redis + Postgres Playground</p>
      <h1>Redis Job Box</h1>
      <p class="subhead">Queue work, watch status, and inspect durable history.</p>
    </div>
    <button class="ghost" on:click={loadJobs} disabled={loading}>
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  </header>

  <section class="panel">
    <h2>Enqueue a Job</h2>
    <form on:submit={submitJob}>
      <label>
        <span>Job type</span>
        <input
          type="text"
          bind:value={type}
          placeholder="send-email"
          autocomplete="off"
          required
        />
      </label>

      <label>
        <span>Payload (JSON)</span>
        <textarea bind:value={payloadText} rows="6" spellcheck="false"></textarea>
      </label>

      <div class="actions">
        <button class="primary" type="submit" disabled={submitting}>
          {submitting ? 'Enqueuing…' : 'Enqueue job'}
        </button>
        <div class="chips">
          <button type="button" on:click={() => (type = 'resize-image')}>Resize image</button>
          <button type="button" on:click={() => (type = 'send-email')}>Send email</button>
          <button type="button" on:click={() => (type = 'sync-crm')}>Sync CRM</button>
        </div>
      </div>
    </form>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </section>

  <section class="panel">
    <div class="panel-header">
      <h2>Recent Jobs</h2>
      <span class="muted">Newest first</span>
    </div>
    {#if loading}
      <p class="muted">Loading jobs…</p>
    {:else if jobs.length === 0}
      <p class="muted">No jobs yet. Enqueue one above.</p>
    {:else}
      <div class="jobs">
        {#each jobs as job}
          <article class="job">
            <div>
              <p class="job-type">{job.type}</p>
              <p class="job-id">{job.id}</p>
            </div>
            <div class="job-meta">
              <span class={`status ${job.status}`}>{job.status}</span>
              <p class="job-time">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    font-family: 'Space Grotesk', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    color: #0f172a;
    background: radial-gradient(circle at top left, #e0f2fe, transparent 45%),
      radial-gradient(circle at top right, #fef3c7, transparent 45%),
      #f8fafc;
  }

  main {
    max-width: 960px;
    margin: 3.5rem auto 5rem;
    padding: 0 1.5rem;
    display: grid;
    gap: 1.5rem;
  }

  h1 {
    font-size: clamp(2.4rem, 3vw, 3.2rem);
    margin: 0.5rem 0 0.75rem;
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.4rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369a1;
    margin: 0;
  }

  .subhead {
    color: #334155;
    margin: 0;
  }

  .panel {
    padding: 1.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
    animation: lift 0.6s ease both;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  form {
    display: grid;
    gap: 1rem;
  }

  label {
    display: grid;
    gap: 0.5rem;
    font-weight: 600;
    color: #0f172a;
  }

  label span {
    font-size: 0.9rem;
  }

  input,
  textarea {
    border-radius: 12px;
    border: 1px solid #cbd5f5;
    padding: 0.75rem 0.9rem;
    font-size: 1rem;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #f8fafc;
    color: #0f172a;
  }

  textarea {
    resize: vertical;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.7rem 1.4rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .primary {
    background: #0f172a;
    color: #ffffff;
  }

  .ghost {
    background: transparent;
    border: 1px solid #cbd5f5;
  }

  .chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .chips button {
    background: #e0f2fe;
    color: #075985;
  }

  .error {
    color: #b91c1c;
    margin: 0.5rem 0 0;
    font-weight: 600;
  }

  .jobs {
    display: grid;
    gap: 0.75rem;
  }

  .job {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .job-type {
    font-weight: 700;
    margin: 0 0 0.3rem;
  }

  .job-id {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
    margin: 0;
    color: #64748b;
  }

  .job-meta {
    text-align: right;
  }

  .status {
    display: inline-block;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status.queued {
    background: #fef9c3;
    color: #854d0e;
  }

  .status.running {
    background: #dbeafe;
    color: #1e40af;
  }

  .status.completed {
    background: #dcfce7;
    color: #166534;
  }

  .job-time {
    margin: 0.35rem 0 0;
    color: #64748b;
    font-size: 0.85rem;
  }

  .muted {
    color: #64748b;
    font-size: 0.95rem;
  }

  @media (max-width: 720px) {
    header {
      flex-direction: column;
      align-items: flex-start;
    }

    .job {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .job-meta {
      text-align: left;
    }
  }

  @keyframes lift {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
