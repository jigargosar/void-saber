const fs = require('fs');
const readline = require('readline');

const INPUT = 'docs/conversation-dump/f5762b04-62db-4428-a28c-9487b9492eed.jsonl';
const OUTPUT = INPUT; // overwrite in place

const MARKER = 'ECS (option 7).';

async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity
  });

  const lines = [];
  let found = false;

  for await (const line of rl) {
    if (found) {
      lines.push(line);
      continue;
    }

    try {
      const obj = JSON.parse(line);
      const content = obj.message?.content;
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.filter(p => p.type === 'text').map(p => p.text).join('\n')
          : '';

      if (text.includes(MARKER)) {
        found = true;
        lines.push(line); // include the marker message itself
      }
    } catch {
      // non-JSON line, skip if before marker
    }
  }

  if (!found) {
    console.error('Marker not found in file!');
    process.exit(1);
  }

  console.log(`Trimmed: keeping ${lines.length} lines (from marker onward)`);
  fs.writeFileSync(OUTPUT, lines.join('\n') + '\n', 'utf8');
  console.log(`Written to ${OUTPUT}`);
}

main().catch(console.error);
