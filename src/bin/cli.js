#!/usr/bin/env node

const args = process.argv.slice(2);
const flag = args[0];

async function main() {
  if (flag === '--remove' || flag === 'remove') {
    const { remove } = await import('../install/remove.js');
    await remove();
  } else if (flag === '--status' || flag === 'status') {
    const { status } = await import('../install/status.js');
    await status();
  } else if (flag === '--restart' || flag === 'restart') {
    const { setup } = await import('../install/setup.js');
    await setup({ restart: true });
  } else {
    const { setup } = await import('../install/setup.js');
    await setup();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
