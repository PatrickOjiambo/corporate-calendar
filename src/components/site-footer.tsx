export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Kenya Reinsurance Corporation. All rights reserved.</p>
      </div>
    </footer>
  )
}
