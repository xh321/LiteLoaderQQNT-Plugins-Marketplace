const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const { promisify } = require("util");



const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

async function unzip(zipFilePath, outputFolderPath) {
    const zipData = await readFile(zipFilePath, "binary");
    const unzipData = await promisify(zlib.unzip)(Buffer.from(zipData).buffer);

    let offset = 0;

    while (offset < unzipData.length) {
        const signature = unzipData.readUInt32LE(offset);
        const fileNameLength = unzipData.readUInt16LE(offset + 26);
        const extraFieldLength = unzipData.readUInt16LE(offset + 28);
        const fileCommentLength = unzipData.readUInt16LE(offset + 30);
        const compressedSize = unzipData.readUInt32LE(offset + 20);
        const uncompressedSize = unzipData.readUInt32LE(offset + 24);

        const fileName = unzipData.slice(offset + 46, offset + 46 + fileNameLength).toString("utf8");

        if (fileName.charAt(fileName.length - 1) === "/") {
            // 文件夹
            const folderPath = path.join(outputFolderPath, fileName);
            await mkdir(folderPath, { recursive: true });
        } else {
            // 文件
            const fileData = unzipData.slice(offset + 46 + fileNameLength + extraFieldLength + fileCommentLength, offset + 46 + fileNameLength + extraFieldLength + fileCommentLength + compressedSize);
            const filePath = path.join(outputFolderPath, fileName);
            await writeFile(filePath, fileData);
        }

        offset += 46 + fileNameLength + extraFieldLength + fileCommentLength + compressedSize;
    }

    console.log("解压完成！");
}

module.exports = {
    unzip
};
