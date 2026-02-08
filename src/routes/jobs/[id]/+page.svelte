<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let job = null;
  let loading = true;
  let error = '';

  async function loadJob(id) {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        throw new Error('Job not found');
      }
      job = await res.json();
    } catch (err) {
      error = err.message || 'Failed to load job.';
      job = null;
    } finally {
      loading = false;
    }
  }

  const unsubscribe = page.subscribe(($page) => {
    const id = $page.params.id;
    if (id) {
      loadJob(id);
    }
  });

  onMount(() => {
    return () => unsubscribe();
  });
</script>

<svelte:head>
  <title>Job Details • Redis Job Box</title>
</svelte:head>

<main>
  <a class="back" href="/">← Back to dashboard</a>
  <h1>Job Details</h1>

  {#if loading}
    <p class="muted">Loading job…</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if job}
    <section class="panel">
      <div class="header">
        <div>
          <p class="job-type">{job.type}</p>
          <p class="job-id">{job.id}</p>
        </div>
        <span class={`status ${job.status}`}>{job.status}</span>
      </div>

      <div class="grid">
        <div>
          <p class="label">Created</p>
          <p>{new Date(job.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p class="label">Updated</p>
          <p>{new Date(job.updatedAt).toLocaleString()}</p>
        </div>
        <div>
          <p class="label">Retries</p>
          <p>{job.retryCount ?? 0} / {job.maxRetries ?? 3}</p>
        </div>
      </div>

      <div>
        <p class="label">Payload</p>
        <pre>{JSON.stringify(job.payload, null, 2)}</pre>
      </div>

      {#if job.lastError}
        <div>
          <p class="label">Last Error</p>
          <pre>{job.lastError}</pre>
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 860px;
    margin: 3.5rem auto;
    padding: 0 1.5rem 3rem;
    display: grid;
    gap: 1.5rem;
  }

  h1 {
    margin: 0;
  }

  .back {
    color: #0f172a;
    text-decoration: none;
    font-weight: 600;
  }

  .panel {
    padding: 1.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .job-type {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0 0 0.4rem;
  }

  .job-id {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    margin: 0;
    color: #64748b;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .label {
    margin: 0 0 0.35rem;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
  }

  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 12px;
    overflow: auto;
    font-size: 0.9rem;
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .status {
    display: inline-block;
    padding: 0.35rem 0.8rem;
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

  .status.failed {
    background: #fee2e2;
    color: #991b1b;
  }

  .muted {
    color: #64748b;
  }

  .error {
    color: #b91c1c;
    font-weight: 600;
  }
</style>
