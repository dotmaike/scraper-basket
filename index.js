const express = require('express');
const PORT = process.env.PORT || 5000;
const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const mcache = require('memory-cache');
const app = express();

function cache(duration) {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url;
    let cachedBody = mcache.get(key);
    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = body => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
}

function getTeams($) {
  let teams = [];
  $('table tr > td:nth-child(2), table td:nth-child(3)').each(
    (index, element) => {
      var team = $(element)
        .text()
        .split('(')[0]
        .trim();
      if (team && !teams.includes(team)) {
        teams.push(team);
      }
    }
  );
  return teams.sort();
}

function getGames($, team, calendarUrl) {
  let games = [];
  const tree = $(`tr:contains("${team}")`);
  $(tree).each(function(index, element) {
    const hour = $(element)
      .find('td:first-child')
      .text()
      .trim();
    const local = $(element)
      .find('td:nth-child(2)')
      .text()
      .trim();
    const visitor = $(element)
      .find('td:nth-child(3)')
      .text()
      .split('(')[0]
      .trim();
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
    games.push({
      status: 'confirmed',
      htmlLink: calendarUrl,
      dateTime: `${dateTime} - ${hour}`,
      summary: 'Next Game',
      description: `${local} vs ${visitor}`,
      location: location
    });
  });
  return games;
}

app.locals.mainUrl = 'http://www.magnoliga7.com';
app.locals.url = `${app.locals.mainUrl}/index.php/calendario-de-juegos`;

app.use(require('body-parser').json(), (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.get('/teams', cache(3600), (req, res) => {
  const json = {
    calendar: {
      updated: moment()
        .tz('America/Mexico_City')
        .format(),
      timeZone: 'America/Mexico_City',
      teams: []
    }
  };
  request(app.locals.url, (error, response, html) => {
    if (!error) {
      let $ = cheerio.load(html);
      const calendarPath = $(html)
        .find('.cat-list-row1 > td > a')
        .attr('href');
      const calendarUrl = `${app.locals.mainUrl}${calendarPath}`;
      request(calendarUrl, (err, response, DOM) => {
        if (!err) {
          let $ = cheerio.load(DOM);
          const teams = getTeams($);
          json.calendar.teams = teams;
        }
        res.status(200).json(json);
      });
    }
  });
});

app.get('/teams/:team', cache(3600), (req, res) => {
  const team = req.params.team.toUpperCase();
  const json = {
    calendar: {
      updated: moment()
        .tz('America/Mexico_City')
        .format(),
      timeZone: 'America/Mexico_City',
      items: []
    }
  };
  request(app.locals.url, (error, response, html) => {
    if (!error) {
      let $ = cheerio.load(html);
      const calendarPath = $(html)
        .find('.cat-list-row1 > td > a')
        .attr('href');
      const calendarUrl = `${app.locals.mainUrl}${calendarPath}`;
      request(calendarUrl, (err, response, DOM) => {
        if (!err) {
          let $ = cheerio.load(DOM);
          json.calendar.items = getGames($, team, calendarUrl);
        }
        res.status(200).json(json);
      });
    }
  });
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
