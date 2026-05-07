/**
 * Search route (server `page.tsx`): delegates to a client entry that loads the
 * heavy search UI with `next/dynamic` and `ssr: false` (required inside a client file in Next 15+).
 */

import { SearchClientEntry } from "./SearchClientEntry"

export default function SearchPage() {
  return <SearchClientEntry />
}
