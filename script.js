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
function isImage(url){
  return /\.(jpg|jpeg|png|webp)$/i.test(url)
}

/**********************
 * UID DETECTION (PID HAS PRIORITY)
 **********************/
let urlUid;

function findUid() {
  const sources = [
    location.search,
    location.hash.replace('#', ''),
    document.referrer ? new URL(document.referrer).search : '',
    document.referrer ? new URL(document.referrer).hash.replace('#', '') : ''
  ];

  const paramKeys = ['sku', 'pid', 'uid', 'product_uid', 'external_id', 'tilda_uid', 'id'];

  for (const source of sources) {
    if (!source) continue;
    const params = new URLSearchParams(source);
    for (const key of paramKeys) {
      if (params.has(key)) return params.get(key);
    }
  }

  const pathRegex = /\/(\d+)(?:-|$)/;
  const pathSources = [location.pathname, document.referrer ? new URL(document.referrer).pathname : ''];
  for (const source of pathSources) {
      const match = source.match(pathRegex);
      if (match) return match[1];
  }

  if (document.referrer) {
    const longDigits = (document.referrer.match(/\d{6,}/g) || [])[0];
    if (longDigits) return longDigits;
  }

  return null;
}

urlUid = findUid();

console.log('FINAL PID/UID:', urlUid)

/**********************
 * IMAGE SEARCH
 **********************/
function loadPaintingImage(rawId){
   if (!rawId) return

   // Оставляем только цифры и убираем ведущие нули
   const baseId = rawId.replace(/\D/g, '').replace(/^0+/, '')
   if (!baseId) {
     paintingDescription.innerHTML = 'Некорректный SKU (нет цифр)'
     return
   }

   const folders = ['images/paintings','images/Paintings']
   const exts = ['jpg','jpeg','png','webp']
   
   // Генерируем варианты: 5, 05, 005, 0005
   const pads = [baseId, baseId.padStart(2,'0'), baseId.padStart(3,'0'), baseId.padStart(4,'0')]
   const uniquePads = [...new Set(pads)]

   const candidates = []
   folders.forEach(f=>{
     uniquePads.forEach(p=>{
       exts.forEach(e=>{
         candidates.push(`${f}/${p}.${e}`)
         candidates.push(`${f}/${p}_large.${e}`)
         candidates.push(`${f}/${p}_main.${e}`)
       })
     })
   })

   let found = false
   let errorCount = 0

   // Запускаем поиск параллельно, а не по очереди
   candidates.forEach(src => {
     const img = new Image()
     img.onload = () => {
       if (found) return
       found = true
       console.log('Painting image loaded:', src)
       artImage.src = src
       selectedThumb.src = src
       selectedThumb.style.display = 'block'
     }
     img.onerror = () => {
       errorCount++
       if (errorCount >= candidates.length && !found) {
         paintingDescription.innerHTML = 'Изображение не найдено'
       }
     }
     img.src = src
   })
}

/**********************
 * INIT
 **********************/
if (urlUid) {
  selectedTitle.textContent = `SKU: ${urlUid}`
  paintingDescription.textContent = ''
  loadPaintingImage(urlUid)
} else {
  paintingDescription.innerHTML = 'SKU не найден в ссылке'
}

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
