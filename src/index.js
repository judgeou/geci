const path = require('path')
const mm = require('music-metadata')
const axios = require('axios')
const fs = require('fs-extra')

async function searchSong (title, artist) {
  let kw = title
  if (artist) {
    kw = title + ' ' + artist
  }
  const { data } = await axios.default({
    baseURL: 'https://songsearch.kugou.com/',
    url: `/song_search_v2?platform=WebFilter&keyword=${ encodeURI(kw) }`,
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

async function searchSong2 (title, artist) {
  try {
    const r = await searchSong(title, artist)
    return r
  } catch (err) {
    return searchSong(title)
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

function takeVaildHash (hashArr) {
  for (let hash of hashArr) {
    if (hash && hash.search(/^00000000/) === 0) {
      continue
    } else {
      return hash
    }
  }
}

async function downlrc (file) {
  const mdata = await mm.parseFile(file)
  const { title, artist, album } = mdata.common
  const songs = await searchSong2(title, artist)
  for (let song of songs) {
    const { SongName, SingerName, AlbumID, SQFileHash, HQFileHash, FileHash } = song
    const hash = takeVaildHash([FileHash, HQFileHash, SQFileHash])
    const lrcContent = await getLrcContent(hash)

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
async function downDirLrcfiles (dirpath, overwriteLrc = false) {
  const files = await fs.readdir(dirpath)
  for (file of files) {
    const filepath = path.resolve(dirpath, file)
    const stat = await fs.lstat(filepath)
    if (stat.isDirectory()) {
      await downDirLrcfiles(filepath, overwriteLrc)
    } else {
      if (isMusicFormat(file)) {
        if (await lrcExists(filepath)) {
          if (overwriteLrc) {
            musicfiles.push(filepath)
          }
        } else {
          musicfiles.push(filepath)
        }
      }
    }
  }
}

async function downDirLrc (dirpath, overwriteLrc) {
  let errorfiles = []
  await downDirLrcfiles(dirpath, overwriteLrc)
  const size = musicfiles.length
  for (let index in musicfiles) {
    const file = musicfiles[index]
    console.log(`[ ${Number(index) + 1} / ${size} ] ${file}`)
    try {
      await downlrc(file)
    } catch (err) {
      const { title, artist } = (await mm.parseFile(file)).common
      errorfiles.push({ title, artist })
    }
  }
  console.log(errorfiles)
}

downDirLrc(process.argv[2] || 'E:\\Music', false)
