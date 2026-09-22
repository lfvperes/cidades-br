import "dotenv/config";
import { AtpAgent } from '@atproto/api';
import * as process from 'process';
import { mediaSkeet } from './bsky';
import { buildWeeklyReportPlan, printWeeklyReportPlan, CityStats } from './weeklyReportContent';

const agent = new AtpAgent({
    service: 'https://bsky.social',
});

const isDryRun = process.argv.includes('--dry-run');

async function fetchCityStats(): Promise<CityStats> {
  const CITIES_API_ENDPOINT = process.env.CITIES_API_ENDPOINT!;
  const CITIES_STATS_ENDPOINT = CITIES_API_ENDPOINT.replace(/random\/?$/, 'stats/');

  const response = await fetch(CITIES_STATS_ENDPOINT);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

async function main() {
  if (isDryRun) {
    console.log('Running in --dry-run mode: nothing will be posted.\n');
  } else {
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME!,
        password: process.env.BLUESKY_PASSWORD!
    })
    console.log(`Logged in as ${agent.session?.handle}`);
  }

  let stats: CityStats;
  try {
    console.log('Fetching city stats...');
    stats = await fetchCityStats();
    console.log(`${stats.published} of ${stats.total} cities published.`);
  } catch (error) {
    console.error('Error fetching city stats:', error);
    return;
  }

  const plan = buildWeeklyReportPlan(stats);

  if (isDryRun) {
    printWeeklyReportPlan(plan);
    return;
  }

  await mediaSkeet(agent, [], [], plan.text);
  console.log(`Post successful on Bluesky!\n${plan.text}`);
}

main();
