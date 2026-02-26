const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('docs/conversation-dump/ecs-conversation-dump.jsonl'),
  crlfDelay: Infinity
});
const otherTypes = {};
rl.on('line', (line) => {
  const obj = JSON.parse(line);
  if (obj.type !== 'user') return;
  const content = obj.message?.content;
  if (Array.isArray(content)) {
    content.forEach(b => {
      if (b.type !== 'text' && b.type !== 'image') {
        otherTypes[b.type] = (otherTypes[b.type] || { count: 0, totalLen: 0 });
        otherTypes[b.type].count++;
        otherTypes[b.type].totalLen += JSON.stringify(b).length;
      }
    });
  }
});
rl.on('close', () => {
  console.log('Other block types in user messages:');
  Object.entries(otherTypes).forEach(([type, info]) => {
    console.log(type + ':', info.count, 'blocks,', (info.totalLen / 1024).toFixed(1), 'KB');
  });
  if (Object.keys(otherTypes).length === 0) console.log('(none)');
});
