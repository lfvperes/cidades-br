import * as fs from 'fs';

// Function to read a .txt file and return its content as a string
export function readFileToString(filePath: string): string {
    try {
        // Read the file synchronously
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent;
    } catch (error) {
        console.error(`Error reading file from disk: ${error}`);
        return '';
    }
}

export function separateTwoLines(textPath: string) {
    const fileContent = readFileToString(textPath);
    const lines = fileContent.split('\n').map(line => line.trim());
    return lines;
}
 export default readFileToString;