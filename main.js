const puppeteer = require("puppeteer");
const fs = require("fs");
const { exec } = require("child_process");
const jsonexport = require("jsonexport");

exec("rm -rf ./crawl_data/*.json", (error, stdout, stderr) => {});

const config = {
  url: "https://www.youtube.com/results?search_query=",
  keyword: [
    "thối nát",
    "đảng",
    "tội ác đảng",
    "cộng sản",
    "việt nam cộng hòa",
    "VNCH",
  ],
  name_save_file:
    new Date()
      .toLocaleString()
      .split(":")
      .join("_")
      .split("/")
      .join("_")
      .split(",")
      .join("")
      .split(" ")
      .join("_") + ".json",
};

exec(
  "echo >> crawl_data/" + config.name_save_file + " []",
  (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    if (stdout) console.log(`stdout: ${stdout}`);
  }
);

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
        if (timeEq >= 20) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}

let dataCrawl = [];
const crawlPage = async (browser) => {
  for (let i = 0; i < config.keyword.length; i++) {
    const key = config.keyword[i];
    console.log("Crawl keyword:" + key);

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    await page.goto(`${config.url + key}`, {
      waitUntil: "networkidle2",
    });
    await page.evaluate(() => {
      document
        .getElementsByClassName(
          "style-scope ytd-toggle-button-renderer style-text"
        )[0]
        .click();
      document
        .getElementsByClassName("style-scope ytd-search-filter-renderer")[4]
        .click();
    });

    await autoScrollBottom(page);

    const res = await page.evaluate(() => {
      let arr = [];
      const videos = document.getElementsByClassName(
        "yt-simple-endpoint style-scope ytd-video-renderer"
      );
      console.log("total video: " + videos.length);
      for (let i = 0; i < videos.length; i++) {
        const youtubeChannel = document.getElementsByClassName(
          "yt-simple-endpoint style-scope yt-formatted-string"
        )[i * 2 + 1];

        arr.push({
          title: videos[i].textContent.trim(),
          url: videos[i].href,
          date: new Date().toISOString(),
          channelName: youtubeChannel.textContent,
          channelUrl: youtubeChannel.href,
        });
      }
      return arr;
    });
    console.log(res.length);
    let oldData = require("./crawl_data/" + config.name_save_file);
    dataCrawl = [...oldData, ...res];
    await fs.writeFile(
      "./crawl_data/" + config.name_save_file,
      JSON.stringify(dataCrawl),
      () => {}
    );
    console.log("saved file: " + key);
    await page.close();
  }
  return dataCrawl;
};

puppeteer
  .launch({
    devtools: false,
    timeout: 0,
    // args: ["--no-sandbox"],
    // executablePath: "/usr/lib/chromium-browser/chromium-browser",
    // save: "",
  })
  .then(async (browser) => {
    const data = await crawlPage(browser);
    jsonexport(data, async (err, csv) => {
      await fs.writeFile(
        "./crawl_data/" + config.name_save_file.replace(".json",".csv"),
        csv,
        () => {}
      );
    });

    exec(
      "hadoop fs -put crawl_data/" + config.name_save_file.replace(".json",".csv") + " /youtube-crawl",
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      }
    );
    await browser.close();
  });
