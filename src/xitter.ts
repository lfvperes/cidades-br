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

export async function mediaReplyTweet(
    client: TwitterApi,
    rwClient: TwitterApiReadWrite,
    imagePaths: string[],
    textContent: string,
    replyToTweetId: string
) {
    try {
        const mediaIds = imagePaths.length > 0
            ? await Promise.all(imagePaths.map(p => client.v1.uploadMedia(p)))
            : [];

        const createdTweet = await rwClient.v2.tweet({
            text: textContent,
            reply: { in_reply_to_tweet_id: replyToTweetId },
            ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds as [string] } } : {}),
        });
        console.log("success");
        return createdTweet;
    } catch (e) {
        console.error(e);
    }
};

