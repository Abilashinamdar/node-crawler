import { Worker } from "worker_threads";

const crawl = (config, onEveryCrawl, onCrawlError, onCrawlComplete) => {
  try {
    const worker = new Worker(new URL("crawler.js", import.meta.url), {
      workerData: {
        config,
      },
    });
    worker.on("message", (data) => {
      const { messageType, value } = data;
      if (messageType === "crawl") {
        onEveryCrawl && onEveryCrawl(value);
      }
      if (messageType === "complete") {
        onCrawlComplete && onCrawlComplete(value);
      }
      if (messageType === "error") {
        onCrawlError && onCrawlError(value);
      }
    });
    worker.on("error", (err) => {
      console.log("WORKER ERROR: ", err);
      onCrawlError && onCrawlError(err);
    });
    worker.on("exit", (code) => {
      console.log("WORKER EXIT: ", code);
      if (code !== 0) {
        const err = new Error(
          `Crawler has stopped working with exit code ${code}`
        );
        onCrawlError && onCrawlError(err);
      }
    });
  } catch (err) {
    console.log(err.message);
  }
};

export default crawl;
