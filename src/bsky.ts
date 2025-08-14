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
      const originalSize = imageBuffer.length;

      if (originalSize > MAX_IMAGE_SIZE_BYTES) {
        console.warn(`Image "${path}" is too large (${(originalSize / 1024).toFixed(2)} KB). Attempting iterative compression...`);

        let quality = 75; // Start with a moderate quality
        let currentBuffer = imageBuffer; // Use a new variable to hold the buffer being processed

        // Keep compressing until the buffer is small enough or quality is too low
        while (currentBuffer.length > MAX_IMAGE_SIZE_BYTES && quality > 10) {
          console.log(`Attempting compression with quality: ${quality}`);
          
          // Process the image using sharp
          const resizedSharpOutput = await sharp(currentBuffer) // Use currentBuffer here
            .jpeg({ quality: quality, progressive: true })
            // .png({ compressionLevel: 9 }) // If you primarily use PNGs, you'd adjust this.
            .toBuffer();
          
          // **CORRECTED FIX**: Create a standard buffer from sharp's output
          currentBuffer = Buffer.from(resizedSharpOutput); 

          quality -= 10; // Decrease quality for the next iteration
      }

        // Final check: if still too large after compression, skip
        if (currentBuffer.length > MAX_IMAGE_SIZE_BYTES) {
          console.error(`Skipping "${path}" - still too large (${(currentBuffer.length / 1024).toFixed(2)} KB) after iterative compression.`);
          continue; // Give up and skip to the next image
    }
        
        // Use the successfully compressed buffer
        imageBuffer = currentBuffer;
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