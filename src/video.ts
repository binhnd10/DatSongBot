import ffmpeg from 'fluent-ffmpeg';
import { Track } from './audio';
import { Browser, launch } from 'puppeteer';
import config from './config';
import path, { resolve } from 'path';

let window: Browser;

export const launchPage = async () => (window = await launch());

export const closePage = async () => window && (await window.close());

export const prepareSvg = (
  bgUrl: string,
  songName: string,
  artistName: string
) => {
  let textX = '10%';

  if (songName.length > 20) {
    textX = '2%';
  }
  return `
		<style>html,body{margin: 0; padding: 0;}</style>
		<link href="https://fonts.googleapis.com/css?family=Poppins&display=swap&text=${songName}${artistName}" rel="stylesheet">
		<svg viewBox="0 0 1920 1080" lang="en-US" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="bottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0" />
					<stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:.8;" />
				</linearGradient>
			</defs>
			<image href="${bgUrl}" x="0" y="0" width="100%" height="100%" />
			<rect x="0" y="40%" width="100%" height="60%" fill="url(#bottomGrad)"/>
			<text x="${textX}" style="font-family: 'Poppins', arial; font-weight: bold; font-size: 5em;" y="90%" fill="white">${songName}</text>
			<text x="${textX}" style="font-family: 'Poppins', arial; font-size: 3em; font-weight: 300;" y="95%" fill="white">${artistName}</text>
		</svg>
	`;
};

export const generateImage = async (content: string) => {
  console.log('prepping image');
  const page = await window.newPage();
  await page.setContent(content);
  await page.setViewport({ width: 1920, height: 1080, isLandscape: true });
  const imageBuffer = await page.screenshot({
    omitBackground: true,
    fullPage: true,
    path: resolve(__dirname, '../assets/out.png'),
  });
  console.log('image prepared');
  await window.close();

  return imageBuffer;
};

export const processVideo = (
  song: Pick<Track, 'duration' | 'download_url'>,
  image: string
): Promise<void> => {
  //@ts-ignore
  const processChain = ffmpeg(image)
    .inputFPS(30)
    .loop()
    .withSize('1920x1080')
    .input(song.download_url + `?client_id=${config.SOUNDCLOUD_CLIENT_ID}`)
    .outputOption('-shortest')
    .videoCodec('libx264')
    .videoBitrate(10000, true)
    .audioCodec('aac')
    .audioBitrate(384)
    .outputOption('-pix_fmt yuv420p')
    .outputFPS(30)
    .videoFilters(
      `fade=in:st=0:d=3,fade=out:st=${song.duration / 1000 - 2}:d=1`
    );

  return new Promise((resolve, reject) => {
    processChain
      .on('start', (cmd: string) => console.log(cmd))
      .on('progress', function(progress: { percent: number }) {
        console.log(progress);
      })
      .on('end', resolve)
      .on('error', reject)
      .save(path.resolve(__dirname, '../assets/out.mp4'));
  });
};
