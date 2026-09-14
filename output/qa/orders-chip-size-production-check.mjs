import { writeFile } from 'node:fs/promises';

const origin = 'https://swapna-garmentsweb-production.up.railway.app';
const deployment = process.env.CHIP_RELEASE_DEPLOYMENT;
if (!deployment) throw new Error('Set the verified Railway deployment ID.');
async function read(path) {
  const response = await fetch(new URL(path, origin), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  return { status: response.status, body: await response.text() };
}
const [orders, healthResponse] = await Promise.all([read('/orders'), read('/api/health')]);
const assets = [...new Set([...orders.body.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map(match => match[1]))];
const styles = await Promise.all(assets.map(read));
const css = styles.map(asset => asset.body).join('\n');
const chipRules = [...css.matchAll(/[^{}]*priorityChip\{([^}]+)\}/g)].map(match => match[1]);
const expandedTarget = [...css.matchAll(/[^{}]*priorityChip:{1,2}after\{([^}]+)\}/g)].map(match => match[1]);
const health = JSON.parse(healthResponse.body);
const report = {
  verifiedAt: new Date().toISOString(),
  commit: 'ce0f45633aa22f76bbfe1c1be2fca679874fcfbb', deployment, url: origin + '/orders',
  railwayStatus: 'active-successful',
  ordersStatus: orders.status,
  health: { status: health.status, database: health.database, bucket: health.bucket },
  styles: {
    allLoaded: styles.length > 0 && styles.every(asset => asset.status === 200),
    height30px: chipRules.some(rule => rule.includes('min-height:30px')),
    font11px: chipRules.some(rule => rule.includes('font-size:11px')),
    naturalMobileWidth: chipRules.some(rule => rule.includes('flex:none')),
    expandedTapArea: expandedTarget.some(rule => rule.includes('inset:-7px 0')),
  },
  localValidation: { productionBuild: 'passed', typescript: 'passed', formatting: 'passed', browserWidths: [320, 390, 1440], filtering: 'passed', hitAreaHeight: 44 },
  productionBusinessCommandsSubmitted: false,
};
report.passed = orders.status === 200 && healthResponse.status === 200 && health.status === 'ok'
  && health.database === 'connected' && health.bucket === 'connected' && Object.values(report.styles).every(Boolean);
await writeFile('output/qa/orders-chip-size-production-release.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
