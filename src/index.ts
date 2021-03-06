import {
  generateImage,
  prepareSvg,
  launchPage,
  closePage,
  processVideo,
} from './video';
import {
  getTracksFromSoundcloud,
  getTranscodingForTrack,
  getStreamUrlFromTranscoding,
  Transcoding,
} from './audio';
import { getUnsplashPhoto } from './image';
import { videoLogger, pipe } from './lib/utils';
import { uploadVideo, connectToYoutube } from './upload';
import { init as initSentry } from '@sentry/node';
import config from './config';
const IMAGE_OUTPUT = '/tmp/out.png';
const VIDEO_OUTPUT = '/tmp/out.mp4';

if (process.env.NODE_ENV === 'production') {
  global.__rootdir__ = __dirname || process.cwd();

  initSentry({
    dsn: config.SENTRY_DSN,
  });
}

type TReturnValue = () => Promise<void>;

export const main: TReturnValue = async () => {
  try {
    const [youtubeClient, song] = await Promise.all([
      connectToYoutube(),
      getTracksFromSoundcloud(),
      launchPage(),
    ]);

    const streamUrl: string = await pipe<number, string>([
      getTranscodingForTrack,
      (transcoding: Transcoding): Promise<string> =>
        getStreamUrlFromTranscoding(transcoding, song.id),
    ])(song.id);

    // Define the property `media_url` on the track object with the value of `streamUrl`
    song.media_url = streamUrl;

    const image = await getUnsplashPhoto(song.tag_list);
    const svgContent = prepareSvg(
      image.urls.custom,
      song.title.replace(/(")|(')|(\.)/g, ''),
      song.user.username
    );

    await generateImage(IMAGE_OUTPUT, svgContent);
    await processVideo(VIDEO_OUTPUT, song, IMAGE_OUTPUT);
    const response = await uploadVideo(
      VIDEO_OUTPUT,
      song,
      image,
      youtubeClient
    );

    videoLogger(`Video has been uploaded!`);
    videoLogger(`Youtube video id - ${response.data.id}`);

    closePage();
  } catch (e) {
    await closePage();
    console.error(e);
    return Promise.reject(e);
  }
};
