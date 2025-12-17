const artImage = document.getElementById("artImage")
const artFrame = document.getElementById("artFrame")

// new UI elements
const paintingDescription = document.getElementById('paintingDescription')

const selectedThumb = document.getElementById('selectedThumb')
const selectedTitle = document.getElementById('selectedTitle')

// Parse UID and title from URL
function getUidAndTitleFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const idMatch = location.pathname.match(/tproduct\/(\d+)-/); // Match ID in URL path
  const uid = urlParams.get('uid') || (idMatch ? idMatch[1] : null); // Extract UID

  // Extract and transliterate title
  const titlePart = location.pathname.split('-').slice(1).join(' ');
  const title = transliterate(titlePart.replace(/-/g, ' ').trim(), true);
  return { uid, title };
}

// Function to transliterate Latin to Cyrillic and vice versa
function transliterate(str, toCyrillic = true) {
  const cyrToLat = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ' ': '-' };
  const latToCyr = Object.fromEntries(Object.entries(cyrToLat).map(([k, v]) => [v, k]));
  const dict = toCyrillic ? latToCyr : cyrToLat;
  return str.split('').map(ch => dict[ch.toLowerCase()] || ch).join('');
}

// Load CSV and find matching painting by UID or title
fetch('paintings.csv')
  .then(r => r.text())
  .then(txt => {
    if (!txt) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">CSV пуст или недоступен</div>';
      return;
    }

    const delim = txt.indexOf(';') !== -1 && txt.indexOf(',') === -1 ? ';' : ',';
    const lines = txt.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">CSV содержит только заголовки</div>';
      return;
    }

    const headers = lines[0].split(delim).map(h => h.trim().toLowerCase());
    const skuIdx = headers.indexOf('sku');
    const uidIdx = headers.indexOf('tilda uid');
    const titleIdx = headers.indexOf('title');
    const descIdx = headers.indexOf('description');

    if (skuIdx === -1 || uidIdx === -1) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Столбцы SKU или Tilda UID не найдены в файле CSV</div>';
      return;
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(delim).map(cell => cell.trim());
      return {
        uid: cols[uidIdx],
        sku: cols[skuIdx],
        title: titleIdx !== -1 ? cols[titleIdx] : '',
        description: descIdx !== -1 ? cols[descIdx] : ''
      };
    });

    const { uid: uidFromUrl, title: urlTitle } = getUidAndTitleFromUrl();

    // Find matching painting by UID or title
    let matched = rows.find(row => row.uid === uidFromUrl);
    if (!matched && urlTitle) {
      matched = rows.find(row => row.title.toLowerCase().includes(urlTitle.toLowerCase()));
    }

    if (!matched) {
      paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Картина не найдена в файле CSV</div>';
      return;
    }

    // Load image related to SKU
    findExistingPaintingImage(matched.sku, imageURL => {
      if (imageURL) {
        artImage.src = imageURL;
        selectedThumb.src = imageURL;
        selectedTitle.textContent = matched.title || '';
        paintingDescription.textContent = matched.description || '';
      } else {
        paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Изображение для картины не найдено в папке</div>';
      }
    });
  })
  .catch(err => {
    console.error('Ошибка загрузки CSV:', err);
    paintingDescription.innerHTML = '<div style="padding:8px;color:#666">Ошибка обработки файла CSV</div>';
  });

// Find painting image
function findExistingPaintingImage(id, callback) {
  const folders = ['images/paintings'];
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  const pads = [id, id.padStart(3, '0'), id.padStart(4, '0')];

  const candidates = [];
  folders.forEach(folder => {
    pads.forEach(pad => {
      exts.forEach(ext => {
        candidates.push(`${folder}/${pad}.${ext}`);
      });
    });
  });

  let idx = 0;
  function tryNext() {
    if (idx >= candidates.length) return callback(null);
    const url = candidates[idx++];
    const img = new Image();
    img.onload = () => callback(url);
    img.onerror = () => tryNext();
    img.src = url;
  }
  tryNext();
}