/**********************
 * ELEMENTS
 **********************/
const artImage = document.getElementById("artImage")
const artFrame = document.getElementById("artFrame")
const selectedThumb = document.getElementById('selectedThumb')
const selectedTitle = document.getElementById('selectedTitle')
const paintingDescription = document.getElementById('paintingDescription')

const scaleInput = document.getElementById("scale")
const frameWidth = document.getElementById("frameWidth")
const frameColor = document.getElementById("frameColor")
const stretcherInput = document.getElementById("stretcher")

/**********************
 * HELPERS
 **********************/
function cell(v){
  return v ? v.replace(/^\s+|\s+$/g,'').replace(/^"|"$/g,'') : ''
}

function isImage(url){
  return /\.(jpg|jpeg|png|webp)$/i.test(url)
}

/**********************
 * THUMBNAIL SEARCH
 **********************/
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

/**********************
 * UID DETECTION (PID HAS PRIORITY)
 **********************/
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

// Also check for tilda uid in other parameters
if (!urlUid) {
  const urlParams = new URLSearchParams(window.location.search)
  const urlUidCandidates = [
    urlParams.get('pid'),  // Priority 1: pid
    urlParams.get('uid'),  // Priority 2: uid
    urlParams.get('product_uid'), 
    urlParams.get('external_id'), 
    urlParams.get('tilda_uid'), 
    urlParams.get('id')
  ].filter(Boolean)
  if (urlUidCandidates.length) urlUid = urlUidCandidates[0]
}

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

console.log('FINAL PID/UID:', urlUid)

/**********************
 * FIND HEADER INDEX
 **********************/
function findHeaderIndex(headers, patterns){
  const lower = headers.map(h=>h.toLowerCase())
 for (const p of patterns){
    const idx = lower.findIndex(h => h.includes(p))
    if (idx !== -1) return idx
  }
 return -1
}

/**********************
 * IMAGE SEARCH
 **********************/
function loadPaintingImage(id){
   const folders = ['images/paintings','images/Paintings']
   const exts = ['jpg','jpeg','png','webp']
   const pads = [id, id.padStart(2,'0'), id.padStart(3,'0')]

   const candidates = []
   folders.forEach(f=>{
     pads.forEach(p=>{
       exts.forEach(e=>{
         candidates.push(`${f}/${p}.${e}`)
         candidates.push(`${f}/${p}_large.${e}`)
         candidates.push(`${f}/${p}_main.${e}`)
       })
     })
   })

   let i = 0
   function tryNext(){
     if (i >= candidates.length){
       paintingDescription.innerHTML = 'Изображение не найдено'
       return
     }
     const src = candidates[i++]
     artImage.onerror = tryNext
     console.log('Trying:', src)
     artImage.src = src
   }
   tryNext()
}

/**********************
 * LOAD CSV
 **********************/
fetch('paintings.csv')
  .then(r => r.text())
  .then(txt => {

    if (!urlUid){
      paintingDescription.innerHTML = 'Нет pid в ссылке'
      return
    }

    const delim = txt.includes(';') && !txt.includes(',') ? ';' : ','
    const lines = txt.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2){
      paintingDescription.innerHTML = 'CSV пуст'
      return
    }

    const headers = lines[0].split(delim).map(cell)
    const rows = lines.slice(1)

    const uidIdx = findHeaderIndex(headers, ['tilda uid', 'uid', 'tilda'])
    const titleIdx = findHeaderIndex(headers, ['title', 'name', 'название'])
    const descIdx = findHeaderIndex(headers, ['description', 'описание'])
    const skuIdx = findHeaderIndex(headers, ['sku', 'code', 'article', 'арт'])

    let found = null

    rows.forEach((line, i) => {
      if (found) return
      const c = line.split(delim).map(cell)
      if (c[uidIdx] === urlUid){
        const digits = (c[skuIdx] || '').match(/\d+/g)
        found = {
          id: digits ? digits.join('') : (i+1).toString(),
          title: c[titleIdx] || '',
          desc: c[descIdx] || ''
        }
      }
    })

    if (!found){
      paintingDescription.innerHTML = 'Картина не найдена в CSV по указанному PID'
      // Hide the painting picker if no painting is found
      const paintingPicker = document.querySelector('.painting-picker')
      if (paintingPicker) {
        paintingPicker.style.display = 'none'
      }
      return
    }

    selectedTitle.textContent = found.title
    paintingDescription.textContent = found.desc

    loadPaintingImage(found.id)

    // Find and set thumbnail image
    findExistingThumb(found.id, (thumbUrl) => {
      if (thumbUrl) {
        selectedThumb.src = thumbUrl
        selectedThumb.style.display = 'block'
      } else {
        selectedThumb.style.display = 'none'
      }
    })
    
    // Hide the painting picker since we're showing only one painting
    const paintingPicker = document.querySelector('.painting-picker')
    if (paintingPicker) {
      paintingPicker.style.display = 'none'
    }
  })
 .catch(err=>{
    console.error(err)
    paintingDescription.innerHTML = 'Ошибка загрузки CSV'
  })

/**********************
 * FRAME CONTROLS
 **********************/
const BASE_WIDTH = 200

function update(){
  const scale = Number(scaleInput.value) / 100
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

/**********************
 * DRAG
 **********************/
let isDragging=false,sx=0,sy=0,l=0,t=0

artFrame.addEventListener('mousedown',e=>{
  isDragging=true
 sx=e.clientX; sy=e.clientY
  l=artFrame.offsetLeft
  t=artFrame.offsetTop
})

document.addEventListener('mousemove',e=>{
  if(!isDragging)return
  artFrame.style.left=l+(e.clientX-sx)+'px'
  artFrame.style.top=t+(e.clientY-sy)+'px'
})

document.addEventListener('mouseup',()=>isDragging=false)

artFrame.addEventListener('touchstart',e=>{
  const t=e.touches[0]
  isDragging=true
  sx=t.clientX; sy=t.clientY
  l=artFrame.offsetLeft
  t=artFrame.offsetTop
})

document.addEventListener('touchmove',e=>{
  if(!isDragging)return
  const t=e.touches[0]
  artFrame.style.left=l+(t.clientX-sx)+'px'
  artFrame.style.top=t+(t.clientY-sy)+'px'
  e.preventDefault()
},{passive:false})

document.addEventListener('touchend',()=>isDragging=false)
