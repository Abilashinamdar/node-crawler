import axios from "axios";
import { load } from "cheerio";

class Proxy {
  url =
    "https://www.free-proxy-list.com/?search=1&page={page}&port=&type%5B%5D=http&type%5B%5D=https&speed%5B%5D=2&speed%5B%5D=3&connect_time%5B%5D=2&connect_time%5B%5D=3&up_time=0";

  fetchProxies = async (page) => {
    try {
      let url = this.url.replace("{page}", page);
      const res = await axios.get(url);
      const $ = load(res.text);
      const proxyItems = [];
      let trs = $(
        "div.container > div.content-wrapper > div.section > div.table-responsive > table > tbody > tr"
      );
      trs.each(function (index, item) {
        let children = $(item).find("td:not(.report-cell)");
        let proxyItem = {};
        const countryName = $(children[2])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.ip = $(children[0]).text();
        proxyItem.port = $(children[1]).text();
        proxyItem.country = countryName;
        proxyItem.protocol = $(children[7]).text();
        proxyItem.connect_time = $(children[5])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.up_time = $(children[6])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.anon = $(children[7]).text();
        proxyItem.last_update = $(children[9]).text();
        proxyItem.speed_download = $(children[4])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.url = `${proxyItem.protocol}://${proxyItem.ip}:${proxyItem.port}`;
        proxyItems.push(proxyItem);
      });
    } catch (err) {
      console.log(err);
    }
    return proxyItems;
  };

  fetchProxies = async (url, page) => {
    const proxyItems = [];
    try {
      const res = await axios.get(url);
      const $ = load(res.data);
      let trs = $(
        "div.container > div.content-wrapper > div.section > div.table-responsive > table > tbody > tr"
      );
      trs.each(function (index, item) {
        let children = $(item).find("td:not(.report-cell)");
        let proxyItem = {};
        const countryName = $(children[2])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.ip = $(children[0]).text();
        proxyItem.port = $(children[1]).text();
        proxyItem.country = countryName;
        proxyItem.protocol = $(children[7]).text();
        proxyItem.connect_time = $(children[5])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.up_time = $(children[6])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.anon = $(children[8]).text();
        proxyItem.last_update = $(children[9]).text();
        proxyItem.speed_download = $(children[4])
          .text()
          .replace(/[\t\n]/g, "");
        proxyItem.url = `${proxyItem.protocol}://${proxyItem.ip}:${proxyItem.port}`;
        proxyItems.push(proxyItem);
      });
    } catch (err) {
      console.log(err);
    }
    return proxyItems;
  };

  get = (site) => {
    let url = site || this.url;
    url = url.replace("{page}", 1);
    return new Promise((resolve, reject) => {
      axios
        .get(url)
        .then((res) => {
          let $ = load(res.data);
          let pagerRaw = $("ul.pagination.content-list-pager > li.pager-item");
          let maxPageNum = pagerRaw.length - 4;
          let responseArray = [];
          for (let i = 1; i < maxPageNum + 1; i++)
            responseArray.push(this.fetchProxies(url, i));
          Promise.all(responseArray)
            .then(function (responses) {
              let results = [];
              for (let i = 0; i < responses.length; i++)
                results = results.concat(responses[i]);
              return results;
            })
            .then(function (results) {
              resolve(results);
            })
            .catch(function (err) {
              reject(err);
            });
        })
        .catch(function (err) {
          reject(err);
        });
    });
  };

  getByCountry = (countryName) => {
    return new Promise((resolve, reject) => {
      const url = this.url + `&country=${countryName}`;
      this.get(url)
        .then(function (res) {
          resolve(res);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  };
}

export default Proxy;
