import * as dotenv from 'dotenv'; // Import dotenv
dotenv.config();

describe('Environment Variables', () => {
  it('should have BLUESKY_USERNAME defined', () => {
    expect(process.env.BLUESKY_USERNAME).toBeDefined();
  });

  it('should have BLUESKY_PASSWORD defined', () => {
    expect(process.env.BLUESKY_PASSWORD).toBeDefined();
  });
});