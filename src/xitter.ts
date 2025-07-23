import TwitterApi from 'twitter-api-v2';
import * as dotenv from 'dotenv';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();
const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!
});

const rwClient = client.readWrite;

export async function mediaTweet(imagePaths: string[]) {
    try {
        const uploadPromises = imagePaths.map(p => client.v1.uploadMedia(p));
        const uploadResults = await Promise.all(uploadPromises);

        const mediaId = uploadResults;
        const createdTweet = await rwClient.v2.tweet({
            text: "test from nodejs with 2 photos and hashtag #test",
            media: { media_ids: mediaId as [string]},
        });
        console.log("success");
        return createdTweet;
    } catch (e) {
        console.error(e);
    }
};

