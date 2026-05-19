import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import KeywordPicker from '../../../components/ui/KeywordPicker'
import { useWishes } from '../../../hooks/useWishes'
import { useCatalog } from '../../../hooks/useTags'
import { checkContent } from '../../../lib/moderation'
import { supabase } from '../../../lib/supabase'
import useAuthStore from '../../../store/authStore'
import { formatLocation } from '../../../lib/geo'

const MAX_KEYWORDS = 5

// Dérive la catégorie principale d'un vœu à partir des mots-clés sélectionnés.
// Même logique que Step4 — assure qu'on a toujours un category_id pour le visuel.
function deriveCategory(tagIds, categoryTags, categories) {
  for (const tagId of tagIds) {
    const candidates = categoryTags.filter((ct) => ct.tag_id === tagId)
    if (candidates.length === 0) continue
    const primary = candidates.find((c) => c.is_suggested_primary)
    return (primary || candidates[0]).category_id
  }
  if (categories && categories.length > 0) return categories[0].id
  return null
}

export default function EditWish() {
  const { wishId } = useParams()
  const navigate = useNavigate()
  const { getWishById, updateWish, loading } = useWishes()
  const user = useAuthStore((s) => s.user)
  const inputRef = useRef()

  const { tags: catalogTags, categoryTags, categories, loaded: catalogLoaded } = useCatalog()
  const [wish, setWish] = useState(null)
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [recompenseType, setRecompenseType] = useState('bon_procede')
  const [montant, setMontant] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  // Images : existantes (from DB) + nouvelles (from file picker)
  const [existingImages, setExistingImages] = useState([]) // { id, url, is_cover }
  const [newImages, setNewImages] = useState([]) // { id, file, preview, is_cover }
  const [deletedImageIds, setDeletedImageIds] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const w = await getWishById(wishId)
        if (!w) { toast.error('Vœu introuvable'); navigate('/wisher'); return }
        if (w.statut !== 'en_attente') { toast.error('Ce vœu ne peut plus être modifié'); navigate('/wisher'); return }
        setWish(w)
        setTitre(w.titre || '')
        setDescription(w.description || '')
        setSelectedTagIds(w.tag_ids || [])
        setRecompenseType(w.type_recompense || 'bon_procede')
        setMontant(w.montant_recompense ? String(w.montant_recompense) : '')
        setExistingImages(w.images?.map((img, i) => ({ id: `existing-${i}`, url: img.url, is_cover: img.is_cover })) || [])
      } catch {
        toast.error('Erreur de chargement')
        navigate('/wisher')
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [wishId])

  const allImages = [
    ...existingImages.filter((img) => !deletedImageIds.includes(img.id)),
    ...newImages,
  ]
  const totalImages = allImages.length

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (totalImages + files.length > 5) {
      toast.error('Maximum 5 photos')
      return
    }

    // Modération NSFW avant acceptation
    const { moderateImages } = await import('../../../lib/moderationImage')
    const modResult = await moderateImages(files)
    if (!modResult.isClean) {
      toast.error(modResult.reason || 'Une image ne respecte pas nos règles')
      e.target.value = ''
      return
    }

    const imgs = files.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      is_cover: totalImages === 0 && i === 0,
    }))
    setNewImages((prev) => [...prev, ...imgs])
    e.target.value = ''
  }

  function removeImage(img) {
    if (img.id.startsWith('existing-')) {
      setDeletedImageIds((prev) => [...prev, img.id])
    } else {
      setNewImages((prev) => prev.filter((i) => i.id !== img.id))
    }
  }

  async function handleSave() {
    if (titre.length < 5) { toast.error('Titre min. 5 caractères'); return }
    if (description.length < 10) { toast.error('Description min. 10 caractères'); return }
    if (selectedTagIds.length === 0) { toast.error('Choisissez au moins un mot-clé'); return }

    const [titreCheck, descCheck] = await Promise.all([checkContent(titre), checkContent(description)])
    if (!titreCheck.isClean || !descCheck.isClean) {
      toast.error('Contenu non conforme.')
      return
    }

    // Recalcul de la catégorie (dérivée du 1er tag) + labels de tags pour rétrocompat
    const derivedCategoryId = deriveCategory(selectedTagIds, categoryTags, categories)
    const tagsById = new Map(catalogTags.map((t) => [t.id, t]))
    const tagLabels = selectedTagIds.map((id) => tagsById.get(id)?.label).filter(Boolean)

    try {
      // 1. Mettre à jour les champs du vœu
      await updateWish(wishId, {
        titre,
        description,
        type_recompense: recompenseType,
        montant_recompense: recompenseType === 'argent' ? parseFloat(montant) || null : null,
        adresse: wish.adresse,
        latitude: wish.latitude,
        longitude: wish.longitude,
        tags: tagLabels,
        tag_ids: selectedTagIds,
        category_id: derivedCategoryId,
      })

      // 2. Supprimer les images marquées
      for (const imgId of deletedImageIds) {
        const img = existingImages.find((i) => i.id === imgId)
        if (img) {
          await supabase.from('wish_images').delete().eq('wish_id', wishId).eq('url', img.url)
        }
      }

      // 3. Uploader les nouvelles images
      for (const img of newImages) {
        const ext = img.file.name.split('.').pop()
        const path = `${user.id}/${wishId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('wish-images').upload(path, img.file)
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('wish-images').getPublicUrl(path)
          await supabase.from('wish_images').insert({
            wish_id: wishId,
            url: publicUrl,
            is_cover: img.is_cover,
            ordre: totalImages,
          })
        }
      }

      toast.success('Vœu modifié avec succès !')
      navigate('/wisher')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la modification')
    }
  }

  if (pageLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Modifier mon vœu" onBack={() => navigate('/wisher')} />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">

          {/* Titre */}
          <Input label="Titre du vœu" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du vœu" />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#1A1A2E]">Description</label>
              <span className="text-xs text-[#8A8A9A]">{description.length}/500</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Décrivez votre vœu..."
              className="w-full bg-[#F5F5F7] rounded-[14px] px-4 py-3 text-[#1A1A2E] text-sm outline-none resize-none focus:ring-2 focus:ring-[#5B6BF5] border border-transparent focus:border-[#5B6BF5] transition-all placeholder-[#8A8A9A]"
            />
          </div>

          {/* Photos */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1A1A2E]">Photos ({totalImages}/5)</label>
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence>
                {allImages.map((img) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-[#F5F5F7]"
                  >
                    <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                    {img.is_cover && (
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                        Cover
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 flex items-end justify-end p-1.5">
                      <button onClick={() => removeImage(img)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#E53E3E">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {totalImages < 5 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#D0D0E0] bg-[#F5F5F7] flex flex-col items-center justify-center gap-1.5"
                >
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#5B6BF5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[10px] font-medium text-[#8A8A9A]">Ajouter</span>
                </motion.button>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </div>

          {/* Mots-clés */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1A1A2E]">
              Mots-clés ({selectedTagIds.length}/{MAX_KEYWORDS})
            </label>
            {catalogLoaded ? (
              <KeywordPicker
                value={selectedTagIds}
                onChange={setSelectedTagIds}
                max={MAX_KEYWORDS}
              />
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
              </div>
            )}
          </div>

          {/* Récompense */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#1A1A2E]">Récompense</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecompenseType('argent')}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                style={recompenseType === 'argent'
                  ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                  : { border: '1.5px solid #D1D5DB', color: '#8A8A9A', background: 'transparent' }
                }
              >
                Argent
              </button>
              <button
                type="button"
                onClick={() => setRecompenseType('bon_procede')}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                style={recompenseType === 'bon_procede'
                  ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                  : { border: '1.5px solid #D1D5DB', color: '#8A8A9A', background: 'transparent' }
                }
              >
                Bon procédé
              </button>
            </div>
            {recompenseType === 'argent' && (
              <Input label="Montant (€)" type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Ex: 15" />
            )}
          </div>

          {/* Localisation (affichage seul) */}
          {wish && (formatLocation(wish) || wish.adresse) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1A1A2E]">Localisation</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F5F7] rounded-[14px]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#5B6BF5" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="#5B6BF5" strokeWidth="2"/>
                </svg>
                <span className="text-sm text-[#1A1A2E]">{formatLocation(wish)}</span>
              </div>
            </div>
          )}

          {/* Bouton sauvegarder */}
          <div className="pt-2">
            <Button onClick={handleSave} loading={loading}>
              Enregistrer les modifications
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
