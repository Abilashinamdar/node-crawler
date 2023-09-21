# node-crawler

> Fast asynchronous NodeJS module for crawling/scraping a web through worker_threads.

[![npm package](https://nodei.co/npm/@abilashinamdar/node-crawler.png)](https://www.npmjs.com/package/@abilashinamdar/node-crawler)


[![Version][version-image]][download-url]
[![License][license-image]][download-url]

[version-image]: https://img.shields.io/npm/v/@abilashinamdar/node-crawler.svg
[license-image]: https://img.shields.io/npm/l/@abilashinamdar/node-crawler.svg
[download-url]: https://npmjs.com/package/@abilashinamdar/node-crawler

### Features
- Crawling on threads(CPU cores)
- Crawl images and links
- Configurable max threshold crawl
- Configurable retries
- Configurable request and retry delays
- Rotate proxies
- Bypass robots.txt

# Get started

## Install
```sh
npm i @abilashinamdar/node-crawler

    OR

yarn add @abilashinamdar/node-crawler
```


# Basic usage

```js
import crawl from "@abilashinamdar/node-crawler";

crawl(config, onEveryCrawl, onCrawlError, onCrawlComplete)
```


### config
Key | Type | Default | Value
--- | --- | --- | ---
url | String | - | 
crawl | Array<String> | ["links"] | ["links", "images"]
maxCrawl | Number | 0 | Acts as threshold value. Stops crawling once it reaches the maxCrawl. 0 represents no threshold.
maxRetries | Number | 0 | No. of times the request should be retried when fails.
allowExternalImages| Boolean | false | true/false. true allows crawler to pick image if it points to outside the origin/host
retryDelay| Number | 0 | in milliseconds. Delay between the retry requests.
useProxy| Boolean | false | true/false. true allows crawler to rotate some free proxies from [https://www.free-proxy-list.com](https://www.free-proxy-list.com)
proxies| Array<String> | [] | Crawler will rotate the proxies from the list rather than fetching free proxies. useProxy: true is mandatory.
skipRobotsFile| Boolean | false | true/false. true allows crawler to bypass the robots.txt check.
requestDelay| Number | 0 | in milliseconds. Delay between the concurrent requests.


### onEveryCrawl(value)
```js
onEveryCrawl will get triggered when crawler will crawl Link or Image.
It will be triggered with the value as object which is as follows:
{
    type: string,
    link: string,
    reason: string
}

type - It can be 'LINK' / 'IMAGE' / 'IGNORE'
reason - Description for the IGNORE type.
```


### onCrawlError(error)
```js
onCrawlError will get triggered when crawler get error while crawling.
It will be triggered with the error as sample object as below or JS Error object.

{
    type: string,
    link: string,
    reason: string
}

type - It will be 'DISALLOWED'
reason - Description for the DISALLOWED type. Basically occurs when robots.txt disallows the url.
```


### onCrawlComplete(value)
```js
onCrawlComplete will get triggered when crawler done with the crawling.
It will be triggered with the value as object which is as follows:

{
    links: Set<String>,
    images: Set<String>,
    ignored: Set<String>
}

links - List of links from the crawled url.
images - List of image links from the crawled url.
ignored - List of ignored links from the crawled url.

Note: After this trigger the thread will get exit and will be available for others.
```


# License
ISC
