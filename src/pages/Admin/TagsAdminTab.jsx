import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const PRIMARY_GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#8A8A9A'
const BORDER = '#E8E8E8'

/**
 * Transforme "Garde d'enfant (urgence)" → "garde-enfant-urgence"
 */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function TagsAdminTab() {
  const [tags, setTags] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryTags, setCategoryTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [selectedCatIds, setSelectedCatIds] = useState([])

  async function loadAll() {
    setLoading(true)
    const [tagsRes, catsRes, ctRes] = await Promise.all([
      supabase.from('tags').select('*').order('label'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('category_tags').select('*'),
    ])
    setTags(tagsRes.data || [])
    setCategories(catsRes.data || [])
    setCategoryTags(ctRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Map tag_id → [category_id, ...]
  const tagCategoriesMap = useMemo(() => {
    const m = new Map()
    for (const ct of categoryTags) {
      if (!m.has(ct.tag_id)) m.set(ct.tag_id, [])
      m.get(ct.tag_id).push(ct.category_id)
    }
    return m
  }, [categoryTags])

  async function handleAddTag() {
    const label = newLabel.trim()
    if (!label) return
    if (selectedCatIds.length === 0) {
      toast.error('Choisis au moins une catégorie')
      return
    }
    const slug = slugify(label)
    const { data: created, error } = await supabase
      .from('tags')
      .insert({ slug, label, is_active: true })
      .select()
      .single()
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ce slug existe déjà.' : error.message)
      return
    }
    // Associer aux catégories choisies (la première est marquée primary)
    const rows = selectedCatIds.map((cat_id, i) => ({
      category_id: cat_id,
      tag_id: created.id,
      is_suggested_primary: i === 0,
      sort_order: 999,
    }))
    const { error: ctErr } = await supabase.from('category_tags').insert(rows)
    if (ctErr) {
      toast.error('Tag créé mais association échouée : ' + ctErr.message)
    } else {
      toast.success(`"${label}" ajouté`)
    }
    setNewLabel('')
    setSelectedCatIds([])
    await loadAll()
  }

  async function handleToggleCategory(tagId, catId) {
    const currentCats = tagCategoriesMap.get(tagId) || []
    const isLinked = currentCats.includes(catId)
    if (isLinked) {
      // Empêche de tout retirer
      if (currentCats.length <= 1) {
        toast.error('Un tag doit être rattaché à au moins 1 catégorie')
        return
      }
      const { error } = await supabase
        .from('category_tags')
        .delete()
        .eq('tag_id', tagId)
        .eq('category_id', catId)
      if (error) toast.error(error.message)
    } else {
      const { error } = await supabase
        .from('category_tags')
        .insert({ tag_id: tagId, category_id: catId, sort_order: 999 })
      if (error) toast.error(error.message)
    }
    await loadAll()
  }

  async function handleToggleActive(tag) {
    const { error } = await supabase
      .from('tags')
      .update({ is_active: !tag.is_active })
      .eq('id', tag.id)
    if (error) { toast.error(error.message); return }
    toast.success(!tag.is_active ? 'Tag réactivé' : 'Tag masqué')
    await loadAll()
  }

  async function handleDelete(tag) {
    if (!window.confirm(`Supprimer définitivement "${tag.label}" ? Les vœux liés perdront ce tag.`)) return
    const { error } = await supabase.from('tags').delete().eq('id', tag.id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${tag.label}" supprimé`)
    await loadAll()
  }

  async function handleRename(tag) {
    const newLabel = window.prompt('Nouveau libellé :', tag.label)
    if (!newLabel || newLabel.trim() === tag.label) return
    const { error } = await supabase
      .from('tags')
      .update({ label: newLabel.trim(), updated_at: new Date().toISOString() })
      .eq('id', tag.id)
    if (error) { toast.error(error.message); return }
    await loadAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Créer un nouveau tag */}
      <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: BORDER }}>
        <p className="text-sm font-bold mb-3" style={{ color: TEXT_PRIMARY }}>Ajouter un tag</p>
        <div className="flex flex-col gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Libellé (ex: Dépannage serrurier)"
            className="h-10 bg-[#F7F8FC] rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-[#5B6BF5]/20"
          />
          {newLabel && (
            <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>
              Slug généré : <code className="font-mono">{slugify(newLabel)}</code>
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {categories.map((cat) => {
              const active = selectedCatIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatIds((prev) =>
                    prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                  )}
                  className="h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors"
                  style={active
                    ? { background: PRIMARY_GRADIENT, borderColor: 'transparent', color: '#fff' }
                    : { background: '#fff', borderColor: BORDER, color: TEXT_PRIMARY }}
                >
                  {cat.emoji} {cat.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleAddTag}
            disabled={!newLabel.trim() || selectedCatIds.length === 0}
            className="h-10 rounded-full font-bold text-sm text-white disabled:opacity-40"
            style={{ background: PRIMARY_GRADIENT }}
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* Liste des tags */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <p className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
            Catalogue — {tags.length} tag{tags.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y" style={{ borderColor: BORDER }}>
          {tags.map((tag) => {
            const linkedCats = tagCategoriesMap.get(tag.id) || []
            return (
              <div key={tag.id} className="px-4 py-3" style={{ opacity: tag.is_active ? 1 : 0.5 }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                      {tag.label}
                    </p>
                    <p className="text-[10px] font-mono truncate" style={{ color: TEXT_SECONDARY }}>
                      {tag.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleRename(tag)}
                      className="text-[11px] px-2 h-7 rounded-full text-[#5B6BF5]">Renommer</button>
                    <button onClick={() => handleToggleActive(tag)}
                      className="text-[11px] px-2 h-7 rounded-full"
                      style={{ color: tag.is_active ? '#F59E0B' : '#059669' }}>
                      {tag.is_active ? 'Masquer' : 'Activer'}
                    </button>
                    <button onClick={() => handleDelete(tag)}
                      className="text-[11px] px-2 h-7 rounded-full text-red-500">Supprimer</button>
                  </div>
                </div>
                {/* Catégories rattachées */}
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => {
                    const linked = linkedCats.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleToggleCategory(tag.id, cat.id)}
                        className="h-6 px-2 rounded-full text-[10px] font-semibold border transition-colors"
                        style={linked
                          ? { background: PRIMARY_GRADIENT, borderColor: 'transparent', color: '#fff' }
                          : { background: '#fff', borderColor: BORDER, color: TEXT_SECONDARY }}
                      >
                        {cat.emoji}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
