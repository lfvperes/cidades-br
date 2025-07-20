import readFileToString from "./readFile";

function makeReplyContent(recordObj: any, textPath: string) {
    const textContent = readFileToString(textPath);
    return {
        text: textContent,
        createdAt: new Date().toISOString(),
        reply: {
            root: {
                uri: recordObj.uri,
                cid: recordObj.cid
            },
            parent: {
                uri: recordObj.uri,
                cid: recordObj.cid
            }
        }
    }
}

export default makeReplyContent