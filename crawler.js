import axios from "axios";
import RobotsParser from "robots-parser";
import { load } from "cheerio";
import { parentPort, workerData } from "worker_threads";
import Proxy from "./Proxy.js";

const fileExtensions = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "exe",
  "dmg",
  "iso",
  "apk",
];
const ignoreContentTypes = [
  "application",
  "image",
  "xml",
  "audio",
  "video",
  "css",
  "javascript",
];

const getRandomProxy = (config, freeProxies) => {
  const proxyList = config?.proxies?.length ? config?.proxies : freeProxies;
  return proxyList[Math.floor(Math.random() * proxyList.length)];
};

const formatLink = (link, mainUrl) => {
  if (link.startsWith("data:image")) {
    return link;
  }
  try {
    new URL(link);
    return link;
  } catch (err) {
    const combinedLink = new URL(link, mainUrl);
    return combinedLink.href;
  }
};

const isExternalLink = (link, mainUrl) => {
  const mainLink = new URL(mainUrl);
  return !link.startsWith(mainLink.origin);
};

const crawlHrefs = (params) => {
  const { mainUrl, $, hrefLinks, crawledLinks, nonCrawledLinks } = params;
  const links = $("body").find("a[href]");
  links.map((idx, link) => {
    let href = $(link).attr("href");
    href = formatLink(href, mainUrl);
    if (!hrefLinks.has(href)) {
      hrefLinks.add(href);
      postMessage("crawl", {
        link: href,
        type: "LINK",
      });
      if (!isExternalLink(href, mainUrl) && !crawledLinks.has(href)) {
        nonCrawledLinks.add(href);
      }
    }
  });
  console.log("hrefs", hrefLinks.size);
};

const crawlImages = (params) => {
  const { config, mainUrl, $, imageLinks } = params;
  const images = $("body").find("img[src]");
  images.map((idx, img) => {
    let imgSrc = $(img).attr("src");
    imgSrc = formatLink(imgSrc, mainUrl);
    if (!imageLinks.has(imgSrc)) {
      if (config.allowExternalImages || !isExternalLink(imgSrc, mainUrl)) {
        imageLinks.add(imgSrc);
        postMessage("crawl", {
          link: imgSrc,
          type: "IMAGE",
        });
      }
    }
  });
  console.log("images", imageLinks.size);
};

const postMessage = (type, obj) => {
  parentPort.postMessage({
    messageType: type,
    value: {
      ...obj,
    },
  });
};

const crawlSite = async (params) => {
  const {
    config,
    mainUrl,
    subUrl,
    crawledLinks,
    ignoredLinks,
    robotsParser,
    freeProxies,
  } = params;

  let proxy = null;
  if (config.useProxy) {
    proxy = getRandomProxy(config, freeProxies);
    proxy = {
      protocol: proxy.protocol,
      host: proxy.ip,
      port: proxy.port,
    };
  }

  try {
    const crawlingUrl = subUrl || mainUrl;

    //check if the URL is file extension then skip crawling
    const extension = crawlingUrl.split(".").pop();
    if (fileExtensions.includes(extension)) {
      console.log("Ignoring link", crawlingUrl);
      ignoredLinks.add(crawlingUrl);
      postMessage("crawl", {
        link: crawlingUrl,
        type: "IGNORE",
        reason: `Has extension ${extension}`,
      });
      return;
    }

    // check robots.txt file
    if (!config.skipRobotsFile) {
      const allowed = robotsParser.isAllowed(crawlingUrl);
      if (!allowed) {
        postMessage("error", {
          link: crawlingUrl,
          type: "DISALLOWED",
          reason: "This link is disallowed by robots.txt",
        });
        return;
      }
    }

    const res = await axios.get(crawlingUrl, {
      retry: config.maxRetries,
      retryDelay: config.retryDelay,
      ...(proxy && { proxy }),
    });
    // if the response has content-disposition header then it cannot be crawled
    if ("content-disposition" in res.headers) {
      console.log("Ignoring link", crawlingUrl);
      ignoredLinks.add(crawlingUrl);
      postMessage("crawl", {
        link: crawlingUrl,
        type: "IGNORE",
        reason: "Has content-disposition content-type",
      });
      return;
    }
    // if the response has content-type from the ignoreContentType then it cannot be crawled
    const contentType = res.headers["content-type"];
    if (contentType && ignoreContentTypes.includes(contentType.split("/")[0])) {
      console.log("Ignoring link", crawlingUrl);
      ignoredLinks.add(crawlingUrl);
      postMessage("crawl", {
        link: crawlingUrl,
        type: "IGNORE",
        reason: `Has ignorable content-type ${contentType}`,
      });
      return;
    }
    console.log("crawling...", crawlingUrl);
    const $ = load(res.data);

    crawledLinks.add(crawlingUrl);

    crawlHrefs({ ...params, $ });
    if (config.crawl.includes("images")) {
      crawlImages({ ...params, $ });
    }
  } catch (err) {
    console.log("error", err);
  }
};

const recursiveCrawl = async (params) => {
  console.log("inside recursiveCrawl");
  const { config, crawledLinks, nonCrawledLinks, ignoredLinks } = params;
  while (nonCrawledLinks.size) {
    const link = nonCrawledLinks.values().next().value;
    if (config.maxCrawl && crawledLinks.size >= config.maxCrawl) {
      break;
    }
    if (crawledLinks.has(link) || ignoredLinks.has(link)) {
      continue;
    }
    if (link) {
      if (config.requestDelay) {
        console.log(`waiting ${config.requestDelay / 1000 || 0} secs...`);
        await new Promise((resolve) => {
          setTimeout(resolve, config.requestDelay || 0);
        });
      }
      nonCrawledLinks.delete(link);
      await crawlSite({ ...params, subUrl: link });
    }
  }
};

const initInterceptor = () => {
  axios.interceptors.response.use(undefined, async (err) => {
    const { config, message } = err;
    if (!config || !config.retry) {
      return Promise.reject(err);
    }
    // retry while Network timeout or Network Error
    if (
      !(
        message.toLowerCase().includes("timeout".toLowerCase()) ||
        message.toLowerCase().includes("timedout".toLowerCase()) ||
        message.toLowerCase().includes("Network Error".toLowerCase())
      )
    ) {
      return Promise.reject(err);
    }
    config.retry -= 1;
    await new Promise((resolve) => {
      setTimeout(resolve, config.retryDelay || 0);
    });
    console.log("Retrying...");
    return axios(config);
  });
};

const start = async () => {
  initInterceptor();

  const { config } = workerData;
  const crawledLinks = new Set();
  const hrefLinks = new Set();
  const imageLinks = new Set();
  const nonCrawledLinks = new Set();
  const ignoredLinks = new Set();

  const mainUrl = config.url;
  const robotsUrl = `${new URL(mainUrl).origin}/robots.txt`;
  const robotsParser = new RobotsParser(robotsUrl);

  let freeProxies = [];
  if (config?.useProxy && !config?.proxies?.length) {
    const res = await new Proxy().getByCountry("India");
    freeProxies = res.filter((proxy) => proxy.anon === "High Anonymous");
  }

  const params = {
    mainUrl,
    subUrl: "",
    crawledLinks,
    hrefLinks,
    imageLinks,
    nonCrawledLinks,
    ignoredLinks,
    config,
    robotsParser,
    freeProxies,
  };

  await crawlSite(params);

  await recursiveCrawl(params);

  postMessage("complete", {
    links: hrefLinks,
    images: imageLinks,
    ignored: ignoredLinks,
  });
};

start();
