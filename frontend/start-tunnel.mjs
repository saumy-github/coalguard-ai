import { startTunnel } from 'untun';

async function main() {
  console.log('Starting Cloudflare tunnel for port 5173...');
  const tunnel = await startTunnel({ port: 5173 });
  const url = await tunnel.getURL();
  console.log('\n======================================================');
  console.log('CLOUDFLARE MOBILE URL:', url);
  console.log('======================================================\n');
}

main().catch(console.error);
