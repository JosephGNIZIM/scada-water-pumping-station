const { execFileSync } = require('child_process');
const output = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
const ports = [3000, 3001, 3002, 3003];
for (const line of output.split(/\r?\n/)) {
  if (ports.some((port) => line.includes(`:${port}`))) {
    console.log(line);
  }
}
