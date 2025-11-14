# City Bot: A Multi-Platform Social Media Bot

This project is a TypeScript-based bot that posts data about Brazilian cities on both Bluesky and Twitter. It's primarily a portfolio project, created for fun and to demonstrate my skills in TypeScript, asynchronous programming, and modern software engineering practices.

## What it Does

The bot performs the following actions automatically:

1.  **Fetches a Random City**: It calls a custom API endpoint to get a random city from Brazil, including its name, state, and estimated population.
2.  **Gathers Visuals**: Using the Google Maps Static API and the Google Places API, it generates a map of the city and fetches relevant photos.
3.  **Posts to Social Media**: It formats the gathered information into a post and shares it on both Bluesky and Twitter, complete with alt text for images.
4.  **Provides Attribution**: To give credit where it's due, the bot posts a reply to its own posts, citing the data sources.

The entire process is automated using **GitHub Actions**, which runs the bot on a schedule.

## Project Highlights & Key Practices

This project was a great opportunity to work with a modern tech stack and apply key software engineering principles. Here are some of the practices demonstrated in this repository:

-   **Dependency Injection (DI)**: Instead of creating API clients within each function, they are instantiated once in `src/index.ts` and passed as arguments (injected) into the modules that need them (e.g., `bsky.ts`, `xitter.ts`). This decouples the code, improves modularity, and makes testing easier.

-   **Modularity and Single Responsibility Principle (SRP)**: The codebase is broken down into distinct modules, each with a clear responsibility: `index.ts` for orchestration, `bsky.ts` for Bluesky logic, `xitter.ts` for Twitter logic, and `googleMapsService.ts` for handling Google APIs.

-   **DRY (Don't Repeat Yourself)**: Logic for creating posts is encapsulated in reusable functions like `mediaSkeet` and `mediaTweet`. This avoids code duplication and makes the main execution flow in `index.ts` cleaner and more readable.

-   **CI/CD & Automation**: The project uses a GitHub Actions workflow (`.github/workflows/main.yml`) for automation. This workflow handles installing dependencies, building the project, and running the bot on a recurring schedule (`cron`), demonstrating a practical CI/CD pipeline.

-   **Git Workflow**: Development follows a standard branching strategy. Features (like adding Twitter support) are developed in a `dev` branch and then merged into `master` via Pull Requests, allowing for code review and a clean commit history.

-   **Secure Secret Management**: All API keys and credentials are kept out of the codebase. They are managed securely using GitHub Secrets and loaded into the environment at runtime, a critical security best practice.

-   **Code Refactoring for Maintainability**: The commit history shows a deliberate effort to improve the codebase over time by removing unused files, cleaning dependencies, and refactoring to implement better design patterns.
## Technologies Used

-   **Language**: TypeScript
-   **Runtime**: Node.js
-   **Social Media APIs**:
    -   Bluesky: `@atproto/api`
    -   Twitter: `twitter-api-v2`
-   **Data APIs**:
    -   `@googlemaps/google-maps-services-js` for Google Maps and Places.
    -   `fetch` for the custom Cities API.
-   **Automation**: GitHub Actions

## Project Structure

-   `src/index.ts`: The main entry point that orchestrates the entire process.
-   `src/bsky.ts`: Contains all functions related to Bluesky interactions.
-   `src/xitter.ts`: Contains all functions related to Twitter interactions.
-   `src/googleMapsService.ts`: Handles the logic for fetching and processing assets from Google's APIs.
-   `.github/workflows/main.yml`: Defines the CI/CD pipeline and the scheduled job for running the bot.

## Setup & Configuration

To run this project locally, you would need to:

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Create a `.env` file in the root of the project with the following variables:
    *   API keys for Bluesky, Twitter, Google Maps, and Google Places
    *   Any other required environment variables
4.  Configure the GitHub Actions workflow to run the bot on a schedule.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

