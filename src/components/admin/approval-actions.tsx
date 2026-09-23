"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function ApprovalActions({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  async function approve() {
    const res = await fetch(`/api/events/${eventId}/approve`, { method: "POST" })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(`Could not approve the event (${res.status})`, {
        description: body?.error ? JSON.stringify(body.error) : undefined,
      })
      return
    }
    toast.success("Event approved")
    router.refresh()
  }

  async function reject() {
    const res = await fetch(`/api/events/${eventId}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(`Could not reject the event (${res.status})`, {
        description: body?.error ? JSON.stringify(body.error) : undefined,
      })
      return
    }
    toast.success("Event rejected")
    setRejecting(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={approve}>
        Approve
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setRejecting(true)}>
        Reject
      </Button>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject event</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="destructive" disabled={!reason.trim()} onClick={reject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
