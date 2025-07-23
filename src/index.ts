import { BskyAgent, AtpAgent, RichText } from '@atproto/api';
import * as dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as process from 'process';
import * as path from 'path';
import readFileToString from './readFile';
import * as fs from 'fs';
import createVideoPost from './embedVideo';
import makeReplyContent from './makeReply';

dotenv.config();

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
    
    // await agent.post(
    //     await createVideoPost(textPath, videoPath, agent)
    // );

    const rTxt = new RichText({
        text: `#testing hashtag`,
    })
    await rTxt.detectFacets(agent);
    const recordObj = await agent.post({
        text: rTxt.text,
        facets: rTxt.facets
    })

    console.log("Just posted!")
    console.log(recordObj)
    
    // await agent.post({
    //     text: 'reply ok',
    //     reply: {
    //         root: recordObj,
    //         parent: recordObj
    //     }
    // })

    // console.log("Just replied!")    
}

main();
