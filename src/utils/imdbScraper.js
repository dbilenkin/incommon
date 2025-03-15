const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'https://www.imdb.com/list/ls052283250/'; // Replace with your target URL

axios.get(url)
    .then(response => {
        const html = response.data;
        const $ = cheerio.load(html);
        let data = [];

        $('.lister-item.mode-detail').each((i, elem) => { // Replace '.item' with the actual class or element
            let name = $(elem).find('.lister-item-header a').text().trim();
            data.push({
                name: name, // Replace '.name' with the actual class or element
                imageUrl: $(elem).find('img').attr('src') // Find the image URL
            });
        });

        fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('Data written to data.json');
            }
          });

        console.log(data); // Outputs the scraped data
    })
    .catch(console.error);
    