const artImage = document.getElementById("artImage")
const artFrame = document.getElementById("artFrame")

// new UI elements
const paintingDescription = document.getElementById('paintingDescription')

const selectedThumb = document.getElementById('selectedThumb')
const selectedTitle = document.getElementById('selectedTitle')


// Parse UID from URL
function getUidFromUrl() {
  const urlParams = new URLSearchParams(window.location.search)
  const urlUidCandidates = [
    urlParams.get('uid'),
    urlParams.get('product_uid'),
    urlParams.get('external_id'),
    urlParams.get('tilda_uid'),
    urlParams.get('id')
  ].filter(Boolean)

  let urlUid = null
  if (urlUidCandidates.length) urlUid = urlUidCandidates[0]

  if (!urlUid && location.hash) {
    const h = location.hash.replace(/^#/, '')
    const hp = new URLSearchParams(h)
    urlUid = hp.get('uid') || hp.get('id') || urlUid
  }
  
  if (!urlUid && location.pathname) {
    const m = location.pathname.match(/\/(\d+)(?:-|$)/)
    if (m) urlUid = m[1]
  }

  return urlUid
}

// Load CSV and find matching painting by UID
fetch('paintings.csv')
  .then(r => r.text())
  .then(txt => {
    if (!txt) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">CSV пуст или недоступен</div>'
      return
    }

    const delim = txt.indexOf(';') !== -1 && txt.indexOf(',') === -1 ? ';' : ','
    const lines = txt.split(/\r?\n/).filter(Boolean)

    if (lines.length <= 1) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">CSV содержит только заголовки</div>'
      return
    }

    const headers = lines[0].split(delim).map(h => h.trim().toLowerCase())
    const skuIdx = headers.indexOf('sku')
    const uidIdx = headers.indexOf('tilda uid')
    const titleIdx = headers.indexOf('title')
    const descIdx = headers.indexOf('description')

    if (skuIdx === -1 || uidIdx === -1) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Столбцы SKU или Tilda UID не найдены в файле CSV</div>'
      return
    }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(delim).map(cell => cell.trim())
      return {
        uid: cols[uidIdx],
        sku: cols[skuIdx],
        title: titleIdx !== -1 ? cols[titleIdx] : '',
        description: descIdx !== -1 ? cols[descIdx] : ''
      }
    })

    const uidFromUrl = getUidFromUrl()
    if (!uidFromUrl) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">UID не найден в URL</div>'
      return
    }

    const matched = rows.find(row => row.uid === uidFromUrl)
    if (!matched) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Картина не найдена в файле CSV</div>'
      return
    }

    findExistingPaintingImage(matched.sku, (imageURL) => {
      if (imageURL) {
        artImage.src = imageURL
        selectedThumb.src = imageURL
        selectedTitle.textContent = matched.title || ''
        paintingDescription.textContent = matched.description || ''
      } else {
        paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Изображение для картины не найдено в папке</div>'
      }
    })
  })
  .catch(err => {
    console.error('Ошибка загрузки CSV:', err)
    paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Ошибка обработки файла CSV</div>'
  })

// Find painting image
function findExistingPaintingImage(id, callback) {
  const folders = ['images/paintings']
  const exts = ['jpg', 'jpeg', 'png', 'webp']
  const pads = [id, id.padStart(3, '0'), id.padStart(4, '0')]

  const candidates = []
  folders.forEach(folder => {
    pads.forEach(pad => {
      exts.forEach(ext => {
        candidates.push(`${folder}/${pad}.${ext}`)
      })
    })
  })

  let idx = 0
  function tryNext() {
    if (idx >= candidates.length) return callback(null)
    const url = candidates[idx++]
    const img = new Image()
    img.onload = () => callback(url)
    img.onerror = () => tryNext()
    img.src = url
  }
  tryNext()
}