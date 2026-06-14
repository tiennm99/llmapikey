export const metadata = { title: "Docs — llmapikey" };

/**
 * Static usage guide: how to call OpenRouter with the issued key.
 */
export default function DocsPage() {
  const model = "minimax/minimax-m3";

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
      <p>
        Your key is a standard OpenRouter API key. Base URL:{" "}
        <code>https://openrouter.ai/api/v1</code>. Authenticate with{" "}
        <code>Authorization: Bearer &lt;your-key&gt;</code>.
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
        <li>The key is shown only once at creation — store it somewhere safe.</li>
        <li>One key per GitHub account.</li>
      </ul>
    </main>
  );
}
