const express = require("express");
const PORT = process.env.PORT || 5000;
const request = require("request");
const cheerio = require("cheerio");
const moment = require("moment-timezone");
const mcache = require("memory-cache");

const cache = duration => {
  return (req, res, next) => {
    let key = "__express__" + req.originalUrl || req.url;
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
};

express()
  .use(require("body-parser").json(), function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  })
  .get("/", cache(10), (req, res) => {
    const mainUrl = "http://www.magnoliga7.com";
    const url = `${mainUrl}/index.php/calendario-de-juegos`;
    const json = {
      calendar: {
        updated: moment()
          .tz("America/Mexico_City")
          .format(),
        timeZone: "America/Mexico_City",
        items: []
      }
    };
    request(url, function(error, response, html) {
      if (!error) {
        let $ = cheerio.load(html);
        const item = Object.keys(
          $(html).find('[class^="cat-list-row"] > td > a')
        ).filter(i =>
          $(result[i])
            .attr("href")
            .includes("semana")
        );
        const calendarPath = $(result[item[0]]).attr('href');
        const calendarUrl = `${mainUrl}${calendarPath}`;
        request(calendarUrl, function(err, response, DOM) {
          if (!err) {
            let $ = cheerio.load(DOM);
            const tree = $('tr:contains("EPAM")');
            $(tree).each(function(index, element) {
              const hour = $(element)
                .find("td:first-child")
                .text()
                .trim();
              const local = $(element)
                .find("td:nth-child(2)")
                .text()
                .trim();
              const visitor = $(element)
                .find("td:nth-child(3)")
                .text()
                .split("(")[0]
                .trim();
              const location = $(element)
                .closest("table")
                .prev()
                .text()
                .trim();
              const dateTime = $(element)
                .closest("table")
                .prev()
                .prev()
                .text();
              json.calendar.items.push({
                status: "confirmed",
                htmlLink: calendarUrl,
                dateTime: `${dateTime} - ${hour}`,
                summary: "Next Game",
                description: `${local} vs ${visitor}`,
                location: location
              });
            });
          }
          res.status(200).json(json);
        });
      }
    });
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
