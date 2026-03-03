const modules = [
  "System Status",
  "Sessions",
  "Conversation",
  "Activity Log",
  "Jobs / Reminders"
];

export function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <h1>OpenClaw Command Center</h1>
        <p>Day 1 scaffold: GUI shell connected to planned bridge contract.</p>
      </header>
      <section className="grid">
        {modules.map((label) => (
          <article className="card" key={label}>
            <h2>{label}</h2>
            <p>Coming in Day 2-4 implementation.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
