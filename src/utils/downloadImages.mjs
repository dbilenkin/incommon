import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Function to download an image
const downloadImage = async (url, filename, folder) => {
    const response = await fetch(url);
    const buffer = await response.buffer();
    fs.writeFileSync(path.join(folder, filename), buffer);
    console.log(`Downloaded ${filename}`);
};

const deckCategory = "celebrities";

// Main function
const downloadImages = async () => {
    // Read the JSON file
    const fileContent = fs.readFileSync(`dataFiles/${deckCategory}.json`);
    const actorList = JSON.parse(fileContent);

    // Create a directory for images
    const folder = './' + deckCategory;
    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder);
    }

    // Download and save each image
    actorList.forEach(({name, imageUrl}, index) => {
        const urlSplit = imageUrl.split(".");
        const fileExtension = urlSplit[urlSplit.length - 1];
        const underscoreName = name.split(" ").join("_");
        const filename = `${underscoreName}.${fileExtension}`; // Rename as you like
        downloadImage(imageUrl, filename, folder);
    });
};

// Run the script
downloadImages();
