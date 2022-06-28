const fs = require('fs');
const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const dirList = fs.readdirSync('./').filter((path) => {
  if (path.includes('node_modules')) {
    return false;
  }
  if (path.includes('dist')) {
    return false;
  }
  return fs.statSync(path).isDirectory();
});

const pdfList = dirList.map((dir, index) => {
  return {
    fileName: `${dir.split('/').pop()}.pdf`,
    dir: path.join(__dirname, dir),
    index,
  };
});

const fileNameToNumber = (fileName) => {
  let preNum = fileName.split('.')[0];

  if (preNum.includes('-')) {
    preNum = preNum.split('-')[1];
  }
  if (!parseInt(preNum)) {
    preNum = preNum.replace(/[^0-9]/gi, '');
  }
  try {
    return parseInt(preNum) || -1;
  } catch (error) {}
  return 9999;
};

const app = express();
app.use(express.static('.'));
const serve = app.listen(3000, () => {
  console.log(`app listening on port ${3000}`);
});

const gen = async () => {
  const browser = await puppeteer.launch({
    // 关闭无头模式，方便我们看到这个无头浏览器执行的过程
    // headless: false,
    timeout: 30000, // 默认超时为30秒，设置为0则表示不设置超时
  });

  const page = await browser.newPage();

  page.setViewport({
    width: 2480,
    height: 3508,
  });

  for await (const pdf of pdfList) {
    let imageList = fs.readdirSync(pdf.dir);
    imageList = imageList
      .filter((fileName) => {
        {
          return !fileName.startsWith('.');
        }
      })
      .sort((pre, next) => {
        let preNum = fileNameToNumber(pre);
        let nextNum = fileNameToNumber(next);
        return preNum - nextNum;
      })

      .map((path) => `${pdf.dir.split('/').pop()}/${path}`);
    console.log(imageList);
    let file = {
      content: `<h1>${pdf.fileName}</h1> <br/> ${imageList
        .map((imgSrc) => {
          return `<img src="/${imgSrc}" width="100%"/>`;
        })
        .join('<br/>')}`,
    };

    app.get('/' + pdf.index, (req, res) => {
      res.send(file.content);
    });
  }

  for await (const pdf of pdfList) {
    await page.goto(`http://localhost:3000/${pdf.index}`);
    await page.pdf({
      path: path.join('dist', pdf.fileName),
      format: 'A4', // 保存尺寸
    });
  }
  console.log('全部完成');
  //   serve.close();
  //   browser.close();
};

gen();
