const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

const wikiUrl = 'https://en.wikipedia.org/wiki/';

async function getWikiImage(name) {
  const response = await axios.get(wikiUrl + name);
  const html = response.data;
  const $ = cheerio.load(html);
  const imageUrl = await $('table.infobox').find('img').attr('src');
  return imageUrl;
}


async function getWikiImages(names, fileName) {
  let data = [];
  for (let i = 0; i < names.length; i++) {
    await delay(500);
    const name = names[i];
    const wikiName = name.split(" ").join("_");
    const imageUrl = await getWikiImage(wikiName);
    const formattedImageUrl = "https:" + imageUrl;

    if (imageUrl) {
      console.log({name, formattedImageUrl});
      data.push({
        name,
        imageUrl: formattedImageUrl
      });
    }
  }
  writeFile(data, fileName);
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

function readListsOfNames(category) {
  const file = fs.readFile("dataFiles/listsOfNames.json", "utf8", (err, data) => {
    if (err) throw err;
    // console.log(data);
    const listsOfNames = JSON.parse(data);
    const names = listsOfNames[category];
    getWikiImages(names, category);
  });
}

readListsOfNames("now");

// const fileName = 'celebrities';
// const file = fs.readFileSync(fileName + '.json', 'utf8');

// let data = JSON.parse(file);
// data = data.map(el => {
//   const name = el.name.split('_').join(' ');
//   return {
//     ...el,
//     name
//   }
// })

// fs.writeFile(fileName + '.json', JSON.stringify(data, null, 2), 'utf8', (err) => {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log('Data written to ' + fileName);
//   }
// });


// scrape(imdbTopActors, 'actors');
// scrape(imdbTopActresses, 'actresses');
// scrape(imdbMostPopular, 'celebrities');
