import { BskyAgent } from '@atproto/api';
import readFileToString from './readFile';
import * as fs from 'fs';

async function createVideoPost(textPath: string, videoPath: string, agent: BskyAgent) {

    const textContent = readFileToString(textPath);
    console.log("Text uploaded...")
    const { data } = await agent.com.atproto.repo.uploadBlob(
        fs.readFileSync(videoPath),
    );
    console.log("Video uploaded, sending data...")
    
    return {
        text: textContent,
        langs: ["en"],
        embed: {
            $type: "app.bsky.embed.video",
            video: data.blob,
            aspectRatio: {
                width: 360,
                height: 640
            },
        }
    }
}

export default createVideoPost