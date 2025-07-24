import TwitterApi, { TwitterApiReadWrite } from 'twitter-api-v2';
import * as dotenv from 'dotenv';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs';


export async function mediaTweet(client: TwitterApi, rwClient: TwitterApiReadWrite, imagePaths: string[], textContent: string) {
    try {
        const uploadPromises = imagePaths.map(p => client.v1.uploadMedia(p));
        const uploadResults = await Promise.all(uploadPromises);

        const mediaId = uploadResults;
        const createdTweet = await rwClient.v2.tweet({
            text: textContent,
            media: { media_ids: mediaId as [string]},
        });
        console.log("success");
        return createdTweet;
    } catch (e) {
        console.error(e);
    }
};

