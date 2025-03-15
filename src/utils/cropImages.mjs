import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

const targetAspectRatio = 5 / 7;
const resizeWidth = 200;
const resizeHeight = 280;
const deckType = 'celebrities';

// Function to crop and resize an image
const cropAndResizeImage = async (filePath, outputFolder, index) => {
    try {
        const metadata = await sharp(filePath).metadata();
        const { width, height } = metadata;
        let newWidth, newHeight;

        // Calculate new dimensions to maintain a 5:7 aspect ratio
        if (width / height > targetAspectRatio) {
            newHeight = height;
            newWidth = Math.round(height * targetAspectRatio);
        } else {
            newWidth = width;
            newHeight = Math.round(width / targetAspectRatio);
        }

        // const outputFilename = `${deckType}-${index}.jpg`; // Format: deckType_index.jpg
        const outputFilename = filePath.split("/").pop();
        const outputPath = path.join(outputFolder, outputFilename);

        await sharp(filePath)
            .extract({ 
                width: newWidth, 
                height: newHeight, 
                left: Math.round((width - newWidth) / 2), 
                top: Math.round((height - newHeight) / 2)
            })
            .resize(resizeWidth, resizeHeight)
            .toFile(outputPath);

        console.log(`Processed ${outputFilename}`);
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
};

// Main function
const processImages = async () => {
    const inputFolder = `./dataFiles/${deckType}`; // Folder containing images
    const outputFolder = `./dataFiles/${deckType}/processed`; // Folder for processed images

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }

    const files = fs.readdirSync(inputFolder);
    let index = 0;

    for (const file of files) {
        const filePath = path.join(inputFolder, file);
        if (fs.statSync(filePath).isFile()) {
            await cropAndResizeImage(filePath, outputFolder, index);
            index++;
        }
    }
};

// Run the script
processImages();
