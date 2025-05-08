import RequireRole from '../components/RequireRole'
import PageTitles from './PageTitles'

export default function PageTitlesWrapper() {
  return (
    <RequireRole role="admin">
      <PageTitles />
    </RequireRole>
  )
}
