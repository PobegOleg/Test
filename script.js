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
  const candidates = [
    `images/paintings/painting_${id}_thumb.jpg`,
    `images/paintings/painting_${id}.jpg`,
    `images/paintings/${id}_thumb.jpg`,
    `images/paintings/${id}.jpg`
  ]
  function tryNext(){
    const url = candidates.shift()
    if (!url) return cb(null)
    const img = new Image()
    img.onload = () => cb(url)
    img.onerror = () => tryNext()
    img.src = url
  }
  tryNext()
}

function selectPainting(p){
  // try multiple image file name patterns for main image
  const mainCandidates = [
    `images/paintings/painting_${p.id}.jpg`,
    `images/paintings/${p.id}.jpg`,
    `images/paintings/painting_${p.id}_large.jpg`,
  ]
  let tried = 0
  function tryNext(){
    const src = mainCandidates.shift()
    if (!src) {
      // fallback to empty
      artImage.src = ''
      return
    }
    artImage.onerror = tryNext
    artImage.src = src
  }
  tryNext()
  selectedThumb.src = `images/paintings/painting_${p.id}_thumb.jpg`
  selectedTitle.textContent = p.title || ''
  paintingDescription.textContent = p.description || ''
  paintingList.classList.add('hidden')
}

// fetch and parse CSV (works with comma or semicolon)
fetch('paintings.csv').then(r=> r.text()).then(txt => {
  if (!txt) return
  const delim = txt.indexOf(';') !== -1 && txt.indexOf(',') === -1 ? ';' : (txt.indexOf(',') !== -1 ? ',' : ',')
  const lines = txt.split(/\r?\n/).filter(Boolean)
  const headers = lines[0].split(delim).map(h=> cell(h))
  const idIdx = findHeaderIndex(headers, ['id','sku','code','external id','uid'])
  const titleIdx = findHeaderIndex(headers, ['title','name','label'])
  const descIdx = findHeaderIndex(headers, ['description','text','desc'])
  const rows = lines.slice(1)
  const items = []
  rows.forEach((ln, i)=>{
    const cols = ln.split(delim).map(c=> cell(c))
    let id = ''
    if (idIdx !== -1) id = cols[idIdx]
    else if (cols[0]) id = cols[0]
    // извлекаем все цифры из SKU/id и соединяем их (буквы игнорируются)
    const digitMatches = (id || '').toString().match(/\d+/g)
    const finalId = digitMatches ? digitMatches.join('') : (i+1).toString()
    const title = titleIdx !== -1 ? cols[titleIdx] : `Картина ${finalId}`
    const description = descIdx !== -1 ? cols[descIdx] : ''
    items.push({ id: finalId, title, description })
  })
  // populate dropdown only with items that have an existing thumbnail
  const appended = []
  let processed = 0
  if (items.length === 0) return
  items.forEach(p => {
    findExistingThumb(p.id, (thumbUrl) => {
      processed++
      if (thumbUrl) {
        p.thumb = thumbUrl
        paintingList.appendChild(makeItem(p))
        appended.push(p)
      }
      // after all processed, select first appended if any
      if (processed === items.length) {
        if (appended.length) selectPainting(appended[0])
        else {
          // nothing to show — optionally display message
          paintingList.innerHTML = '<div style="padding:8px;color:#666">Нет доступных изображений</div>'
        }
      }
    })
  })
}).catch(err => {
  console.warn('Не удалось загрузить paintings.csv', err)
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
