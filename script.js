/*************************************************
 * BASIC ELEMENTS
 *************************************************/
const artImage = document.getElementById("artImage")
const artFrame = document.getElementById("artFrame")

const paintingToggle = document.getElementById('paintingToggle')
const paintingList = document.getElementById('paintingList')
const selectedThumb = document.getElementById('selectedThumb')
const selectedTitle = document.getElementById('selectedTitle')
const paintingDescription = document.getElementById('paintingDescription')

const scaleInput = document.getElementById("scale")
const frameWidth = document.getElementById("frameWidth")
const frameColor = document.getElementById("frameColor")
const stretcherInput = document.getElementById("stretcher")

const interiorImg = document.querySelector('.interior')
if (interiorImg) interiorImg.src = 'images/interior/interior.png'

/*************************************************
 * HELPERS
 *************************************************/
function cell(v){
  return v ? v.replace(/^\s+|\s+$/g, '').replace(/^"|"$/g, '') : ''
}

function isImageUrl(url){
  return typeof url === 'string' && /\.(jpg|jpeg|png|webp)$/i.test(url)
}

function findHeaderIndex(headers, patterns){
  const lower = headers.map(h => h.toLowerCase())
  for (const p of patterns){
    const idx = lower.findIndex(h => h.includes(p))
    if (idx !== -1) return idx
  }
  return -1
}

/*************************************************
 * IMAGE ERROR LOGGER
 *************************************************/
window.addEventListener('error', function(e){
  const t = e.target
  if (t && t.tagName === 'IMG') {
    console.warn('Image load error:', t.src)
  }
}, true)

/*************************************************
 * THUMBNAIL SEARCH
 *************************************************/
function findExistingThumb(id, cb){
  const folders = ['images/paintings','images/Paintings']
  const exts = ['jpg','jpeg','png','webp']
  const pads = [id, id.padStart(2,'0'), id.padStart(3,'0')]
  const suffixes = ['','_thumb','-thumb','_main','_large']

  const candidates = []
  folders.forEach(f=>{
    pads.forEach(p=>{
      suffixes.forEach(s=>{
        exts.forEach(e=>{
          candidates.push(`${f}/${p}${s}.${e}`)
        })
      })
    })
  })

  let i = 0
  function next(){
    if (i >= candidates.length) return cb(null)
    const url = candidates[i++]
    const img = new Image()
    img.onload = ()=> cb(url)
    img.onerror = next
    img.src = url
  }
  next()
}

/*************************************************
 * SELECT PAINTING
 *************************************************/
function selectPainting(p){
  const folders = ['images/paintings','images/Paintings']
  const exts = ['jpg','jpeg','png','webp']
  const pads = [p.id, p.id.padStart(2,'0'), p.id.padStart(3,'0')]

  const candidates = []
  folders.forEach(f=>{
    pads.forEach(pa=>{
      exts.forEach(e=>{
        candidates.push(`${f}/${pa}.${e}`)
        candidates.push(`${f}/${pa}_large.${e}`)
        candidates.push(`${f}/${pa}_main.${e}`)
      })
    })
  })

  let i = 0
  function tryNext(){
    if (i >= candidates.length) {
      artImage.src = ''
      return
    }
    const src = candidates[i++]
    artImage.onerror = tryNext
    console.log('Trying image:', src)
    artImage.src = src
  }
  tryNext()

  if (isImageUrl(p.thumb)) selectedThumb.src = p.thumb
  selectedTitle.textContent = p.title || ''
  paintingDescription.textContent = p.description || ''
  paintingList.classList.add('hidden')
}

/*************************************************
 * UID DETECTION (PID HAS PRIORITY)
 *************************************************/
const params = new URLSearchParams(location.search)
let urlUid = params.get('pid') || params.get('uid')

if (!urlUid && location.hash){
  const hp = new URLSearchParams(location.hash.replace('#',''))
  urlUid = hp.get('pid') || hp.get('uid')
}

if (!urlUid && location.pathname){
  const m = location.pathname.match(/\/(\d+)(?:-|$)/)
  if (m) urlUid = m[1]
}

console.log('FINAL PID:', urlUid)

/*************************************************
 * LOAD CSV
 *************************************************/
fetch('paintings.csv')
  .then(r => r.text())
  .then(txt => {

    const delim = txt.includes(';') && !txt.includes(',') ? ';' : ','
    const lines = txt.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return

    const headers = lines[0].split(delim).map(cell)
    const rows = lines.slice(1)

    const skuIdx  = findHeaderIndex(headers, ['sku','code','article','арт'])
    const uidIdx  = findHeaderIndex(headers, ['uid','tilda'])
    const titleIdx= findHeaderIndex(headers, ['title','name','название'])
    const descIdx = findHeaderIndex(headers, ['description','описание'])

    const items = rows.map((ln,i)=>{
      const c = ln.split(delim).map(cell)
      const skuRaw = skuIdx !== -1 ? c[skuIdx] : ''
      const digits = (skuRaw.match(/\d+/g)||[]).join('')
      const id = digits || (i+1).toString()

      return {
        id,
        title: titleIdx!==-1 ? c[titleIdx] : `Картина ${id}`,
        description: descIdx!==-1 ? c[descIdx] : '',
        uidRaw: uidIdx!==-1 ? c[uidIdx] : ''
      }
    })

    if (!urlUid){
      paintingDescription.innerHTML = 'Нет PID в ссылке'
      return
    }

    const match = items.find(it => it.uidRaw === urlUid)
    if (!match){
      paintingDescription.innerHTML = 'Картина не найдена'
      return
    }

    const picker = document.querySelector('.painting-picker')
    if (picker) picker.style.display = 'none'

    findExistingThumb(match.id, (thumb)=>{
      match.thumb = thumb
      selectPainting(match)
    })
  })

/*************************************************
 * UI CONTROLS
 *************************************************/
const BASE_WIDTH = 200

function update(){
  const scale = Number(scaleInput.value)/100
  artFrame.style.width = BASE_WIDTH * scale + 'px'
  artFrame.style.borderWidth = frameWidth.value + 'px'
  artFrame.style.borderColor = frameColor.value
  if (stretcherInput)
    artFrame.style.setProperty('--stretcher', stretcherInput.value+'px')
}

scaleInput.addEventListener('input', update)
frameWidth.addEventListener('input', update)
frameColor.addEventListener('input', update)
if (stretcherInput) stretcherInput.addEventListener('input', update)

update()

/*************************************************
 * DRAG & TOUCH
 *************************************************/
let isDragging=false,startX=0,startY=0,startLeft=0,startTop=0

artFrame.addEventListener('mousedown',e=>{
  isDragging=true
  startX=e.clientX; startY=e.clientY
  startLeft=artFrame.offsetLeft
  startTop=artFrame.offsetTop
})

document.addEventListener('mousemove',e=>{
  if(!isDragging)return
  artFrame.style.left=startLeft+(e.clientX-startX)+'px'
  artFrame.style.top=startTop+(e.clientY-startY)+'px'
})

document.addEventListener('mouseup',()=>isDragging=false)

artFrame.addEventListener('touchstart',e=>{
  const t=e.touches[0]
  isDragging=true
  startX=t.clientX; startY=t.clientY
  startLeft=artFrame.offsetLeft
  startTop=artFrame.offsetTop
})

document.addEventListener('touchmove',e=>{
  if(!isDragging)return
  const t=e.touches[0]
  artFrame.style.left=startLeft+(t.clientX-startX)+'px'
  artFrame.style.top=startTop+(t.clientY-startY)+'px'
  e.preventDefault()
},{passive:false})

document.addEventListener('touchend',()=>isDragging=false)
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
  // We rely on CSV-derived id and try multiple filename variants (pads and suffixes).
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
  const skuIdx = findHeaderIndex(headers, ['sku','code','article','арт','артикул'])
  const uidIdx = findHeaderIndex(headers, ['tilda uid','tilda_uid','tilda','external id','externalid','uid'])
  const titleIdx = findHeaderIndex(headers, ['title','name','label','название','title_ru'])
  const descIdx = findHeaderIndex(headers, ['description','text','desc','описание'])

  const rows = lines.slice(1)
  const items = rows.map((ln, i) => {
    const cols = ln.split(delim).map(c => cell(c))
    const skuRaw = skuIdx !== -1 ? cols[skuIdx] : ''
    const skuDigits = (skuRaw || '').toString().match(/\d+/g)
    const skuJoined = skuDigits ? skuDigits.join('') : ''
    const finalId = (skuJoined.replace(/^0+/, '') || skuJoined || (i+1).toString())
    const title = titleIdx !== -1 ? cols[titleIdx] : `Картина ${finalId}`
    const description = descIdx !== -1 ? cols[descIdx] : ''
    const uidRaw = uidIdx !== -1 ? cols[uidIdx] : ''
    return { id: finalId, title, description, uidRaw, skuRaw }
  })

  const appended = []
  let processed = 0
  if (items.length === 0) return
  // read uid from URL if present (query or hash)
  const urlParams = new URLSearchParams(window.location.search)
  const urlUidCandidates = [
    urlParams.get('pid'),  urlParams.get('uid'), urlParams.get('product_uid'), urlParams.get('external_id'), urlParams.get('tilda_uid'), urlParams.get('id')
  ].filter(Boolean)
  let urlUid = null
  if (urlUidCandidates.length) urlUid = urlUidCandidates[0]
  // also support hash like #uid=...
  if (!urlUid && location.hash) {
    const h = location.hash.replace(/^#/, '')
    const hp = new URLSearchParams(h)
    urlUid = hp.get('uid') || hp.get('id') || urlUid
  }
  // also support UID embedded in pathname (e.g. /tproduct/782957961992-novie-freski-altamira)
  if (!urlUid && location.pathname) {
    const m = location.pathname.match(/\/(\d+)(?:-|$)/)
    if (m) urlUid = m[1]
  }
  // if still no uid, try to extract it from document.referrer (useful when coming from Tilda)
  if (!urlUid && document.referrer) {
    try {
      const ref = new URL(document.referrer)
      const refParams = new URLSearchParams(ref.search)
      urlUid = refParams.get('pid') || refParams.get('uid') || refParams.get('product_uid') || refParams.get('external_id') || refParams.get('tilda_uid') || refParams.get('id') || urlUid
      if (!urlUid) {
        const rm = ref.pathname.match(/\/(\d+)(?:-|$)/)
        if (rm) urlUid = rm[1]
      }
      // fallback: any long digit sequence in referrer URL
      if (!urlUid) {
        const longDigits = (ref.href.match(/\d{6,}/g) || [])[0]
        if (longDigits) urlUid = longDigits
      }
      if (urlUid) console.log('Detected urlUid from referrer:', urlUid, 'referrer:', document.referrer)
    } catch (e) {
      // ignore invalid referrer
    }
  }
  if (urlUid) console.log('Detected urlUid:', urlUid)
  // if UID present in URL, try to open only that product
  if (urlUid) {
    // try exact match by Tilda UID column
    const matchByUid = items.find(it => {
      if (!it.uidRaw) return false
      return it.uidRaw.replace(/^"|"$/g, '') === urlUid
    })
    let match = matchByUid || null
    console.log('Match by UID result:', !!match, match ? match.skuRaw || match.id : null)
    // if not found, try matching by title slug (transliteration)
    if (!match) {
      // extract slug part after the first dash in last path segment
      const seg = location.pathname.split('/').filter(Boolean).pop() || ''
      const slugPart = seg.includes('-') ? seg.split('-').slice(1).join('-') : seg
      if (slugPart) {
        function transliterate(str){
          const map = {
            'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
          }
          return str.toLowerCase().split('').map(ch => map[ch] || ch).join('')
        }
        function slugify(str){
          return transliterate(str || '').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
        }
        const target = slugify(slugPart)
        match = items.find(it => slugify(it.title) === target)
        console.log('Title slug fallback target:', target, 'found:', !!match)
      }
    }
    if (!match) {
      paintingList.innerHTML = '<div style="padding:8px;color:#666">Товар не найден в CSV по UID или названию</div>'
      return
    }
    // hide the picker UI — we show only the matched painting
    const pickerEl = document.querySelector('.painting-picker')
    if (pickerEl) pickerEl.style.display = 'none'
    // find thumbnail/main image for the matched item
    findExistingThumb(match.id, (thumbUrl) => {
      if (thumbUrl) {
        match.thumb = thumbUrl
        // show title/description and open the painting
        selectPainting(match)
      } else {
        paintingDescription.innerHTML = '<div style="color:#a33">Изображение для товара не найдено</div>'
      }
    })
    return
  }
  // No UID provided — this constructor is intended to open only a painting from an external card.
  // Hide/remove the selector UI and show a friendly message.
  const pickerEl = document.querySelector('.painting-picker')
  if (pickerEl) pickerEl.remove()
  paintingList.innerHTML = '<div style="padding:8px;color:#666">Нет UID в ссылке — картина не выбрана</div>'
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
