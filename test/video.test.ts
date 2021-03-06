import {
  launchPage,
  closePage,
  prepareSvg,
  generateImage,
  getDescription,
} from '../src/video';
import { puppeteer } from 'chrome-aws-lambda';
import { LaunchOptions } from 'puppeteer';
import fs from 'fs-extra';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { tracks, imageData } from './__fixtures__/index.fixture';
import { Track } from 'audio';

expect.extend({ toMatchImageSnapshot });

const PUPPETEER_OPTS: LaunchOptions = {
  args: ['-disable-sandbox', '–disable-setuid-sandbox'],
};

describe('video', () => {
  afterAll(async () => await closePage());
  describe('#launchPage', () => {
    let launchSpy: jest.SpyInstance;

    afterEach(async () => {
      await closePage();
    });

    beforeAll(() => {
      launchSpy = jest.spyOn(puppeteer, 'launch');
    });

    afterAll(() => jest.restoreAllMocks());

    it('create a new browser instance', async () => {
      await launchPage(PUPPETEER_OPTS);
      expect(launchSpy).toHaveBeenCalled();
    });
  });

  describe('#closePage', () => {
    let closePageSpy: jest.SpyInstance;

    beforeAll(async () => {
      const window = await launchPage(PUPPETEER_OPTS);
      closePageSpy = jest.spyOn(window, 'close');
    });

    afterAll(() => jest.restoreAllMocks());

    it('will close the browser', async () => {
      await closePage();
      expect(closePageSpy).toHaveBeenCalled();
    });
  });

  describe('#prepareSvg', () => {
    it('execute the template and return a svg string', () => {
      const svgString = prepareSvg('google.com', 'Sandstorm', 'Darude');
      expect(svgString).toMatchSnapshot();
    });
  });

  describe('#generateImage', () => {
    let svgStr: string;

    beforeAll(async () => {
      await launchPage(PUPPETEER_OPTS);
      svgStr = prepareSvg(
        'https://placehold.it/1920x1080',
        'Sandstorm',
        'Darude'
      );
    });

    it('generate a png image', async () => {
      await generateImage('/tmp/out.png', svgStr);
      const image = await fs.readFile('/tmp/out.png');
      jest.retryTimes(3);
      expect(image).toMatchImageSnapshot({
        customSnapshotIdentifier: 'sandstorm',
        failureThreshold: 2000,
        failureThresholdType: 'pixel',
      });
    });
  });

  describe('#getDescription', () => {
    it('generates a description string', () => {
      const description = getDescription(
        'Sandstorm',
        tracks[0] as Track,
        imageData
      );
      expect(description).toMatchSnapshot();
    });
  });
});
