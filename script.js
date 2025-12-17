const artImage = document.getElementById("artImage")
const artFrame = document.getElementById("artFrame")

// new UI elements for custom dropdown
const paintingToggle = document.getElementById('paintingToggle')
const paintingList = document.getElementById('paintingList')
const selectedThumb = document.getElementById('selectedThumb')
const selectedTitle = document.getElementById('selectedTitle')
const paintingDescription = document.getElementById('paintingDescription')

const scaleInput = document.getElementById("scale")
const frameWidth = document.getElementById("frameWidth")
const frameColor = document.getElementById("frameColor")
const stretcherInput = document.getElementById("stretcher")

// load interior image from images/interior/ folder
const interiorImg = document.querySelector('.interior')
if (interiorImg) interiorImg.src = 'images/interior/interior.png'

// helper: sanitize CSV cell
function cell(v){ return v ? v.replace(/^\s+|\s+$/g, '').replace(/^"|"$/g, '') : '' }

// global resource error logger for images (helps detect external URLs coming from CSV)
window.addEventListener('error', function(e){
  const t = e.target || e.srcElement
  if (t && t.tagName === 'IMG') {
    console.warn('Image load error captured:', t.src)
  }
}, true)

// try to find best-matching header index
function findHeaderIndex(headers, patterns){
  const lower = headers.map(h=>h.toLowerCase())
  for (const p of patterns){
    const idx = lower.findIndex(h => h.includes(p))
    if (idx !== -1) return idx
  }
  return -1
}

// build dropdown item (uses p.thumb which must be a verified URL)
function makeItem(p){
  const el = document.createElement('div')
  el.className = 'dropdown-item'
  const img = document.createElement('img')
  img.alt = p.title || ''
  img.src = p.thumb || ''
  const title = document.createElement('div')
  title.textContent = p.title || (`Картина ${p.id}`)
  el.appendChild(img)
  el.appendChild(title)
  el.dataset.id = p.id
  el.dataset.title = p.title || ''
  el.dataset.desc = p.description || ''
  el.addEventListener('click', ()=> selectPainting(p))
  return el
}

// проверяет список возможных URL миниатюры и возвращает первый успешный
function findExistingThumb(id, cb){
  const folders = ['images/paintings','images/Paintings']
  const exts = ['jpg','jpeg','png','webp']
  const pads = [id, id.padStart(2,'0'), id.padStart(3,'0')]
  const candidates = []
  const suffixes = ['','_thumb','-thumb','_main','_large','_re1','_old','_new']
  folders.forEach(f => {
    pads.forEach(p => {
      suffixes.forEach(suf => {
        exts.forEach(ext => {
          candidates.push(`${f}/${p}${suf}.${ext}`)
        })
      })
    })
  })
  let idx = 0
  const max = candidates.length
  function tryNext(){
    if (idx >= max) return cb(null)
    const url = candidates[idx++]
    const img = new Image()
    img.onload = () => cb(url)
    img.onerror = () => {
      console.debug('Thumbnail not found:', url)
      tryNext()
    }
    console.debug('Trying thumbnail URL:', url)
    img.src = url
  }
  tryNext()
}

function selectPainting(p){
  // build main image candidates similar to thumbnail search (no prefix required)
  const folders = ['images/paintings','images/Paintings']
  const exts = ['jpg','jpeg','png','webp']
  const pads = [p.id, p.id.padStart(2,'0'), p.id.padStart(3,'0')]
  const mainCandidates = []
  folders.forEach(f => {
    pads.forEach(pa => {
      exts.forEach(ext => {
        mainCandidates.push(`${f}/${pa}.${ext}`)
        mainCandidates.push(`${f}/${pa}_large.${ext}`)
        mainCandidates.push(`${f}/${pa}_main.${ext}`)
      })
    })
  })
  let mIdx = 0
  const maxMain = mainCandidates.length
  function tryNextMain(){
    if (mIdx >= maxMain) { artImage.src = ''; return }
    const src = mainCandidates[mIdx++]
    artImage.onerror = () => {
      console.debug('Main image not found:', src)
      tryNextMain()
    }
    console.debug('Trying main image URL:', src)
    artImage.src = src
  }
  tryNextMain()
  // selected thumbnail already discovered earlier and stored in p.thumb
  if (p.thumb) selectedThumb.src = p.thumb
  selectedTitle.textContent = p.title || ''
  paintingDescription.textContent = p.description || ''
  paintingList.classList.add('hidden')
}

// load CSV and populate only CSV rows that have matching image files in images/Paintings
fetch('paintings.csv').then(r => r.text()).then(txt => {
  if (!txt) return
  const delim = txt.indexOf(';') !== -1 && txt.indexOf(',') === -1 ? ';' : (txt.indexOf(',') !== -1 ? ',' : ',')
  const lines = txt.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) {
    paintingList.innerHTML = '<div style="padding:8px;color:#666">CSV пуст или содержит только заголовки</div>'
    return
  }
  const headers = lines[0].split(delim).map(h => cell(h))
  const skuIdx = findHeaderIndex(headers, ['sku','code','article'])
  const uidIdx = findHeaderIndex(headers, ['tilda uid','tilda_uid','external id','externalid','uid','tilda'])
  const titleIdx = findHeaderIndex(headers, ['title','name','label'])
  const descIdx = findHeaderIndex(headers, ['description','text','desc'])

  const rows = lines.slice(1)
  const items = rows.map((ln, i) => {
    const cols = ln.split(delim).map(c => cell(c))
    let raw = ''
    if (skuIdx !== -1) raw = cols[skuIdx]
    else if (cols[0]) raw = cols[0]
    const digitMatches = (raw || '').toString().match(/\d+/g)
    const rawId = digitMatches ? digitMatches.join('') : (i+1).toString()
    const finalId = rawId.replace(/^0+/, '') || '0'
    const title = titleIdx !== -1 ? cols[titleIdx] : `Картина ${finalId}`
    const description = descIdx !== -1 ? cols[descIdx] : ''
    const uidRaw = uidIdx !== -1 ? cols[uidIdx] : ''
    return { id: finalId, title, description, uidRaw }
  })

  const appended = []
  let processed = 0
  if (items.length === 0) return
  // read uid from URL if present (query or hash)
  const urlParams = new URLSearchParams(window.location.search)
  const urlUidCandidates = [
    urlParams.get('uid'), urlParams.get('product_uid'), urlParams.get('external_id'), urlParams.get('tilda_uid'), urlParams.get('id')
  ].filter(Boolean)
  let urlUid = null
  if (urlUidCandidates.length) urlUid = urlUidCandidates[0]
  // also support hash like #uid=...
  if (!urlUid && location.hash) {
    const h = location.hash.replace(/^#/, '')
    const hp = new URLSearchParams(h)
    urlUid = hp.get('uid') || hp.get('id') || urlUid
  }

  items.forEach(p => {
    findExistingThumb(p.id, (thumbUrl) => {
      processed++
      if (thumbUrl) {
        p.thumb = thumbUrl
        paintingList.appendChild(makeItem(p))
        appended.push(p)
      }
      if (processed === items.length) {
        if (appended.length) {
          // if URL provided uid, try to find corresponding CSV row by uidRaw
          if (urlUid) {
            const found = appended.find(a => {
              if (!a.uidRaw) return false
              return a.uidRaw.replace(/^"|"$/g, '') === urlUid
            })
            if (found) selectPainting(found)
            else selectPainting(appended[0])
          } else {
            selectPainting(appended[0])
          }
        } else paintingList.innerHTML = '<div style="padding:8px;color:#666">Нет доступных изображений</div>'
      }
    })
  })
}).catch(err => {
  console.warn('Не удалось загрузить paintings.csv', err)
  paintingList.innerHTML = '<div style="padding:8px;color:#666">Ошибка загрузки CSV</div>'
})

// toggle dropdown
if (paintingToggle) {
  paintingToggle.addEventListener('click', (e)=>{
    e.stopPropagation()
    paintingList.classList.toggle('hidden')
  })
  // close when clicking outside
  document.addEventListener('click', ()=> paintingList.classList.add('hidden'))
}

const BASE_WIDTH = 200 // px — базовый размер картины

function update() {
  const scale = Number(scaleInput.value) / 100
  artFrame.style.width = BASE_WIDTH * scale + "px"
  artFrame.style.borderWidth = frameWidth.value + "px"
  artFrame.style.borderColor = frameColor.value
  const stretcherVal = stretcherInput ? stretcherInput.value : null
  if (stretcherVal !== null) {
    artFrame.style.setProperty("--stretcher", stretcherVal + "px")
  }
  // ensure transform is consistent (keep scale idempotent)
  artFrame.style.transform = `none`
}

// wire inputs
scaleInput.addEventListener("input", update)
frameWidth.addEventListener("input", update)
frameColor.addEventListener("input", update)

if (stretcherInput) {
  stretcherInput.addEventListener("input", update)
} else {
  // provide a default value if control is missing in DOM
  artFrame.style.setProperty('--stretcher', '20px')
}

update()

let isDragging = false
let startX = 0
let startY = 0
let startLeft = 0
let startTop = 0

artFrame.addEventListener("mousedown", (e) => {
  e.preventDefault()
  isDragging = true
  startX = e.clientX
  startY = e.clientY
  startLeft = artFrame.offsetLeft
  startTop = artFrame.offsetTop
})

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return

  const dx = e.clientX - startX
  const dy = e.clientY - startY

  artFrame.style.left = startLeft + dx + "px"
  artFrame.style.top = startTop + dy + "px"
})

document.addEventListener("mouseup", () => {
  isDragging = false
})



// touch support
artFrame.addEventListener('touchstart', (e) => {
  const t = e.touches[0]
  startX = t.clientX
  startY = t.clientY
  startLeft = artFrame.offsetLeft
  startTop = artFrame.offsetTop
  isDragging = true
})
document.addEventListener('touchmove', (e) => {
  if (!isDragging) return
  const t = e.touches[0]
  const dx = t.clientX - startX
  const dy = t.clientY - startY
  artFrame.style.left = startLeft + dx + "px"
  artFrame.style.top = startTop + dy + "px"
  e.preventDefault()
}, {passive: false})
document.addEventListener('touchend', () => { isDragging = false })
