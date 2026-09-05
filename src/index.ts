import { Client } from "@googlemaps/google-maps-services-js";
import "dotenv/config";
import { AtpAgent } from '@atproto/api';
import * as process from 'process';
import { processCity } from './googleMapsService';
import { fetchCityWikipediaData } from './wikipediaService';
import { mediaSkeet, simpleReplySkeet, mediaReplySkeet } from './bsky';
import { mediaTweet, mediaReplyTweet } from './xitter';
import { buildPostPlan, printPostPlan } from './postContent';
import { TwitterApi } from "twitter-api-v2";

// Create a Bluesky Agent 
const agent = new AtpAgent({
    service: 'https://bsky.social',
});
// Create a X Client
const xClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!
});
const rwxClient = xClient.readWrite;

// create a Google Maps Client
const client = new Client({});

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  if (isDryRun) {
    console.log('Running in --dry-run mode: nothing will be posted, and the city will not be marked as used.\n');
  } else {
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME!,
        password: process.env.BLUESKY_PASSWORD!
    })
    console.log(`Logged in as ${agent.session?.handle}`);
  }

  // --- Fetch Random City ---
  const CITIES_API_ENDPOINT = process.env.CITIES_API_ENDPOINT!;
  var randomCity: any;
  try {
    console.log('Fetching a random city...');
    const response = await fetch(CITIES_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ "update_used": !isDryRun })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    randomCity = await response.json();
    console.log(`City found: ${randomCity.name}`);
  } catch (error) {
    console.error('Error fetching city data:', error);
    return; // Exit if we can't get a city
  }

  // --- Generate Map/Photo Assets and Wikipedia Data in parallel ---
  const [assetPaths, wikiData] = await Promise.all([
    processCity(`${randomCity.name} ${randomCity.state}`),
    fetchCityWikipediaData(randomCity.name, randomCity.state)
  ]);

  if (assetPaths.length === 0) {
    console.log("No assets were generated. Aborting post.");
    return;
  }

  // --- Build post content ---
  const plan = buildPostPlan(randomCity, assetPaths, wikiData);
  const {
    mainText: textContent,
    mainAltTexts: altTexts,
    wikiTexts,
    wikiImagePaths,
    wikiAltTexts,
    creditsText: creditsContent,
  } = plan;

  if (isDryRun) {
    printPostPlan(plan);
    return;
  }

  // --- Post to Bluesky ---
  const skeet = await mediaSkeet(agent, assetPaths, altTexts, textContent)
  console.log(`Post successful on Bluesky!\n${textContent}\n`);

  // --- Post Wikipedia Reply(ies) (if available), split across posts if too long ---
  let lastBskyPost = skeet;
  for (let i = 0; i < wikiTexts.length; i++) {
    const images = i === 0 ? wikiImagePaths : [];
    const alts = i === 0 ? wikiAltTexts : [];
    lastBskyPost = await mediaReplySkeet(agent, skeet, lastBskyPost, images, alts, wikiTexts[i]);
    console.log(`Wikipedia reply ${i + 1}/${wikiTexts.length} successful on Bluesky!\n${wikiTexts[i]}`);
  }

  // --- Post Credits Reply ---
  await simpleReplySkeet(agent, skeet, lastBskyPost, creditsContent);
  console.log(`Reply successful on Bluesky!\n${creditsContent}`);

  // --- Post to Twitter ---
  const tweet = await mediaTweet(xClient, rwxClient, assetPaths, textContent);
  console.log(`Tweet successful on Twitter!\n${textContent}`);

  if (tweet) {
    let lastTweetId = tweet.data.id;

    // --- Post Wikipedia Reply(ies) (if available), split across posts if too long ---
    for (let i = 0; i < wikiTexts.length; i++) {
      const images = i === 0 ? wikiImagePaths : [];
      const wikiTweet = await mediaReplyTweet(xClient, rwxClient, images, wikiTexts[i], lastTweetId);
      console.log(`Wikipedia reply ${i + 1}/${wikiTexts.length} successful on Twitter!\n${wikiTexts[i]}`);
      if (wikiTweet) lastTweetId = wikiTweet.data.id;
    }

    // --- Post Credits Reply ---
    await xClient.v2.reply(creditsContent, lastTweetId);
    console.log(`Reply successful on Twitter!\n${creditsContent}`);
  }
}

main();
