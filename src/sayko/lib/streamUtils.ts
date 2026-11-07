// @ts-nocheck
/**
 * SAYKO RACING INTELLIGENCE - Stream Utility & Embed Resolver
 * Converts live video URLs (Aparat, YouTube, HLS .m3u8, MP4) into proper embed players.
 * Resolves Aparat live channels like https://www.aparat.com/Asbdavani_app/live
 * to direct embed: https://www.aparat.com/embed/live/Asbdavani_app
 */

export type StreamKind = 'aparat-live' | 'aparat-video' | 'youtube' | 'direct-video' | 'generic-iframe';

export interface StreamResolution {
  kind: StreamKind;
  embedUrl: string;
  isDirectVideo: boolean;
  channelOrId?: string;
  title?: string;
}

/**
 * Resolves any stream URL into embeddable format
 */
export function resolveStreamUrl(rawUrl: string): StreamResolution {
  if (!rawUrl || !rawUrl.trim()) {
    // Default fallback to Asbdavani_app Aparat live
    return {
      kind: 'aparat-live',
      embedUrl: 'https://www.aparat.com/embed/live/Asbdavani_app?data[rnddiv]=sayko_aparat_live&data[responsive]=yes',
      isDirectVideo: false,
      channelOrId: 'Asbdavani_app',
    };
  }

  const url = rawUrl.trim();

  // 1. Direct video formats (.m3u8, .mp4, .webm, .ogg)
  const isDirect = /\.(m3u8|mp4|webm|ogg)(\?.*)?$/i.test(url);
  if (isDirect) {
    return {
      kind: 'direct-video',
      embedUrl: url,
      isDirectVideo: true,
    };
  }

  // 2. Aparat Live Streams
  // Patterns:
  // - https://www.aparat.com/Asbdavani_app/live
  // - https://www.aparat.com/live/Asbdavani_app
  // - https://www.aparat.com/embed/live/Asbdavani_app
  const aparatLiveMatch1 = url.match(/aparat\.com\/([^/?#]+)\/live(?:\/)?(?:$|[?#])/i);
  const aparatLiveMatch2 = url.match(/aparat\.com\/live\/([^/?#]+)(?:$|[?#])/i);
  const aparatLiveMatch3 = url.match(/aparat\.com\/embed\/live\/([^/?#]+)(?:$|[?#])/i);

  const aparatChannel = aparatLiveMatch1?.[1] || aparatLiveMatch2?.[1] || aparatLiveMatch3?.[1];
  if (aparatChannel) {
    return {
      kind: 'aparat-live',
      embedUrl: `https://www.aparat.com/embed/live/${aparatChannel}?data[rnddiv]=sayko_aparat_live&data[responsive]=yes`,
      isDirectVideo: false,
      channelOrId: aparatChannel,
    };
  }

  // 3. Aparat Recorded Video
  // Patterns:
  // - https://www.aparat.com/v/{hash}
  // - https://www.aparat.com/video/video/embed/videohash/{hash}/vt/frame
  const aparatVideoMatch = url.match(/aparat\.com\/v\/([^/?#]+)/i);
  if (aparatVideoMatch?.[1]) {
    const videoHash = aparatVideoMatch[1];
    return {
      kind: 'aparat-video',
      embedUrl: `https://www.aparat.com/video/video/embed/videohash/${videoHash}/vt/frame`,
      isDirectVideo: false,
      channelOrId: videoHash,
    };
  }

  // If already an Aparat embed
  if (url.includes('aparat.com/video/video/embed') || url.includes('aparat.com/embed/')) {
    return {
      kind: 'aparat-video',
      embedUrl: url,
      isDirectVideo: false,
    };
  }

  // 4. YouTube
  // Patterns:
  // - https://www.youtube.com/watch?v=XYZ
  // - https://youtu.be/XYZ
  // - https://www.youtube.com/embed/XYZ
  const ytMatch1 = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/i);
  if (ytMatch1?.[1]) {
    const ytId = ytMatch1[1];
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0`,
      isDirectVideo: false,
      channelOrId: ytId,
    };
  }

  if (url.includes('youtube.com/embed/')) {
    return {
      kind: 'youtube',
      embedUrl: url,
      isDirectVideo: false,
    };
  }

  // 5. Generic iframe embed URL
  return {
    kind: 'generic-iframe',
    embedUrl: url,
    isDirectVideo: false,
  };
}
