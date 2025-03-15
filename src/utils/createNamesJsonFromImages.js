const fs = require('fs');
const path = require('path');

// Folder containing the .jpg files
const folderPath = './dataFiles/celebrities'; // Replace with your folder path

// Output JSON file
const outputFilePath = './celebrities.json';

fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error('Error reading the directory:', err);
    return;
  }

  // Filter out only .jpg files

  // Create an array of objects with name and imageUrl properties
  const result = files.map(file => {
    const name = path.basename(file, path.extname(file)).replace(/_/g, ' ');
    return {
      name: name,
      imageUrl: file
    };
  });

  // Write the result to a JSON file
  fs.writeFile(outputFilePath, JSON.stringify(result, null, 2), 'utf8', err => {
    if (err) {
      console.error('Error writing to file:', err);
      return;
    }
    console.log('JSON file created successfully:', outputFilePath);
  });
});
