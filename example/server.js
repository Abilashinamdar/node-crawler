// server.js
// where your node app starts

// init project
import express from "express";
import crawl from "@abilashinamdar/node-crawler";
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use(express.json())    
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

app.post('/crawl', function(req, res) {
  const WEB_URL = req.body.url;

  res.writeHead(200, { "Content-Type": "text/html" });
  const config = {
    url: WEB_URL,
    allowExternalImages: true,
    maxCrawl: 0,
    crawl: ["links", "images"],
    // crawl: ["links"],
    useProxy: false,
    proxies: [],
    maxRetries: 3,
    retryDelay: 0,
    requestDelay: 0,
    skipRobotsFile: false,
  };
  crawl(
    config,
    (obj) => {
      if (obj.type === "IGNORE") {
        res.write(`<br/>IGNORED: <a href='${obj.link}'>${obj.link}</a>`);
      }
      if (obj.type === "LINK") {
        res.write(`<br/>LINK: <a href='${obj.link}'>${obj.link}</a>`);
      }
      if (obj.type === "IMAGE") {
        res.write(`<br/><img src='${obj.link}' style='max-width: 25%'/>`);
      }
    },
    (err) => {
      console.log(err);
    },
    () => {
      console.log("Request closed...");
      // res.writeHead(200);
      res.end();
    }
  );
})

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
