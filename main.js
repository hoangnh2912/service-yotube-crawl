const puppeteer = require("puppeteer");
const fs = require("fs");
const config = {
  url: "https://www.youtube.com/channel/UC40matwhaoY44zR4bvTljYg",
};

async function autoScrollBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let timeEq = 0;
      let distance = 1000;
      let oldHeight = 0;
      let timer = setInterval(() => {
        window.scrollBy(distance, distance);
        const contentHeight = document.getElementsByClassName(
          "style-scope ytd-section-list-renderer"
        )[4].offsetHeight;
        if (oldHeight == contentHeight) timeEq++;
        else timeEq = 0;
        oldHeight = contentHeight;
        console.log(timeEq);
        if (timeEq >= 10) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

async function autoScrollTop(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 300;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(-distance, -distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

let dataCrawl = [];
const crawlPage = async (browser) => {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  await page.goto(`${config.url}`, {
    waitUntil: "networkidle2",
  });
  await page.evaluate(async () => {
    await document
      .getElementsByClassName("tab-content style-scope paper-tab")[1]
      .click();
  });
  await autoScrollBottom(page);
  const res = await page.evaluate(async () => {
    let arr = [];
    const videos = await document.getElementsByClassName(
      "yt-simple-endpoint inline-block style-scope ytd-thumbnail"
    );
    console.log("total video: " + videos.length);
    for (let i = 0; i < videos.length; i++) {
      arr.push(videos[i].href);
    }
    return arr;
  });
  dataCrawl = dataCrawl.concat(res);

  await page.close();
  return res;
};

puppeteer
  .launch({
    devtools: true,
    timeout: 0,
    // args: ["--no-sandbox"],
    // executablePath: "/usr/lib/chromium-browser/chromium-browser",
    // save: "",
  })
  .then(async (browser) => {
    console.log("Crawl page ");
    const data = await crawlPage(browser);
    console.log(data.length);
    // for (let j = 0; j < data.length; j++) {
    //   console.log("Item " + (j + i * data.length) + "/" + dataCrawl.length);
    //   const pg = await browser.newPage();
    //     await pg.setDefaultNavigationTimeout(0);
    //   await pg.goto(data[j].url, {
    //     waitUntil: "networkidle2",
    //   });
    //   try {

    //   } catch (error) {}

    //   await pg.close();
    // }
    fs.writeFileSync(`crawl.json`, JSON.stringify(data));
    console.log("saved file: ");
  });
