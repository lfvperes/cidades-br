import "dotenv/config";
import { AtpAgent } from '@atproto/api';
import * as process from 'process';
import { mediaSkeet } from './bsky';
import { simpleTweet } from './xitter';
import { buildWeeklyReportPlan, printWeeklyReportPlan, CityStats } from './weeklyReportContent';
import { TwitterApi } from "twitter-api-v2";

const agent = new AtpAgent({
    service: 'https://bsky.social',
});
const xClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!
});
const rwxClient = xClient.readWrite;

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

  await simpleTweet(rwxClient, plan.text);
  console.log(`Tweet successful on Twitter!\n${plan.text}`);
}

main();
