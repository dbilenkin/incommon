import fs, { read } from 'fs';

const deckType = "celebrities";

const readFile = async () => {
  const data = [];
  const fileContent = fs.readFileSync(`dataFiles/${deckType}.json`);
  const items = JSON.parse(fileContent);
  for (let item of items) {
    const urlSplit = item.imageUrl.split(".");
    const fileExtension = urlSplit[urlSplit.length - 1].toLowerCase();
    const underscoreName = item.name.split(" ").join("_");
    const fileName = `${underscoreName}.${fileExtension}`; 
    data.push({
      name: item.name,
      imageUrl: fileName
    })
  }
  writeFile(data, deckType + "2");
}

function writeFile(data, fileName) {
  fs.writeFile('dataFiles/' + fileName + '.json', JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Data written to ' + fileName);
    }
  });
}

readFile();