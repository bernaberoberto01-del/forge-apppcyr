export function diaLocal(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-')
}

export function mesLocal(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0')
  ].join('-')
}
