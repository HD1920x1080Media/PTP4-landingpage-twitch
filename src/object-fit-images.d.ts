declare module 'object-fit-images' {
  interface OfiOptions {
    watchMQ?: boolean
    cover?: string
    padding?: string
    skipTest?: boolean
  }
  function objectFitImages(
    images?: string | Element | NodeListOf<Element> | null,
    options?: OfiOptions,
  ): void
  export default objectFitImages
}
