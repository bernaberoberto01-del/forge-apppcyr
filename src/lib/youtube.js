// Enlaces de YouTube de la biblioteca de ejercicios. Llegan en varios formatos
// (embed/ID, watch?v=ID, youtu.be/ID, shorts/ID); hay que sacar el ID para la
// miniatura y para el reproductor, que solo acepta la URL /embed/.
export function ytId(url) {
  if (!url) return null
  const m = String(url).match(/(?:embed\/|watch\?(?:.*&)?v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}
export const ytEmbed = url => { const id = ytId(url); return id ? `https://www.youtube.com/embed/${id}` : null }
export const ytMiniatura = url => { const id = ytId(url); return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null }
