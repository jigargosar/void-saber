const fs = require('fs');
const readline = require('readline');

const INPUT = 'docs/conversation-dump/ecs-conversation-dump.jsonl';
const OUTPUT = 'docs/conversation-dump/ecs-conversation-summary.md';

async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity
  });

  const lines = [];

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    if (obj.type !== 'user' && obj.type !== 'assistant') continue;
    if (obj.isMeta) continue;

    const role = obj.type;
    const content = obj.message?.content;
    if (!content) continue;

    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed === '') continue;
      lines.push(formatMessage(role, trimmed));
    } else if (Array.isArray(content)) {
      const parts = [];

      for (const block of content) {
        if (block.type === 'text') {
          const t = block.text.trim();
          if (t) parts.push({ kind: 'text', text: t });
        } else if (block.type === 'thinking') {
          const t = block.thinking.trim();
          if (t) parts.push({ kind: 'thinking', text: t });
        }
        // drop tool_use, tool_result, image, etc.
      }

      if (parts.length === 0) continue;

      const output = [];
      for (const part of parts) {
        if (part.kind === 'thinking') {
          output.push(formatThinking(part.text));
        } else {
          output.push(formatMessage(role, part.text));
        }
      }
      lines.push(output.join('\n\n'));
    }
  }

  const md = lines.join('\n\n---\n\n') + '\n';
  fs.writeFileSync(OUTPUT, md, 'utf8');
  console.log(`Written ${lines.length} entries to ${OUTPUT} (${(Buffer.byteLength(md) / 1024).toFixed(1)} KB)`);
}

function formatMessage(role, text) {
  const prefix = role === 'user' ? '**User:**' : '**Assistant:**';
  return `${prefix}\n\n${text}`;
}

function formatThinking(text) {
  return `<details><summary>Thinking</summary>\n\n${text}\n\n</details>`;
}

main().catch(console.error);
