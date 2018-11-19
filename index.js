const cron = require("node-cron");
const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const app = express();

app.get('/', function(req, res) {
  /* cron.schedule("* * * * *", function() {
    console.log("running a task every minute");
  }); */
  const mainUrl = 'http://www.magnoliga7.com';
  const url = `${mainUrl}/index.php/calendario-de-juegos`;
  const json = {
    calendar: {
      updated: moment().format(),
      timeZone: 'America/Mexico_City',
      items: []
    }
  };
  request(url, function(error, response, html) {
    if (!error) {
      let $ = cheerio.load(html);
      const calendarPath = $(html)
        .find('.cat-list-row1 > td > a')
        .attr('href');
      const calendarUrl = `${mainUrl}${calendarPath}`;
      request(calendarUrl, function(err, response, DOM) {
        if (!err) {
          let $ = cheerio.load(DOM);
          const tree = $('tr:contains("EPAM")');
          $(tree).each(function(index, element) {
            const hour = $(element)
              .find('td:first-child')
              .text()
              .trim();
            const challenger = $(element)
              .find('td:nth-child(3)')
              .text()
              .trim()
              .split('(')[0];
            const location = $(element)
              .closest('table')
              .prev()
              .text()
              .trim();
            const dateTime = $(element)
              .closest('table')
              .prev()
              .prev()
              .text();
            json.calendar.items.push({
              status: 'confirmed',
              htmlLink: calendarUrl,
              dateTime: `${dateTime} ${hour}`,
              summary: 'Next Game',
              description: `EPAM vs ${challenger}`,
              location: location
            });
          });
        }
        res.send(json);
      });
    }
  });
});

app.listen('3000');

console.log('Magic happens on port 3000');

exports = module.exports = app;
