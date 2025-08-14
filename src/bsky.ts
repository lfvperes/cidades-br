import "dotenv/config";
import { AtpAgent, RichText } from '@atproto/api';
import * as fs from 'fs';
import sharp from 'sharp';

const MAX_IMAGE_SIZE_KB = 976.56;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_KB * 1024;

export async function mediaSkeet(agent: AtpAgent, imagePaths: string[], altTexts: string[], textContent: string) {
  console.log("Processing images for Bluesky...");

  const validUploads: { buffer: any; alt: string }[] = [];
  for (let i = 0; i < imagePaths.length; i++) {
    const path = imagePaths[i];
    const alt = altTexts[i];
    try {
      let imageBuffer = fs.readFileSync(path);

      if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
        console.warn(`Image "${path}" is too large, resizing...`);
        imageBuffer = await sharp(imageBuffer)
          .resize({ width: 2000, withoutEnlargement: true }) // Resize to max 2000px width, don't make small images larger
          .jpeg({ quality: 85 }) // Set JPEG quality
          .png({ compressionLevel: 9 }) // Set PNG compression
          .toBuffer();
      }

      if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
        console.error(`Skipping "${path}" - still too large after resizing.`);
        continue; // Skip to the next image
      }

      validUploads.push({ buffer: imageBuffer, alt: alt });
    } catch (error) {
      console.error(`Failed to process image "${path}":`, error);
    }
  }

  if (validUploads.length === 0) {
    console.warn("No valid images to upload. Posting text only.");
    const rTxtOnly = new RichText({ text: textContent });
    await rTxtOnly.detectFacets(agent);
    return agent.post({
      text: rTxtOnly.text,
      facets: rTxtOnly.facets,
      langs: ["pt-BR"],
    });
  }

  console.log(`Uploading ${validUploads.length} valid images...`);
  const uploadResults = await Promise.all(
    validUploads.map(upload => agent.com.atproto.repo.uploadBlob(upload.buffer))
  );

  const rTxt = new RichText({
      text: textContent,
  });
  await rTxt.detectFacets(agent);

  const recordObj = await agent.post({
    text: rTxt.text,
    facets: rTxt.facets,
    langs: ["pt-BR"],
    embed: {
      $type: "app.bsky.embed.images",
      images: uploadResults.map((res, i) => ({
        alt: validUploads[i].alt, // Use the matched alt text
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
