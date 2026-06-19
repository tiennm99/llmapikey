import { isProjectLive, projectPendingMessage } from "@/lib/project-status";

export const metadata = { title: "Docs — llmapikey" };
export const dynamic = "force-dynamic";

/**
 * Static usage guide: how to call OpenRouter with the issued key.
 */
export default function DocsPage() {
  const model = "minimax/minimax-m3";
  const projectLive = isProjectLive();

  const curlExample = `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer $OPENROUTER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{ "role": "user", "content": "Hello!" }]
  }'`;

  const jsExample = `const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENROUTER_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);`;

  return (
    <main>
      <h1>Using your key</h1>
      {!projectLive && (
        <div className="panel status-panel">
          <p className="warn">Project status: pending.</p>
          <p className="muted">{projectPendingMessage()}</p>
        </div>
      )}
      <p>
        {projectLive ? "Your key is" : "Previously issued keys are"} a standard
        OpenRouter API key. Base URL: <code>https://openrouter.ai/api/v1</code>.
        Authenticate with <code>Authorization: Bearer &lt;your-key&gt;</code>.
      </p>

      <h2>Model</h2>
      <p>
        <code>{model}</code>
      </p>

      <h2>curl</h2>
      <pre>{curlExample}</pre>

      <h2>JavaScript (fetch)</h2>
      <pre>{jsExample}</pre>

      <h2>Limits</h2>
      <ul>
        <li>Capped at $10/day, resetting daily.</li>
        <li>
          {projectLive
            ? "Your key is stored — copy it again anytime from your dashboard."
            : "Stored-key retrieval is paused while the project is pending."}
        </li>
        <li>One key per GitHub account.</li>
      </ul>
    </main>
  );
}
