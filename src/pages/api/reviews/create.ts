// Keep the old route safe: linked job transitions are the only review-write path.
export const prerender = false
export { POST } from '../jobs/index'
