import "dotenv/config";
import { AtpAgent, RichText } from '@atproto/api';
import * as fs from 'fs';

export async function mediaSkeet(agent: AtpAgent, imagePaths: string[], altTexts: string[], textContent: string) {
  // --- Upload Images in Parallel ---
  console.log("Uploading images to Bluesky...");
  const uploadPromises = imagePaths.map(p => agent.com.atproto.repo.uploadBlob(fs.readFileSync(p)));
  const uploadResults = await Promise.all(uploadPromises);

  const rTxt = new RichText({
      text: textContent,
  })
  await rTxt.detectFacets(agent);
  const recordObj = await agent.post({
    text: rTxt.text,
    facets: rTxt.facets,
    langs: ["pt-BR"],
    embed: {
      $type: "app.bsky.embed.images",
      images: uploadResults.map((res, i) => ({
        alt: altTexts[i],
        image: res.data.blob,
      }))
    }
  });

  return recordObj;
}

export async function simpleReplySkeet(agent: AtpAgent, recordObj: { uri: string; cid: string }, textContent: string) {
  await agent.post({
    text: textContent,
    reply: {
        root: recordObj,
        parent: recordObj
    }
  });
}