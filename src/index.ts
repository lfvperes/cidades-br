import { BskyAgent, AtpAgent, RichText } from '@atproto/api';
import "dotenv/config";
import * as process from 'process';
import * as path from 'path';
import { TwitterApi } from 'twitter-api-v2';
import { mediaTweet } from './xitter';
import { mediaSkeet, simpleReplySkeet } from './bsky';

// Create a Bluesky Agent 
const agent = new AtpAgent({
    service: 'https://bsky.social',
  })

const textPath = path.join(__dirname, '../assets', 'text.txt');
const videoPath = path.join(__dirname, '../assets','video.mp4');

async function main() {
    await agent.login({
        identifier: process.env.BLUESKY_USERNAME!, 
        password: process.env.BLUESKY_PASSWORD!
    })
    console.log(`Logged in as ${agent.session?.handle}`);
    
    const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_SECRET!,
        accessToken: process.env.TWITTER_ACCESS_TOKEN!,
        accessSecret: process.env.TWITTER_ACCESS_SECRET!
    });
    const rwClient = client.readWrite;

    mediaSkeet(agent, [textPath, videoPath], ["text", "video"], "test from nodejs with 2 photos and hashtag #test");
    mediaTweet(client, rwClient, [textPath, videoPath]);
}

main();
