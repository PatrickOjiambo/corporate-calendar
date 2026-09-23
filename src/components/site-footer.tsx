export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Kenya Reinsurance Corporation. All rights reserved.</p>
        <p>Kenya &middot; Zambia &middot; C&ocirc;te d&apos;Ivoire</p>
      </div>
    </footer>
  )
}
