const path = require('path')
const mm = require('music-metadata')
const axios = require('axios')
const fs = require('fs-extra')

async function searchSong (title, artist) {
  const { data } = await axios.default({
    baseURL: 'https://songsearch.kugou.com/',
    url: `/song_search_v2?keyword=${ encodeURI(title + ' ' + artist) }`,
  })
  if (data.status) {
    const { lists } = data.data
    if (lists instanceof Array) {
      return lists
    } else {
      throw Error('没找到歌曲')
    }
  } else {
    throw Error('没找到歌曲')
  }
}

async function getLrcContent (hash) {
  const { data } = await axios.default({
    baseURL: 'https://wwwapi.kugou.com',
    url: `/yy/index.php?r=play/getdata&hash=${hash}`,
  })
  if (data.status) {
    return data.data.lyrics
  } else {
    throw Error('没找到歌词')
  }
}

async function downlrc (file) {
  const mdata = await mm.parseFile(file)
  const { title, artist, album } = mdata.common
  const songs = await searchSong(title, artist)
  for (let song of songs) {
    const { SongName, SingerName, AlbumID, SQFileHash, HQFileHash } = song
    const lrcContent = await getLrcContent(HQFileHash)

    const lrcFilePath = path.resolve(path.dirname(file), path.basename(file, path.extname(file)) + '.lrc')
    await fs.writeFile(lrcFilePath, lrcContent)
    break;
  }
}

function isMusicFormat (filename) {
  const musicExt = ['.mp3', '.flac', '.m4a']
  const ext = path.extname(filename)
  return musicExt.find(m => m === ext)
}

async function lrcExists (filepath) {
  const lrcPath = path.resolve(path.dirname(filepath), path.basename(filepath, path.extname(file)) + '.lrc')
  return fs.exists(lrcPath)
}

let musicfiles = []
async function downDirLrcfiles (dirpath) {
  const files = await fs.readdir(dirpath)
  for (file of files) {
    const filepath = path.resolve(dirpath, file)
    const stat = await fs.lstat(filepath)
    if (stat.isDirectory()) {
      await downDirLrcfiles(filepath)
    } else {
      if (isMusicFormat(file)) {
        if (await lrcExists(filepath)) {
        } else {
          musicfiles.push(filepath)
        }
      }
    }
  }
}

async function downDirLrc (dirpath) {
  let errorfiles = []
  await downDirLrcfiles(dirpath)
  const size = musicfiles.length
  for (let index in musicfiles) {
    const file = musicfiles[index]
    console.log(`[ ${Number(index) + 1} / ${size} ] ${file}`)
    try {
      await downlrc(file)
    } catch (err) {
      errorfiles.push(file)
    }
  }
  console.log(errorfiles)
}

downDirLrc('H:\\MUSIC')
