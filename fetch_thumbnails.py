"""Pull the latest 30 long-form videos (title + thumbnail) from each reference
channel and write them to thumbnails.js for the Thumbnails tab.
(A .js file rather than .json so the page also works when opened straight from disk.)

Run:  py fetch_thumbnails.py
Needs yt-dlp (pip install yt-dlp). Edit CHANNELS to add or remove channels.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yt_dlp

CHANNELS = ['@AndrewPaul1', '@danieldalen', '@GregLaVecchia', '@inside.outline', '@LifeOfRiza', '@sleepycharliee']
PER_CHANNEL = 30
OUT = Path(__file__).with_name('thumbnails.js')


def fetch_channel(handle):
    opts = {'extract_flat': True, 'playlistend': PER_CHANNEL, 'quiet': True, 'no_warnings': True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/{handle}/videos', download=False)
    videos = [
        {'id': e['id'], 'title': e.get('title') or ''}
        for e in (info.get('entries') or []) if e and e.get('id')
    ][:PER_CHANNEL]
    if not videos:
        raise RuntimeError(f'No videos found for {handle}')
    name = (info.get('channel') or info.get('uploader') or handle).removesuffix(' - Videos')
    return {'handle': handle, 'name': name, 'videos': videos}


def main():
    # Sequential on purpose: yt-dlp's plugin registry isn't thread-safe.
    channels = [fetch_channel(h) for h in CHANNELS]
    channels.sort(key=lambda c: c['handle'].lstrip('@').lower())
    data = {'updated': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'channels': channels}
    OUT.write_text('window.THUMBNAILS_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    for c in channels:
        print(f"{c['handle']}: {len(c['videos'])} videos ({c['name']})")


if __name__ == '__main__':
    sys.exit(main())
