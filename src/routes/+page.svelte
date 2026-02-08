<svelte:head>
  <title>Redis Job Box</title>
</svelte:head>

<main>
  <h1>Redis Job Box</h1>
  <p>Queue jobs, watch them run, and learn Redis-backed workflows.</p>

  <section>
    <h2>Coming Next</h2>
    <ul>
      <li>Job enqueue form</li>
      <li>Live status updates via Redis pub/sub</li>
      <li>Postgres-backed job history</li>
    </ul>
  </section>
</main>

<style>
  :global(body) {
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 0;
    background: #f8fafc;
    color: #0f172a;
  }

  main {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 1.5rem;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  section {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  ul {
    padding-left: 1.25rem;
  }
</style>
