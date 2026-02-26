const fs = require('fs');
const readline = require('readline');

const INPUT = 'docs/conversation-dump/f5762b04-62db-4428-a28c-9487b9492eed.jsonl';
const OUTPUT = 'docs/conversation-dump/conversation.html';

async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity
  });

  const messages = [];

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    if (obj.type !== 'user' && obj.type !== 'assistant') continue;
    if (obj.isMeta) continue;

    const content = obj.message?.content;
    if (!content) continue;

    // Skip command messages
    if (typeof content === 'string') {
      if (content.startsWith('<command-name>') || content.startsWith('<local-command')) continue;
      if (content.trim() === '') continue;

      // Strip XML tags like <system-reminder>...</system-reminder>
      const cleaned = content.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
      if (cleaned === '') continue;

      messages.push({
        role: obj.message.role,
        content: cleaned,
        timestamp: obj.timestamp
      });
    } else if (Array.isArray(content)) {
      // Extract text parts, skip images (too large for HTML)
      const textParts = content
        .filter(p => p.type === 'text')
        .map(p => p.text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim())
        .filter(t => t !== '');

      const hasImage = content.some(p => p.type === 'image');

      if (textParts.length === 0 && !hasImage) continue;

      let combined = textParts.join('\n');
      if (hasImage) {
        combined = (combined ? combined + '\n' : '') + '[image attached]';
      }
      if (combined.trim() === '') continue;

      messages.push({
        role: obj.message.role,
        content: combined,
        timestamp: obj.timestamp
      });
    }
  }

  console.log(`Extracted ${messages.length} messages`);

  const dataJson = JSON.stringify(messages);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conversation</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #1a1a1a; color: #e0e0e0; font-family: monospace; font-size: 14px; padding: 16px; }
#chat { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.msg { max-width: 75%; padding: 8px 12px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; }
.user { align-self: flex-end; background: #2a4a2a; }
.assistant { align-self: flex-start; background: #2a2a2a; border: 1px solid #333; }
.ts { font-size: 10px; color: #666; margin-top: 4px; text-align: right; }
code { background: #111; padding: 1px 4px; border-radius: 3px; }
pre { background: #111; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }
pre code { background: none; padding: 0; }
</style>
</head>
<body>
<div id="chat"></div>
<script>
const data = ${dataJson};

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderContent(text) {
  let escaped = escapeHtml(text);

  // Code blocks
  escaped = escaped.replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) => {
    return '<pre><code>' + code + '</code></pre>';
  });

  // Inline code
  escaped = escaped.replace(/\`([^\`]+)\`/g, '<code>$1</code>');

  // Bold
  escaped = escaped.replace(/\\*\\*(.+?)\\*\\*/g, '<b>$1</b>');

  return escaped;
}

const chat = document.getElementById('chat');
data.forEach(m => {
  const div = document.createElement('div');
  div.className = 'msg ' + m.role;
  div.innerHTML = renderContent(m.content);

  const ts = document.createElement('div');
  ts.className = 'ts';
  ts.textContent = new Date(m.timestamp).toLocaleString();
  div.appendChild(ts);

  chat.appendChild(div);
});
</script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.log(`Written to ${OUTPUT} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(console.error);
