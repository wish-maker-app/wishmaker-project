/**
 * Compression d'image côté client — aucune dépendance externe.
 * Utilise le Canvas API natif pour redimensionner + convertir en JPEG.
 *
 * Cas d'usage principal : avatars & cover images (photos iPhone 4 MB → ~150 KB)
 */

/**
 * Compresse un fichier image en conservant les proportions.
 *
 * @param {File} file - Fichier source (image/jpeg, image/png, image/webp, etc.)
 * @param {object} [opts]
 * @param {number} [opts.maxWidth=1200] - Largeur max en pixels
 * @param {number} [opts.maxHeight=1200] - Hauteur max en pixels
 * @param {number} [opts.quality=0.85] - Qualité JPEG (0-1)
 * @param {string} [opts.mimeType='image/jpeg'] - MIME type de sortie
 * @returns {Promise<File>} Fichier compressé (ou l'original si déjà sous 200 KB et <= dimensions)
 */
export async function compressImage(file, opts = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = opts

  // Si le fichier est déjà petit, on le retourne tel quel (gain négligeable)
  if (file.size < 200 * 1024 && file.type === mimeType) return file

  // Charge l'image
  const img = await loadImage(file)
  const { width, height } = fitInside(img.width, img.height, maxWidth, maxHeight)

  // Dessine sur un canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // Fond blanc pour gérer les PNG transparents convertis en JPEG
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)

  // Export en blob
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  )
  if (!blob) return file // fallback

  // Construit un nouveau File avec le bon type + un nom cohérent
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

function fitInside(w, h, maxW, maxH) {
  if (w <= maxW && h <= maxH) return { width: w, height: h }
  const ratio = Math.min(maxW / w, maxH / h)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
}
